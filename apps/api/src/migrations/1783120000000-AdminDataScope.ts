import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AdminDataScope1783120000000 implements MigrationInterface {
  name = "AdminDataScope1783120000000";
  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasColumn("admin_users", "dataScope"))) await queryRunner.addColumn("admin_users", new TableColumn({ name: "dataScope", type: "json", isNullable: true }));
    if (await queryRunner.hasTable("admin_invites") && !(await queryRunner.hasColumn("admin_invites", "dataScope"))) await queryRunner.addColumn("admin_invites", new TableColumn({ name: "dataScope", type: "json", isNullable: true }));
  }
  async down(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("admin_invites") && await queryRunner.hasColumn("admin_invites", "dataScope")) await queryRunner.dropColumn("admin_invites", "dataScope");
    if (await queryRunner.hasColumn("admin_users", "dataScope")) await queryRunner.dropColumn("admin_users", "dataScope");
  }
}
