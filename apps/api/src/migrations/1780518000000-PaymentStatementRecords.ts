import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class PaymentStatementRecords1780518000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("payment_statement_records")) return;
    await queryRunner.createTable(
      new Table({
        name: "payment_statement_records",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "orderId", type: "int", isNullable: true },
          { name: "provider", type: "varchar", length: "40" },
          { name: "transactionNo", type: "varchar", length: "128" },
          { name: "orderNo", type: "varchar", length: "128", isNullable: true },
          { name: "amount", type: "decimal", precision: 10, scale: 2 },
          { name: "tradeType", type: "varchar", length: "40", isNullable: true },
          { name: "providerStatus", type: "varchar", length: "40", isNullable: true },
          { name: "tradedAt", type: "datetime", isNullable: true },
          { name: "batchNo", type: "varchar", length: "64", isNullable: true },
          { name: "reconciliationStatus", type: "varchar", length: "24", default: "'pending'" },
          { name: "discrepancyType", type: "varchar", length: "40", isNullable: true },
          { name: "remark", type: "varchar", length: "255", isNullable: true },
          { name: "rawPayload", type: "json", isNullable: true },
          { name: "importedBy", type: "varchar", length: "100", isNullable: true },
          { name: "importedAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      })
    );
    await queryRunner.createForeignKey("payment_statement_records", new TableForeignKey({ columnNames: ["orderId"], referencedTableName: "orders", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    await queryRunner.createIndex("payment_statement_records", new TableIndex({ name: "IDX_payment_statement_provider_transaction", columnNames: ["provider", "transactionNo"], isUnique: true }));
    await queryRunner.createIndex("payment_statement_records", new TableIndex({ name: "IDX_payment_statement_order_no", columnNames: ["orderNo"] }));
    await queryRunner.createIndex("payment_statement_records", new TableIndex({ name: "IDX_payment_statement_reconciliation", columnNames: ["reconciliationStatus"] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("payment_statement_records")) await queryRunner.dropTable("payment_statement_records");
  }
}
