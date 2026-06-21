import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateTenantRegionHitLogs1781889000000 implements MigrationInterface {
  name = "CreateTenantRegionHitLogs1781889000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("tenant_region_hit_logs")) return;
    await queryRunner.createTable(
      new Table({
        name: "tenant_region_hit_logs",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "regionId", type: "int", isNullable: true },
          { name: "latitude", type: "decimal", precision: 10, scale: 6 },
          { name: "longitude", type: "decimal", precision: 10, scale: 6 },
          { name: "matched", type: "boolean", default: false },
          { name: "distanceMeters", type: "int", isNullable: true },
          { name: "source", type: "varchar", length: "40", isNullable: true },
          { name: "clientIp", type: "varchar", length: "64", isNullable: true },
          { name: "userAgent", type: "varchar", length: "255", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      })
    );
    await queryRunner.createIndex("tenant_region_hit_logs", new TableIndex({ name: "IDX_tenant_region_hit_logs_tenantId", columnNames: ["tenantId"] }));
    await queryRunner.createIndex("tenant_region_hit_logs", new TableIndex({ name: "IDX_tenant_region_hit_logs_regionId", columnNames: ["regionId"] }));
    await queryRunner.createIndex("tenant_region_hit_logs", new TableIndex({ name: "IDX_tenant_region_hit_logs_matched_createdAt", columnNames: ["matched", "createdAt"] }));
    await queryRunner.createForeignKey(
      "tenant_region_hit_logs",
      new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" })
    );
    await queryRunner.createForeignKey(
      "tenant_region_hit_logs",
      new TableForeignKey({ columnNames: ["regionId"], referencedTableName: "tenant_regions", referencedColumnNames: ["id"], onDelete: "SET NULL" })
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("tenant_region_hit_logs"))) return;
    await queryRunner.dropTable("tenant_region_hit_logs");
  }
}
