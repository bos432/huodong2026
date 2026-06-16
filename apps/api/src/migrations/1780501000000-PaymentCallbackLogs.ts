import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class PaymentCallbackLogs1780501000000 implements MigrationInterface {
  name = "PaymentCallbackLogs1780501000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("payment_callback_logs")) return;
    await queryRunner.createTable(
      new Table({
        name: "payment_callback_logs",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "orderId", type: "int", isNullable: true },
          { name: "provider", type: "varchar", length: "40" },
          { name: "orderNo", type: "varchar", length: "64", isNullable: true },
          { name: "transactionNo", type: "varchar", length: "128", isNullable: true },
          { name: "amount", type: "decimal", precision: 10, scale: 2, isNullable: true },
          { name: "signatureValid", type: "boolean", isNullable: true },
          { name: "resultStatus", type: "varchar", length: "24", default: "'received'" },
          { name: "resultMessage", type: "varchar", length: "255", isNullable: true },
          { name: "payload", type: "json" },
          { name: "processedAt", type: "datetime", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      })
    );
    await queryRunner.createForeignKey("payment_callback_logs", new TableForeignKey({ columnNames: ["orderId"], referencedTableName: "orders", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    await queryRunner.createIndex("payment_callback_logs", new TableIndex({ name: "IDX_payment_callback_logs_provider_created", columnNames: ["provider", "createdAt"] }));
    await queryRunner.createIndex("payment_callback_logs", new TableIndex({ name: "IDX_payment_callback_logs_order_no", columnNames: ["orderNo"] }));
    await queryRunner.createIndex("payment_callback_logs", new TableIndex({ name: "IDX_payment_callback_logs_transaction_no", columnNames: ["transactionNo"] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("payment_callback_logs")) await queryRunner.dropTable("payment_callback_logs");
  }
}
