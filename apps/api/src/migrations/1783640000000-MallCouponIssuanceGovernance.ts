import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class MallCouponIssuanceGovernance1783640000000 implements MigrationInterface {
  name = "MallCouponIssuanceGovernance1783640000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_coupons"))) return;
    if (!(await queryRunner.hasColumn("mall_coupons", "issuanceLimit"))) await queryRunner.addColumn("mall_coupons", new TableColumn({ name: "issuanceLimit", type: "int", default: 0 }));
    if (!(await queryRunner.hasColumn("mall_coupons", "claimedCount"))) await queryRunner.addColumn("mall_coupons", new TableColumn({ name: "claimedCount", type: "int", default: 0 }));
    if (await queryRunner.hasTable("mall_coupon_claims")) {
      await queryRunner.query(`
        UPDATE mall_coupons coupon
        LEFT JOIN (
          SELECT couponId, COALESCE(SUM(claimedCount), 0) AS claimedCount
          FROM mall_coupon_claims
          GROUP BY couponId
        ) claim ON claim.couponId = coupon.id
        SET coupon.claimedCount = COALESCE(claim.claimedCount, 0)
      `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_coupons"))) return;
    if (await queryRunner.hasColumn("mall_coupons", "claimedCount")) await queryRunner.dropColumn("mall_coupons", "claimedCount");
    if (await queryRunner.hasColumn("mall_coupons", "issuanceLimit")) await queryRunner.dropColumn("mall_coupons", "issuanceLimit");
  }
}
