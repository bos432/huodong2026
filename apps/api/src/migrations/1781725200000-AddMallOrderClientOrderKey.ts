import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMallOrderClientOrderKey1781725200000 implements MigrationInterface {
  name = "AddMallOrderClientOrderKey1781725200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_orders"))) return;
    if (!(await queryRunner.hasColumn("mall_orders", "clientOrderKey"))) {
      await queryRunner.query("ALTER TABLE mall_orders ADD COLUMN clientOrderKey varchar(80) NULL AFTER paymentMethod");
    }
    const indexes = await queryRunner.query("SHOW INDEX FROM mall_orders WHERE Key_name = 'IDX_mall_orders_client_key'");
    if (!indexes?.length) {
      await queryRunner.query("CREATE UNIQUE INDEX IDX_mall_orders_client_key ON mall_orders (tenantId, userId, clientOrderKey)");
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_orders"))) return;
    const indexes = await queryRunner.query("SHOW INDEX FROM mall_orders WHERE Key_name = 'IDX_mall_orders_client_key'");
    if (indexes?.length) await queryRunner.query("DROP INDEX IDX_mall_orders_client_key ON mall_orders");
    if (await queryRunner.hasColumn("mall_orders", "clientOrderKey")) {
      await queryRunner.query("ALTER TABLE mall_orders DROP COLUMN clientOrderKey");
    }
  }
}
