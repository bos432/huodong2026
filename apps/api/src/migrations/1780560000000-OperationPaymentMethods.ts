import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

const defaultPaymentMethods = JSON.stringify({
  free: true,
  wechat: true,
  alipay: false,
  balance: true,
  offline: true
});

export class OperationPaymentMethods1780560000000 implements MigrationInterface {
  name = "OperationPaymentMethods1780560000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = "operation_settings";
    if (!(await queryRunner.hasTable(table))) return;
    if (!(await queryRunner.hasColumn(table, "paymentMethods"))) {
      await queryRunner.addColumn(table, new TableColumn({ name: "paymentMethods", type: "json", isNullable: true }));
    }
    await queryRunner.query("UPDATE operation_settings SET paymentMethods = ? WHERE paymentMethods IS NULL", [defaultPaymentMethods]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = "operation_settings";
    if (!(await queryRunner.hasTable(table))) return;
    if (await queryRunner.hasColumn(table, "paymentMethods")) await queryRunner.dropColumn(table, "paymentMethods");
  }
}
