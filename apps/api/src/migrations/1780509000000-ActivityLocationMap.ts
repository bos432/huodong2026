import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class ActivityLocationMap1780509000000 implements MigrationInterface {
  name = "ActivityLocationMap1780509000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("activities"))) return;
    if (!(await queryRunner.hasColumn("activities", "locationLatitude"))) {
      await queryRunner.addColumn("activities", new TableColumn({ name: "locationLatitude", type: "decimal", precision: 10, scale: 6, isNullable: true }));
    }
    if (!(await queryRunner.hasColumn("activities", "locationLongitude"))) {
      await queryRunner.addColumn("activities", new TableColumn({ name: "locationLongitude", type: "decimal", precision: 10, scale: 6, isNullable: true }));
    }
    if (!(await queryRunner.hasColumn("activities", "locationMapUrl"))) {
      await queryRunner.addColumn("activities", new TableColumn({ name: "locationMapUrl", type: "varchar", length: "800", isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("activities"))) return;
    if (await queryRunner.hasColumn("activities", "locationMapUrl")) await queryRunner.dropColumn("activities", "locationMapUrl");
    if (await queryRunner.hasColumn("activities", "locationLongitude")) await queryRunner.dropColumn("activities", "locationLongitude");
    if (await queryRunner.hasColumn("activities", "locationLatitude")) await queryRunner.dropColumn("activities", "locationLatitude");
  }
}
