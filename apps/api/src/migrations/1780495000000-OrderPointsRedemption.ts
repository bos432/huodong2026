import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderPointsRedemption1780495000000 implements MigrationInterface {
  name = "OrderPointsRedemption1780495000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("orders", "pointsUsed"))) {
      await queryRunner.query("ALTER TABLE orders ADD pointsUsed int NOT NULL DEFAULT 0");
    }
    if (!(await queryRunner.hasColumn("orders", "pointsDiscountAmount"))) {
      await queryRunner.query("ALTER TABLE orders ADD pointsDiscountAmount decimal(10,2) NOT NULL DEFAULT 0");
    }
    if (!(await queryRunner.hasColumn("orders", "pointsRefundedAt"))) {
      await queryRunner.query("ALTER TABLE orders ADD pointsRefundedAt datetime NULL");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("orders", "pointsRefundedAt")) await queryRunner.query("ALTER TABLE orders DROP COLUMN pointsRefundedAt");
    if (await queryRunner.hasColumn("orders", "pointsDiscountAmount")) await queryRunner.query("ALTER TABLE orders DROP COLUMN pointsDiscountAmount");
    if (await queryRunner.hasColumn("orders", "pointsUsed")) await queryRunner.query("ALTER TABLE orders DROP COLUMN pointsUsed");
  }
}
