import { MigrationInterface, QueryRunner } from "typeorm";

export class IntegerMoneySnapshots1783260000000 implements MigrationInterface {
  name = "IntegerMoneySnapshots1783260000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    const addColumns = async (tableName: string, columns: Array<[string, string]>) => {
      const table = await queryRunner.getTable(tableName);
      const missing = columns.filter(([name]) => !table?.findColumnByName(name));
      if (missing.length) await queryRunner.query(`ALTER TABLE \`${tableName}\` ${missing.map(([, definition]) => `ADD ${definition}`).join(", ")}`);
    };
    await addColumns("orders", [["amountFen", "`amountFen` bigint NOT NULL DEFAULT 0"], ["businessSnapshot", "`businessSnapshot` json NULL"]]);
    await queryRunner.query("UPDATE `orders` SET `amountFen` = ROUND(`amount` * 100), `businessSnapshot` = JSON_OBJECT('orderNo', `orderNo`, 'amount', `amount`, 'originalAmount', `originalAmount`, 'discountAmount', `discountAmount`, 'paymentMethod', `paymentMethod`)");
    await addColumns("course_orders", [["amountFen", "`amountFen` bigint NOT NULL DEFAULT 0"], ["businessSnapshot", "`businessSnapshot` json NULL"]]);
    await queryRunner.query("UPDATE `course_orders` SET `amountFen` = ROUND(`amount` * 100), `businessSnapshot` = JSON_OBJECT('orderNo', `orderNo`, 'amount', `amount`, 'paymentMethod', `paymentMethod`)");
    await addColumns("payment_transactions", [["amountFen", "`amountFen` bigint NOT NULL DEFAULT 0"], ["businessType", "`businessType` varchar(40) NOT NULL DEFAULT 'activity'"], ["businessOrderNo", "`businessOrderNo` varchar(80) NULL"], ["businessSnapshot", "`businessSnapshot` json NULL"]]);
    await queryRunner.query("UPDATE `payment_transactions` p LEFT JOIN `orders` o ON o.id = p.orderId SET p.`amountFen` = ROUND(p.`amount` * 100), p.`businessOrderNo` = o.`orderNo`, p.`businessSnapshot` = JSON_OBJECT('transactionNo', p.`transactionNo`, 'provider', p.`provider`, 'paymentMethod', p.`paymentMethod`, 'amount', p.`amount`)");
    const table = await queryRunner.getTable("payment_transactions");
    if (table && !table.indices.some((index) => index.name === "IDX_payment_transactions_business_order")) await queryRunner.query("CREATE INDEX `IDX_payment_transactions_business_order` ON `payment_transactions` (`businessType`, `businessOrderNo`)");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("payment_transactions");
    if (table?.indices.some((index) => index.name === "IDX_payment_transactions_business_order")) await queryRunner.query("DROP INDEX `IDX_payment_transactions_business_order` ON `payment_transactions`");
    const dropColumns = async (tableName: string, names: string[]) => {
      const current = await queryRunner.getTable(tableName);
      const existing = names.filter((name) => current?.findColumnByName(name));
      if (existing.length) await queryRunner.query(`ALTER TABLE \`${tableName}\` ${existing.map((name) => `DROP COLUMN \`${name}\``).join(", ")}`);
    };
    await dropColumns("payment_transactions", ["businessSnapshot", "businessOrderNo", "businessType", "amountFen"]);
    await dropColumns("course_orders", ["businessSnapshot", "amountFen"]);
    await dropColumns("orders", ["businessSnapshot", "amountFen"]);
  }
}
