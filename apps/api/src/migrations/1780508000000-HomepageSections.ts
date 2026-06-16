import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class HomepageSections1780508000000 implements MigrationInterface {
  name = "HomepageSections1780508000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("homepage_sections")) return;
    await queryRunner.createTable(
      new Table({
        name: "homepage_sections",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "type", type: "varchar", length: "40", isNullable: false },
          { name: "title", type: "varchar", length: "120", isNullable: true },
          { name: "subtitle", type: "varchar", length: "240", isNullable: true },
          { name: "enabled", type: "tinyint", default: 1 },
          { name: "sortOrder", type: "int", default: 0 },
          { name: "config", type: "json", isNullable: true },
          { name: "layout", type: "json", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ],
        indices: [
          { name: "IDX_homepage_sections_enabled_sort", columnNames: ["enabled", "sortOrder"] },
          { name: "IDX_homepage_sections_type", columnNames: ["type"] }
        ]
      })
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("homepage_sections")) await queryRunner.dropTable("homepage_sections");
  }
}
