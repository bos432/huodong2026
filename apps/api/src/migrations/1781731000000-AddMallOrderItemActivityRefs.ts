import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMallOrderItemActivityRefs1781731000000 implements MigrationInterface {
  name = "AddMallOrderItemActivityRefs1781731000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_order_items"))) return;

    if (!(await queryRunner.hasColumn("mall_order_items", "flashSaleId"))) {
      await queryRunner.query("ALTER TABLE mall_order_items ADD COLUMN flashSaleId INT NULL");
    }
    if (!(await queryRunner.hasColumn("mall_order_items", "groupBuyId"))) {
      await queryRunner.query("ALTER TABLE mall_order_items ADD COLUMN groupBuyId INT NULL");
    }

    await this.createIndexIfMissing(queryRunner, "IDX_mall_order_items_flash_sale", "flashSaleId");
    await this.createIndexIfMissing(queryRunner, "IDX_mall_order_items_group_buy", "groupBuyId");

    if (await queryRunner.hasTable("mall_flash_sales")) {
      await this.createForeignKeyIfMissing(queryRunner, "FK_mall_order_items_flash_sale", "flashSaleId", "mall_flash_sales");
    }
    if (await queryRunner.hasTable("mall_group_buys")) {
      await this.createForeignKeyIfMissing(queryRunner, "FK_mall_order_items_group_buy", "groupBuyId", "mall_group_buys");
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_order_items"))) return;

    await this.dropForeignKeyIfExists(queryRunner, "FK_mall_order_items_group_buy");
    await this.dropForeignKeyIfExists(queryRunner, "FK_mall_order_items_flash_sale");
    await this.dropIndexIfExists(queryRunner, "IDX_mall_order_items_group_buy");
    await this.dropIndexIfExists(queryRunner, "IDX_mall_order_items_flash_sale");

    if (await queryRunner.hasColumn("mall_order_items", "groupBuyId")) {
      await queryRunner.query("ALTER TABLE mall_order_items DROP COLUMN groupBuyId");
    }
    if (await queryRunner.hasColumn("mall_order_items", "flashSaleId")) {
      await queryRunner.query("ALTER TABLE mall_order_items DROP COLUMN flashSaleId");
    }
  }

  private async createIndexIfMissing(queryRunner: QueryRunner, name: string, column: string) {
    const indexes = await queryRunner.query("SHOW INDEX FROM mall_order_items WHERE Key_name = ?", [name]);
    if (!indexes?.length) await queryRunner.query(`CREATE INDEX ${name} ON mall_order_items (${column})`);
  }

  private async dropIndexIfExists(queryRunner: QueryRunner, name: string) {
    const indexes = await queryRunner.query("SHOW INDEX FROM mall_order_items WHERE Key_name = ?", [name]);
    if (indexes?.length) await queryRunner.query(`DROP INDEX ${name} ON mall_order_items`);
  }

  private async createForeignKeyIfMissing(queryRunner: QueryRunner, name: string, column: string, targetTable: string) {
    const keys = await queryRunner.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mall_order_items'
        AND CONSTRAINT_NAME = ?
    `, [name]);
    if (!keys?.length) {
      await queryRunner.query(`ALTER TABLE mall_order_items ADD CONSTRAINT ${name} FOREIGN KEY (${column}) REFERENCES ${targetTable}(id) ON DELETE SET NULL`);
    }
  }

  private async dropForeignKeyIfExists(queryRunner: QueryRunner, name: string) {
    const keys = await queryRunner.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mall_order_items'
        AND CONSTRAINT_NAME = ?
    `, [name]);
    if (keys?.length) await queryRunner.query(`ALTER TABLE mall_order_items DROP FOREIGN KEY ${name}`);
  }
}
