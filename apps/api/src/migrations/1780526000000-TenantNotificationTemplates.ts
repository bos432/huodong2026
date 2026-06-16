import { MigrationInterface, QueryRunner, TableForeignKey, TableIndex } from "typeorm";

export class TenantNotificationTemplates1780526000000 implements MigrationInterface {
  name = "TenantNotificationTemplates1780526000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("notification_templates"))) return;
    if (!(await queryRunner.hasColumn("notification_templates", "tenantId"))) {
      await queryRunner.query("ALTER TABLE notification_templates ADD tenantId int NULL");
    }
    await this.addTenantIndex(queryRunner);
    await this.addTenantForeignKey(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("notification_templates")) || !(await queryRunner.hasColumn("notification_templates", "tenantId"))) return;
    const table = await queryRunner.getTable("notification_templates");
    const foreignKey = table?.foreignKeys.find((key) => key.columnNames.includes("tenantId"));
    if (foreignKey) await queryRunner.dropForeignKey("notification_templates", foreignKey);
    const index = table?.indices.find((item) => item.name === "IDX_notification_templates_tenantId");
    if (index) await queryRunner.dropIndex("notification_templates", index);
    await queryRunner.dropColumn("notification_templates", "tenantId");
  }

  private async addTenantIndex(queryRunner: QueryRunner) {
    const table = await queryRunner.getTable("notification_templates");
    if (table?.indices.some((index) => index.name === "IDX_notification_templates_tenantId")) return;
    await queryRunner.createIndex("notification_templates", new TableIndex({ name: "IDX_notification_templates_tenantId", columnNames: ["tenantId"] }));
  }

  private async addTenantForeignKey(queryRunner: QueryRunner) {
    const table = await queryRunner.getTable("notification_templates");
    if (table?.foreignKeys.some((key) => key.columnNames.includes("tenantId"))) return;
    await queryRunner.createForeignKey(
      "notification_templates",
      new TableForeignKey({
        columnNames: ["tenantId"],
        referencedTableName: "tenants",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL"
      })
    );
  }
}
