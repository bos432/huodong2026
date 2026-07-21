import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

type IndexDefinition = {
  table: string;
  name: string;
  columns: string[];
};

const INDEXES: IndexDefinition[] = [
  { table: "admin_operation_logs", name: "IDX_admin_operation_logs_tenant_created", columns: ["tenantId", "createdAt"] },
  { table: "admin_operation_logs", name: "IDX_admin_operation_logs_action_target_created", columns: ["action", "targetType", "createdAt"] },
  { table: "admin_operation_logs", name: "IDX_admin_operation_logs_admin_created", columns: ["adminId", "createdAt"] },
  { table: "tenant_subscription_events", name: "IDX_tenant_subscription_events_action_created", columns: ["action", "createdAt"] },
  { table: "tenant_regions", name: "IDX_tenant_regions_tenant_status", columns: ["tenantId", "authorizationStatus", "enabled"] },
  { table: "tenant_regions", name: "IDX_tenant_regions_city_status", columns: ["province", "city", "authorizationStatus", "enabled"] },
  { table: "admin_users", name: "IDX_admin_users_tenant_enabled_role", columns: ["tenantId", "enabled", "role"] }
];

export class SaasGovernanceIndexes1783180000000 implements MigrationInterface {
  name = "SaasGovernanceIndexes1783180000000";

  async up(queryRunner: QueryRunner) {
    for (const definition of INDEXES) {
      if (!(await queryRunner.hasTable(definition.table))) continue;
      const table = await queryRunner.getTable(definition.table);
      const hasColumns = definition.columns.every((column) => table?.findColumnByName(column));
      if (hasColumns && !table?.indices.some((index) => index.name === definition.name)) {
        await queryRunner.createIndex(definition.table, new TableIndex({ name: definition.name, columnNames: definition.columns }));
      }
    }
  }

  async down(queryRunner: QueryRunner) {
    for (const definition of [...INDEXES].reverse()) {
      if (!(await queryRunner.hasTable(definition.table))) continue;
      const table = await queryRunner.getTable(definition.table);
      if (table?.indices.some((index) => index.name === definition.name)) await queryRunner.dropIndex(definition.table, definition.name);
    }
  }
}
