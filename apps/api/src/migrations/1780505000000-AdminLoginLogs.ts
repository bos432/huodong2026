import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class AdminLoginLogs1780505000000 implements MigrationInterface {
  name = "AdminLoginLogs1780505000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("admin_login_logs")) return;
    await queryRunner.createTable(
      new Table({
        name: "admin_login_logs",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "username", type: "varchar", length: "100" },
          { name: "adminId", type: "int", isNullable: true },
          { name: "clientIp", type: "varchar", length: "64", isNullable: true },
          { name: "status", type: "varchar", length: "24" },
          { name: "failureReason", type: "varchar", length: "80", isNullable: true },
          { name: "userAgent", type: "varchar", length: "255", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      })
    );
    await queryRunner.createIndex("admin_login_logs", new TableIndex({ name: "IDX_admin_login_logs_username", columnNames: ["username"] }));
    await queryRunner.createIndex("admin_login_logs", new TableIndex({ name: "IDX_admin_login_logs_client_ip", columnNames: ["clientIp"] }));
    await queryRunner.createIndex("admin_login_logs", new TableIndex({ name: "IDX_admin_login_logs_status", columnNames: ["status"] }));
    await queryRunner.createIndex("admin_login_logs", new TableIndex({ name: "IDX_admin_login_logs_created", columnNames: ["createdAt"] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("admin_login_logs")) await queryRunner.dropTable("admin_login_logs");
  }
}
