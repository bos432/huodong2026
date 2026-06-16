import { MigrationInterface, QueryRunner } from "typeorm";

export class UserWalletsAndBalancePayment1780531000000 implements MigrationInterface {
  name = "UserWalletsAndBalancePayment1780531000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_wallets (
        id int NOT NULL AUTO_INCREMENT,
        userId int NOT NULL,
        tenantId int NULL,
        tenantScopeKey varchar(32) NOT NULL DEFAULT 'platform',
        availableBalance decimal(12,2) NOT NULL DEFAULT 0,
        frozenBalance decimal(12,2) NOT NULL DEFAULT 0,
        totalRecharge decimal(12,2) NOT NULL DEFAULT 0,
        totalSpent decimal(12,2) NOT NULL DEFAULT 0,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY IDX_user_wallet_user_scope (userId, tenantScopeKey),
        INDEX IDX_user_wallet_tenant_scope (tenantScopeKey),
        CONSTRAINT FK_user_wallet_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_user_wallet_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE SET NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id int NOT NULL AUTO_INCREMENT,
        walletId int NOT NULL,
        userId int NOT NULL,
        tenantId int NULL,
        orderId int NULL,
        transactionNo varchar(64) NOT NULL,
        direction varchar(12) NOT NULL,
        type varchar(32) NOT NULL,
        amount decimal(12,2) NOT NULL,
        balanceBefore decimal(12,2) NOT NULL,
        balanceAfter decimal(12,2) NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'success',
        operator varchar(100) NULL,
        remark varchar(255) NULL,
        idempotencyKey varchar(128) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY IDX_wallet_transaction_no (transactionNo),
        UNIQUE KEY IDX_wallet_transaction_idempotency (idempotencyKey),
        CONSTRAINT FK_wallet_transaction_wallet FOREIGN KEY (walletId) REFERENCES user_wallets(id) ON DELETE CASCADE,
        CONSTRAINT FK_wallet_transaction_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_wallet_transaction_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE SET NULL,
        CONSTRAINT FK_wallet_transaction_order FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query("ALTER TABLE orders MODIFY paymentMethod enum('free','offline','wechat','alipay','balance') NOT NULL");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE orders MODIFY paymentMethod enum('free','offline','wechat','alipay') NOT NULL");
    await queryRunner.query("DROP TABLE IF EXISTS wallet_transactions");
    await queryRunner.query("DROP TABLE IF EXISTS user_wallets");
  }
}
