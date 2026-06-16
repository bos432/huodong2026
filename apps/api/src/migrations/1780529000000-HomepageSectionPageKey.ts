import { MigrationInterface, QueryRunner } from "typeorm";

export class HomepageSectionPageKey1780529000000 implements MigrationInterface {
  name = "HomepageSectionPageKey1780529000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("homepage_sections", "pageKey"))) {
      await queryRunner.query("ALTER TABLE homepage_sections ADD pageKey varchar(40) NOT NULL DEFAULT 'home'");
    }
    await queryRunner.query("UPDATE homepage_sections SET pageKey = 'home' WHERE pageKey IS NULL OR pageKey = ''");
    const table = await queryRunner.getTable("homepage_sections");
    const hasIndex = table?.indices.some((index) => index.name === "IDX_homepage_sections_page_scope");
    const hasTenantId = table?.columns.some((column) => column.name === "tenantId");
    if (!hasIndex && hasTenantId) {
      await queryRunner.query("CREATE INDEX IDX_homepage_sections_page_scope ON homepage_sections (pageKey, tenantId, enabled, sortOrder)");
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("homepage_sections");
    if (table?.indices.some((index) => index.name === "IDX_homepage_sections_page_scope")) {
      await queryRunner.query("DROP INDEX IDX_homepage_sections_page_scope ON homepage_sections");
    }
    if (await queryRunner.hasColumn("homepage_sections", "pageKey")) {
      await queryRunner.query("ALTER TABLE homepage_sections DROP COLUMN pageKey");
    }
  }
}
