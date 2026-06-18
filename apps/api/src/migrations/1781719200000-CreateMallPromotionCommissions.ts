import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMallPromotionCommissions1781719200000 implements MigrationInterface {
  name = "CreateMallPromotionCommissions1781719200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("mall_orders", "promotionCode"))) {
      await queryRunner.query("ALTER TABLE mall_orders ADD promotionCode varchar(40) NULL");
    }
    if (!(await queryRunner.hasColumn("mall_orders", "promotionSnapshot"))) {
      await queryRunner.query("ALTER TABLE mall_orders ADD promotionSnapshot json NULL");
    }

    if (!(await queryRunner.hasTable("mall_promotion_codes"))) {
      await queryRunner.query(`
        CREATE TABLE mall_promotion_codes (
          id INT NOT NULL AUTO_INCREMENT,
          tenantId INT NOT NULL,
          code VARCHAR(40) NOT NULL,
          name VARCHAR(100) NOT NULL,
          promoterUserId INT NULL,
          agentId INT NULL,
          commissionRate DECIMAL(8,4) NOT NULL DEFAULT 0,
          enabled TINYINT NOT NULL DEFAULT 1,
          orderCount INT NOT NULL DEFAULT 0,
          orderAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
          remark VARCHAR(255) NULL,
          createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE KEY IDX_mall_promotion_codes_code (code),
          INDEX IDX_mall_promotion_codes_tenantId (tenantId),
          INDEX IDX_mall_promotion_codes_agentId (agentId),
          PRIMARY KEY (id),
          CONSTRAINT FK_mall_promotion_codes_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_promotion_codes_user FOREIGN KEY (promoterUserId) REFERENCES users(id) ON DELETE SET NULL,
          CONSTRAINT FK_mall_promotion_codes_agent FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL
        ) ENGINE=InnoDB
      `);
    }

    if (!(await queryRunner.hasTable("mall_commissions"))) {
      await queryRunner.query(`
        CREATE TABLE mall_commissions (
          id INT NOT NULL AUTO_INCREMENT,
          tenantId INT NOT NULL,
          orderId INT NOT NULL,
          promotionCodeId INT NULL,
          promoterUserId INT NULL,
          agentId INT NULL,
          code VARCHAR(40) NOT NULL,
          orderAmount DECIMAL(10,2) NOT NULL,
          commissionRate DECIMAL(8,4) NOT NULL,
          commissionAmount DECIMAL(10,2) NOT NULL,
          status VARCHAR(24) NOT NULL DEFAULT 'pending',
          voidReason VARCHAR(255) NULL,
          voidedAt DATETIME NULL,
          settledAt DATETIME NULL,
          createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE KEY IDX_mall_commissions_orderId (orderId),
          INDEX IDX_mall_commissions_tenantId (tenantId),
          INDEX IDX_mall_commissions_status (status),
          INDEX IDX_mall_commissions_agentId (agentId),
          PRIMARY KEY (id),
          CONSTRAINT FK_mall_commissions_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_commissions_order FOREIGN KEY (orderId) REFERENCES mall_orders(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_commissions_code FOREIGN KEY (promotionCodeId) REFERENCES mall_promotion_codes(id) ON DELETE SET NULL,
          CONSTRAINT FK_mall_commissions_user FOREIGN KEY (promoterUserId) REFERENCES users(id) ON DELETE SET NULL,
          CONSTRAINT FK_mall_commissions_agent FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_commissions")) await queryRunner.query("DROP TABLE mall_commissions");
    if (await queryRunner.hasTable("mall_promotion_codes")) await queryRunner.query("DROP TABLE mall_promotion_codes");
    if (await queryRunner.hasColumn("mall_orders", "promotionSnapshot")) await queryRunner.query("ALTER TABLE mall_orders DROP COLUMN promotionSnapshot");
    if (await queryRunner.hasColumn("mall_orders", "promotionCode")) await queryRunner.query("ALTER TABLE mall_orders DROP COLUMN promotionCode");
  }
}
