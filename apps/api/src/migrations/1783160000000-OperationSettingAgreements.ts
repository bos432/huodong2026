import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class OperationSettingAgreements1783160000000 implements MigrationInterface {
  name = "OperationSettingAgreements1783160000000";
  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("operation_settings"))) return;
    for (const name of ["userAgreementUrl", "privacyPolicyUrl", "merchantAgreementUrl"]) if (!(await queryRunner.hasColumn("operation_settings", name))) await queryRunner.addColumn("operation_settings", new TableColumn({ name, type: "text", isNullable: true }));
  }
  async down(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("operation_settings"))) return;
    for (const name of ["merchantAgreementUrl", "privacyPolicyUrl", "userAgreementUrl"]) if (await queryRunner.hasColumn("operation_settings", name)) await queryRunner.dropColumn("operation_settings", name);
  }
}
