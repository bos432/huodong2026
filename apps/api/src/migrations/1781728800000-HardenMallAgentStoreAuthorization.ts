import { MigrationInterface, QueryRunner } from "typeorm";

export class HardenMallAgentStoreAuthorization1781728800000 implements MigrationInterface {
  name = "HardenMallAgentStoreAuthorization1781728800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_merchants"))) return;

    await queryRunner.query(`
      UPDATE mall_merchants merchant
      SET
        merchant.status = 'disabled',
        merchant.mallEnabled = 0,
        merchant.remark = CASE
          WHEN merchant.remark IS NULL OR merchant.remark = '' THEN '代理店铺需由平台在商城店铺管理中授权开通后才会对外展示'
          WHEN merchant.remark NOT LIKE '%授权开通%' THEN CONCAT(merchant.remark, '；代理店铺需由平台在商城店铺管理中授权开通后才会对外展示')
          ELSE merchant.remark
        END
      WHERE merchant.ownerType = 'agent'
        AND merchant.code = CONCAT('agent_', merchant.agentId)
        AND NOT EXISTS (
          SELECT 1 FROM admin_mall_merchant_access access
          WHERE access.merchantId = merchant.id AND access.enabled = 1
        )
        AND NOT EXISTS (
          SELECT 1 FROM mall_products product
          WHERE product.merchantId = merchant.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM mall_orders order_row
          WHERE order_row.merchantId = merchant.id
        )
    `);
  }

  async down(): Promise<void> {
    // Keep the safer authorization state; reopening agent stores must be explicit.
  }
}
