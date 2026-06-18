import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMallCouponUsages1781721000000 implements MigrationInterface {
  name = "CreateMallCouponUsages1781721000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("mall_coupons", "perUserLimit"))) {
      await queryRunner.query("ALTER TABLE mall_coupons ADD perUserLimit INT NOT NULL DEFAULT 0 AFTER usageLimit");
    }
    if (!(await queryRunner.hasTable("mall_coupon_usages"))) {
      await queryRunner.query(`
        CREATE TABLE mall_coupon_usages (
          id INT NOT NULL AUTO_INCREMENT,
          tenantId INT NOT NULL,
          couponId INT NOT NULL,
          orderId INT NOT NULL,
          userId INT NOT NULL,
          code VARCHAR(40) NOT NULL,
          discountAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
          status VARCHAR(24) NOT NULL DEFAULT 'used',
          releasedAt DATETIME NULL,
          releaseReason VARCHAR(255) NULL,
          createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE INDEX IDX_mall_coupon_usages_order (orderId),
          INDEX IDX_mall_coupon_usages_tenant_coupon_user_status (tenantId, couponId, userId, status),
          INDEX IDX_mall_coupon_usages_code (code),
          PRIMARY KEY (id),
          CONSTRAINT FK_mall_coupon_usages_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_coupon_usages_coupon FOREIGN KEY (couponId) REFERENCES mall_coupons(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_coupon_usages_order FOREIGN KEY (orderId) REFERENCES mall_orders(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_coupon_usages_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_coupon_usages")) await queryRunner.query("DROP TABLE mall_coupon_usages");
    if (await queryRunner.hasColumn("mall_coupons", "perUserLimit")) await queryRunner.query("ALTER TABLE mall_coupons DROP COLUMN perUserLimit");
  }
}
