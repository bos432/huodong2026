import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class MarketingPopups1782070000000 implements MigrationInterface {
  name = "MarketingPopups1782070000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("marketing_popups")) return;
    await queryRunner.createTable(new Table({
      name: "marketing_popups",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
        { name: "tenantId", type: "int", isNullable: true },
        { name: "title", type: "varchar", length: "120" },
        { name: "subtitle", type: "varchar", length: "160", isNullable: true },
        { name: "content", type: "text", isNullable: true },
        { name: "emphasis", type: "varchar", length: "180", isNullable: true },
        { name: "imageUrl", type: "varchar", length: "500", isNullable: true },
        { name: "type", type: "varchar", length: "40", default: "'notice'" },
        { name: "platforms", type: "json", isNullable: true },
        { name: "placements", type: "json", isNullable: true },
        { name: "buttons", type: "json", isNullable: true },
        { name: "frequency", type: "varchar", length: "40", default: "'once_per_day'" },
        { name: "priority", type: "int", default: 0 },
        { name: "enabled", type: "tinyint", default: 1 },
        { name: "dismissible", type: "tinyint", default: 1 },
        { name: "startAt", type: "datetime", isNullable: true },
        { name: "endAt", type: "datetime", isNullable: true },
        { name: "impressionCount", type: "int", default: 0 },
        { name: "clickCount", type: "int", default: 0 },
        { name: "closeCount", type: "int", default: 0 },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
        { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
      ],
      indices: [
        { name: "IDX_marketing_popups_tenant_enabled", columnNames: ["tenantId", "enabled", "priority"] },
        { name: "IDX_marketing_popups_schedule", columnNames: ["startAt", "endAt"] },
        { name: "IDX_marketing_popups_type", columnNames: ["type"] }
      ],
      foreignKeys: [
        { name: "FK_marketing_popups_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }
      ]
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("marketing_popups")) await queryRunner.dropTable("marketing_popups");
  }
}
