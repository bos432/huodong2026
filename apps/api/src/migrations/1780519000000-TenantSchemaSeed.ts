import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

const DEFAULT_TENANT_CODE = "platform";
const DEFAULT_TENANT_NAME = "平台机构";

const tenantTables = [
  "admin_users",
  "activities",
  "agents",
  "agent_payment_accounts",
  "agent_settlements",
  "agent_settlement_transfers",
  "registrations",
  "orders",
  "payment_transactions",
  "refunds",
  "payment_callback_logs",
  "payment_statement_records",
  "coupons",
  "ticket_types"
];

export class TenantSchemaSeed1780519000000 implements MigrationInterface {
  name = "TenantSchemaSeed1780519000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.createTenantsTable(queryRunner);
    await this.seedDefaultTenant(queryRunner);
    const tenantId = await this.defaultTenantId(queryRunner);

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

    if (await queryRunner.hasTable("tenants")) {
      await queryRunner.dropTable("tenants");
    }
  }

  private async createTenantsTable(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("tenants")) return;
    await queryRunner.createTable(
      new Table({
        name: "tenants",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "code", type: "varchar", length: "64", isUnique: true },
          { name: "name", type: "varchar", length: "120" },
          { name: "region", type: "varchar", length: "80", isNullable: true },
          { name: "contactName", type: "varchar", length: "100", isNullable: true },
          { name: "contactPhone", type: "varchar", length: "40", isNullable: true },
          { name: "enabled", type: "boolean", default: true },
          { name: "settings", type: "json", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      })
    );
  }

  private async seedDefaultTenant(queryRunner: QueryRunner) {
    await queryRunner.query(
      "INSERT INTO tenants (code, name, enabled, createdAt, updatedAt) SELECT ?, ?, true, NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE code = ?)",
      [DEFAULT_TENANT_CODE, DEFAULT_TENANT_NAME, DEFAULT_TENANT_CODE]
    );
  }

  private async defaultTenantId(queryRunner: QueryRunner) {
    const rows = await queryRunner.query("SELECT id FROM tenants WHERE code = ? LIMIT 1", [DEFAULT_TENANT_CODE]);
    return Number(rows[0].id);
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
