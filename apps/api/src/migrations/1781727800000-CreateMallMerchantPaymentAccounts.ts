import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateMallMerchantPaymentAccounts1781727800000 implements MigrationInterface {
  name = "CreateMallMerchantPaymentAccounts1781727800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_merchant_payment_accounts")) return;
    await queryRunner.createTable(
      new Table({
        name: "mall_merchant_payment_accounts",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int" },
          { name: "merchantId", type: "int" },
          { name: "provider", type: "varchar", length: "40" },
          { name: "merchantName", type: "varchar", length: "120", isNullable: true },
          { name: "merchantNo", type: "varchar", length: "128", isNullable: true },
          { name: "enabled", type: "boolean", default: true },
          { name: "config", type: "json", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      })
    );
    await queryRunner.createForeignKey("mall_merchant_payment_accounts", new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createForeignKey("mall_merchant_payment_accounts", new TableForeignKey({ columnNames: ["merchantId"], referencedTableName: "mall_merchants", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createIndex("mall_merchant_payment_accounts", new TableIndex({ name: "IDX_mall_merchant_payment_accounts_provider", columnNames: ["merchantId", "provider"] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_merchant_payment_accounts")) await queryRunner.dropTable("mall_merchant_payment_accounts");
  }
}
