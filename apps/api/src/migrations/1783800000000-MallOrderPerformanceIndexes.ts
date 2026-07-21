import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

type IndexDefinition = {
  name: string;
  columns: string[];
  unique?: boolean;
};

const INDEXES: IndexDefinition[] = [
  { name: "UQ_mall_orders_order_no", columns: ["orderNo"], unique: true },
  { name: "UQ_mall_orders_tenant_user_client_key", columns: ["tenantId", "userId", "clientOrderKey"], unique: true },
  { name: "IDX_mall_orders_tenant_status_created", columns: ["tenantId", "status", "createdAt"] },
  { name: "IDX_mall_orders_tenant_user_created", columns: ["tenantId", "userId", "createdAt"] },
  { name: "IDX_mall_orders_merchant_status_created", columns: ["merchantId", "status", "createdAt"] },
  { name: "IDX_mall_orders_checkout_group", columns: ["checkoutGroupId"] },
  { name: "IDX_mall_orders_status_expires", columns: ["status", "expiresAt"] },
  { name: "IDX_mall_orders_transaction_no", columns: ["transactionNo"] }
];

export class MallOrderPerformanceIndexes1783800000000 implements MigrationInterface {
  name = "MallOrderPerformanceIndexes1783800000000";

  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("mall_orders"))) return;
    for (const definition of INDEXES) {
      const table = await queryRunner.getTable("mall_orders");
      if (!table || table.indices.some((index) => index.name === definition.name)) continue;
      if (!definition.columns.every((column) => table.findColumnByName(column))) continue;
      await queryRunner.createIndex("mall_orders", new TableIndex({
        name: definition.name,
        columnNames: definition.columns,
        isUnique: definition.unique === true
      }));
    }
  }

  async down(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("mall_orders"))) return;
    for (const definition of [...INDEXES].reverse()) {
      const table = await queryRunner.getTable("mall_orders");
      if (table?.indices.some((index) => index.name === definition.name)) {
        await queryRunner.dropIndex("mall_orders", definition.name);
      }
    }
  }
}
