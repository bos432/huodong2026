import { MigrationInterface, QueryRunner } from "typeorm";

export class PaymentReconciliation1780499000000 implements MigrationInterface {
  name = "PaymentReconciliation1780499000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("payment_transactions", "reconciliationStatus"))) {
      await queryRunner.query("ALTER TABLE payment_transactions ADD reconciliationStatus varchar(24) NOT NULL DEFAULT 'matched'");
    }
    if (!(await queryRunner.hasColumn("payment_transactions", "discrepancyType"))) {
      await queryRunner.query("ALTER TABLE payment_transactions ADD discrepancyType varchar(40) NULL");
    }
    if (!(await queryRunner.hasColumn("payment_transactions", "reconciledBy"))) {
      await queryRunner.query("ALTER TABLE payment_transactions ADD reconciledBy varchar(100) NULL");
    }
    if (!(await queryRunner.hasColumn("payment_transactions", "reconciliationRemark"))) {
      await queryRunner.query("ALTER TABLE payment_transactions ADD reconciliationRemark varchar(255) NULL");
    }
    if (!(await queryRunner.hasColumn("payment_transactions", "reconciledAt"))) {
      await queryRunner.query("ALTER TABLE payment_transactions ADD reconciledAt datetime NULL");
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("payment_transactions", "reconciledAt")) await queryRunner.query("ALTER TABLE payment_transactions DROP COLUMN reconciledAt");
    if (await queryRunner.hasColumn("payment_transactions", "reconciliationRemark")) await queryRunner.query("ALTER TABLE payment_transactions DROP COLUMN reconciliationRemark");
    if (await queryRunner.hasColumn("payment_transactions", "reconciledBy")) await queryRunner.query("ALTER TABLE payment_transactions DROP COLUMN reconciledBy");
    if (await queryRunner.hasColumn("payment_transactions", "discrepancyType")) await queryRunner.query("ALTER TABLE payment_transactions DROP COLUMN discrepancyType");
    if (await queryRunner.hasColumn("payment_transactions", "reconciliationStatus")) await queryRunner.query("ALTER TABLE payment_transactions DROP COLUMN reconciliationStatus");
  }
}
