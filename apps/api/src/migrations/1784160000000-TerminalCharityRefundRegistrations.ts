import { MigrationInterface, QueryRunner } from "typeorm";

export class TerminalCharityRefundRegistrations1784160000000 implements MigrationInterface {
  name = "TerminalCharityRefundRegistrations1784160000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE registrations registration
      INNER JOIN orders businessOrder ON businessOrder.registrationId = registration.id
      INNER JOIN refunds refund ON refund.orderId = businessOrder.id
      SET
        registration.status = 'cancelled',
        registration.cancelReason = CASE
          WHEN registration.cancelReason IS NULL OR registration.cancelReason = ''
            THEN '公益保留退款已完成，报名资格已关闭'
          ELSE registration.cancelReason
        END,
        registration.updatedAt = CURRENT_TIMESTAMP
      WHERE refund.status = 'completed'
        AND refund.reason LIKE '%[charity_retained]%'
        AND registration.status <> 'cancelled'
    `);
  }

  async down(): Promise<void> {
    // Historical eligibility cannot be restored safely after a completed refund.
  }
}
