import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillMallOfflinePaymentTransactions1783830000000 implements MigrationInterface {
  name = "BackfillMallOfflinePaymentTransactions1783830000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO mall_payment_transactions
        (orderId, tenantId, merchantId, transactionNo, provider, paymentMethod, amount, amountFen, businessType, businessOrderNo, businessSnapshot, status, remark, reconciliationStatus, discrepancyType, createdAt)
      SELECT
        o.id, o.tenantId, o.merchantId, o.transactionNo, 'offline', o.paymentMethod, o.amount, o.amountFen,
        'mall', o.orderNo,
        JSON_OBJECT('transactionNo', o.transactionNo, 'provider', 'offline', 'paymentMethod', o.paymentMethod, 'amount', o.amount, 'orderNo', o.orderNo, 'merchantId', o.merchantId, 'historicalBackfill', TRUE),
        'success', '历史线下收款流水补录', 'matched', NULL, COALESCE(o.paidAt, o.updatedAt, o.createdAt)
      FROM mall_orders o
      WHERE o.paymentMethod = 'offline'
        AND o.status IN ('paid', 'shipped', 'completed', 'refund_pending', 'refunded')
        AND o.transactionNo IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM mall_payment_transactions p
          WHERE p.orderId = o.id AND p.status = 'success'
        )
        AND NOT EXISTS (
          SELECT 1 FROM mall_payment_transactions p
          WHERE p.transactionNo = o.transactionNo
        )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM mall_payment_transactions
      WHERE provider = 'offline'
        AND remark = '历史线下收款流水补录'
        AND JSON_EXTRACT(businessSnapshot, '$.historicalBackfill') = TRUE
    `);
  }
}
