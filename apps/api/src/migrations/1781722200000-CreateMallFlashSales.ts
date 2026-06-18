import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMallFlashSales1781722200000 implements MigrationInterface {
  name = "CreateMallFlashSales1781722200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_flash_sales"))) {
      await queryRunner.query(`
        CREATE TABLE mall_flash_sales (
          id INT NOT NULL AUTO_INCREMENT,
          tenantId INT NOT NULL,
          productId INT NOT NULL,
          skuId INT NOT NULL,
          title VARCHAR(120) NOT NULL,
          salePrice DECIMAL(10,2) NOT NULL,
          saleStock INT NOT NULL DEFAULT 0,
          lockedStock INT NOT NULL DEFAULT 0,
          soldStock INT NOT NULL DEFAULT 0,
          perUserLimit INT NOT NULL DEFAULT 1,
          startsAt DATETIME NOT NULL,
          endsAt DATETIME NOT NULL,
          status VARCHAR(24) NOT NULL DEFAULT 'draft',
          sortOrder INT NOT NULL DEFAULT 0,
          createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          INDEX IDX_mall_flash_sales_tenant_status (tenantId, status),
          INDEX IDX_mall_flash_sales_sku (skuId),
          PRIMARY KEY (id),
          CONSTRAINT FK_mall_flash_sales_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_flash_sales_product FOREIGN KEY (productId) REFERENCES mall_products(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_flash_sales_sku FOREIGN KEY (skuId) REFERENCES mall_skus(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_flash_sales")) await queryRunner.query("DROP TABLE mall_flash_sales");
  }
}
