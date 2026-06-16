import { MigrationInterface, QueryRunner } from "typeorm";

export class CharityFund1780550000000 implements MigrationInterface {
  name = "CharityFund1780550000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS charity_fund_settings (
        id int NOT NULL AUTO_INCREMENT,
        tenantId int NULL,
        enabled tinyint NOT NULL DEFAULT 1,
        ratePercent decimal(5,2) NOT NULL DEFAULT 5,
        accrualBasis varchar(32) NOT NULL DEFAULT 'paid_amount',
        manualBasisAmount decimal(10,2) NULL,
        userDisplayName varchar(80) NOT NULL DEFAULT '我的公益贡献',
        publicNote varchar(120) NOT NULL DEFAULT '公益金来自平台订单收入计提，用户无需额外支付。',
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY IDX_charity_setting_tenant (tenantId),
        CONSTRAINT FK_charity_setting_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE SET NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS charity_fund_transactions (
        id int NOT NULL AUTO_INCREMENT,
        tenantId int NULL,
        userId int NULL,
        orderId int NULL,
        refundId int NULL,
        direction varchar(16) NOT NULL,
        type varchar(32) NOT NULL,
        amount decimal(12,2) NOT NULL,
        basisAmount decimal(12,2) NOT NULL DEFAULT 0,
        ratePercent decimal(5,2) NOT NULL DEFAULT 0,
        operator varchar(100) NULL,
        remark varchar(255) NULL,
        idempotencyKey varchar(80) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY IDX_charity_tx_idempotency (idempotencyKey),
        INDEX IDX_charity_tx_tenant_type (tenantId, type),
        INDEX IDX_charity_tx_user (userId),
        INDEX IDX_charity_tx_order (orderId),
        INDEX IDX_charity_tx_created (createdAt),
        CONSTRAINT FK_charity_tx_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE SET NULL,
        CONSTRAINT FK_charity_tx_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT FK_charity_tx_order FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL,
        CONSTRAINT FK_charity_tx_refund FOREIGN KEY (refundId) REFERENCES refunds(id) ON DELETE SET NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS charity_projects (
        id int NOT NULL AUTO_INCREMENT,
        tenantId int NULL,
        title varchar(120) NOT NULL,
        targetAmount decimal(12,2) NOT NULL,
        disbursedAmount decimal(12,2) NOT NULL DEFAULT 0,
        status varchar(32) NOT NULL DEFAULT 'fundraising',
        coverUrl varchar(500) NULL,
        description text NULL,
        executedAt datetime NULL,
        publicVisible tinyint NOT NULL DEFAULT 1,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_charity_project_tenant_status (tenantId, status),
        CONSTRAINT FK_charity_project_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE SET NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS charity_project_disbursements (
        id int NOT NULL AUTO_INCREMENT,
        projectId int NOT NULL,
        tenantId int NULL,
        operatorId int NULL,
        amount decimal(12,2) NOT NULL,
        proofUrl varchar(500) NULL,
        remark varchar(255) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_charity_disbursement_project (projectId),
        CONSTRAINT FK_charity_disbursement_project FOREIGN KEY (projectId) REFERENCES charity_projects(id) ON DELETE CASCADE,
        CONSTRAINT FK_charity_disbursement_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE SET NULL,
        CONSTRAINT FK_charity_disbursement_admin FOREIGN KEY (operatorId) REFERENCES admin_users(id) ON DELETE SET NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS charity_project_disbursements");
    await queryRunner.query("DROP TABLE IF EXISTS charity_projects");
    await queryRunner.query("DROP TABLE IF EXISTS charity_fund_transactions");
    await queryRunner.query("DROP TABLE IF EXISTS charity_fund_settings");
  }
}
