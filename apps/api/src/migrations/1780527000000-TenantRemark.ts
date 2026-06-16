import { MigrationInterface, QueryRunner } from "typeorm";

export class TenantRemark1780527000000 implements MigrationInterface {
  name = "TenantRemark1780527000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("tenants", "remark")) return;
    await queryRunner.query("ALTER TABLE tenants ADD remark text NULL");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("tenants", "remark"))) return;
    await queryRunner.query("ALTER TABLE tenants DROP COLUMN remark");
  }
}
