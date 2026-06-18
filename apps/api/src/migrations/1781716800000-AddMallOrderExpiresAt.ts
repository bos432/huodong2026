import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMallOrderExpiresAt1781716800000 implements MigrationInterface {
  name = "AddMallOrderExpiresAt1781716800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_orders")) {
      if (!(await queryRunner.hasColumn("mall_orders", "expiresAt"))) {
        await queryRunner.query("ALTER TABLE mall_orders ADD COLUMN expiresAt DATETIME NULL AFTER completedAt");
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("mall_orders", "expiresAt")) {
      await queryRunner.query("ALTER TABLE mall_orders DROP COLUMN expiresAt");
    }
  }
}
