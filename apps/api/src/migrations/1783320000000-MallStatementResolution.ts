import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class MallStatementResolution1783320000000 implements MigrationInterface {
  name = "MallStatementResolution1783320000000";
  async up(queryRunner: QueryRunner) {
    for (const column of [new TableColumn({ name: "claimedBy", type: "varchar", length: "100", isNullable: true }), new TableColumn({ name: "claimedAt", type: "datetime", isNullable: true }), new TableColumn({ name: "resolvedBy", type: "varchar", length: "100", isNullable: true }), new TableColumn({ name: "resolvedAt", type: "datetime", isNullable: true }), new TableColumn({ name: "resolutionRemark", type: "varchar", length: "500", isNullable: true })]) if (!(await queryRunner.hasColumn("mall_payment_statement_records", column.name))) await queryRunner.addColumn("mall_payment_statement_records", column);
  }
  async down(queryRunner: QueryRunner) { for (const name of ["resolutionRemark", "resolvedAt", "resolvedBy", "claimedAt", "claimedBy"]) if (await queryRunner.hasColumn("mall_payment_statement_records", name)) await queryRunner.dropColumn("mall_payment_statement_records", name); }
}
