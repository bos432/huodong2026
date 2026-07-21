import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from "typeorm";

export class MallPaymentStatements1783310000000 implements MigrationInterface {
  name = "MallPaymentStatements1783310000000";
  async up(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("mall_payment_statement_records")) return;
    await queryRunner.createTable(new Table({ name: "mall_payment_statement_records", columns: [
      { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "tenantId", type: "int" }, { name: "merchantId", type: "int", isNullable: true }, { name: "orderId", type: "int", isNullable: true },
      { name: "provider", type: "varchar", length: "40" }, { name: "accountScope", type: "varchar", length: "80" }, { name: "transactionNo", type: "varchar", length: "128" }, { name: "orderNo", type: "varchar", length: "128", isNullable: true },
      { name: "amount", type: "decimal", precision: 12, scale: 2 }, { name: "amountFen", type: "bigint", default: 0 }, { name: "tradeType", type: "varchar", length: "40", isNullable: true }, { name: "providerStatus", type: "varchar", length: "40", isNullable: true },
      { name: "tradedAt", type: "datetime", isNullable: true }, { name: "batchNo", type: "varchar", length: "80", isNullable: true }, { name: "reconciliationStatus", type: "varchar", length: "24", default: "'pending'" }, { name: "discrepancyType", type: "varchar", length: "40", isNullable: true },
      { name: "remark", type: "varchar", length: "255", isNullable: true }, { name: "rawPayload", type: "json", isNullable: true }, { name: "importedBy", type: "varchar", length: "100", isNullable: true }, { name: "importedAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
    ], uniques: [new TableUnique({ name: "UQ_mall_statement_scope_transaction", columnNames: ["provider", "accountScope", "transactionNo"] })], indices: [new TableIndex({ name: "IDX_mall_statement_order_no", columnNames: ["orderNo"] }), new TableIndex({ name: "IDX_mall_statement_status", columnNames: ["reconciliationStatus"] }), new TableIndex({ name: "IDX_mall_statement_account_scope", columnNames: ["accountScope"] })] }));
    for (const fk of [new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }), new TableForeignKey({ columnNames: ["merchantId"], referencedTableName: "mall_merchants", referencedColumnNames: ["id"], onDelete: "SET NULL" }), new TableForeignKey({ columnNames: ["orderId"], referencedTableName: "mall_orders", referencedColumnNames: ["id"], onDelete: "SET NULL" })]) await queryRunner.createForeignKey("mall_payment_statement_records", fk);
  }
  async down(queryRunner: QueryRunner) { if (await queryRunner.hasTable("mall_payment_statement_records")) await queryRunner.dropTable("mall_payment_statement_records"); }
}
