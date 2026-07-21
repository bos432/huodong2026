import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillCoursePaymentTransactions1783940000000 implements MigrationInterface {
  name = "BackfillCoursePaymentTransactions1783940000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO payment_transactions
        (orderId, tenantId, transactionNo, provider, paymentMethod, amount, amountFen, businessType, businessOrderNo, businessSnapshot, status, remark, reconciliationStatus, discrepancyType, createdAt)
      SELECT
        NULL,
        c.tenantId,
        CONCAT('COURSE-HIST-', co.id),
        CASE
          WHEN co.paymentMethod IN ('wechat', 'alipay', 'balance', 'offline') THEN co.paymentMethod
          ELSE 'historical'
        END,
        co.paymentMethod,
        co.amount,
        co.amountFen,
        'course',
        co.orderNo,
        JSON_OBJECT(
          'courseId', c.id,
          'courseTitle', c.title,
          'orderNo', co.orderNo,
          'amount', co.amount,
          'paymentMethod', co.paymentMethod,
          'originalTransactionNo', co.transactionNo,
          'historicalBackfill', TRUE
        ),
        'success',
        '历史课程支付流水补录',
        'matched',
        NULL,
        COALESCE(co.paidAt, co.createdAt)
      FROM course_orders co
      INNER JOIN courses c ON c.id = co.courseId
      LEFT JOIN payment_transactions p ON p.businessType = 'course' AND p.businessOrderNo = co.orderNo AND p.status = 'success'
      WHERE co.status = 'paid' AND co.amountFen > 0 AND p.id IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM payment_transactions WHERE businessType = 'course' AND JSON_EXTRACT(businessSnapshot, '$.historicalBackfill') = TRUE");
  }
}
