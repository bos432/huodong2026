import { MigrationInterface, QueryRunner } from "typeorm";

export class RefundProviderCompensation1780517000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("refunds", "providerRefundFailureReason"))) {
      await queryRunner.query("ALTER TABLE refunds ADD providerRefundFailureReason varchar(500) NULL");
    }
    if (!(await queryRunner.hasColumn("refunds", "providerRefundRetryCount"))) {
      await queryRunner.query("ALTER TABLE refunds ADD providerRefundRetryCount int NOT NULL DEFAULT 0");
    }
    if (!(await queryRunner.hasColumn("refunds", "providerRefundNextQueryAt"))) {
      await queryRunner.query("ALTER TABLE refunds ADD providerRefundNextQueryAt datetime NULL");
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("refunds", "providerRefundNextQueryAt")) await queryRunner.query("ALTER TABLE refunds DROP COLUMN providerRefundNextQueryAt");
    if (await queryRunner.hasColumn("refunds", "providerRefundRetryCount")) await queryRunner.query("ALTER TABLE refunds DROP COLUMN providerRefundRetryCount");
    if (await queryRunner.hasColumn("refunds", "providerRefundFailureReason")) await queryRunner.query("ALTER TABLE refunds DROP COLUMN providerRefundFailureReason");
  }
}
