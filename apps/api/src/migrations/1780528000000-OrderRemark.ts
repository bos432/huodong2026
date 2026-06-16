import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderRemark1780528000000 implements MigrationInterface {
  name = "OrderRemark1780528000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("orders", "remark")) return;
    await queryRunner.query("ALTER TABLE orders ADD remark text NULL");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("orders", "remark"))) return;
    await queryRunner.query("ALTER TABLE orders DROP COLUMN remark");
  }
}
