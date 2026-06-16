import { MigrationInterface, QueryRunner, TableForeignKey, TableIndex } from "typeorm";

export class TenantActivityCategories1780522000000 implements MigrationInterface {
  name = "TenantActivityCategories1780522000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("activity_categories"))) return;
    await this.addTenantColumn(queryRunner);
    const tenantId = await this.defaultTenantId(queryRunner);
    if (tenantId) await queryRunner.query("UPDATE activity_categories SET tenantId = ? WHERE tenantId IS NULL", [tenantId]);
    await this.addTenantIndex(queryRunner);
    await this.addTenantForeignKey(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("activity_categories")) || !(await queryRunner.hasColumn("activity_categories", "tenantId"))) return;
    const table = await queryRunner.getTable("activity_categories");
    const foreignKey = table?.foreignKeys.find((key) => key.columnNames.includes("tenantId"));
    if (foreignKey) await queryRunner.dropForeignKey("activity_categories", foreignKey);
    const index = table?.indices.find((item) => item.name === "IDX_activity_categories_tenantId");
    if (index) await queryRunner.dropIndex("activity_categories", index);
    await queryRunner.dropColumn("activity_categories", "tenantId");
  }

  private async defaultTenantId(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("tenants"))) return null;
    const rows = await queryRunner.query("SELECT id FROM tenants WHERE code = ? LIMIT 1", ["platform"]);
    return rows[0]?.id ? Number(rows[0].id) : null;
  }

  private async addTenantColumn(queryRunner: QueryRunner) {
    if (await queryRunner.hasColumn("activity_categories", "tenantId")) return;
    await queryRunner.query("ALTER TABLE activity_categories ADD tenantId int NULL");
  }

  private async addTenantIndex(queryRunner: QueryRunner) {
    const table = await queryRunner.getTable("activity_categories");
    if (table?.indices.some((index) => index.name === "IDX_activity_categories_tenantId")) return;
    await queryRunner.createIndex("activity_categories", new TableIndex({ name: "IDX_activity_categories_tenantId", columnNames: ["tenantId"] }));
  }

  private async addTenantForeignKey(queryRunner: QueryRunner) {
    const table = await queryRunner.getTable("activity_categories");
    if (table?.foreignKeys.some((key) => key.columnNames.includes("tenantId"))) return;
    await queryRunner.createForeignKey(
      "activity_categories",
      new TableForeignKey({
        columnNames: ["tenantId"],
        referencedTableName: "tenants",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL"
      })
    );
  }
}
