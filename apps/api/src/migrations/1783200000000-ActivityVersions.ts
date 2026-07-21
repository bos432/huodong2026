import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class ActivityVersions1783200000000 implements MigrationInterface {
  name = "ActivityVersions1783200000000";
  async up(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("activity_versions")) return;
    await queryRunner.createTable(new Table({ name: "activity_versions", columns: [
      { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
      { name: "activityId", type: "int" }, { name: "tenantId", type: "int", isNullable: true }, { name: "versionNo", type: "int" },
      { name: "source", type: "varchar", length: "24", default: "'manual_save'" }, { name: "snapshot", type: "json" },
      { name: "createdBy", type: "varchar", length: "80", isNullable: true }, { name: "remark", type: "varchar", length: "500", isNullable: true },
      { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
    ] }));
    await queryRunner.createIndex("activity_versions", new TableIndex({ name: "IDX_activity_versions_activity_version", columnNames: ["activityId", "versionNo"], isUnique: true }));
    await queryRunner.createIndex("activity_versions", new TableIndex({ name: "IDX_activity_versions_tenant_created", columnNames: ["tenantId", "createdAt"] }));
    await queryRunner.createForeignKey("activity_versions", new TableForeignKey({ columnNames: ["activityId"], referencedTableName: "activities", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createForeignKey("activity_versions", new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
  }
  async down(queryRunner: QueryRunner) { if (await queryRunner.hasTable("activity_versions")) await queryRunner.dropTable("activity_versions", true); }
}
