import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class TenantSwitcherSettings1784130000000 implements MigrationInterface {
  name = "TenantSwitcherSettings1784130000000";

  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("operation_settings"))) return;
    if (!(await queryRunner.hasColumn("operation_settings", "tenantSwitcherEnabled"))) {
      await queryRunner.addColumn("operation_settings", new TableColumn({ name: "tenantSwitcherEnabled", type: "tinyint", default: 1 }));
    }
    await queryRunner.query("UPDATE operation_settings SET tenantSwitcherEnabled = 1 WHERE tenantSwitcherEnabled IS NULL");
  }

  async down(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("operation_settings") && await queryRunner.hasColumn("operation_settings", "tenantSwitcherEnabled")) {
      await queryRunner.dropColumn("operation_settings", "tenantSwitcherEnabled");
    }
  }
}
