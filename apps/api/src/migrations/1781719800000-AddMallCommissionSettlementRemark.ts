import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMallCommissionSettlementRemark1781719800000 implements MigrationInterface {
  name = "AddMallCommissionSettlementRemark1781719800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("mall_commissions", "settledBy"))) {
      await queryRunner.query("ALTER TABLE mall_commissions ADD settledBy varchar(80) NULL");
    }
    if (!(await queryRunner.hasColumn("mall_commissions", "settleRemark"))) {
      await queryRunner.query("ALTER TABLE mall_commissions ADD settleRemark varchar(255) NULL");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("mall_commissions", "settleRemark")) {
      await queryRunner.query("ALTER TABLE mall_commissions DROP COLUMN settleRemark");
    }
    if (await queryRunner.hasColumn("mall_commissions", "settledBy")) {
      await queryRunner.query("ALTER TABLE mall_commissions DROP COLUMN settledBy");
    }
  }
}
