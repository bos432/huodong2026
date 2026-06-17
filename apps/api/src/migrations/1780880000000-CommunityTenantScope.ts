import { MigrationInterface, QueryRunner, TableForeignKey, TableIndex } from "typeorm";

const scopedTables = ["community_activities", "community_posts", "checkin_tasks", "community_checkins"];

export class CommunityTenantScope1780880000000 implements MigrationInterface {
  name = "CommunityTenantScope1780880000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const tenantId = await this.defaultTenantId(queryRunner);
    for (const table of scopedTables) {
      await this.addTenantColumn(queryRunner, table);
      if (tenantId) await this.backfillTenant(queryRunner, table, tenantId);
      await this.addTenantIndex(queryRunner, table);
      await this.addTenantForeignKey(queryRunner, table);
    }
    await this.rebuildCommunityCheckinUniqueIndex(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...scopedTables].reverse()) {
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

  private async rebuildCommunityCheckinUniqueIndex(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("community_checkins")) || !(await queryRunner.hasColumn("community_checkins", "tenantId"))) return;
    const table = await queryRunner.getTable("community_checkins");
    const oldIndex = table?.indices.find((index) => index.name === "IDX_community_checkins_user_date");
    if (oldIndex) await queryRunner.dropIndex("community_checkins", oldIndex);
    const currentTable = await queryRunner.getTable("community_checkins");
    if (currentTable?.indices.some((index) => index.name === "IDX_community_checkins_user_tenant_date")) return;
    await queryRunner.createIndex("community_checkins", new TableIndex({ name: "IDX_community_checkins_user_tenant_date", columnNames: ["userId", "tenantId", "date"], isUnique: true }));
  }
}
