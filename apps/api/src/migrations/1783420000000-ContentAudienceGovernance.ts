import { MigrationInterface, QueryRunner } from "typeorm";

export class ContentAudienceGovernance1783420000000 implements MigrationInterface {
  name = "ContentAudienceGovernance1783420000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `announcements` ADD `endAt` datetime NULL, ADD `audience` json NULL, ADD `viewCount` int NOT NULL DEFAULT 0, ADD `clickCount` int NOT NULL DEFAULT 0");
    await queryRunner.query("ALTER TABLE `marketing_popups` ADD `audience` json NULL");
    await queryRunner.query("ALTER TABLE `ad_campaigns` ADD `audience` json NULL");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `ad_campaigns` DROP COLUMN `audience`");
    await queryRunner.query("ALTER TABLE `marketing_popups` DROP COLUMN `audience`");
    await queryRunner.query("ALTER TABLE `announcements` DROP COLUMN `clickCount`, DROP COLUMN `viewCount`, DROP COLUMN `audience`, DROP COLUMN `endAt`");
  }
}
