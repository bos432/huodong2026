import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMallCouponScope1781720400000 implements MigrationInterface {
  name = "AddMallCouponScope1781720400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("mall_coupons", "scope"))) await queryRunner.query("ALTER TABLE mall_coupons ADD scope VARCHAR(24) NOT NULL DEFAULT 'all' AFTER discountAmount");
    if (!(await queryRunner.hasColumn("mall_coupons", "scopeCategoryId"))) await queryRunner.query("ALTER TABLE mall_coupons ADD scopeCategoryId INT NULL AFTER scope");
    if (!(await queryRunner.hasColumn("mall_coupons", "scopeProductId"))) await queryRunner.query("ALTER TABLE mall_coupons ADD scopeProductId INT NULL AFTER scopeCategoryId");
    const table = await queryRunner.getTable("mall_coupons");
    if (!table?.indices.some((index) => index.name === "IDX_mall_coupons_scope_category")) await queryRunner.query("CREATE INDEX IDX_mall_coupons_scope_category ON mall_coupons (scopeCategoryId)");
    if (!table?.indices.some((index) => index.name === "IDX_mall_coupons_scope_product")) await queryRunner.query("CREATE INDEX IDX_mall_coupons_scope_product ON mall_coupons (scopeProductId)");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("mall_coupons");
    const productIndex = table?.indices.find((index) => index.name === "IDX_mall_coupons_scope_product");
    if (productIndex) await queryRunner.dropIndex("mall_coupons", productIndex);
    const categoryIndex = table?.indices.find((index) => index.name === "IDX_mall_coupons_scope_category");
    if (categoryIndex) await queryRunner.dropIndex("mall_coupons", categoryIndex);
    if (await queryRunner.hasColumn("mall_coupons", "scopeProductId")) await queryRunner.query("ALTER TABLE mall_coupons DROP COLUMN scopeProductId");
    if (await queryRunner.hasColumn("mall_coupons", "scopeCategoryId")) await queryRunner.query("ALTER TABLE mall_coupons DROP COLUMN scopeCategoryId");
    if (await queryRunner.hasColumn("mall_coupons", "scope")) await queryRunner.query("ALTER TABLE mall_coupons DROP COLUMN scope");
  }
}
