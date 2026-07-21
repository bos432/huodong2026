import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class ActivityCouponGovernance1783390000000 implements MigrationInterface {
  name = "ActivityCouponGovernance1783390000000";
  async up(queryRunner: QueryRunner) {
    for (const column of [new TableColumn({ name: "claimMode", type: "varchar", length: "24", default: "'code'" }), new TableColumn({ name: "perUserLimit", type: "int", default: 1 }), new TableColumn({ name: "claimedCount", type: "int", default: 0 })]) if (!(await queryRunner.hasColumn("coupons", column.name))) await queryRunner.addColumn("coupons", column);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS coupon_claims (id INT NOT NULL AUTO_INCREMENT, tenantId INT NULL, couponId INT NOT NULL, userId INT NOT NULL, claimedCount INT NOT NULL DEFAULT 1, usedCount INT NOT NULL DEFAULT 0, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY UQ_coupon_claim_coupon_user (couponId, userId), KEY IDX_coupon_claim_tenant_user (tenantId, userId), CONSTRAINT FK_coupon_claim_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE, CONSTRAINT FK_coupon_claim_coupon FOREIGN KEY (couponId) REFERENCES coupons(id) ON DELETE CASCADE, CONSTRAINT FK_coupon_claim_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS coupon_usages (id INT NOT NULL AUTO_INCREMENT, tenantId INT NULL, couponId INT NOT NULL, orderId INT NOT NULL, userId INT NOT NULL, discountAmount DECIMAL(10,2) NOT NULL DEFAULT 0, status VARCHAR(24) NOT NULL DEFAULT 'used', releasedAt DATETIME NULL, releaseReason VARCHAR(255) NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY UQ_coupon_usage_order (orderId), KEY IDX_coupon_usage_coupon_user_status (couponId, userId, status), CONSTRAINT FK_coupon_usage_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE, CONSTRAINT FK_coupon_usage_coupon FOREIGN KEY (couponId) REFERENCES coupons(id) ON DELETE CASCADE, CONSTRAINT FK_coupon_usage_order FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE, CONSTRAINT FK_coupon_usage_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner) {
    await queryRunner.query("DROP TABLE IF EXISTS coupon_usages"); await queryRunner.query("DROP TABLE IF EXISTS coupon_claims");
    for (const name of ["claimedCount", "perUserLimit", "claimMode"]) if (await queryRunner.hasColumn("coupons", name)) await queryRunner.dropColumn("coupons", name);
  }
}
