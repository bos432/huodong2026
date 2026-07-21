import { MigrationInterface, QueryRunner } from "typeorm";

export class CourseAccessModes1783460000000 implements MigrationInterface {
  name = "CourseAccessModes1783460000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `courses` ADD COLUMN `accessMode` varchar(24) NOT NULL DEFAULT 'price', ADD COLUMN `requiredMemberLevelId` int NULL, ADD COLUMN `completionThreshold` int NOT NULL DEFAULT 100");
    await queryRunner.query("ALTER TABLE `courses` ADD CONSTRAINT `FK_courses_required_member_level` FOREIGN KEY (`requiredMemberLevelId`) REFERENCES `member_levels`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `courses` DROP FOREIGN KEY `FK_courses_required_member_level`");
    await queryRunner.query("ALTER TABLE `courses` DROP COLUMN `completionThreshold`, DROP COLUMN `requiredMemberLevelId`, DROP COLUMN `accessMode`");
  }
}
