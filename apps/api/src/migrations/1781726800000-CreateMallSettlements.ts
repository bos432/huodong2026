import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMallSettlements1781726800000 implements MigrationInterface {
  name = "CreateMallSettlements1781726800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mall_settlements (
        id INT NOT NULL AUTO_INCREMENT,
        settlementNo VARCHAR(64) NOT NULL,
        tenantId INT NOT NULL,
        merchantId INT NOT NULL,
        periodStart DATE NOT NULL,
        periodEnd DATE NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        paymentMode VARCHAR(24) NOT NULL,
        orderCount INT NOT NULL DEFAULT 0,
        orderAmount DECIMAL(12,2) NOT NULL DEFAULT 0,
        refundAmount DECIMAL(12,2) NOT NULL DEFAULT 0,
        serviceFeeAmount DECIMAL(12,2) NOT NULL DEFAULT 0,
        payableAmount DECIMAL(12,2) NOT NULL DEFAULT 0,
        snapshot JSON NULL,
        generatedBy VARCHAR(80) NULL,
        reviewedBy VARCHAR(80) NULL,
        reviewedAt DATETIME NULL,
        paidBy VARCHAR(80) NULL,
        paidAt DATETIME NULL,
        paidReference VARCHAR(120) NULL,
        paidProofUrl VARCHAR(500) NULL,
        remark TEXT NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE INDEX IDX_mall_settlements_no (settlementNo),
        INDEX IDX_mall_settlements_merchant_period (merchantId, periodStart, periodEnd),
        INDEX IDX_mall_settlements_tenant_status (tenantId, status),
        CONSTRAINT FK_mall_settlements_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_settlements_merchant FOREIGN KEY (merchantId) REFERENCES mall_merchants(id) ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS mall_settlements");
  }
}
