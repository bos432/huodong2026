import { MigrationInterface, QueryRunner, TableForeignKey, TableIndex } from "typeorm";

const tenantTables = ["operation_settings", "homepage_sections", "announcements"];

export class TenantOperationContent1780521000000 implements MigrationInterface {
  name = "TenantOperationContent1780521000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const tenantId = await this.defaultTenantId(queryRunner);
    if (!tenantId) return;
    for (const table of tenantTables) {
      await this.addTenantColumn(queryRunner, table);
      await this.backfillTenant(queryRunner, table, tenantId);
      await this.addTenantIndex(queryRunner, table);
      await this.addTenantForeignKey(queryRunner, table);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...tenantTables].reverse()) {
      if (!(await queryRunner.hasTable(table)) || !(await queryRunner.hasColumn(table, "tenantId"))) continue;
      const currentTable = await queryRunner.getTable(table);
      const foreignKey = currentTable?.foreignKeys.find((key) => key.columnNames.includes("tenantId"));
      if (foreignKey) await queryRunner.dropForeignKey(table, foreignKey);
      const index = currentTable?.indices.find((item) => item.name === `IDX_${table}_tenantId`);
      if (index) await queryRunner.dropIndex(table, index);
      await queryRunner.dropColumn(table, "tenantId");
    }
  }

  private async defaultTenantId(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("tenants"))) return null;
    const rows = await queryRunner.query("SELECT id FROM tenants WHERE code = ? LIMIT 1", ["platform"]);
    return rows[0]?.id ? Number(rows[0].id) : null;
  }

  private async addTenantColumn(queryRunner: QueryRunner, table: string) {
    if (!(await queryRunner.hasTable(table)) || (await queryRunner.hasColumn(table, "tenantId"))) return;
    await queryRunner.query(`ALTER TABLE ${table} ADD tenantId int NULL`);
  }

  private async backfillTenant(queryRunner: QueryRunner, table: string, tenantId: number) {
    if (!(await queryRunner.hasTable(table)) || !(await queryRunner.hasColumn(table, "tenantId"))) return;
    await queryRunner.query(`UPDATE ${table} SET tenantId = ? WHERE tenantId IS NULL`, [tenantId]);
  }

  private async addTenantIndex(queryRunner: QueryRunner, table: string) {
    if (!(await queryRunner.hasTable(table)) || !(await queryRunner.hasColumn(table, "tenantId"))) return;
    const currentTable = await queryRunner.getTable(table);
    if (currentTable?.indices.some((index) => index.name === `IDX_${table}_tenantId`)) return;
    await queryRunner.createIndex(table, new TableIndex({ name: `IDX_${table}_tenantId`, columnNames: ["tenantId"] }));
  }

  private async addTenantForeignKey(queryRunner: QueryRunner, table: string) {
    if (!(await queryRunner.hasTable(table)) || !(await queryRunner.hasColumn(table, "tenantId"))) return;
    const currentTable = await queryRunner.getTable(table);
    if (currentTable?.foreignKeys.some((key) => key.columnNames.includes("tenantId"))) return;
    await queryRunner.createForeignKey(
      table,
      new TableForeignKey({
        columnNames: ["tenantId"],
        referencedTableName: "tenants",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL"
      })
    );
  }
}
