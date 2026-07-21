import { MigrationInterface, QueryRunner } from "typeorm";

export class MallIntegerMoneySnapshots1783270000000 implements MigrationInterface {
  name = "MallIntegerMoneySnapshots1783270000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `mall_checkout_groups` ADD `amountFen` bigint NOT NULL DEFAULT 0, ADD `businessSnapshot` json NULL");
    await queryRunner.query("UPDATE `mall_checkout_groups` SET `amountFen` = ROUND(`amount` * 100), `businessSnapshot` = JSON_OBJECT('groupNo', `groupNo`, 'amount', `amount`, 'goodsAmount', `goodsAmount`, 'discountAmount', `discountAmount`, 'paymentMethod', `paymentMethod`)");
    await queryRunner.query("ALTER TABLE `mall_orders` ADD `amountFen` bigint NOT NULL DEFAULT 0, ADD `businessSnapshot` json NULL");
    await queryRunner.query("UPDATE `mall_orders` SET `amountFen` = ROUND(`amount` * 100), `businessSnapshot` = JSON_OBJECT('orderNo', `orderNo`, 'amount', `amount`, 'goodsAmount', `goodsAmount`, 'discountAmount', `discountAmount`, 'freightAmount', `freightAmount`, 'pointsUsed', `pointsUsed`, 'pointsDiscountAmount', `pointsDiscountAmount`, 'paymentMethod', `paymentMethod`, 'couponSnapshot', `couponSnapshot`, 'promotionSnapshot', `promotionSnapshot`, 'addressSnapshot', `addressSnapshot`)");
    await queryRunner.query("ALTER TABLE `mall_payment_transactions` ADD `amountFen` bigint NOT NULL DEFAULT 0, ADD `businessType` varchar(40) NOT NULL DEFAULT 'mall', ADD `businessOrderNo` varchar(80) NULL, ADD `businessSnapshot` json NULL");
    await queryRunner.query("UPDATE `mall_payment_transactions` p LEFT JOIN `mall_orders` o ON o.id = p.orderId SET p.`amountFen` = ROUND(p.`amount` * 100), p.`businessOrderNo` = o.`orderNo`, p.`businessSnapshot` = JSON_OBJECT('transactionNo', p.`transactionNo`, 'provider', p.`provider`, 'paymentMethod', p.`paymentMethod`, 'amount', p.`amount`, 'orderNo', o.`orderNo`)");
    await queryRunner.query("CREATE INDEX `IDX_mall_payment_business_order` ON `mall_payment_transactions` (`businessType`, `businessOrderNo`)");
    await queryRunner.query("ALTER TABLE `mall_refunds` ADD `amountFen` bigint NOT NULL DEFAULT 0, ADD `businessSnapshot` json NULL");
    await queryRunner.query("UPDATE `mall_refunds` r LEFT JOIN `mall_orders` o ON o.id = r.orderId SET r.`amountFen` = ROUND(r.`amount` * 100), r.`businessSnapshot` = JSON_OBJECT('refundNo', r.`refundNo`, 'type', r.`type`, 'amount', r.`amount`, 'reason', r.`reason`, 'orderNo', o.`orderNo`, 'orderAmount', o.`amount`, 'paymentMethod', o.`paymentMethod`)");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `mall_refunds` DROP COLUMN `businessSnapshot`, DROP COLUMN `amountFen`");
    await queryRunner.query("DROP INDEX `IDX_mall_payment_business_order` ON `mall_payment_transactions`");
    await queryRunner.query("ALTER TABLE `mall_payment_transactions` DROP COLUMN `businessSnapshot`, DROP COLUMN `businessOrderNo`, DROP COLUMN `businessType`, DROP COLUMN `amountFen`");
    await queryRunner.query("ALTER TABLE `mall_orders` DROP COLUMN `businessSnapshot`, DROP COLUMN `amountFen`");
    await queryRunner.query("ALTER TABLE `mall_checkout_groups` DROP COLUMN `businessSnapshot`, DROP COLUMN `amountFen`");
  }
}
