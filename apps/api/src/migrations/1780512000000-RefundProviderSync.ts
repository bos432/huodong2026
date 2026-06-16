import { MigrationInterface, QueryRunner } from "typeorm";

export class RefundProviderSync1780512000000 implements MigrationInterface {
  name = "RefundProviderSync1780512000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("refunds", "providerRefundNo"))) {
      await queryRunner.query("ALTER TABLE refunds ADD providerRefundNo varchar(128) NULL");
    }
    if (!(await queryRunner.hasColumn("refunds", "providerRefundStatus"))) {
      await queryRunner.query("ALTER TABLE refunds ADD providerRefundStatus varchar(32) NULL");
    }
    if (!(await queryRunner.hasColumn("refunds", "providerRefundSyncedAt"))) {
      await queryRunner.query("ALTER TABLE refunds ADD providerRefundSyncedAt datetime NULL");
    }
    if (!(await queryRunner.hasColumn("refunds", "providerRefundPayload"))) {
      await queryRunner.query("ALTER TABLE refunds ADD providerRefundPayload json NULL");
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("refunds", "providerRefundPayload")) await queryRunner.query("ALTER TABLE refunds DROP COLUMN providerRefundPayload");
    if (await queryRunner.hasColumn("refunds", "providerRefundSyncedAt")) await queryRunner.query("ALTER TABLE refunds DROP COLUMN providerRefundSyncedAt");
    if (await queryRunner.hasColumn("refunds", "providerRefundStatus")) await queryRunner.query("ALTER TABLE refunds DROP COLUMN providerRefundStatus");
    if (await queryRunner.hasColumn("refunds", "providerRefundNo")) await queryRunner.query("ALTER TABLE refunds DROP COLUMN providerRefundNo");
  }
}
