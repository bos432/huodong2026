import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class CoursePaymentStatementReconciliation1783980000000 implements MigrationInterface {
  name = "CoursePaymentStatementReconciliation1783980000000";

  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasColumn("payment_statement_records", "businessType"))) {
      await queryRunner.addColumn("payment_statement_records", new TableColumn({ name: "businessType", type: "varchar", length: "40", default: "'activity'" }));
    }
    if (!(await queryRunner.hasColumn("payment_statement_records", "courseOrderId"))) {
      await queryRunner.addColumn("payment_statement_records", new TableColumn({ name: "courseOrderId", type: "int", isNullable: true }));
    }
    const table = await queryRunner.getTable("payment_statement_records");
    if (table && !table.indices.some((index) => index.name === "IDX_payment_statement_course_order")) {
      await queryRunner.createIndex(table, new TableIndex({ name: "IDX_payment_statement_course_order", columnNames: ["courseOrderId"] }));
    }
    if (table && !table.foreignKeys.some((key) => key.name === "FK_payment_statement_course_order")) {
      await queryRunner.createForeignKey(table, new TableForeignKey({ name: "FK_payment_statement_course_order", columnNames: ["courseOrderId"], referencedTableName: "course_orders", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    }
  }

  async down(queryRunner: QueryRunner) {
    const table = await queryRunner.getTable("payment_statement_records");
    const foreignKey = table?.foreignKeys.find((key) => key.name === "FK_payment_statement_course_order");
    if (foreignKey) await queryRunner.dropForeignKey(table!, foreignKey);
    const index = table?.indices.find((item) => item.name === "IDX_payment_statement_course_order");
    if (index) await queryRunner.dropIndex(table!, index);
    if (await queryRunner.hasColumn("payment_statement_records", "courseOrderId")) await queryRunner.dropColumn("payment_statement_records", "courseOrderId");
    if (await queryRunner.hasColumn("payment_statement_records", "businessType")) await queryRunner.dropColumn("payment_statement_records", "businessType");
  }
}
