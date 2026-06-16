import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class AdminLoginLogTenant1780524000000 implements MigrationInterface {
  name = "AdminLoginLogTenant1780524000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("admin_login_logs"))) return;
    if (!(await queryRunner.hasColumn("admin_login_logs", "tenantId"))) {
      await queryRunner.query("ALTER TABLE admin_login_logs ADD tenantId int NULL");
    }
    await queryRunner.query("UPDATE admin_login_logs log LEFT JOIN admin_users admin ON admin.id = log.adminId SET log.tenantId = admin.tenantId WHERE log.tenantId IS NULL AND log.adminId IS NOT NULL");
    const table = await queryRunner.getTable("admin_login_logs");
    if (!table?.indices.some((index) => index.name === "IDX_admin_login_logs_tenant")) {
      await queryRunner.createIndex("admin_login_logs", new TableIndex({ name: "IDX_admin_login_logs_tenant", columnNames: ["tenantId"] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("admin_login_logs"))) return;
    const table = await queryRunner.getTable("admin_login_logs");
    const index = table?.indices.find((item) => item.name === "IDX_admin_login_logs_tenant");
    if (index) await queryRunner.dropIndex("admin_login_logs", index);
    if (await queryRunner.hasColumn("admin_login_logs", "tenantId")) await queryRunner.dropColumn("admin_login_logs", "tenantId");
  }
}
