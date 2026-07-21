import { MigrationInterface, QueryRunner } from "typeorm";
export class CourseLearningReminders1783490000000 implements MigrationInterface {
  name = "CourseLearningReminders1783490000000";
  async up(q:QueryRunner):Promise<void>{await q.query("ALTER TABLE `user_learning` ADD `lastRemindedAt` datetime NULL");}
  async down(q:QueryRunner):Promise<void>{await q.query("ALTER TABLE `user_learning` DROP COLUMN `lastRemindedAt`");}
}
