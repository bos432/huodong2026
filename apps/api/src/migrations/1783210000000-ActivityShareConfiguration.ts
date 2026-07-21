import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class ActivityShareConfiguration1783210000000 implements MigrationInterface {
  name = "ActivityShareConfiguration1783210000000";
  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("activities"))) return;
    const columns = [
      new TableColumn({ name: "shareTitle", type: "varchar", length: "200", isNullable: true }),
      new TableColumn({ name: "shareDescription", type: "varchar", length: "500", isNullable: true }),
      new TableColumn({ name: "shareImageUrl", type: "varchar", length: "500", isNullable: true })
    ];
    for (const column of columns) if (!(await queryRunner.hasColumn("activities", column.name))) await queryRunner.addColumn("activities", column);
  }
  async down(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("activities"))) return;
    for (const name of ["shareImageUrl", "shareDescription", "shareTitle"]) if (await queryRunner.hasColumn("activities", name)) await queryRunner.dropColumn("activities", name);
  }
}
