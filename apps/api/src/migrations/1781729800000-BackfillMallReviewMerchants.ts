import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillMallReviewMerchants1781729800000 implements MigrationInterface {
  name = "BackfillMallReviewMerchants1781729800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_reviews")) || !(await queryRunner.hasColumn("mall_reviews", "merchantId"))) return;

    await queryRunner.query(`
      UPDATE mall_reviews review
      LEFT JOIN mall_order_items item ON item.id = review.orderItemId
      LEFT JOIN mall_orders order_row ON order_row.id = review.orderId
      LEFT JOIN mall_products product ON product.id = review.productId
      SET review.merchantId = COALESCE(item.merchantId, order_row.merchantId, product.merchantId)
      WHERE review.merchantId IS NULL
        AND COALESCE(item.merchantId, order_row.merchantId, product.merchantId) IS NOT NULL
    `);

    if (await queryRunner.hasTable("mall_merchants")) {
      await queryRunner.query(`
        UPDATE mall_reviews review
        JOIN mall_merchants merchant ON merchant.ownerType = 'tenant' AND merchant.tenantId = review.tenantId AND merchant.agentId IS NULL
        SET review.merchantId = merchant.id
        WHERE review.merchantId IS NULL
      `);
    }
  }

  async down(): Promise<void> {
    // Keep merchant ownership on reviews; removing it would reopen cross-store moderation risk.
  }
}
