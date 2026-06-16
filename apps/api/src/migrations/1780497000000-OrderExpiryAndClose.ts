import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderExpiryAndClose1780497000000 implements MigrationInterface {
  name = "OrderExpiryAndClose1780497000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("orders", "expiresAt"))) {
      await queryRunner.query("ALTER TABLE orders ADD expiresAt datetime NULL");
    }
    if (!(await queryRunner.hasColumn("orders", "closedAt"))) {
      await queryRunner.query("ALTER TABLE orders ADD closedAt datetime NULL");
    }
    if (!(await queryRunner.hasColumn("orders", "closeReason"))) {
      await queryRunner.query("ALTER TABLE orders ADD closeReason varchar(255) NULL");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("orders", "closeReason")) await queryRunner.query("ALTER TABLE orders DROP COLUMN closeReason");
    if (await queryRunner.hasColumn("orders", "closedAt")) await queryRunner.query("ALTER TABLE orders DROP COLUMN closedAt");
    if (await queryRunner.hasColumn("orders", "expiresAt")) await queryRunner.query("ALTER TABLE orders DROP COLUMN expiresAt");
  }
}
