import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class ActivitySectionImages1780507000000 implements MigrationInterface {
  name = "ActivitySectionImages1780507000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("activity_sections"))) return;
    if (!(await queryRunner.hasColumn("activity_sections", "imageUrl"))) {
      await queryRunner.addColumn("activity_sections", new TableColumn({ name: "imageUrl", type: "varchar", length: "500", isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("activity_sections"))) return;
    if (await queryRunner.hasColumn("activity_sections", "imageUrl")) await queryRunner.dropColumn("activity_sections", "imageUrl");
  }
}
