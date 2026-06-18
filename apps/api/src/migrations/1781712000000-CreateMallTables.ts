import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMallTables1781712000000 implements MigrationInterface {
  name = "CreateMallTables1781712000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mall_categories (
        id INT NOT NULL AUTO_INCREMENT,
        tenantId INT NOT NULL,
        name VARCHAR(80) NOT NULL,
        iconUrl VARCHAR(500) NULL,
        sortOrder INT NOT NULL DEFAULT 0,
        enabled TINYINT NOT NULL DEFAULT 1,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_mall_categories_tenant (tenantId),
        INDEX IDX_mall_categories_name (name),
        PRIMARY KEY (id),
        CONSTRAINT FK_mall_categories_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mall_products (
        id INT NOT NULL AUTO_INCREMENT,
        tenantId INT NOT NULL,
        categoryId INT NULL,
        title VARCHAR(160) NOT NULL,
        coverUrl VARCHAR(500) NULL,
        description TEXT NULL,
        brandName VARCHAR(120) NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        originalPrice DECIMAL(10,2) NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        featured TINYINT NOT NULL DEFAULT 0,
        sortOrder INT NOT NULL DEFAULT 0,
        deliveryNote VARCHAR(255) NULL,
        afterSaleNote VARCHAR(255) NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_mall_products_tenant (tenantId),
        INDEX IDX_mall_products_title (title),
        INDEX IDX_mall_products_status (status),
        PRIMARY KEY (id),
        CONSTRAINT FK_mall_products_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_products_category FOREIGN KEY (categoryId) REFERENCES mall_categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mall_skus (
        id INT NOT NULL AUTO_INCREMENT,
        tenantId INT NOT NULL,
        productId INT NOT NULL,
        name VARCHAR(120) NOT NULL,
        skuCode VARCHAR(80) NULL,
        price DECIMAL(10,2) NOT NULL,
        originalPrice DECIMAL(10,2) NOT NULL DEFAULT 0,
        stock INT NOT NULL DEFAULT 0,
        lockedStock INT NOT NULL DEFAULT 0,
        sortOrder INT NOT NULL DEFAULT 0,
        enabled TINYINT NOT NULL DEFAULT 1,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_mall_skus_tenant (tenantId),
        INDEX IDX_mall_skus_product (productId),
        INDEX IDX_mall_skus_name (name),
        PRIMARY KEY (id),
        CONSTRAINT FK_mall_skus_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_skus_product FOREIGN KEY (productId) REFERENCES mall_products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mall_addresses (
        id INT NOT NULL AUTO_INCREMENT,
        tenantId INT NOT NULL,
        userId INT NOT NULL,
        receiverName VARCHAR(40) NOT NULL,
        receiverPhone VARCHAR(32) NOT NULL,
        province VARCHAR(80) NULL,
        city VARCHAR(80) NULL,
        district VARCHAR(80) NULL,
        detail VARCHAR(255) NOT NULL,
        isDefault TINYINT NOT NULL DEFAULT 0,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_mall_addresses_tenant_user (tenantId, userId),
        PRIMARY KEY (id),
        CONSTRAINT FK_mall_addresses_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_addresses_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mall_orders (
        id INT NOT NULL AUTO_INCREMENT,
        orderNo VARCHAR(64) NOT NULL,
        tenantId INT NOT NULL,
        userId INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        goodsAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
        freightAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
        paymentMethod VARCHAR(24) NOT NULL,
        status VARCHAR(32) NOT NULL,
        transactionNo VARCHAR(128) NULL,
        addressSnapshot JSON NOT NULL,
        expressCompany VARCHAR(80) NULL,
        expressNo VARCHAR(80) NULL,
        buyerRemark VARCHAR(255) NULL,
        adminRemark VARCHAR(255) NULL,
        paidAt DATETIME NULL,
        shippedAt DATETIME NULL,
        completedAt DATETIME NULL,
        closedAt DATETIME NULL,
        closeReason VARCHAR(255) NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX IDX_mall_orders_order_no (orderNo),
        INDEX IDX_mall_orders_tenant (tenantId),
        INDEX IDX_mall_orders_user (userId),
        INDEX IDX_mall_orders_status (status),
        PRIMARY KEY (id),
        CONSTRAINT FK_mall_orders_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_orders_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mall_order_items (
        id INT NOT NULL AUTO_INCREMENT,
        tenantId INT NOT NULL,
        orderId INT NOT NULL,
        productId INT NOT NULL,
        skuId INT NOT NULL,
        productTitle VARCHAR(160) NOT NULL,
        skuName VARCHAR(120) NOT NULL,
        coverUrl VARCHAR(500) NULL,
        price DECIMAL(10,2) NOT NULL,
        quantity INT NOT NULL,
        totalAmount DECIMAL(10,2) NOT NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_mall_order_items_tenant (tenantId),
        INDEX IDX_mall_order_items_order (orderId),
        PRIMARY KEY (id),
        CONSTRAINT FK_mall_order_items_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_order_items_order FOREIGN KEY (orderId) REFERENCES mall_orders(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_order_items_product FOREIGN KEY (productId) REFERENCES mall_products(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_order_items_sku FOREIGN KEY (skuId) REFERENCES mall_skus(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mall_inventory_logs (
        id INT NOT NULL AUTO_INCREMENT,
        tenantId INT NOT NULL,
        skuId INT NOT NULL,
        orderId INT NULL,
        type VARCHAR(24) NOT NULL,
        quantity INT NOT NULL,
        stockBefore INT NOT NULL,
        stockAfter INT NOT NULL,
        lockedBefore INT NOT NULL,
        lockedAfter INT NOT NULL,
        remark VARCHAR(255) NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_mall_inventory_logs_tenant (tenantId),
        INDEX IDX_mall_inventory_logs_sku (skuId),
        PRIMARY KEY (id),
        CONSTRAINT FK_mall_inventory_logs_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_inventory_logs_sku FOREIGN KEY (skuId) REFERENCES mall_skus(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_inventory_logs_order FOREIGN KEY (orderId) REFERENCES mall_orders(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mall_refunds (
        id INT NOT NULL AUTO_INCREMENT,
        refundNo VARCHAR(64) NOT NULL,
        tenantId INT NOT NULL,
        userId INT NOT NULL,
        orderId INT NOT NULL,
        type VARCHAR(24) NOT NULL DEFAULT 'refund_only',
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        reason VARCHAR(255) NULL,
        reviewRemark VARCHAR(255) NULL,
        reviewedBy VARCHAR(80) NULL,
        reviewedAt DATETIME NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX IDX_mall_refunds_refund_no (refundNo),
        INDEX IDX_mall_refunds_tenant (tenantId),
        INDEX IDX_mall_refunds_order (orderId),
        PRIMARY KEY (id),
        CONSTRAINT FK_mall_refunds_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_refunds_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_refunds_order FOREIGN KEY (orderId) REFERENCES mall_orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS mall_refunds");
    await queryRunner.query("DROP TABLE IF EXISTS mall_inventory_logs");
    await queryRunner.query("DROP TABLE IF EXISTS mall_order_items");
    await queryRunner.query("DROP TABLE IF EXISTS mall_orders");
    await queryRunner.query("DROP TABLE IF EXISTS mall_addresses");
    await queryRunner.query("DROP TABLE IF EXISTS mall_skus");
    await queryRunner.query("DROP TABLE IF EXISTS mall_products");
    await queryRunner.query("DROP TABLE IF EXISTS mall_categories");
  }
}
