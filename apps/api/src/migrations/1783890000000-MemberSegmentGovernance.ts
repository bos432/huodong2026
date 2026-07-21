import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from "typeorm";

async function dropIndexIfPresent(queryRunner: QueryRunner, tableName: string, indexName: string) {
  const table = await queryRunner.getTable(tableName);
  if (table?.indices.some((index) => index.name === indexName)) await queryRunner.dropIndex(tableName, indexName);
}

async function addScopeColumn(queryRunner: QueryRunner, tableName: string) {
  if (!(await queryRunner.hasColumn(tableName, "tenantScopeKey"))) {
    await queryRunner.addColumn(tableName, new TableColumn({ name: "tenantScopeKey", type: "varchar", length: "64", isNullable: false, default: "'platform'" }));
  }
  await queryRunner.query(`UPDATE \`${tableName}\` SET tenantScopeKey = IF(tenantId IS NULL, 'platform', CONCAT('tenant:', tenantId))`);
}

export class MemberSegmentGovernance1783890000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner) {
    await addScopeColumn(queryRunner, "user_tags");
    await addScopeColumn(queryRunner, "member_segments");
    await addScopeColumn(queryRunner, "member_segment_snapshots");

    const duplicateTag = await queryRunner.query("SELECT tenantScopeKey, userId, name, COUNT(*) total FROM user_tags GROUP BY tenantScopeKey, userId, name HAVING total > 1 LIMIT 1") as Array<Record<string, unknown>>;
    if (duplicateTag.length) throw new Error(`Duplicate user tag blocks governance migration: ${JSON.stringify(duplicateTag[0])}`);
    const duplicateSegment = await queryRunner.query("SELECT tenantScopeKey, name, COUNT(*) total FROM member_segments GROUP BY tenantScopeKey, name HAVING total > 1 LIMIT 1") as Array<Record<string, unknown>>;
    if (duplicateSegment.length) throw new Error(`Duplicate member segment blocks governance migration: ${JSON.stringify(duplicateSegment[0])}`);

    await dropIndexIfPresent(queryRunner, "user_tags", "IDX_user_tags_tenant_user_name");
    await dropIndexIfPresent(queryRunner, "member_segments", "UQ_member_segment_tenant_name");
    await queryRunner.createIndex("user_tags", new TableIndex({ name: "UQ_user_tags_scope_user_name", columnNames: ["tenantScopeKey", "userId", "name"], isUnique: true }));
    await queryRunner.createIndex("user_tags", new TableIndex({ name: "IDX_user_tags_scope_name", columnNames: ["tenantScopeKey", "name", "userId"] }));
    await queryRunner.createIndex("member_segments", new TableIndex({ name: "UQ_member_segments_scope_name", columnNames: ["tenantScopeKey", "name"], isUnique: true }));
    await queryRunner.createIndex("member_segments", new TableIndex({ name: "IDX_member_segments_scope_enabled", columnNames: ["tenantScopeKey", "enabled", "updatedAt"] }));

    const tagTable = await queryRunner.getTable("user_tags");
    for (const foreignKey of tagTable?.foreignKeys.filter((item) => item.columnNames.includes("tenantId")) || []) await queryRunner.dropForeignKey("user_tags", foreignKey);
    await queryRunner.createForeignKey("user_tags", new TableForeignKey({ name: "FK_user_tags_tenant_governed", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }));

    if (!(await queryRunner.hasColumn("member_segment_snapshots", "businessKey"))) {
      await queryRunner.addColumn("member_segment_snapshots", new TableColumn({ name: "businessKey", type: "varchar", length: "100", isNullable: true }));
      await queryRunner.query("UPDATE member_segment_snapshots SET businessKey = CONCAT('legacy:', id) WHERE businessKey IS NULL OR businessKey = ''");
      await queryRunner.changeColumn("member_segment_snapshots", "businessKey", new TableColumn({ name: "businessKey", type: "varchar", length: "100", isNullable: false }));
    }
    await queryRunner.createIndex("member_segment_snapshots", new TableIndex({ name: "UQ_member_segment_snapshot_business", columnNames: ["tenantScopeKey", "segmentId", "businessKey"], isUnique: true }));
    await queryRunner.createIndex("member_segment_snapshots", new TableIndex({ name: "IDX_member_segment_snapshot_scope_created", columnNames: ["tenantScopeKey", "createdAt"] }));

