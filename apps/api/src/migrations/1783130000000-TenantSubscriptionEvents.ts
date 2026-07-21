import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class TenantSubscriptionEvents1783130000000 implements MigrationInterface {
  name = "TenantSubscriptionEvents1783130000000";
  async up(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("tenant_subscription_events")) return;
    await queryRunner.createTable(new Table({ name: "tenant_subscription_events", columns: [
      { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "tenantId", type: "int" }, { name: "operatorId", type: "int", isNullable: true },
      { name: "action", type: "varchar", length: "24" }, { name: "fromPlan", type: "varchar", length: "32", isNullable: true }, { name: "toPlan", type: "varchar", length: "32", isNullable: true },
      { name: "fromExpiresAt", type: "date", isNullable: true }, { name: "toExpiresAt", type: "date", isNullable: true }, { name: "beforeState", type: "json", isNullable: true }, { name: "afterState", type: "json", isNullable: true },
      { name: "remark", type: "varchar", length: "500", isNullable: true }, { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
    ] }));
    await queryRunner.createIndex("tenant_subscription_events", new TableIndex({ name: "IDX_tenant_subscription_events_tenant_created", columnNames: ["tenantId", "createdAt"] }));
    await queryRunner.createForeignKey("tenant_subscription_events", new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createForeignKey("tenant_subscription_events", new TableForeignKey({ columnNames: ["operatorId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
  }
  async down(queryRunner: QueryRunner) { if (await queryRunner.hasTable("tenant_subscription_events")) await queryRunner.dropTable("tenant_subscription_events", true); }
}
