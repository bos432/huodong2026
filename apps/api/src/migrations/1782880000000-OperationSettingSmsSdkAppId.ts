import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class OperationSettingSmsSdkAppId1782880000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = "operation_settings";
    if (!(await queryRunner.hasTable(table))) return;
    if (!(await queryRunner.hasColumn(table, "smsSdkAppId"))) {
      await queryRunner.addColumn(table, new TableColumn({ name: "smsSdkAppId", type: "varchar", length: "80", isNullable: true }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = "operation_settings";
    if (!(await queryRunner.hasTable(table))) return;
    if (await queryRunner.hasColumn(table, "smsSdkAppId")) await queryRunner.dropColumn(table, "smsSdkAppId");
  }
}
