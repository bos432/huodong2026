import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class ActivityRecapVersions1783920000000 implements MigrationInterface {
  name = "ActivityRecapVersions1783920000000";

  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("activity_recap_versions"))) {
      await queryRunner.createTable(new Table({
        name: "activity_recap_versions",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "activityId", type: "int" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "tenantScopeKey", type: "varchar", length: "40" },
          { name: "versionNo", type: "int" },
          { name: "summary", type: "text" },
          { name: "problems", type: "json" },
          { name: "actionItems", type: "json" },
          { name: "images", type: "json" },
          { name: "metricSnapshot", type: "json" },
          { name: "createdById", type: "int", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      }));
      await queryRunner.createIndex("activity_recap_versions", new TableIndex({ name: "UQ_activity_recap_versions_activity_version", columnNames: ["activityId", "versionNo"], isUnique: true }));
      await queryRunner.createIndex("activity_recap_versions", new TableIndex({ name: "IDX_activity_recap_versions_scope_created", columnNames: ["tenantScopeKey", "createdAt"] }));
      await queryRunner.createForeignKey("activity_recap_versions", new TableForeignKey({ columnNames: ["activityId"], referencedTableName: "activities", referencedColumnNames: ["id"], onDelete: "RESTRICT" }));
      await queryRunner.createForeignKey("activity_recap_versions", new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "RESTRICT" }));
      await queryRunner.createForeignKey("activity_recap_versions", new TableForeignKey({ columnNames: ["createdById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "RESTRICT" }));
    }
    await queryRunner.query("DROP TRIGGER IF EXISTS trg_activity_recap_versions_immutable_update");
    await queryRunner.query("DROP TRIGGER IF EXISTS trg_activity_recap_versions_immutable_delete");
    await queryRunner.query(`CREATE TRIGGER trg_activity_recap_versions_immutable_update BEFORE UPDATE ON activity_recap_versions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'activity recap versions are immutable'`);
    await queryRunner.query(`CREATE TRIGGER trg_activity_recap_versions_immutable_delete BEFORE DELETE ON activity_recap_versions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'activity recap versions are immutable'`);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query("DROP TRIGGER IF EXISTS trg_activity_recap_versions_immutable_update");
    await queryRunner.query("DROP TRIGGER IF EXISTS trg_activity_recap_versions_immutable_delete");
    if (await queryRunner.hasTable("activity_recap_versions")) await queryRunner.dropTable("activity_recap_versions", true);
  }
}
