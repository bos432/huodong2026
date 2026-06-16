import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class OperationPageTheme1780511000000 implements MigrationInterface {
  name = "OperationPageTheme1780511000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("operation_settings"))) return;
    if (await queryRunner.hasColumn("operation_settings", "pageTheme")) return;
    await queryRunner.addColumn("operation_settings", new TableColumn({ name: "pageTheme", type: "json", isNullable: true }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("operation_settings"))) return;
    if (await queryRunner.hasColumn("operation_settings", "pageTheme")) await queryRunner.dropColumn("operation_settings", "pageTheme");
  }
}
