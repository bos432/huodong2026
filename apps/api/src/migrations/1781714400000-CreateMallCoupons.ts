import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMallCoupons1781714400000 implements MigrationInterface {
  name = "CreateMallCoupons1781714400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_coupons"))) {
      await queryRunner.query(`
        CREATE TABLE mall_coupons (
          id INT NOT NULL AUTO_INCREMENT,
          tenantId INT NOT NULL,
          code VARCHAR(40) NOT NULL,
          name VARCHAR(80) NOT NULL,
          minAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
          discountAmount DECIMAL(10,2) NOT NULL,
          usageLimit INT NOT NULL DEFAULT 0,
          usedCount INT NOT NULL DEFAULT 0,
          enabled TINYINT NOT NULL DEFAULT 1,
          startsAt DATETIME NULL,
          endsAt DATETIME NULL,
          createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE INDEX IDX_mall_coupons_tenant_code (tenantId, code),
          INDEX IDX_mall_coupons_tenant_enabled (tenantId, enabled),
          PRIMARY KEY (id),
          CONSTRAINT FK_mall_coupons_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `);
    }
    if (!(await queryRunner.hasColumn("mall_orders", "discountAmount"))) await queryRunner.query("ALTER TABLE mall_orders ADD discountAmount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER goodsAmount");
    if (!(await queryRunner.hasColumn("mall_orders", "couponId"))) await queryRunner.query("ALTER TABLE mall_orders ADD couponId INT NULL AFTER discountAmount");
    if (!(await queryRunner.hasColumn("mall_orders", "couponSnapshot"))) await queryRunner.query("ALTER TABLE mall_orders ADD couponSnapshot JSON NULL AFTER couponId");
    const table = await queryRunner.getTable("mall_orders");
    const hasCouponFk = table?.foreignKeys.some((fk) => fk.columnNames.includes("couponId"));
    if (!hasCouponFk) await queryRunner.query("ALTER TABLE mall_orders ADD CONSTRAINT FK_mall_orders_coupon FOREIGN KEY (couponId) REFERENCES mall_coupons(id) ON DELETE SET NULL");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("mall_orders");
    const couponFk = table?.foreignKeys.find((fk) => fk.columnNames.includes("couponId"));
    if (couponFk) await queryRunner.dropForeignKey("mall_orders", couponFk);
    if (await queryRunner.hasColumn("mall_orders", "couponSnapshot")) await queryRunner.query("ALTER TABLE mall_orders DROP COLUMN couponSnapshot");
    if (await queryRunner.hasColumn("mall_orders", "couponId")) await queryRunner.query("ALTER TABLE mall_orders DROP COLUMN couponId");
    if (await queryRunner.hasColumn("mall_orders", "discountAmount")) await queryRunner.query("ALTER TABLE mall_orders DROP COLUMN discountAmount");
    if (await queryRunner.hasTable("mall_coupons")) await queryRunner.query("DROP TABLE mall_coupons");
  }
}
