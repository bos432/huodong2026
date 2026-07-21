import { MigrationInterface, QueryRunner } from "typeorm";

export class RepairMallIntegerAmounts1783820000000 implements MigrationInterface {
  name = "RepairMallIntegerAmounts1783820000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("UPDATE `mall_orders` SET `amountFen` = ROUND(`amount` * 100) WHERE `amountFen` <> ROUND(`amount` * 100)");
    await queryRunner.query("UPDATE `mall_checkout_groups` SET `amountFen` = ROUND(`amount` * 100) WHERE `amountFen` <> ROUND(`amount` * 100)");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    // The repair is a deterministic projection of the canonical decimal amount.
    // There is no safe inverse for previously stale integer values.
    void queryRunner;
    throw new Error("RepairMallIntegerAmounts is a corrective backfill and cannot be reverted safely");
  }
}
