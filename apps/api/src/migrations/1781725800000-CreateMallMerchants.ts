import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMallMerchants1781725800000 implements MigrationInterface {
  name = "CreateMallMerchants1781725800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mall_merchants (
        id INT NOT NULL AUTO_INCREMENT,
        code VARCHAR(80) NOT NULL,
        name VARCHAR(120) NOT NULL,
        ownerType VARCHAR(16) NOT NULL,
        tenantId INT NOT NULL,
        agentId INT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        mallEnabled TINYINT NOT NULL DEFAULT 1,
        productAuditRequired TINYINT NOT NULL DEFAULT 1,
        paymentMode VARCHAR(24) NOT NULL DEFAULT 'platform_collect',
        region VARCHAR(80) NULL,
        contactName VARCHAR(100) NULL,
        contactPhone VARCHAR(40) NULL,
        logoUrl VARCHAR(500) NULL,
        notice VARCHAR(255) NULL,
        settlementConfig JSON NULL,
        remark TEXT NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE INDEX IDX_mall_merchants_code (code),
        INDEX IDX_mall_merchants_tenant_status (tenantId, status),
        INDEX IDX_mall_merchants_owner (ownerType, tenantId, agentId),
        CONSTRAINT FK_mall_merchants_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_merchants_agent FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin_mall_merchant_access (
        id INT NOT NULL AUTO_INCREMENT,
        adminId INT NOT NULL,
        merchantId INT NOT NULL,
        tenantId INT NULL,
        accessRole VARCHAR(40) NOT NULL DEFAULT 'manager',
        enabled TINYINT NOT NULL DEFAULT 1,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE INDEX IDX_admin_mall_merchant_unique (adminId, merchantId),
        INDEX IDX_admin_mall_merchant_tenant (tenantId),
        CONSTRAINT FK_admin_mall_merchant_admin FOREIGN KEY (adminId) REFERENCES admin_users(id) ON DELETE CASCADE,
        CONSTRAINT FK_admin_mall_merchant_merchant FOREIGN KEY (merchantId) REFERENCES mall_merchants(id) ON DELETE CASCADE,
        CONSTRAINT FK_admin_mall_merchant_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mall_checkout_groups (
        id INT NOT NULL AUTO_INCREMENT,
        groupNo VARCHAR(64) NOT NULL,
        tenantId INT NOT NULL,
        userId INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        goodsAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
        discountAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
        paymentMethod VARCHAR(24) NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending_payment',
        clientOrderKey VARCHAR(80) NULL,
        paymentTasks JSON NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE INDEX IDX_mall_checkout_groups_no (groupNo),
        UNIQUE INDEX IDX_mall_checkout_groups_client_key (tenantId, userId, clientOrderKey),
        INDEX IDX_mall_checkout_groups_tenant_user (tenantId, userId),
        CONSTRAINT FK_mall_checkout_groups_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT FK_mall_checkout_groups_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await this.addMerchantColumn(queryRunner, "mall_categories");
    await this.addMerchantColumn(queryRunner, "mall_products");
    await this.addMerchantColumn(queryRunner, "mall_skus");
    await this.addMerchantColumn(queryRunner, "mall_cart_items");
    await this.addMerchantColumn(queryRunner, "mall_orders");
    await this.addCheckoutGroupColumn(queryRunner);
    await this.addMerchantColumn(queryRunner, "mall_order_items");
    await this.addMerchantColumn(queryRunner, "mall_inventory_logs");
    await this.addMerchantColumn(queryRunner, "mall_refunds");
    await this.addMerchantColumn(queryRunner, "mall_payment_transactions");
    await this.addMerchantColumn(queryRunner, "mall_payment_callback_logs");
    await this.addMerchantColumn(queryRunner, "mall_refund_logs");
    await this.addMerchantColumn(queryRunner, "mall_coupons");
    await this.addMerchantColumn(queryRunner, "mall_coupon_claims");
    await this.addMerchantColumn(queryRunner, "mall_coupon_usages");
    await this.addMerchantColumn(queryRunner, "mall_logistics_companies");
    await this.addMerchantColumn(queryRunner, "mall_flash_sales");
    await this.addMerchantColumn(queryRunner, "mall_group_buys");
    await this.addMerchantColumn(queryRunner, "mall_group_buy_records");
    await this.addMerchantColumn(queryRunner, "mall_promotion_codes");
    await this.addMerchantColumn(queryRunner, "mall_commissions");
    await this.addMerchantColumn(queryRunner, "mall_favorites");
    await this.addMerchantColumn(queryRunner, "mall_browse_histories");
    await this.addMerchantColumn(queryRunner, "mall_reviews");

    await this.seedTenantMerchants(queryRunner);
    await this.seedAgentMerchants(queryRunner);
    await this.backfillMerchantIds(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropCheckoutGroupColumn(queryRunner);
    for (const table of [
      "mall_reviews",
      "mall_browse_histories",
      "mall_favorites",
      "mall_commissions",
      "mall_promotion_codes",
      "mall_group_buy_records",
      "mall_group_buys",
      "mall_flash_sales",
      "mall_logistics_companies",
      "mall_coupon_usages",
      "mall_coupon_claims",
      "mall_coupons",
      "mall_refund_logs",
      "mall_payment_callback_logs",
      "mall_payment_transactions",
      "mall_refunds",
      "mall_inventory_logs",
      "mall_order_items",
      "mall_orders",
      "mall_cart_items",
      "mall_skus",
      "mall_products",
      "mall_categories"
    ]) {
      await this.dropMerchantColumn(queryRunner, table);
    }
    await queryRunner.query("DROP TABLE IF EXISTS admin_mall_merchant_access");
    await queryRunner.query("DROP TABLE IF EXISTS mall_checkout_groups");
    await queryRunner.query("DROP TABLE IF EXISTS mall_merchants");
  }

  private async addMerchantColumn(queryRunner: QueryRunner, table: string) {
    if (!(await queryRunner.hasTable(table))) return;
    if (!(await queryRunner.hasColumn(table, "merchantId"))) {
      await queryRunner.query(`ALTER TABLE ${table} ADD COLUMN merchantId INT NULL`);
    }
    await this.createIndexIfMissing(queryRunner, table, `IDX_${table}_merchant`, "merchantId");
  }

  private async dropMerchantColumn(queryRunner: QueryRunner, table: string) {
    if (!(await queryRunner.hasTable(table))) return;
    await this.dropIndexIfExists(queryRunner, table, `IDX_${table}_merchant`);
    if (await queryRunner.hasColumn(table, "merchantId")) {
      await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN merchantId`);
    }
  }

  private async addCheckoutGroupColumn(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("mall_orders"))) return;
    if (!(await queryRunner.hasColumn("mall_orders", "checkoutGroupId"))) {
      await queryRunner.query("ALTER TABLE mall_orders ADD COLUMN checkoutGroupId INT NULL");
    }
    await this.createIndexIfMissing(queryRunner, "mall_orders", "IDX_mall_orders_checkout_group", "checkoutGroupId");
  }

  private async dropCheckoutGroupColumn(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("mall_orders"))) return;
    await this.dropIndexIfExists(queryRunner, "mall_orders", "IDX_mall_orders_checkout_group");
    if (await queryRunner.hasColumn("mall_orders", "checkoutGroupId")) {
      await queryRunner.query("ALTER TABLE mall_orders DROP COLUMN checkoutGroupId");
    }
  }

  private async createIndexIfMissing(queryRunner: QueryRunner, table: string, indexName: string, column: string) {
    const indexes = await queryRunner.query(`SHOW INDEX FROM ${table} WHERE Key_name = ?`, [indexName]);
    if (!indexes?.length) await queryRunner.query(`CREATE INDEX ${indexName} ON ${table} (${column})`);
  }

  private async dropIndexIfExists(queryRunner: QueryRunner, table: string, indexName: string) {
    const indexes = await queryRunner.query(`SHOW INDEX FROM ${table} WHERE Key_name = ?`, [indexName]);
    if (indexes?.length) await queryRunner.query(`DROP INDEX ${indexName} ON ${table}`);
  }

  private async seedTenantMerchants(queryRunner: QueryRunner) {
    await queryRunner.query(`
      INSERT INTO mall_merchants (code, name, ownerType, tenantId, agentId, status, mallEnabled, productAuditRequired, paymentMode, region, contactName, contactPhone, settlementConfig, createdAt, updatedAt)
      SELECT
        CONCAT('tenant_', t.id),
        t.name,
        'tenant',
        t.id,
        NULL,
        CASE WHEN t.enabled = 1 THEN 'active' ELSE 'disabled' END,
        CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(t.settings, '$.mallEnabled')) = 'false' THEN 0 ELSE 1 END,
        1,
        'platform_collect',
        t.region,
        t.contactName,
        t.contactPhone,
        JSON_OBJECT('source', 'tenant_default'),
        NOW(6),
        NOW(6)
      FROM tenants t
      WHERE NOT EXISTS (
        SELECT 1 FROM mall_merchants m WHERE m.ownerType = 'tenant' AND m.tenantId = t.id AND m.agentId IS NULL
      )
    `);
  }

  private async seedAgentMerchants(queryRunner: QueryRunner) {
    await queryRunner.query(`
      INSERT INTO mall_merchants (code, name, ownerType, tenantId, agentId, status, mallEnabled, productAuditRequired, paymentMode, region, contactName, contactPhone, settlementConfig, remark, createdAt, updatedAt)
      SELECT
        CONCAT('agent_', a.id),
        a.name,
        'agent',
        a.tenantId,
        a.id,
        'disabled',
        0,
        1,
        'platform_collect',
        a.region,
        a.contactName,
        a.contactPhone,
        COALESCE(a.settlementConfig, JSON_OBJECT('source', 'agent_store')),
        '代理店铺需由平台在商城店铺管理中授权开通后才会对外展示',
        NOW(6),
        NOW(6)
      FROM agents a
      WHERE a.tenantId IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM mall_merchants m WHERE m.ownerType = 'agent' AND m.agentId = a.id
        )
    `);
  }

  private async backfillMerchantIds(queryRunner: QueryRunner) {
    const tenantDefaultTables = [
      "mall_categories",
      "mall_products",
      "mall_skus",
      "mall_cart_items",
      "mall_orders",
      "mall_inventory_logs",
      "mall_refunds",
      "mall_payment_transactions",
      "mall_payment_callback_logs",
      "mall_refund_logs",
      "mall_coupons",
      "mall_coupon_claims",
      "mall_coupon_usages",
      "mall_logistics_companies",
      "mall_flash_sales",
      "mall_group_buys",
      "mall_group_buy_records",
      "mall_promotion_codes",
      "mall_commissions",
      "mall_favorites",
      "mall_browse_histories",
      "mall_reviews"
    ];
    for (const table of tenantDefaultTables) {
      if (!(await queryRunner.hasTable(table)) || !(await queryRunner.hasColumn(table, "tenantId")) || !(await queryRunner.hasColumn(table, "merchantId"))) continue;
      await queryRunner.query(`
        UPDATE ${table} target
        JOIN mall_merchants merchant ON merchant.ownerType = 'tenant' AND merchant.tenantId = target.tenantId AND merchant.agentId IS NULL
        SET target.merchantId = merchant.id
        WHERE target.merchantId IS NULL
      `);
    }

    if (await queryRunner.hasTable("mall_order_items") && await queryRunner.hasColumn("mall_order_items", "merchantId")) {
      await queryRunner.query(`
        UPDATE mall_order_items item
        JOIN mall_orders order_row ON order_row.id = item.orderId
        SET item.merchantId = order_row.merchantId
        WHERE item.merchantId IS NULL
      `);
    }
  }
}
