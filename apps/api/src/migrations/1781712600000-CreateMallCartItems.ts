import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMallCartItems1781712600000 implements MigrationInterface {
  name = "CreateMallCartItems1781712600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mall_cart_items (
        id INT NOT NULL AUTO_INCREMENT,
        tenantId INT NOT NULL,
        userId INT NOT NULL,
        productId INT NOT NULL,
        skuId INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_mall_cart_items_tenant_user (tenantId, userId),
        UNIQUE INDEX IDX_mall_cart_unique_user_sku (tenantId, userId, skuId),
        PRIMARY KEY (id),
        CONSTRAINT FK_mall_cart_items_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_cart_items_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_cart_items_product FOREIGN KEY (productId) REFERENCES mall_products(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_cart_items_sku FOREIGN KEY (skuId) REFERENCES mall_skus(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS mall_cart_items");
  }
}
