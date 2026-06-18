import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMallRefundImages1781716200000 implements MigrationInterface {
  name = "AddMallRefundImages1781716200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_refunds")) {
      if (!(await queryRunner.hasColumn("mall_refunds", "images"))) {
        await queryRunner.query("ALTER TABLE mall_refunds ADD COLUMN images JSON NULL AFTER reason");
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("mall_refunds", "images")) {
      await queryRunner.query("ALTER TABLE mall_refunds DROP COLUMN images");
    }
  }
}
