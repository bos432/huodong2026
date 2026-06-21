import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class OperationSettingLaunchConfig1781960000000 implements MigrationInterface {
  name = "OperationSettingLaunchConfig1781960000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = "operation_settings";
    if (!(await queryRunner.hasTable(table))) return;
    if (!(await queryRunner.hasColumn(table, "launchConfig"))) {
      await queryRunner.addColumn(table, new TableColumn({ name: "launchConfig", type: "json", isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = "operation_settings";
    if (!(await queryRunner.hasTable(table))) return;
    if (await queryRunner.hasColumn(table, "launchConfig")) {
      await queryRunner.dropColumn(table, "launchConfig");
    }
  }
}
