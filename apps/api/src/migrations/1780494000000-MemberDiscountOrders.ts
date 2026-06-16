import { MigrationInterface, QueryRunner } from "typeorm";

export class MemberDiscountOrders1780494000000 implements MigrationInterface {
  name = "MemberDiscountOrders1780494000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("orders", "memberDiscountAmount"))) {
      await queryRunner.query("ALTER TABLE orders ADD memberDiscountAmount decimal(10,2) NOT NULL DEFAULT 0");
    }
    if (!(await queryRunner.hasColumn("orders", "memberLevelId"))) {
      await queryRunner.query("ALTER TABLE orders ADD memberLevelId int NULL");
      await queryRunner.query("ALTER TABLE orders ADD CONSTRAINT FK_orders_member_level FOREIGN KEY (memberLevelId) REFERENCES member_levels(id)");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("orders", "memberLevelId")) {
      await queryRunner.query("ALTER TABLE orders DROP FOREIGN KEY FK_orders_member_level");
      await queryRunner.query("ALTER TABLE orders DROP COLUMN memberLevelId");
    }
    if (await queryRunner.hasColumn("orders", "memberDiscountAmount")) {
      await queryRunner.query("ALTER TABLE orders DROP COLUMN memberDiscountAmount");
    }
  }
}
