import { MigrationInterface, QueryRunner } from "typeorm";

export class ReclassifyDuplicateStatementPayments1783950000000 implements MigrationInterface {
  name = "ReclassifyDuplicateStatementPayments1783950000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE payment_transactions p
      INNER JOIN payment_statement_records s ON s.transactionNo = p.transactionNo AND s.orderId = p.orderId
      INNER JOIN payment_transactions actual ON actual.orderId = p.orderId AND actual.id <> p.id AND actual.status = 'success'
      SET
        p.status = 'statement_matched',
        p.businessSnapshot = JSON_SET(COALESCE(p.businessSnapshot, JSON_OBJECT()), '$.statementDuplicateReclassified', TRUE),
        p.remark = '历史渠道账单重复支付流水已重分类'
      WHERE p.status = 'success'
        AND p.orderId IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE payment_transactions
      SET
        status = 'success',
        businessSnapshot = CASE
          WHEN JSON_LENGTH(JSON_REMOVE(COALESCE(businessSnapshot, JSON_OBJECT()), '$.statementDuplicateReclassified')) = 0 THEN NULL
          ELSE JSON_REMOVE(businessSnapshot, '$.statementDuplicateReclassified')
        END,
        remark = '服务商账单与本地订单匹配'
      WHERE status = 'statement_matched'
        AND JSON_EXTRACT(businessSnapshot, '$.statementDuplicateReclassified') = TRUE
    `);
  }
}
