import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from "typeorm";

async function uniqueIndexNames(queryRunner: QueryRunner, tableName: string, columns: string[]) {
  return queryRunner.query(
    "SELECT INDEX_NAME AS name FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY' GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') = ?",
    [tableName, columns.join(",")]
  ) as Promise<Array<{ name: string }>>;
}

async function dropUniqueIndexes(queryRunner: QueryRunner, tableName: string, columns: string[]) {
  for (const row of await uniqueIndexNames(queryRunner, tableName, columns)) {
    await queryRunner.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${String(row.name).replace(/`/g, "``")}\``);
  }
}

export class TenantMemberGrowth1783360000000 implements MigrationInterface {
  name = "TenantMemberGrowth1783360000000";
  async up(queryRunner: QueryRunner) {
    for (const column of [new TableColumn({ name: "minGrowth", type: "int", default: 0 }), new TableColumn({ name: "validityDays", type: "int", isNullable: true }), new TableColumn({ name: "benefits", type: "json", isNullable: true })]) if (!(await queryRunner.hasColumn("member_levels", column.name))) await queryRunner.addColumn("member_levels", column);
    await queryRunner.query("UPDATE member_levels SET minGrowth = minPoints WHERE minGrowth = 0");
    for (const column of [new TableColumn({ name: "tenantId", type: "int", isNullable: true }), new TableColumn({ name: "tenantScopeKey", type: "varchar", length: "32", default: "'platform'" }), new TableColumn({ name: "growthValue", type: "int", default: 0 }), new TableColumn({ name: "growthCycleStartedAt", type: "datetime", isNullable: true }), new TableColumn({ name: "levelStartedAt", type: "datetime", isNullable: true }), new TableColumn({ name: "levelExpiresAt", type: "datetime", isNullable: true }), new TableColumn({ name: "levelSource", type: "varchar", length: "32", default: "'growth'" })]) if (!(await queryRunner.hasColumn("member_profiles", column.name))) await queryRunner.addColumn("member_profiles", column);
    await queryRunner.query("UPDATE member_profiles SET tenantScopeKey = 'platform', growthValue = GREATEST(points, 0), levelStartedAt = COALESCE(levelStartedAt, createdAt)");
    let profileTable = await queryRunner.getTable("member_profiles");
    if (!profileTable?.indices.some(index => index.name === "IDX_member_profiles_user_fk")) await queryRunner.createIndex("member_profiles", new TableIndex({ name: "IDX_member_profiles_user_fk", columnNames: ["userId"] }));
    await dropUniqueIndexes(queryRunner, "member_profiles", ["userId"]);
    if (!profileTable?.foreignKeys.some(item => item.columnNames.includes("tenantId"))) await queryRunner.createForeignKey("member_profiles", new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    profileTable = await queryRunner.getTable("member_profiles");
    if (!profileTable?.indices.some(index => index.name === "UQ_member_profile_user_scope")) await queryRunner.createIndex("member_profiles", new TableIndex({ name: "UQ_member_profile_user_scope", columnNames: ["userId", "tenantScopeKey"], isUnique: true }));
    if (!profileTable?.indices.some(index => index.name === "IDX_member_profile_tenant_growth")) await queryRunner.createIndex("member_profiles", new TableIndex({ name: "IDX_member_profile_tenant_growth", columnNames: ["tenantId", "growthValue"] }));
    for (const column of [new TableColumn({ name: "tenantId", type: "int", isNullable: true }), new TableColumn({ name: "tenantScopeKey", type: "varchar", length: "32", default: "'platform'" }), new TableColumn({ name: "growthValue", type: "int", default: 0 }), new TableColumn({ name: "expiresAt", type: "datetime", isNullable: true }), new TableColumn({ name: "expiryProcessedAt", type: "datetime", isNullable: true }), new TableColumn({ name: "reversedAt", type: "datetime", isNullable: true })]) if (!(await queryRunner.hasColumn("member_point_logs", column.name))) await queryRunner.addColumn("member_point_logs", column);
    await queryRunner.query("UPDATE member_point_logs SET tenantScopeKey = 'platform', growthValue = CASE WHEN points > 0 AND sourceType <> 'points_return' THEN points ELSE 0 END");
    const pointTable = await queryRunner.getTable("member_point_logs");
    if (!pointTable?.foreignKeys.some(item => item.columnNames.includes("tenantId"))) await queryRunner.createForeignKey("member_point_logs", new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    if (!pointTable?.indices.some(index => index.name === "IDX_member_points_scope_user_created")) await queryRunner.createIndex("member_point_logs", new TableIndex({ name: "IDX_member_points_scope_user_created", columnNames: ["tenantScopeKey", "userId", "createdAt"] }));
  }
  async down(queryRunner: QueryRunner) {
    await queryRunner.query("DELETE FROM member_profiles WHERE tenantId IS NOT NULL");
    await dropUniqueIndexes(queryRunner, "member_profiles", ["userId", "tenantScopeKey"]);
    for (const tableName of ["member_point_logs", "member_profiles"]) {
      const table = await queryRunner.getTable(tableName);
      for (const foreignKey of table?.foreignKeys.filter(item => item.columnNames.includes("tenantId")) || []) await queryRunner.dropForeignKey(tableName, foreignKey);
      for (const index of table?.indices.filter(item => item.name === "IDX_member_points_scope_user_created" || item.name === "IDX_member_profile_tenant_growth") || []) await queryRunner.dropIndex(tableName, index);
    }
    for (const name of ["reversedAt", "expiryProcessedAt", "expiresAt", "growthValue", "tenantScopeKey", "tenantId"]) if (await queryRunner.hasColumn("member_point_logs", name)) await queryRunner.dropColumn("member_point_logs", name);
    for (const name of ["levelSource", "levelExpiresAt", "levelStartedAt", "growthCycleStartedAt", "growthValue", "tenantScopeKey", "tenantId"]) if (await queryRunner.hasColumn("member_profiles", name)) await queryRunner.dropColumn("member_profiles", name);
    if (!(await uniqueIndexNames(queryRunner, "member_profiles", ["userId"])).length) await queryRunner.createIndex("member_profiles", new TableIndex({ name: "UQ_member_profiles_user", columnNames: ["userId"], isUnique: true }));
    const legacyProfile = await queryRunner.getTable("member_profiles");
    if (legacyProfile?.indices.some(index => index.name === "IDX_member_profiles_user_fk")) await queryRunner.dropIndex("member_profiles", "IDX_member_profiles_user_fk");
    for (const name of ["benefits", "validityDays", "minGrowth"]) if (await queryRunner.hasColumn("member_levels", name)) await queryRunner.dropColumn("member_levels", name);
  }
}
