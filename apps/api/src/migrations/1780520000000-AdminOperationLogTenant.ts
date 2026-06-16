import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class AdminOperationLogTenant1780520000000 implements MigrationInterface {
  name = "AdminOperationLogTenant1780520000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("admin_operation_logs"))) return;
    if (!(await queryRunner.hasColumn("admin_operation_logs", "tenantId"))) {
      await queryRunner.query("ALTER TABLE admin_operation_logs ADD tenantId int NULL");
    }
    const table = await queryRunner.getTable("admin_operation_logs");
    if (!table?.indices.some((index) => index.name === "IDX_admin_operation_logs_tenant")) {
      await queryRunner.createIndex("admin_operation_logs", new TableIndex({ name: "IDX_admin_operation_logs_tenant", columnNames: ["tenantId"] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("admin_operation_logs"))) return;
    const table = await queryRunner.getTable("admin_operation_logs");
    const index = table?.indices.find((item) => item.name === "IDX_admin_operation_logs_tenant");
    if (index) await queryRunner.dropIndex("admin_operation_logs", index);
    if (await queryRunner.hasColumn("admin_operation_logs", "tenantId")) await queryRunner.dropColumn("admin_operation_logs", "tenantId");
  }
}
