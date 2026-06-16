import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class H5AuthCodeLogs1780504000000 implements MigrationInterface {
  name = "H5AuthCodeLogs1780504000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("h5_auth_code_logs")) return;
    await queryRunner.createTable(
      new Table({
        name: "h5_auth_code_logs",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "phone", type: "varchar", length: "32" },
          { name: "clientIp", type: "varchar", length: "64", isNullable: true },
          { name: "mode", type: "varchar", length: "20" },
          { name: "status", type: "varchar", length: "24" },
          { name: "provider", type: "varchar", length: "80", isNullable: true },
          { name: "providerMessageId", type: "varchar", length: "120", isNullable: true },
          { name: "message", type: "varchar", length: "255", isNullable: true },
          { name: "expiresAt", type: "datetime", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      })
    );
    await queryRunner.createIndex("h5_auth_code_logs", new TableIndex({ name: "IDX_h5_auth_code_logs_phone", columnNames: ["phone"] }));
    await queryRunner.createIndex("h5_auth_code_logs", new TableIndex({ name: "IDX_h5_auth_code_logs_client_ip", columnNames: ["clientIp"] }));
    await queryRunner.createIndex("h5_auth_code_logs", new TableIndex({ name: "IDX_h5_auth_code_logs_status", columnNames: ["status"] }));
    await queryRunner.createIndex("h5_auth_code_logs", new TableIndex({ name: "IDX_h5_auth_code_logs_created", columnNames: ["createdAt"] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("h5_auth_code_logs")) await queryRunner.dropTable("h5_auth_code_logs");
  }
}
