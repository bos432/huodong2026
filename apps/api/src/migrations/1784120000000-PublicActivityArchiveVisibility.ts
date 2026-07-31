import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class PublicActivityArchiveVisibility1784120000000 implements MigrationInterface {
  name = "PublicActivityArchiveVisibility1784120000000";

  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("operation_settings"))) return;
    if (!(await queryRunner.hasColumn("operation_settings", "publicActivityArchiveEnabled"))) {
      await queryRunner.addColumn("operation_settings", new TableColumn({ name: "publicActivityArchiveEnabled", type: "tinyint", default: 0 }));
    }
    await queryRunner.query("UPDATE operation_settings SET publicActivityArchiveEnabled = 0 WHERE publicActivityArchiveEnabled IS NULL");
  }

  async down(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("operation_settings") && await queryRunner.hasColumn("operation_settings", "publicActivityArchiveEnabled")) {
      await queryRunner.dropColumn("operation_settings", "publicActivityArchiveEnabled");
    }
  }
}