    await queryRunner.query(`CREATE TABLE member_behavior_tag_runs (
      id INT NOT NULL AUTO_INCREMENT,
      tenantId INT NULL,
      tenantScopeKey VARCHAR(64) NOT NULL,
      operatorAdminId INT NULL,
      operatorScopeKey VARCHAR(100) NOT NULL,
      idempotencyKey VARCHAR(100) NOT NULL,
      batchKey VARCHAR(64) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'running',
      profileCount INT NOT NULL DEFAULT 0,
      createdCount INT NOT NULL DEFAULT 0,
      deletedCount INT NOT NULL DEFAULT 0,
      retainedCount INT NOT NULL DEFAULT 0,
      definitionsSnapshot JSON NOT NULL,
      errorMessage VARCHAR(1000) NULL,
      startedAt DATETIME NULL,
      completedAt DATETIME NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY UQ_member_behavior_run_idempotency (tenantScopeKey, operatorScopeKey, idempotencyKey),
      UNIQUE KEY UQ_member_behavior_run_batch (batchKey),
      KEY IDX_member_behavior_run_scope_created (tenantScopeKey, createdAt),
      CONSTRAINT FK_member_behavior_run_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT FK_member_behavior_run_operator FOREIGN KEY (operatorAdminId) REFERENCES admin_users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`);

    await queryRunner.query("DROP TRIGGER IF EXISTS TRG_member_segment_snapshots_no_update");
    await queryRunner.query("DROP TRIGGER IF EXISTS TRG_member_segment_snapshots_no_delete");
    await queryRunner.query("DROP TRIGGER IF EXISTS TRG_member_segment_snapshot_members_no_update");
    await queryRunner.query("DROP TRIGGER IF EXISTS TRG_member_segment_snapshot_members_no_delete");
    await queryRunner.query("CREATE TRIGGER TRG_member_segment_snapshots_no_update BEFORE UPDATE ON member_segment_snapshots FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Member segment snapshots are immutable'");
    await queryRunner.query("CREATE TRIGGER TRG_member_segment_snapshots_no_delete BEFORE DELETE ON member_segment_snapshots FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Member segment snapshots are immutable'");
    await queryRunner.query("CREATE TRIGGER TRG_member_segment_snapshot_members_no_update BEFORE UPDATE ON member_segment_snapshot_members FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Member segment snapshot members are immutable'");
    await queryRunner.query("CREATE TRIGGER TRG_member_segment_snapshot_members_no_delete BEFORE DELETE ON member_segment_snapshot_members FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Member segment snapshot members are immutable'");
  }

  async down(queryRunner: QueryRunner) {
    for (const trigger of ["TRG_member_segment_snapshot_members_no_delete", "TRG_member_segment_snapshot_members_no_update", "TRG_member_segment_snapshots_no_delete", "TRG_member_segment_snapshots_no_update"]) await queryRunner.query(`DROP TRIGGER IF EXISTS ${trigger}`);
    if (await queryRunner.hasTable("member_behavior_tag_runs")) await queryRunner.dropTable("member_behavior_tag_runs", true);

    for (const index of ["UQ_member_segment_snapshot_business", "IDX_member_segment_snapshot_scope_created"]) await dropIndexIfPresent(queryRunner, "member_segment_snapshots", index);
    if (await queryRunner.hasColumn("member_segment_snapshots", "businessKey")) await queryRunner.dropColumn("member_segment_snapshots", "businessKey");
    for (const index of ["UQ_member_segments_scope_name", "IDX_member_segments_scope_enabled"]) await dropIndexIfPresent(queryRunner, "member_segments", index);
    for (const index of ["UQ_user_tags_scope_user_name", "IDX_user_tags_scope_name"]) await dropIndexIfPresent(queryRunner, "user_tags", index);

    const tagTable = await queryRunner.getTable("user_tags");
    for (const foreignKey of tagTable?.foreignKeys.filter((item) => item.columnNames.includes("tenantId")) || []) await queryRunner.dropForeignKey("user_tags", foreignKey);
    await queryRunner.createForeignKey("user_tags", new TableForeignKey({ name: "FK_user_tags_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    await queryRunner.createIndex("user_tags", new TableIndex({ name: "IDX_user_tags_tenant_user_name", columnNames: ["tenantId", "userId", "name"], isUnique: true }));
    await queryRunner.createIndex("member_segments", new TableIndex({ name: "UQ_member_segment_tenant_name", columnNames: ["tenantId", "name"], isUnique: true }));
    for (const tableName of ["member_segment_snapshots", "member_segments", "user_tags"]) if (await queryRunner.hasColumn(tableName, "tenantScopeKey")) await queryRunner.dropColumn(tableName, "tenantScopeKey");
  }
}
