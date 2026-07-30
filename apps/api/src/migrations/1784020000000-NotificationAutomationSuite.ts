import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class NotificationAutomationSuite1784020000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumn(queryRunner, "notifications", new TableColumn({ name: "scene", type: "varchar", length: "64", isNullable: true }));
    await this.addColumn(queryRunner, "notifications", new TableColumn({ name: "providerTemplateId", type: "varchar", length: "120", isNullable: true }));
    await this.addColumn(queryRunner, "notifications", new TableColumn({ name: "templateVersion", type: "int", isNullable: true }));
    await this.addColumn(queryRunner, "notifications", new TableColumn({ name: "deliveryOptions", type: "json", isNullable: true }));

    await this.addColumn(queryRunner, "notification_templates", new TableColumn({ name: "scene", type: "varchar", length: "64", isNullable: true }));
    await this.addColumn(queryRunner, "notification_templates", new TableColumn({ name: "providerTemplateId", type: "varchar", length: "120", isNullable: true }));
    await this.addColumn(queryRunner, "notification_templates", new TableColumn({ name: "approvalStatus", type: "varchar", length: "20", default: "'draft'" }));
    await this.addColumn(queryRunner, "notification_templates", new TableColumn({ name: "version", type: "int", default: 1 }));
    await this.addColumn(queryRunner, "notification_templates", new TableColumn({ name: "dataKeys", type: "json", isNullable: true }));
    await this.addColumn(queryRunner, "notification_templates", new TableColumn({ name: "page", type: "varchar", length: "240", isNullable: true }));
    await this.addColumn(queryRunner, "notification_templates", new TableColumn({ name: "versionHistory", type: "json", isNullable: true }));

    await this.addColumn(queryRunner, "operation_settings", new TableColumn({ name: "automaticWechat", type: "json", isNullable: true }));
    await this.addColumn(queryRunner, "operation_settings", new TableColumn({ name: "postEventAutomation", type: "json", isNullable: true }));

    if (!(await queryRunner.hasTable("wechat_subscription_grants"))) {
      await queryRunner.createTable(new Table({
        name: "wechat_subscription_grants",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "userId", type: "int" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "tenantScopeKey", type: "varchar", length: "32", default: "'platform'" },
          { name: "scene", type: "varchar", length: "64" },
          { name: "templateId", type: "varchar", length: "120" },
          { name: "status", type: "varchar", length: "20" },
          { name: "source", type: "varchar", length: "40", default: "'mp_weixin'" },
          { name: "acceptedAt", type: "datetime", isNullable: true },
          { name: "consumedAt", type: "datetime", isNullable: true },
          { name: "reservedAt", type: "datetime", isNullable: true },
          { name: "reservedBusinessKey", type: "varchar", length: "160", isNullable: true },
          { name: "consumedByNotificationId", type: "int", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      }));
      await queryRunner.createForeignKeys("wechat_subscription_grants", [
        new TableForeignKey({ columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" })
      ]);
      await queryRunner.createIndex("wechat_subscription_grants", new TableIndex({
        name: "IDX_wechat_subscription_grants_available",
        columnNames: ["userId", "tenantScopeKey", "scene", "templateId", "status", "consumedAt"]
      }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("wechat_subscription_grants")) await queryRunner.dropTable("wechat_subscription_grants");
    for (const column of ["postEventAutomation", "automaticWechat"]) await this.dropColumn(queryRunner, "operation_settings", column);
    for (const column of ["versionHistory", "page", "dataKeys", "version", "approvalStatus", "providerTemplateId", "scene"]) await this.dropColumn(queryRunner, "notification_templates", column);
    for (const column of ["deliveryOptions", "templateVersion", "providerTemplateId", "scene"]) await this.dropColumn(queryRunner, "notifications", column);
  }

  private async addColumn(queryRunner: QueryRunner, table: string, column: TableColumn) {
    if (await queryRunner.hasTable(table) && !(await queryRunner.hasColumn(table, column.name))) await queryRunner.addColumn(table, column);
  }

  private async dropColumn(queryRunner: QueryRunner, table: string, column: string) {
    if (await queryRunner.hasTable(table) && await queryRunner.hasColumn(table, column)) await queryRunner.dropColumn(table, column);
  }
}
