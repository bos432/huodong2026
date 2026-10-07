import { MigrationInterface, QueryRunner } from "typeorm";

export class RefundIntegerMoneySnapshots1783280000000 implements MigrationInterface {
  name = "RefundIntegerMoneySnapshots1783280000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("refunds");
    const missing = [["amountFen", "`amountFen` bigint NOT NULL DEFAULT 0"], ["businessSnapshot", "`businessSnapshot` json NULL"]] as const;
    const missingColumns = missing.filter(([name]) => !table?.findColumnByName(name));
    if (missingColumns.length) await queryRunner.query(`ALTER TABLE \`refunds\` ${missingColumns.map(([, definition]) => `ADD ${definition}`).join(", ")}`);
    await queryRunner.query("UPDATE `refunds` r LEFT JOIN `orders` o ON o.id = r.orderId SET r.`amountFen` = ROUND(r.`amount` * 100), r.`businessSnapshot` = JSON_OBJECT('refundNo', r.`refundNo`, 'amount', r.`amount`, 'reason', r.`reason`, 'orderNo', o.`orderNo`, 'orderAmount', o.`amount`, 'paymentMethod', o.`paymentMethod`, 'transactionNo', o.`transactionNo`)");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("refunds");
    const existing = ["businessSnapshot", "amountFen"].filter((name) => table?.findColumnByName(name));
    if (existing.length) await queryRunner.query(`ALTER TABLE \`refunds\` ${existing.map((name) => `DROP COLUMN \`${name}\``).join(", ")}`);
  }
}
