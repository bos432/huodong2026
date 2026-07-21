import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AdminSessionVersion1783100000000 implements MigrationInterface {
  name = "AdminSessionVersion1783100000000";

  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasColumn("admin_users", "sessionVersion"))) {
      await queryRunner.addColumn("admin_users", new TableColumn({ name: "sessionVersion", type: "int", default: 0 }));
    }
  }

  async down(queryRunner: QueryRunner) {
    if (await queryRunner.hasColumn("admin_users", "sessionVersion")) await queryRunner.dropColumn("admin_users", "sessionVersion");
  }
}
