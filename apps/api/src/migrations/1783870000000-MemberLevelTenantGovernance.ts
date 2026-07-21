import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

type LevelRow = {
  id: number;
  tenantId: number | null;
  tenantScopeKey: string;
  name: string;
  minPoints: number;
  minGrowth: number;
  validityDays: number | null;
  discountRate: string;
  priorityBooking: number | boolean;
  benefits: unknown;
  enabled: number | boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type LevelMapping = Map<number, Map<number, number>>;

const audienceTables = ["announcements", "marketing_popups", "ad_campaigns"];

function tenantScopeKey(tenantId: number) {
  return `tenant:${tenantId}`;
}

function parseJson(value: unknown) {
  if (!value) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  try {
    return JSON.parse(String(value)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function audienceLevelIds(value: unknown) {
  const audience = parseJson(value);
  return Array.isArray(audience?.memberLevelIds)
    ? audience.memberLevelIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];
}

function replaceAudienceLevelIds(value: unknown, mapping: Map<number, number>) {
  const audience = parseJson(value);
  if (!audience || !Array.isArray(audience.memberLevelIds)) return null;
  const previous = audience.memberLevelIds.map(Number);
  const next = previous.map((id) => mapping.get(id) || id);
  if (previous.every((id, index) => id === next[index])) return null;
  return { ...audience, memberLevelIds: next };
}

export class MemberLevelTenantGovernance1783870000000 implements MigrationInterface {
  name = "MemberLevelTenantGovernance1783870000000";

  async up(queryRunner: QueryRunner) {
    await this.addLevelScopeColumns(queryRunner);
    await this.addProfileSnapshot(queryRunner);

    const duplicateNames = await queryRunner.query(
      "SELECT tenantScopeKey, name, COUNT(*) AS count FROM member_levels GROUP BY tenantScopeKey, name HAVING COUNT(*) > 1 LIMIT 1"
    ) as Array<{ tenantScopeKey: string; name: string; count: string }>;
    if (duplicateNames.length) throw new Error(`Duplicate member level name in scope ${duplicateNames[0].tenantScopeKey}: ${duplicateNames[0].name}`);

    await this.ensureLevelIndexes(queryRunner);
    const mapping = await this.cloneTenantLevels(queryRunner);
    await this.rewireRelationalReferences(queryRunner, mapping, false);
    await this.rewireAudienceReferences(queryRunner, mapping, false);
    await this.backfillProfileSnapshots(queryRunner);
    await this.createChangeTable(queryRunner);
    await this.backfillChangeHistory(queryRunner);
    await this.createChangeTriggers(queryRunner);
  }

  async down(queryRunner: QueryRunner) {
    const unsafe = await queryRunner.query(
      "SELECT id FROM member_levels WHERE tenantId IS NOT NULL AND templateLevelId IS NULL LIMIT 1"
    ) as Array<{ id: number }>;
    if (unsafe.length) throw new Error("Cannot revert member level tenant governance while tenant-defined levels exist");

    const rows = await queryRunner.query(
      "SELECT id, tenantId, templateLevelId FROM member_levels WHERE tenantId IS NOT NULL AND templateLevelId IS NOT NULL ORDER BY id"
    ) as Array<{ id: number; tenantId: number; templateLevelId: number }>;
    const reverse: LevelMapping = new Map();
    for (const row of rows) {
      if (!reverse.has(Number(row.tenantId))) reverse.set(Number(row.tenantId), new Map());
      reverse.get(Number(row.tenantId))!.set(Number(row.id), Number(row.templateLevelId));
    }

    await this.rewireRelationalReferences(queryRunner, reverse, true);
    await this.rewireAudienceReferences(queryRunner, reverse, true);
    await this.dropChangeTriggers(queryRunner);
    if (await queryRunner.hasTable("member_level_changes")) await queryRunner.dropTable("member_level_changes", true);
    if (await queryRunner.hasColumn("member_profiles", "levelSnapshot")) await queryRunner.dropColumn("member_profiles", "levelSnapshot");

    await queryRunner.query("DELETE FROM member_levels WHERE tenantId IS NOT NULL AND templateLevelId IS NOT NULL");
    const table = await queryRunner.getTable("member_levels");
    for (const indexName of ["UQ_member_levels_scope_name", "IDX_member_levels_scope_enabled_growth"]) {
      if (table?.indices.some((index) => index.name === indexName)) await queryRunner.dropIndex("member_levels", indexName);
    }
    for (const foreignKeyName of ["FK_member_levels_tenant", "FK_member_levels_template"]) {
      const current = await queryRunner.getTable("member_levels");
      const foreignKey = current?.foreignKeys.find((item) => item.name === foreignKeyName);
      if (foreignKey) await queryRunner.dropForeignKey("member_levels", foreignKey);
    }
    for (const name of ["version", "templateLevelId", "tenantScopeKey", "tenantId"]) {
      if (await queryRunner.hasColumn("member_levels", name)) await queryRunner.dropColumn("member_levels", name);
    }
  }

  private async addLevelScopeColumns(queryRunner: QueryRunner) {
    const columns = [
      new TableColumn({ name: "tenantId", type: "int", isNullable: true }),
      new TableColumn({ name: "tenantScopeKey", type: "varchar", length: "32", default: "'platform'" }),
      new TableColumn({ name: "templateLevelId", type: "int", isNullable: true }),
      new TableColumn({ name: "version", type: "int", default: 1 })
    ];
    for (const column of columns) if (!(await queryRunner.hasColumn("member_levels", column.name))) await queryRunner.addColumn("member_levels", column);
    await queryRunner.query("UPDATE member_levels SET tenantScopeKey = 'platform' WHERE tenantId IS NULL OR tenantScopeKey IS NULL OR tenantScopeKey = ''");

    let table = await queryRunner.getTable("member_levels");
    if (!table?.foreignKeys.some((item) => item.name === "FK_member_levels_tenant")) {
      await queryRunner.createForeignKey("member_levels", new TableForeignKey({ name: "FK_member_levels_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    }
    table = await queryRunner.getTable("member_levels");
    if (!table?.foreignKeys.some((item) => item.name === "FK_member_levels_template")) {
      await queryRunner.createForeignKey("member_levels", new TableForeignKey({ name: "FK_member_levels_template", columnNames: ["templateLevelId"], referencedTableName: "member_levels", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    }
  }

  private async addProfileSnapshot(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasColumn("member_profiles", "levelSnapshot"))) {
      await queryRunner.addColumn("member_profiles", new TableColumn({ name: "levelSnapshot", type: "json", isNullable: true }));
    }
  }

  private async ensureLevelIndexes(queryRunner: QueryRunner) {
    let table = await queryRunner.getTable("member_levels");
    if (!table?.indices.some((index) => index.name === "UQ_member_levels_scope_name")) {
      await queryRunner.createIndex("member_levels", new TableIndex({ name: "UQ_member_levels_scope_name", columnNames: ["tenantScopeKey", "name"], isUnique: true }));
    }
    table = await queryRunner.getTable("member_levels");
    if (!table?.indices.some((index) => index.name === "IDX_member_levels_scope_enabled_growth")) {
      await queryRunner.createIndex("member_levels", new TableIndex({ name: "IDX_member_levels_scope_enabled_growth", columnNames: ["tenantScopeKey", "enabled", "minGrowth"] }));
    }
  }

  private async cloneTenantLevels(queryRunner: QueryRunner) {
    const tenants = await queryRunner.query("SELECT id FROM tenants ORDER BY id") as Array<{ id: number }>;
    const platformLevels = await queryRunner.query(
      "SELECT id, tenantId, tenantScopeKey, name, minPoints, minGrowth, validityDays, discountRate, priorityBooking, benefits, enabled, sortOrder, createdAt, updatedAt FROM member_levels WHERE tenantId IS NULL ORDER BY sortOrder, minGrowth, id"
    ) as LevelRow[];
    const levelsById = new Map(platformLevels.map((row) => [Number(row.id), row]));
    const baseTemplateIds = [1, 2, 3].filter((id) => levelsById.has(id));
    if (!baseTemplateIds.length && platformLevels.length) baseTemplateIds.push(Number(platformLevels[0].id));

    const requested = new Map<number, Set<number>>();
    for (const tenant of tenants) requested.set(Number(tenant.id), new Set(baseTemplateIds));
    const relationalQueries = [
      "SELECT tenantId, levelId AS levelId FROM member_profiles WHERE tenantId IS NOT NULL AND levelId IS NOT NULL",
      "SELECT tenantId, minMemberLevelId AS levelId FROM activities WHERE tenantId IS NOT NULL AND minMemberLevelId IS NOT NULL",
      "SELECT tenantId, priorityMemberLevelId AS levelId FROM activities WHERE tenantId IS NOT NULL AND priorityMemberLevelId IS NOT NULL",
      "SELECT tenantId, requiredMemberLevelId AS levelId FROM courses WHERE tenantId IS NOT NULL AND requiredMemberLevelId IS NOT NULL",
      "SELECT tenantId, memberLevelId AS levelId FROM orders WHERE tenantId IS NOT NULL AND memberLevelId IS NOT NULL"
    ];
    for (const sql of relationalQueries) {
      const rows = await queryRunner.query(sql) as Array<{ tenantId: number; levelId: number }>;
      for (const row of rows) if (levelsById.has(Number(row.levelId))) requested.get(Number(row.tenantId))?.add(Number(row.levelId));
    }
    for (const table of audienceTables) {
      if (!(await queryRunner.hasTable(table))) continue;
      const rows = await queryRunner.query(`SELECT tenantId, audience FROM \`${table}\` WHERE tenantId IS NOT NULL AND audience IS NOT NULL`) as Array<{ tenantId: number; audience: unknown }>;
      for (const row of rows) {
        for (const levelId of audienceLevelIds(row.audience)) if (levelsById.has(levelId)) requested.get(Number(row.tenantId))?.add(levelId);
      }
    }

    const mapping: LevelMapping = new Map();
    for (const tenant of tenants) {
      const tenantId = Number(tenant.id);
      const tenantMap = new Map<number, number>();
      mapping.set(tenantId, tenantMap);
      const existing = await queryRunner.query(
        "SELECT id, templateLevelId FROM member_levels WHERE tenantId = ? AND templateLevelId IS NOT NULL",
        [tenantId]
      ) as Array<{ id: number; templateLevelId: number }>;
      for (const row of existing) tenantMap.set(Number(row.templateLevelId), Number(row.id));

      for (const templateId of requested.get(tenantId) || []) {
        if (tenantMap.has(templateId)) continue;
        const template = levelsById.get(templateId);
        if (!template) continue;
        const result: any = await queryRunner.query(
          "INSERT INTO member_levels (tenantId, tenantScopeKey, templateLevelId, version, name, minPoints, minGrowth, validityDays, discountRate, priorityBooking, benefits, enabled, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [tenantId, tenantScopeKey(tenantId), templateId, template.name, template.minPoints, template.minGrowth, template.validityDays, template.discountRate, template.priorityBooking, template.benefits == null ? null : typeof template.benefits === "string" ? template.benefits : JSON.stringify(template.benefits), template.enabled, template.sortOrder, template.createdAt, template.updatedAt]
        );
        tenantMap.set(templateId, Number(result.insertId));
      }
    }
    return mapping;
  }

  private async rewireRelationalReferences(queryRunner: QueryRunner, mapping: LevelMapping, reverse: boolean) {
    const targets = [
      ["member_profiles", "levelId"],
      ["activities", "minMemberLevelId"],
      ["activities", "priorityMemberLevelId"],
      ["courses", "requiredMemberLevelId"],
      ["orders", "memberLevelId"]
    ] as const;
    for (const [tenantId, tenantMap] of mapping) {
      for (const [fromId, toId] of tenantMap) {
        for (const [table, column] of targets) {
          if (!(await queryRunner.hasTable(table)) || !(await queryRunner.hasColumn(table, column))) continue;
          await queryRunner.query(`UPDATE \`${table}\` SET \`${column}\` = ? WHERE tenantId = ? AND \`${column}\` = ?`, [toId, tenantId, fromId]);
        }
      }
    }
    if (!reverse) return;
  }

  private async rewireAudienceReferences(queryRunner: QueryRunner, mapping: LevelMapping, _reverse: boolean) {
    for (const table of audienceTables) {
      if (!(await queryRunner.hasTable(table))) continue;
      const rows = await queryRunner.query(`SELECT id, tenantId, audience FROM \`${table}\` WHERE tenantId IS NOT NULL AND audience IS NOT NULL`) as Array<{ id: number; tenantId: number; audience: unknown }>;
      for (const row of rows) {
        const tenantMap = mapping.get(Number(row.tenantId));
        if (!tenantMap?.size) continue;
        const next = replaceAudienceLevelIds(row.audience, tenantMap);
        if (next) await queryRunner.query(`UPDATE \`${table}\` SET audience = ? WHERE id = ?`, [JSON.stringify(next), row.id]);
      }
    }
  }

  private async backfillProfileSnapshots(queryRunner: QueryRunner) {
    await queryRunner.query(`
      UPDATE member_profiles profile
      LEFT JOIN member_levels level ON level.id = profile.levelId
      SET profile.levelSnapshot = CASE WHEN level.id IS NULL THEN NULL ELSE JSON_OBJECT(
        'id', level.id,
        'name', level.name,
        'minPoints', level.minPoints,
        'minGrowth', level.minGrowth,
        'validityDays', level.validityDays,
        'discountRate', level.discountRate,
        'priorityBooking', level.priorityBooking,
        'benefits', COALESCE(level.benefits, JSON_ARRAY()),
        'tenantScopeKey', level.tenantScopeKey,
        'version', level.version
      ) END
    `);
  }

  private async createChangeTable(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("member_level_changes")) return;
    await queryRunner.createTable(new Table({
      name: "member_level_changes",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
        { name: "tenantId", type: "int", isNullable: true },
        { name: "tenantScopeKey", type: "varchar", length: "32", default: "'platform'" },
        { name: "memberProfileId", type: "int" },
        { name: "userId", type: "int" },
        { name: "fromLevelId", type: "int", isNullable: true },
        { name: "toLevelId", type: "int", isNullable: true },
        { name: "source", type: "varchar", length: "32" },
        { name: "reason", type: "varchar", length: "255", isNullable: true },
        { name: "operatorAdminId", type: "int", isNullable: true },
        { name: "growthValue", type: "int", default: 0 },
        { name: "levelStartedAt", type: "datetime", isNullable: true },
        { name: "levelExpiresAt", type: "datetime", isNullable: true },
        { name: "benefitSnapshot", type: "json", isNullable: true },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
      ],
      foreignKeys: [
        { name: "FK_member_level_changes_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_member_level_changes_profile", columnNames: ["memberProfileId"], referencedTableName: "member_profiles", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_member_level_changes_user", columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_member_level_changes_from", columnNames: ["fromLevelId"], referencedTableName: "member_levels", referencedColumnNames: ["id"], onDelete: "SET NULL" },
        { name: "FK_member_level_changes_to", columnNames: ["toLevelId"], referencedTableName: "member_levels", referencedColumnNames: ["id"], onDelete: "SET NULL" },
        { name: "FK_member_level_changes_admin", columnNames: ["operatorAdminId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }
      ],
      indices: [
        { name: "IDX_member_level_changes_scope_user_created", columnNames: ["tenantScopeKey", "userId", "createdAt"] },
        { name: "IDX_member_level_changes_profile_created", columnNames: ["memberProfileId", "createdAt"] }
      ]
    }), true);
  }

  private async backfillChangeHistory(queryRunner: QueryRunner) {
    await queryRunner.query(`
      INSERT INTO member_level_changes (
        tenantId, tenantScopeKey, memberProfileId, userId, fromLevelId, toLevelId, source, reason,
        operatorAdminId, growthValue, levelStartedAt, levelExpiresAt, benefitSnapshot, createdAt
      )
      SELECT profile.tenantId, profile.tenantScopeKey, profile.id, profile.userId, NULL, profile.levelId,
        'migration_baseline', '会员等级租户化迁移基线', NULL, profile.growthValue,
        profile.levelStartedAt, profile.levelExpiresAt, profile.levelSnapshot, profile.createdAt
      FROM member_profiles profile
      WHERE profile.levelId IS NOT NULL
    `);
  }

  private async createChangeTriggers(queryRunner: QueryRunner) {
    await this.dropChangeTriggers(queryRunner);
    await queryRunner.query(`
      CREATE TRIGGER TRG_member_profiles_level_change
      AFTER UPDATE ON member_profiles
      FOR EACH ROW
      BEGIN
        IF NOT (OLD.levelId <=> NEW.levelId) THEN
          INSERT INTO member_level_changes (
            tenantId, tenantScopeKey, memberProfileId, userId, fromLevelId, toLevelId, source, reason,
            operatorAdminId, growthValue, levelStartedAt, levelExpiresAt, benefitSnapshot, createdAt
          ) VALUES (
            NEW.tenantId, NEW.tenantScopeKey, NEW.id, NEW.userId, OLD.levelId, NEW.levelId,
            COALESCE(NULLIF(@member_level_source, ''), NULLIF(NEW.levelSource, ''), 'profile_update'),
            NULLIF(@member_level_reason, ''), @member_level_operator_admin_id, NEW.growthValue,
            NEW.levelStartedAt, NEW.levelExpiresAt, NEW.levelSnapshot, CURRENT_TIMESTAMP
          );
        END IF;
      END
    `);
    await queryRunner.query(`
      CREATE TRIGGER TRG_member_level_changes_no_update
      BEFORE UPDATE ON member_level_changes
      FOR EACH ROW
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Member level history is immutable'
    `);
    await queryRunner.query(`
      CREATE TRIGGER TRG_member_level_changes_no_delete
      BEFORE DELETE ON member_level_changes
      FOR EACH ROW
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Member level history is immutable'
    `);
  }

  private async dropChangeTriggers(queryRunner: QueryRunner) {
    for (const trigger of ["TRG_member_profiles_level_change", "TRG_member_level_changes_no_update", "TRG_member_level_changes_no_delete"]) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS \`${trigger}\``);
    }
  }
}
