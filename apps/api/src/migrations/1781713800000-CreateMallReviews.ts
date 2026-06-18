import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMallReviews1781713800000 implements MigrationInterface {
  name = "CreateMallReviews1781713800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_reviews")) return;
    await queryRunner.query(`
      CREATE TABLE mall_reviews (
        id INT NOT NULL AUTO_INCREMENT,
        tenantId INT NOT NULL,
        userId INT NOT NULL,
        orderId INT NOT NULL,
        orderItemId INT NOT NULL,
        productId INT NOT NULL,
        skuId INT NOT NULL,
        rating TINYINT NOT NULL DEFAULT 5,
        content VARCHAR(500) NOT NULL,
        images JSON NULL,
        status VARCHAR(24) NOT NULL DEFAULT 'pending',
        reviewRemark VARCHAR(255) NULL,
        reviewedBy VARCHAR(80) NULL,
        reviewedAt DATETIME NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_mall_reviews_tenant_status_created (tenantId, status, createdAt),
        INDEX IDX_mall_reviews_product_status_created (productId, status, createdAt),
        INDEX IDX_mall_reviews_user (userId),
        UNIQUE INDEX IDX_mall_reviews_order_item_user (orderItemId, userId),
        PRIMARY KEY (id),
        CONSTRAINT FK_mall_reviews_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_reviews_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_reviews_order FOREIGN KEY (orderId) REFERENCES mall_orders(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_reviews_order_item FOREIGN KEY (orderItemId) REFERENCES mall_order_items(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_reviews_product FOREIGN KEY (productId) REFERENCES mall_products(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_reviews_sku FOREIGN KEY (skuId) REFERENCES mall_skus(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_reviews")) await queryRunner.query("DROP TABLE mall_reviews");
  }
}
