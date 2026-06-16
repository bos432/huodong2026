import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from "typeorm";

export class NotificationDeliveryAndSchedules1780490000000 implements MigrationInterface {
  name = "NotificationDeliveryAndSchedules1780490000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(queryRunner, "notifications", new TableColumn({ name: "provider", type: "varchar", length: "80", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "notifications", new TableColumn({ name: "providerMessageId", type: "varchar", length: "120", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "notifications", new TableColumn({ name: "errorMessage", type: "varchar", length: "500", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "notifications", new TableColumn({ name: "retryCount", type: "int", default: 0 }));
    await this.addColumnIfMissing(queryRunner, "notifications", new TableColumn({ name: "sentAt", type: "datetime", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "notifications", new TableColumn({ name: "failedAt", type: "datetime", isNullable: true }));

    if (!(await queryRunner.hasTable("notification_schedules"))) {
      await queryRunner.createTable(
        new Table({
          name: "notification_schedules",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "activityId", type: "int", isNullable: true },
            { name: "templateId", type: "int", isNullable: true },
            { name: "name", type: "varchar", length: "80" },
            { name: "channel", type: "varchar", length: "40", default: "'site'" },
            { name: "beforeHours", type: "int", default: 24 },
            { name: "enabled", type: "tinyint", default: 1 },
            { name: "title", type: "varchar", length: "160", isNullable: true },
            { name: "content", type: "text", isNullable: true },
            { name: "remark", type: "varchar", length: "255", isNullable: true },
            { name: "lastRunAt", type: "datetime", isNullable: true },
            { name: "lastSentCount", type: "int", default: 0 },
            { name: "lastFailedCount", type: "int", default: 0 },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
            { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createForeignKeys("notification_schedules", [
        new TableForeignKey({ columnNames: ["activityId"], referencedTableName: "activities", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ columnNames: ["templateId"], referencedTableName: "notification_templates", referencedColumnNames: ["id"], onDelete: "SET NULL" })
      ]);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("notification_schedules")) await queryRunner.dropTable("notification_schedules");
    await this.dropColumnIfExists(queryRunner, "notifications", "failedAt");
    await this.dropColumnIfExists(queryRunner, "notifications", "sentAt");
    await this.dropColumnIfExists(queryRunner, "notifications", "retryCount");
    await this.dropColumnIfExists(queryRunner, "notifications", "errorMessage");
    await this.dropColumnIfExists(queryRunner, "notifications", "providerMessageId");
    await this.dropColumnIfExists(queryRunner, "notifications", "provider");
  }

  private async addColumnIfMissing(queryRunner: QueryRunner, tableName: string, column: TableColumn) {
    if (!(await queryRunner.hasColumn(tableName, column.name))) await queryRunner.addColumn(tableName, column);
  }

  private async dropColumnIfExists(queryRunner: QueryRunner, tableName: string, columnName: string) {
    if (await queryRunner.hasColumn(tableName, columnName)) await queryRunner.dropColumn(tableName, columnName);
  }
}
