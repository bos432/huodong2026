import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMallReviewMerchantReply1781722800000 implements MigrationInterface {
  name = "AddMallReviewMerchantReply1781722800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_reviews"))) return;
    if (!(await queryRunner.hasColumn("mall_reviews", "merchantReply"))) {
      await queryRunner.query("ALTER TABLE mall_reviews ADD COLUMN merchantReply VARCHAR(500) NULL AFTER reviewRemark");
    }
    if (!(await queryRunner.hasColumn("mall_reviews", "repliedBy"))) {
      await queryRunner.query("ALTER TABLE mall_reviews ADD COLUMN repliedBy VARCHAR(80) NULL AFTER merchantReply");
    }
    if (!(await queryRunner.hasColumn("mall_reviews", "repliedAt"))) {
      await queryRunner.query("ALTER TABLE mall_reviews ADD COLUMN repliedAt DATETIME NULL AFTER repliedBy");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("mall_reviews", "repliedAt")) await queryRunner.query("ALTER TABLE mall_reviews DROP COLUMN repliedAt");
    if (await queryRunner.hasColumn("mall_reviews", "repliedBy")) await queryRunner.query("ALTER TABLE mall_reviews DROP COLUMN repliedBy");
    if (await queryRunner.hasColumn("mall_reviews", "merchantReply")) await queryRunner.query("ALTER TABLE mall_reviews DROP COLUMN merchantReply");
  }
}
