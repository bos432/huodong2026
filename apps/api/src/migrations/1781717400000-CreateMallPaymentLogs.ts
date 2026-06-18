import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMallPaymentLogs1781717400000 implements MigrationInterface {
  name = "CreateMallPaymentLogs1781717400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_payment_transactions"))) {
      await queryRunner.query(`
        CREATE TABLE mall_payment_transactions (
          id INT NOT NULL AUTO_INCREMENT,
          orderId INT NOT NULL,
          tenantId INT NULL,
          transactionNo VARCHAR(128) NOT NULL,
          provider VARCHAR(40) NOT NULL,
          paymentMethod VARCHAR(40) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          status VARCHAR(24) NOT NULL DEFAULT 'success',
          remark VARCHAR(255) NULL,
          reconciliationStatus VARCHAR(24) NOT NULL DEFAULT 'matched',
          discrepancyType VARCHAR(40) NULL,
          createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          UNIQUE KEY IDX_mall_payment_transactions_transactionNo (transactionNo),
          INDEX IDX_mall_payment_transactions_orderId (orderId),
          INDEX IDX_mall_payment_transactions_tenantId (tenantId),
          PRIMARY KEY (id),
          CONSTRAINT FK_mall_payment_transactions_order FOREIGN KEY (orderId) REFERENCES mall_orders(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_payment_transactions_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE SET NULL
        ) ENGINE=InnoDB
      `);
    }

    if (!(await queryRunner.hasTable("mall_payment_callback_logs"))) {
      await queryRunner.query(`
        CREATE TABLE mall_payment_callback_logs (
          id INT NOT NULL AUTO_INCREMENT,
          orderId INT NULL,
          tenantId INT NULL,
          provider VARCHAR(40) NOT NULL,
          orderNo VARCHAR(64) NULL,
          transactionNo VARCHAR(128) NULL,
          amount DECIMAL(10,2) NULL,
          signatureValid TINYINT NULL,
          resultStatus VARCHAR(24) NOT NULL DEFAULT 'received',
          resultMessage VARCHAR(255) NULL,
          payload JSON NOT NULL,
          processedAt DATETIME NULL,
          createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          INDEX IDX_mall_payment_callback_logs_orderId (orderId),
          INDEX IDX_mall_payment_callback_logs_tenantId (tenantId),
          INDEX IDX_mall_payment_callback_logs_orderNo (orderNo),
          PRIMARY KEY (id),
          CONSTRAINT FK_mall_payment_callback_logs_order FOREIGN KEY (orderId) REFERENCES mall_orders(id) ON DELETE SET NULL,
          CONSTRAINT FK_mall_payment_callback_logs_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE SET NULL
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_payment_callback_logs")) {
      await queryRunner.query("DROP TABLE mall_payment_callback_logs");
    }
    if (await queryRunner.hasTable("mall_payment_transactions")) {
      await queryRunner.query("DROP TABLE mall_payment_transactions");
    }
  }
}
