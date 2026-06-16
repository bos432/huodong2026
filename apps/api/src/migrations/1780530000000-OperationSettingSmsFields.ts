import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class OperationSettingSmsFields1780530000000 implements MigrationInterface {
  name = "OperationSettingSmsFields1780530000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = "operation_settings";
    if (!(await queryRunner.hasTable(table))) return;

    const cols = [
      { name: "smsProviderEnabled", type: "tinyint", default: 0 },
      { name: "smsProvider", type: "varchar", length: "80", isNullable: true },
      { name: "smsAccessKeyId", type: "varchar", length: "120", isNullable: true },
      { name: "smsAccessKeySecret", type: "varchar", length: "200", isNullable: true },
      { name: "smsSignName", type: "varchar", length: "100", isNullable: true },
      { name: "smsTemplateId", type: "varchar", length: "120", isNullable: true }
    ];

    for (const col of cols) {
      if (!(await queryRunner.hasColumn(table, col.name))) {
        await queryRunner.addColumn(table, new TableColumn(col));
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = "operation_settings";
    if (!(await queryRunner.hasTable(table))) return;
    const names = ["smsProviderEnabled", "smsProvider", "smsAccessKeyId", "smsAccessKeySecret", "smsSignName", "smsTemplateId"];
    for (const name of names) {
      if (await queryRunner.hasColumn(table, name)) {
        await queryRunner.dropColumn(table, name);
      }
    }
  }
}
