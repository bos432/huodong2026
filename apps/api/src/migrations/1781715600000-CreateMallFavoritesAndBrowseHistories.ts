import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMallFavoritesAndBrowseHistories1781715600000 implements MigrationInterface {
  name = "CreateMallFavoritesAndBrowseHistories1781715600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_favorites"))) {
      await queryRunner.query(`
        CREATE TABLE mall_favorites (
          id INT NOT NULL AUTO_INCREMENT,
          tenantId INT NOT NULL,
          userId INT NOT NULL,
          productId INT NOT NULL,
          createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          UNIQUE INDEX IDX_mall_favorites_unique_user_product (tenantId, userId, productId),
          INDEX IDX_mall_favorites_user_created (tenantId, userId, createdAt),
          PRIMARY KEY (id),
          CONSTRAINT FK_mall_favorites_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_favorites_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_favorites_product FOREIGN KEY (productId) REFERENCES mall_products(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `);
    }
    if (!(await queryRunner.hasTable("mall_browse_histories"))) {
      await queryRunner.query(`
        CREATE TABLE mall_browse_histories (
          id INT NOT NULL AUTO_INCREMENT,
          tenantId INT NOT NULL,
          userId INT NOT NULL,
          productId INT NOT NULL,
          viewCount INT NOT NULL DEFAULT 1,
          lastViewedAt DATETIME NOT NULL,
          createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE INDEX IDX_mall_browse_unique_user_product (tenantId, userId, productId),
          INDEX IDX_mall_browse_user_last (tenantId, userId, lastViewedAt),
          PRIMARY KEY (id),
          CONSTRAINT FK_mall_browse_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_browse_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_browse_product FOREIGN KEY (productId) REFERENCES mall_products(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_browse_histories")) await queryRunner.query("DROP TABLE mall_browse_histories");
    if (await queryRunner.hasTable("mall_favorites")) await queryRunner.query("DROP TABLE mall_favorites");
  }
}
