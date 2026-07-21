import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class ExpandOperationSettingSecrets1783150000000 implements MigrationInterface {
  name = "ExpandOperationSettingSecrets1783150000000";

  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("operation_settings")) || !(await queryRunner.hasColumn("operation_settings", "smsAccessKeySecret"))) return;
    await queryRunner.changeColumn("operation_settings", "smsAccessKeySecret", new TableColumn({ name: "smsAccessKeySecret", type: "text", isNullable: true }));
  }

  async down(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("operation_settings")) || !(await queryRunner.hasColumn("operation_settings", "smsAccessKeySecret"))) return;
    await queryRunner.changeColumn("operation_settings", "smsAccessKeySecret", new TableColumn({ name: "smsAccessKeySecret", type: "varchar", length: "200", isNullable: true }));
  }
}
