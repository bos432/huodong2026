import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class MallCheckoutExperience1783570000000 implements MigrationInterface {
  name = "MallCheckoutExperience1783570000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const indexes: Array<[string, TableIndex]> = [
      ["mall_addresses", new TableIndex({ name: "IDX_mall_address_user_default", columnNames: ["tenantId", "userId", "isDefault", "id"] })],
      ["mall_cart_items", new TableIndex({ name: "IDX_mall_cart_user_updated", columnNames: ["tenantId", "userId", "updatedAt"] })],
      ["mall_browse_histories", new TableIndex({ name: "IDX_mall_browse_user_viewed", columnNames: ["tenantId", "userId", "lastViewedAt"] })]
    ];
    for (const [tableName, index] of indexes) {
      const table = await queryRunner.getTable(tableName);
      if (table && !table.indices.some((item) => item.name === index.name)) await queryRunner.createIndex(tableName, index);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [tableName, indexName] of [["mall_browse_histories", "IDX_mall_browse_user_viewed"], ["mall_cart_items", "IDX_mall_cart_user_updated"], ["mall_addresses", "IDX_mall_address_user_default"]]) {
      const table = await queryRunner.getTable(tableName);
      const index = table?.indices.find((item) => item.name === indexName);
      if (index) await queryRunner.dropIndex(tableName, index);
    }
  }
}
