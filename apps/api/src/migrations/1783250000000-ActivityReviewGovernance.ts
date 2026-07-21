import { MigrationInterface, QueryRunner } from "typeorm";

export class ActivityReviewGovernance1783250000000 implements MigrationInterface {
  name = "ActivityReviewGovernance1783250000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `activity_reviews` ADD `featured` tinyint NOT NULL DEFAULT 0");
    await queryRunner.query("CREATE TABLE `activity_review_reports` (`id` int NOT NULL AUTO_INCREMENT, `reason` varchar(500) NOT NULL, `status` varchar(20) NOT NULL DEFAULT 'pending', `resolution` varchar(500) NULL, `handledBy` varchar(80) NULL, `handledAt` datetime NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `reviewId` int NULL, `userId` int NULL, UNIQUE INDEX `IDX_activity_review_report_user` (`reviewId`, `userId`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
    await queryRunner.query("ALTER TABLE `activity_review_reports` ADD CONSTRAINT `FK_activity_review_report_review` FOREIGN KEY (`reviewId`) REFERENCES `activity_reviews`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION");
    await queryRunner.query("ALTER TABLE `activity_review_reports` ADD CONSTRAINT `FK_activity_review_report_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `activity_review_reports` DROP FOREIGN KEY `FK_activity_review_report_user`");
    await queryRunner.query("ALTER TABLE `activity_review_reports` DROP FOREIGN KEY `FK_activity_review_report_review`");
    await queryRunner.query("DROP TABLE `activity_review_reports`");
    await queryRunner.query("ALTER TABLE `activity_reviews` DROP COLUMN `featured`");
  }
}
