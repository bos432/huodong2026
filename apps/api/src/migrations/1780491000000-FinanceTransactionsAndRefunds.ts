import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class FinanceTransactionsAndRefunds1780491000000 implements MigrationInterface {
  name = "FinanceTransactionsAndRefunds1780491000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("payment_transactions"))) {
      await queryRunner.createTable(
        new Table({
          name: "payment_transactions",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "orderId", type: "int", isNullable: true },
            { name: "transactionNo", type: "varchar", length: "128", isUnique: true },
            { name: "provider", type: "varchar", length: "40" },
            { name: "paymentMethod", type: "varchar", length: "40" },
            { name: "amount", type: "decimal", precision: 10, scale: 2 },
            { name: "status", type: "varchar", length: "24", default: "'success'" },
            { name: "remark", type: "varchar", length: "255", isNullable: true },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createForeignKey("payment_transactions", new TableForeignKey({ columnNames: ["orderId"], referencedTableName: "orders", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    }

    if (!(await queryRunner.hasTable("refunds"))) {
      await queryRunner.createTable(
        new Table({
          name: "refunds",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "orderId", type: "int", isNullable: true },
            { name: "refundNo", type: "varchar", length: "128", isUnique: true },
            { name: "amount", type: "decimal", precision: 10, scale: 2 },
            { name: "status", type: "varchar", length: "24", default: "'pending'" },
            { name: "operator", type: "varchar", length: "100", isNullable: true },
            { name: "reason", type: "varchar", length: "255", isNullable: true },
            { name: "completedAt", type: "datetime", isNullable: true },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createForeignKey("refunds", new TableForeignKey({ columnNames: ["orderId"], referencedTableName: "orders", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("refunds")) await queryRunner.dropTable("refunds");
    if (await queryRunner.hasTable("payment_transactions")) await queryRunner.dropTable("payment_transactions");
  }
}
