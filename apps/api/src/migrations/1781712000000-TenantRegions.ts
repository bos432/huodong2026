import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class TenantRegions1781712000000 implements MigrationInterface {
  name = "TenantRegions1781712000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("tenant_regions")) return;
    await queryRunner.createTable(
      new Table({
        name: "tenant_regions",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int" },
          { name: "province", type: "varchar", length: "80", isNullable: true },
          { name: "city", type: "varchar", length: "80", isNullable: true },
          { name: "district", type: "varchar", length: "80", isNullable: true },
          { name: "name", type: "varchar", length: "120" },
          { name: "latitude", type: "decimal", precision: 10, scale: 6 },
          { name: "longitude", type: "decimal", precision: 10, scale: 6 },
          { name: "radiusMeters", type: "int", default: 5000 },
          { name: "exclusive", type: "boolean", default: true },
          { name: "priority", type: "int", default: 0 },
          { name: "enabled", type: "boolean", default: true },
          { name: "remark", type: "text", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ],
        indices: [
          new TableIndex({ name: "IDX_tenant_regions_tenant", columnNames: ["tenantId"] }),
          new TableIndex({ name: "IDX_tenant_regions_enabled_priority", columnNames: ["enabled", "priority"] }),
          new TableIndex({ name: "IDX_tenant_regions_city", columnNames: ["province", "city", "district"] })
        ]
      })
    );
    await queryRunner.createForeignKey("tenant_regions", new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("tenant_regions")) await queryRunner.dropTable("tenant_regions");
  }
}
