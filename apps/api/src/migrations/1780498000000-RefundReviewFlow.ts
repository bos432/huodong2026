import { MigrationInterface, QueryRunner } from "typeorm";

export class RefundReviewFlow1780498000000 implements MigrationInterface {
  name = "RefundReviewFlow1780498000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("refunds", "reviewedBy"))) {
      await queryRunner.query("ALTER TABLE refunds ADD reviewedBy varchar(100) NULL");
    }
    if (!(await queryRunner.hasColumn("refunds", "reviewRemark"))) {
      await queryRunner.query("ALTER TABLE refunds ADD reviewRemark varchar(255) NULL");
    }
    if (!(await queryRunner.hasColumn("refunds", "reviewedAt"))) {
      await queryRunner.query("ALTER TABLE refunds ADD reviewedAt datetime NULL");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("refunds", "reviewedAt")) await queryRunner.query("ALTER TABLE refunds DROP COLUMN reviewedAt");
    if (await queryRunner.hasColumn("refunds", "reviewRemark")) await queryRunner.query("ALTER TABLE refunds DROP COLUMN reviewRemark");
    if (await queryRunner.hasColumn("refunds", "reviewedBy")) await queryRunner.query("ALTER TABLE refunds DROP COLUMN reviewedBy");
  }
}
