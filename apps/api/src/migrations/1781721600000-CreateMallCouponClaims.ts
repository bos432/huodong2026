import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMallCouponClaims1781721600000 implements MigrationInterface {
  name = "CreateMallCouponClaims1781721600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_coupon_claims"))) {
      await queryRunner.query(`
        CREATE TABLE mall_coupon_claims (
          id INT NOT NULL AUTO_INCREMENT,
          tenantId INT NOT NULL,
          couponId INT NOT NULL,
          userId INT NOT NULL,
          claimedCount INT NOT NULL DEFAULT 1,
          usedCount INT NOT NULL DEFAULT 0,
          createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE INDEX IDX_mall_coupon_claims_coupon_user (couponId, userId),
          INDEX IDX_mall_coupon_claims_tenant_user (tenantId, userId),
          PRIMARY KEY (id),
          CONSTRAINT FK_mall_coupon_claims_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_coupon_claims_coupon FOREIGN KEY (couponId) REFERENCES mall_coupons(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_coupon_claims_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_coupon_claims")) await queryRunner.query("DROP TABLE mall_coupon_claims");
  }
}
