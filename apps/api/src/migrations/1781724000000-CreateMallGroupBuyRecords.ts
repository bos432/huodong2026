import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMallGroupBuyRecords1781724000000 implements MigrationInterface {
  name = "CreateMallGroupBuyRecords1781724000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mall_group_buy_records (
        id int NOT NULL AUTO_INCREMENT,
        tenantId int NOT NULL,
        groupBuyId int NOT NULL,
        orderId int NOT NULL,
        userId int NOT NULL,
        productId int NOT NULL,
        skuId int NOT NULL,
        title varchar(120) NOT NULL,
        groupPrice decimal(10,2) NOT NULL,
        quantity int NOT NULL,
        amount decimal(10,2) NOT NULL,
        teamNo varchar(64) NOT NULL,
        teamStatus varchar(24) NOT NULL DEFAULT 'forming',
        minPeople int NOT NULL DEFAULT 2,
        paidPeople int NOT NULL DEFAULT 0,
        status varchar(24) NOT NULL DEFAULT 'pending',
        paidAt datetime NULL,
        closedAt datetime NULL,
        refundedAt datetime NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_mall_group_buy_records_tenant_status (tenantId, status),
        INDEX IDX_mall_group_buy_records_group_buy (groupBuyId),
        INDEX IDX_mall_group_buy_records_team (teamNo),
        INDEX IDX_mall_group_buy_records_order (orderId),
        CONSTRAINT FK_mall_group_buy_records_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_group_buy_records_group_buy FOREIGN KEY (groupBuyId) REFERENCES mall_group_buys(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_group_buy_records_order FOREIGN KEY (orderId) REFERENCES mall_orders(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_group_buy_records_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_group_buy_records_product FOREIGN KEY (productId) REFERENCES mall_products(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_group_buy_records_sku FOREIGN KEY (skuId) REFERENCES mall_skus(id) ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS mall_group_buy_records");
  }
}
