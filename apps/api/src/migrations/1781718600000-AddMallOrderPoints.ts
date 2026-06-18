import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMallOrderPoints1781718600000 implements MigrationInterface {
  name = "AddMallOrderPoints1781718600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("mall_orders", "pointsUsed"))) {
      await queryRunner.query("ALTER TABLE mall_orders ADD pointsUsed int NOT NULL DEFAULT 0");
    }
    if (!(await queryRunner.hasColumn("mall_orders", "pointsDiscountAmount"))) {
      await queryRunner.query("ALTER TABLE mall_orders ADD pointsDiscountAmount decimal(10,2) NOT NULL DEFAULT 0");
    }
    if (!(await queryRunner.hasColumn("mall_orders", "pointsRefundedAt"))) {
      await queryRunner.query("ALTER TABLE mall_orders ADD pointsRefundedAt datetime NULL");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("mall_orders", "pointsRefundedAt")) await queryRunner.query("ALTER TABLE mall_orders DROP COLUMN pointsRefundedAt");
    if (await queryRunner.hasColumn("mall_orders", "pointsDiscountAmount")) await queryRunner.query("ALTER TABLE mall_orders DROP COLUMN pointsDiscountAmount");
    if (await queryRunner.hasColumn("mall_orders", "pointsUsed")) await queryRunner.query("ALTER TABLE mall_orders DROP COLUMN pointsUsed");
  }
}
