import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class HomepageDecorationVersionsAndTemplates1782060000000 implements MigrationInterface {
  name = "HomepageDecorationVersionsAndTemplates1782060000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("homepage_decoration_versions"))) {
      await queryRunner.createTable(new Table({
        name: "homepage_decoration_versions",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "pageKey", type: "varchar", length: "40", default: "'home'" },
          { name: "name", type: "varchar", length: "120", isNullable: true },
          { name: "note", type: "varchar", length: "500", isNullable: true },
          { name: "sections", type: "json" },
          { name: "sectionCount", type: "int", default: 0 },
          { name: "createdById", type: "int", isNullable: true },
          { name: "createdByName", type: "varchar", length: "80", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ],
        indices: [
          { name: "IDX_homepage_versions_scope_page", columnNames: ["tenantId", "pageKey", "createdAt"] },
          { name: "IDX_homepage_versions_page", columnNames: ["pageKey", "createdAt"] }
        ],
        foreignKeys: [
          { name: "FK_homepage_versions_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }
        ]
      }));
    }

    if (!(await queryRunner.hasTable("homepage_decoration_templates"))) {
      await queryRunner.createTable(new Table({
        name: "homepage_decoration_templates",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "pageKey", type: "varchar", length: "40", default: "'home'" },
          { name: "name", type: "varchar", length: "120" },
          { name: "category", type: "varchar", length: "60", isNullable: true },
          { name: "description", type: "varchar", length: "500", isNullable: true },
          { name: "sections", type: "json" },
          { name: "sectionCount", type: "int", default: 0 },
          { name: "createdById", type: "int", isNullable: true },
          { name: "createdByName", type: "varchar", length: "80", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ],
        indices: [
          { name: "IDX_homepage_templates_scope_page", columnNames: ["tenantId", "pageKey", "updatedAt"] },
          { name: "IDX_homepage_templates_category", columnNames: ["category", "pageKey"] }
        ],
        foreignKeys: [
          { name: "FK_homepage_templates_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }
        ]
      }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("homepage_decoration_templates")) await queryRunner.dropTable("homepage_decoration_templates");
    if (await queryRunner.hasTable("homepage_decoration_versions")) await queryRunner.dropTable("homepage_decoration_versions");
  }
}
