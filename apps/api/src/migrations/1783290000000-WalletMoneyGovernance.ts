import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class WalletMoneyGovernance1783290000000 implements MigrationInterface {
  name = "WalletMoneyGovernance1783290000000";

  async up(queryRunner: QueryRunner) {
    for (const column of [
      new TableColumn({ name: "availableBalanceFen", type: "bigint", default: 0 }),
      new TableColumn({ name: "frozenBalanceFen", type: "bigint", default: 0 }),
      new TableColumn({ name: "giftBalance", type: "decimal", precision: 12, scale: 2, default: 0 }),
      new TableColumn({ name: "giftBalanceFen", type: "bigint", default: 0 }),
      new TableColumn({ name: "frozenGiftBalance", type: "decimal", precision: 12, scale: 2, default: 0 }),
      new TableColumn({ name: "frozenGiftBalanceFen", type: "bigint", default: 0 })
    ]) if (!(await queryRunner.hasColumn("user_wallets", column.name))) await queryRunner.addColumn("user_wallets", column);
    for (const column of [
      new TableColumn({ name: "amountFen", type: "bigint", default: 0 }),
      new TableColumn({ name: "frozenBefore", type: "decimal", precision: 12, scale: 2, default: 0 }),
      new TableColumn({ name: "frozenAfter", type: "decimal", precision: 12, scale: 2, default: 0 }),
      new TableColumn({ name: "giftBefore", type: "decimal", precision: 12, scale: 2, default: 0 }),
      new TableColumn({ name: "giftAfter", type: "decimal", precision: 12, scale: 2, default: 0 })
    ]) if (!(await queryRunner.hasColumn("wallet_transactions", column.name))) await queryRunner.addColumn("wallet_transactions", column);
    await queryRunner.query("UPDATE user_wallets SET availableBalanceFen = ROUND(availableBalance * 100), frozenBalanceFen = ROUND(frozenBalance * 100), giftBalanceFen = ROUND(giftBalance * 100), frozenGiftBalanceFen = ROUND(frozenGiftBalance * 100)");
    await queryRunner.query("UPDATE wallet_transactions SET amountFen = ROUND(amount * 100), frozenBefore = 0, frozenAfter = 0, giftBefore = 0, giftAfter = 0");
  }

  async down(queryRunner: QueryRunner) {
    for (const name of ["giftAfter", "giftBefore", "frozenAfter", "frozenBefore", "amountFen"]) if (await queryRunner.hasColumn("wallet_transactions", name)) await queryRunner.dropColumn("wallet_transactions", name);
    for (const name of ["frozenGiftBalanceFen", "frozenGiftBalance", "giftBalanceFen", "giftBalance", "frozenBalanceFen", "availableBalanceFen"]) if (await queryRunner.hasColumn("user_wallets", name)) await queryRunner.dropColumn("user_wallets", name);
  }
}
