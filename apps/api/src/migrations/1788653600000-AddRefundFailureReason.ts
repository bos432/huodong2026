import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRefundFailureReason1788653600000 implements MigrationInterface {
  name = "AddRefundFailureReason1788653600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("refunds") && !(await queryRunner.hasColumn("refunds", "failureReason"))) {
      await queryRunner.query("ALTER TABLE `refunds` ADD `failureReason` varchar(500) NULL");
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("refunds", "failureReason")) {
      await queryRunner.query("ALTER TABLE `refunds` DROP COLUMN `failureReason`");
    }
  }
}
