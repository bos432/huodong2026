import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class MallCouponPromotionRules1783650000000 implements MigrationInterface {
  name = "MallCouponPromotionRules1783650000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_coupons")) {
      if (!(await queryRunner.hasColumn("mall_coupons", "issuerScope"))) await queryRunner.addColumn("mall_coupons", new TableColumn({ name: "issuerScope", type: "varchar", length: "24", default: "'merchant'" }));
      if (!(await queryRunner.hasColumn("mall_coupons", "refundReleasePolicy"))) await queryRunner.addColumn("mall_coupons", new TableColumn({ name: "refundReleasePolicy", type: "varchar", length: "24", default: "'full_refund'" }));
      await queryRunner.query("UPDATE mall_coupons SET issuerScope = CASE WHEN merchantId IS NULL THEN 'platform' ELSE 'merchant' END");
    }
    if (await queryRunner.hasTable("mall_promotion_codes")) {
      if (!(await queryRunner.hasColumn("mall_promotion_codes", "startsAt"))) await queryRunner.addColumn("mall_promotion_codes", new TableColumn({ name: "startsAt", type: "datetime", isNullable: true }));
      if (!(await queryRunner.hasColumn("mall_promotion_codes", "endsAt"))) await queryRunner.addColumn("mall_promotion_codes", new TableColumn({ name: "endsAt", type: "datetime", isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_promotion_codes")) {
      if (await queryRunner.hasColumn("mall_promotion_codes", "endsAt")) await queryRunner.dropColumn("mall_promotion_codes", "endsAt");
      if (await queryRunner.hasColumn("mall_promotion_codes", "startsAt")) await queryRunner.dropColumn("mall_promotion_codes", "startsAt");
    }
    if (await queryRunner.hasTable("mall_coupons")) {
      if (await queryRunner.hasColumn("mall_coupons", "refundReleasePolicy")) await queryRunner.dropColumn("mall_coupons", "refundReleasePolicy");
      if (await queryRunner.hasColumn("mall_coupons", "issuerScope")) await queryRunner.dropColumn("mall_coupons", "issuerScope");
    }
  }
}
