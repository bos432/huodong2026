import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AutomaticSmsSettings1784010000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("operation_settings"))) return;
    if (!(await queryRunner.hasColumn("operation_settings", "automaticSms"))) {
      await queryRunner.addColumn("operation_settings", new TableColumn({ name: "automaticSms", type: "json", isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("operation_settings", "automaticSms")) {
      await queryRunner.dropColumn("operation_settings", "automaticSms");
    }
  }
}
