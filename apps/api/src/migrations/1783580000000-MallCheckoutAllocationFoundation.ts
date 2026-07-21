import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class MallCheckoutAllocationFoundation1783580000000 implements MigrationInterface {
  name = "MallCheckoutAllocationFoundation1783580000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const add = async (table: string, column: TableColumn) => { if (!(await queryRunner.hasColumn(table, column.name))) await queryRunner.addColumn(table, column); };
    await add("mall_merchants", new TableColumn({ name: "freightConfig", type: "json", isNullable: true }));
    await add("mall_checkout_groups", new TableColumn({ name: "freightAmount", type: "decimal", precision: 10, scale: 2, default: 0 }));
    await add("mall_checkout_groups", new TableColumn({ name: "allocationSnapshot", type: "json", isNullable: true }));
    await add("mall_orders", new TableColumn({ name: "allocationSnapshot", type: "json", isNullable: true }));
    await queryRunner.query("UPDATE `mall_merchants` SET `freightConfig` = COALESCE(`freightConfig`, JSON_OBJECT('enabled', true, 'baseFreightFen', 0, 'freeThresholdFen', 0))");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, columns] of [["mall_orders", ["allocationSnapshot"]], ["mall_checkout_groups", ["allocationSnapshot", "freightAmount"]], ["mall_merchants", ["freightConfig"]]] as Array<[string, string[]]>) {
      for (const column of columns) if (await queryRunner.hasColumn(table, column)) await queryRunner.dropColumn(table, column);
    }
  }
}
