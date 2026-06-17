import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class MiniprogramReleaseManagement1780910000000 implements MigrationInterface {
  name = "MiniprogramReleaseManagement1780910000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("miniprogram_release_settings"))) {
      await queryRunner.createTable(new Table({
        name: "miniprogram_release_settings",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "appId", type: "varchar", length: "80" },
          { name: "appSecret", type: "varchar", length: "255", isNullable: true },
          { name: "privateKey", type: "text", isNullable: true },
          { name: "version", type: "varchar", length: "40", isNullable: true },
          { name: "description", type: "varchar", length: "500", isNullable: true },
          { name: "projectPath", type: "varchar", length: "255", isNullable: true },
          { name: "auditItem", type: "json", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      }));
    }

    if (!(await queryRunner.hasTable("miniprogram_release_logs"))) {
      await queryRunner.createTable(new Table({
        name: "miniprogram_release_logs",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "action", type: "varchar", length: "40" },
          { name: "status", type: "varchar", length: "40" },
          { name: "appId", type: "varchar", length: "80", isNullable: true },
          { name: "version", type: "varchar", length: "40", isNullable: true },
          { name: "description", type: "varchar", length: "500", isNullable: true },
          { name: "qrCodeUrl", type: "varchar", length: "500", isNullable: true },
          { name: "auditId", type: "varchar", length: "80", isNullable: true },
          { name: "errorMessage", type: "varchar", length: "500", isNullable: true },
          { name: "detail", type: "json", isNullable: true },
          { name: "adminId", type: "int", isNullable: true },
          { name: "adminUsername", type: "varchar", length: "100", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      }));
      await queryRunner.createIndex("miniprogram_release_logs", new TableIndex({ name: "IDX_miniprogram_release_logs_created", columnNames: ["createdAt"] }));
      await queryRunner.createIndex("miniprogram_release_logs", new TableIndex({ name: "IDX_miniprogram_release_logs_action", columnNames: ["action"] }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("miniprogram_release_logs")) await queryRunner.dropTable("miniprogram_release_logs");
    if (await queryRunner.hasTable("miniprogram_release_settings")) await queryRunner.dropTable("miniprogram_release_settings");
  }
}
