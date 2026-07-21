import { MigrationInterface, QueryRunner } from "typeorm";

export class RefundIntegerMoneySnapshots1783280000000 implements MigrationInterface {
  name = "RefundIntegerMoneySnapshots1783280000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `refunds` ADD `amountFen` bigint NOT NULL DEFAULT 0, ADD `businessSnapshot` json NULL");
    await queryRunner.query("UPDATE `refunds` r LEFT JOIN `orders` o ON o.id = r.orderId SET r.`amountFen` = ROUND(r.`amount` * 100), r.`businessSnapshot` = JSON_OBJECT('refundNo', r.`refundNo`, 'amount', r.`amount`, 'reason', r.`reason`, 'orderNo', o.`orderNo`, 'orderAmount', o.`amount`, 'paymentMethod', o.`paymentMethod`, 'transactionNo', o.`transactionNo`)");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `refunds` DROP COLUMN `businessSnapshot`, DROP COLUMN `amountFen`");
  }
}
