import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class OperationRegistrationSwitch1780506000000 implements MigrationInterface {
  name = "OperationRegistrationSwitch1780506000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("operation_settings"))) return;
    if (!(await queryRunner.hasColumn("operation_settings", "registrationEnabled"))) {
      await queryRunner.addColumn("operation_settings", new TableColumn({ name: "registrationEnabled", type: "tinyint", default: 1 }));
    }
    if (!(await queryRunner.hasColumn("operation_settings", "registrationDisabledMessage"))) {
      await queryRunner.addColumn("operation_settings", new TableColumn({ name: "registrationDisabledMessage", type: "text", isNullable: true }));
    }
    await queryRunner.query("UPDATE operation_settings SET registrationEnabled = 1 WHERE registrationEnabled IS NULL");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("operation_settings"))) return;
    if (await queryRunner.hasColumn("operation_settings", "registrationDisabledMessage")) await queryRunner.dropColumn("operation_settings", "registrationDisabledMessage");
    if (await queryRunner.hasColumn("operation_settings", "registrationEnabled")) await queryRunner.dropColumn("operation_settings", "registrationEnabled");
  }
}
