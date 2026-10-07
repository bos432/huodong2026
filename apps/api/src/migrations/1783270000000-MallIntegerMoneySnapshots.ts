import { MigrationInterface, QueryRunner } from "typeorm";

export class MallIntegerMoneySnapshots1783270000000 implements MigrationInterface {
  name = "MallIntegerMoneySnapshots1783270000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    const addColumns = async (tableName: string, columns: Array<[string, string]>) => {
      const table = await queryRunner.getTable(tableName);
      const missing = columns.filter(([name]) => !table?.findColumnByName(name));
      if (missing.length) await queryRunner.query(`ALTER TABLE \`${tableName}\` ${missing.map(([, definition]) => `ADD ${definition}`).join(", ")}`);
    };
    await addColumns("mall_checkout_groups", [["amountFen", "`amountFen` bigint NOT NULL DEFAULT 0"], ["businessSnapshot", "`businessSnapshot` json NULL"]]);
    await queryRunner.query("UPDATE `mall_checkout_groups` SET `amountFen` = ROUND(`amount` * 100), `businessSnapshot` = JSON_OBJECT('groupNo', `groupNo`, 'amount', `amount`, 'goodsAmount', `goodsAmount`, 'discountAmount', `discountAmount`, 'paymentMethod', `paymentMethod`)");
    await addColumns("mall_orders", [["amountFen", "`amountFen` bigint NOT NULL DEFAULT 0"], ["businessSnapshot", "`businessSnapshot` json NULL"]]);
    await queryRunner.query("UPDATE `mall_orders` SET `amountFen` = ROUND(`amount` * 100), `businessSnapshot` = JSON_OBJECT('orderNo', `orderNo`, 'amount', `amount`, 'goodsAmount', `goodsAmount`, 'discountAmount', `discountAmount`, 'freightAmount', `freightAmount`, 'pointsUsed', `pointsUsed`, 'pointsDiscountAmount', `pointsDiscountAmount`, 'paymentMethod', `paymentMethod`, 'couponSnapshot', `couponSnapshot`, 'promotionSnapshot', `promotionSnapshot`, 'addressSnapshot', `addressSnapshot`)");
    await addColumns("mall_payment_transactions", [["amountFen", "`amountFen` bigint NOT NULL DEFAULT 0"], ["businessType", "`businessType` varchar(40) NOT NULL DEFAULT 'mall'"], ["businessOrderNo", "`businessOrderNo` varchar(80) NULL"], ["businessSnapshot", "`businessSnapshot` json NULL"]]);
    await queryRunner.query("UPDATE `mall_payment_transactions` p LEFT JOIN `mall_orders` o ON o.id = p.orderId SET p.`amountFen` = ROUND(p.`amount` * 100), p.`businessOrderNo` = o.`orderNo`, p.`businessSnapshot` = JSON_OBJECT('transactionNo', p.`transactionNo`, 'provider', p.`provider`, 'paymentMethod', p.`paymentMethod`, 'amount', p.`amount`, 'orderNo', o.`orderNo`)");
    const paymentTable = await queryRunner.getTable("mall_payment_transactions");
    if (paymentTable && !paymentTable.indices.some((index) => index.name === "IDX_mall_payment_business_order")) await queryRunner.query("CREATE INDEX `IDX_mall_payment_business_order` ON `mall_payment_transactions` (`businessType`, `businessOrderNo`)");
    await addColumns("mall_refunds", [["amountFen", "`amountFen` bigint NOT NULL DEFAULT 0"], ["businessSnapshot", "`businessSnapshot` json NULL"]]);
    await queryRunner.query("UPDATE `mall_refunds` r LEFT JOIN `mall_orders` o ON o.id = r.orderId SET r.`amountFen` = ROUND(r.`amount` * 100), r.`businessSnapshot` = JSON_OBJECT('refundNo', r.`refundNo`, 'type', r.`type`, 'amount', r.`amount`, 'reason', r.`reason`, 'orderNo', o.`orderNo`, 'orderAmount', o.`amount`, 'paymentMethod', o.`paymentMethod`)");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    const dropColumns = async (tableName: string, names: string[]) => {
      const current = await queryRunner.getTable(tableName);
      const existing = names.filter((name) => current?.findColumnByName(name));
      if (existing.length) await queryRunner.query(`ALTER TABLE \`${tableName}\` ${existing.map((name) => `DROP COLUMN \`${name}\``).join(", ")}`);
    };
    await dropColumns("mall_refunds", ["businessSnapshot", "amountFen"]);
    const paymentTable = await queryRunner.getTable("mall_payment_transactions");
    if (paymentTable?.indices.some((index) => index.name === "IDX_mall_payment_business_order")) await queryRunner.query("DROP INDEX `IDX_mall_payment_business_order` ON `mall_payment_transactions`");
    await dropColumns("mall_payment_transactions", ["businessSnapshot", "businessOrderNo", "businessType", "amountFen"]);
    await dropColumns("mall_orders", ["businessSnapshot", "amountFen"]);
    await dropColumns("mall_checkout_groups", ["businessSnapshot", "amountFen"]);
  }
}
