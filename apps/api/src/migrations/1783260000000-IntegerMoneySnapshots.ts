import { MigrationInterface, QueryRunner } from "typeorm";

export class IntegerMoneySnapshots1783260000000 implements MigrationInterface {
  name = "IntegerMoneySnapshots1783260000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `orders` ADD `amountFen` bigint NOT NULL DEFAULT 0, ADD `businessSnapshot` json NULL");
    await queryRunner.query("UPDATE `orders` SET `amountFen` = ROUND(`amount` * 100), `businessSnapshot` = JSON_OBJECT('orderNo', `orderNo`, 'amount', `amount`, 'originalAmount', `originalAmount`, 'discountAmount', `discountAmount`, 'paymentMethod', `paymentMethod`)");
    await queryRunner.query("ALTER TABLE `course_orders` ADD `amountFen` bigint NOT NULL DEFAULT 0, ADD `businessSnapshot` json NULL");
    await queryRunner.query("UPDATE `course_orders` SET `amountFen` = ROUND(`amount` * 100), `businessSnapshot` = JSON_OBJECT('orderNo', `orderNo`, 'amount', `amount`, 'paymentMethod', `paymentMethod`)");
    await queryRunner.query("ALTER TABLE `payment_transactions` ADD `amountFen` bigint NOT NULL DEFAULT 0, ADD `businessType` varchar(40) NOT NULL DEFAULT 'activity', ADD `businessOrderNo` varchar(80) NULL, ADD `businessSnapshot` json NULL");
    await queryRunner.query("UPDATE `payment_transactions` p LEFT JOIN `orders` o ON o.id = p.orderId SET p.`amountFen` = ROUND(p.`amount` * 100), p.`businessOrderNo` = o.`orderNo`, p.`businessSnapshot` = JSON_OBJECT('transactionNo', p.`transactionNo`, 'provider', p.`provider`, 'paymentMethod', p.`paymentMethod`, 'amount', p.`amount`)");
    await queryRunner.query("CREATE INDEX `IDX_payment_transactions_business_order` ON `payment_transactions` (`businessType`, `businessOrderNo`)");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX `IDX_payment_transactions_business_order` ON `payment_transactions`");
    await queryRunner.query("ALTER TABLE `payment_transactions` DROP COLUMN `businessSnapshot`, DROP COLUMN `businessOrderNo`, DROP COLUMN `businessType`, DROP COLUMN `amountFen`");
    await queryRunner.query("ALTER TABLE `course_orders` DROP COLUMN `businessSnapshot`, DROP COLUMN `amountFen`");
    await queryRunner.query("ALTER TABLE `orders` DROP COLUMN `businessSnapshot`, DROP COLUMN `amountFen`");
  }
}
