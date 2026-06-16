import { MigrationInterface, QueryRunner } from "typeorm";

export class UserPasswordLogin1780532000000 implements MigrationInterface {
  name = "UserPasswordLogin1780532000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn("users", "passwordHash");
    if (!hasColumn) {
      await queryRunner.query("ALTER TABLE users ADD passwordHash varchar(255) NULL");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn("users", "passwordHash");
    if (hasColumn) {
      await queryRunner.query("ALTER TABLE users DROP COLUMN passwordHash");
    }
  }
}
