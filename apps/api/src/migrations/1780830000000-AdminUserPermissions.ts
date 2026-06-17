import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AdminUserPermissions1780830000000 implements MigrationInterface {
  name = "AdminUserPermissions1780830000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("admin_users", "permissions"))) {
      await queryRunner.addColumn("admin_users", new TableColumn({ name: "permissions", type: "json", isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("admin_users", "permissions")) {
      await queryRunner.dropColumn("admin_users", "permissions");
    }
  }
}
