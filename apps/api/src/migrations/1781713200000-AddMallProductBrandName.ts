import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMallProductBrandName1781713200000 implements MigrationInterface {
  name = "AddMallProductBrandName1781713200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("mall_products");
    if (table && !table.findColumnByName("brandName")) {
      await queryRunner.query("ALTER TABLE mall_products ADD COLUMN brandName VARCHAR(120) NULL AFTER description");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("mall_products");
    if (table?.findColumnByName("brandName")) {
      await queryRunner.query("ALTER TABLE mall_products DROP COLUMN brandName");
    }
  }
}
