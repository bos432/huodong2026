import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class AdminOperationLogs1780503000000 implements MigrationInterface {
  name = "AdminOperationLogs1780503000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("admin_operation_logs")) return;
    await queryRunner.createTable(
      new Table({
        name: "admin_operation_logs",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "adminId", type: "int", isNullable: true },
          { name: "adminUsername", type: "varchar", length: "100", isNullable: true },
          { name: "action", type: "varchar", length: "80" },
          { name: "targetType", type: "varchar", length: "80" },
          { name: "targetId", type: "varchar", length: "80", isNullable: true },
          { name: "summary", type: "varchar", length: "255", isNullable: true },
          { name: "detail", type: "json", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      })
    );
    await queryRunner.createIndex("admin_operation_logs", new TableIndex({ name: "IDX_admin_operation_logs_created", columnNames: ["createdAt"] }));
    await queryRunner.createIndex("admin_operation_logs", new TableIndex({ name: "IDX_admin_operation_logs_action", columnNames: ["action"] }));
    await queryRunner.createIndex("admin_operation_logs", new TableIndex({ name: "IDX_admin_operation_logs_target", columnNames: ["targetType", "targetId"] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("admin_operation_logs")) await queryRunner.dropTable("admin_operation_logs");
  }
}
