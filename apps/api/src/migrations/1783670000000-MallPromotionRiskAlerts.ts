import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class MallPromotionRiskAlerts1783670000000 implements MigrationInterface {
  name = "MallPromotionRiskAlerts1783670000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_promotion_rate_limits")) {
      if (!(await queryRunner.hasColumn("mall_promotion_rate_limits", "action"))) await queryRunner.addColumn("mall_promotion_rate_limits", new TableColumn({ name: "action", type: "varchar", length: "32", default: "'promotion_order'" }));
      let table = await queryRunner.getTable("mall_promotion_rate_limits");
      if (!table?.indices.some((index) => index.name === "IDX_mall_promotion_rate_tenant_fk")) await queryRunner.createIndex("mall_promotion_rate_limits", new TableIndex({ name: "IDX_mall_promotion_rate_tenant_fk", columnNames: ["tenantId"] }));
      table = await queryRunner.getTable("mall_promotion_rate_limits");
      const previous = table?.indices.find((index) => index.name === "UQ_mall_promotion_rate_window");
      if (previous) await queryRunner.dropIndex("mall_promotion_rate_limits", previous);
      await queryRunner.createIndex("mall_promotion_rate_limits", new TableIndex({ name: "UQ_mall_promotion_rate_window", columnNames: ["tenantId", "action", "dimension", "keyHash", "windowStartedAt"], isUnique: true }));
      table = await queryRunner.getTable("mall_promotion_rate_limits");
      if (table?.indices.some((index) => index.name === "IDX_mall_promotion_rate_tenant_fk")) await queryRunner.dropIndex("mall_promotion_rate_limits", "IDX_mall_promotion_rate_tenant_fk");
    }

    if (await queryRunner.hasTable("mall_promotion_risk_events")) {
      if (!(await queryRunner.hasColumn("mall_promotion_risk_events", "ruleCode"))) await queryRunner.addColumn("mall_promotion_risk_events", new TableColumn({ name: "ruleCode", type: "varchar", length: "48", isNullable: true }));
      if (!(await queryRunner.hasColumn("mall_promotion_risk_events", "severity"))) await queryRunner.addColumn("mall_promotion_risk_events", new TableColumn({ name: "severity", type: "varchar", length: "16", default: "'info'" }));
    }

    if (!(await queryRunner.hasTable("mall_promotion_risk_alerts"))) {
      await queryRunner.createTable(new Table({
        name: "mall_promotion_risk_alerts",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int" },
          { name: "merchantId", type: "int", isNullable: true },
          { name: "fingerprint", type: "varchar", length: "64" },
          { name: "ruleCode", type: "varchar", length: "48" },
          { name: "severity", type: "varchar", length: "16" },
          { name: "status", type: "varchar", length: "16", default: "'open'" },
          { name: "subjectType", type: "varchar", length: "32" },
          { name: "subjectId", type: "varchar", length: "100" },
          { name: "title", type: "varchar", length: "160" },
          { name: "message", type: "varchar", length: "1000" },
          { name: "detail", type: "json", isNullable: true },
          { name: "occurrenceCount", type: "int", default: 1 },
          { name: "firstDetectedAt", type: "datetime" },
          { name: "lastDetectedAt", type: "datetime" },
          { name: "resolvedByAdminId", type: "int", isNullable: true },
          { name: "resolvedBy", type: "varchar", length: "100", isNullable: true },
          { name: "resolvedAt", type: "datetime", isNullable: true },
          { name: "resolutionRemark", type: "varchar", length: "1000", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      }));
      await queryRunner.createForeignKey("mall_promotion_risk_alerts", new TableForeignKey({ name: "FK_mall_promotion_risk_alert_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
      await queryRunner.createForeignKey("mall_promotion_risk_alerts", new TableForeignKey({ name: "FK_mall_promotion_risk_alert_merchant", columnNames: ["merchantId"], referencedTableName: "mall_merchants", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
      await queryRunner.createIndex("mall_promotion_risk_alerts", new TableIndex({ name: "UQ_mall_promotion_risk_alert_fingerprint", columnNames: ["fingerprint"], isUnique: true }));
      await queryRunner.createIndex("mall_promotion_risk_alerts", new TableIndex({ name: "IDX_mall_promotion_risk_alert_scope", columnNames: ["tenantId", "merchantId", "status", "severity", "lastDetectedAt"] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_promotion_risk_alerts")) await queryRunner.dropTable("mall_promotion_risk_alerts", true);
    if (await queryRunner.hasTable("mall_promotion_risk_events")) {
      if (await queryRunner.hasColumn("mall_promotion_risk_events", "severity")) await queryRunner.dropColumn("mall_promotion_risk_events", "severity");
      if (await queryRunner.hasColumn("mall_promotion_risk_events", "ruleCode")) await queryRunner.dropColumn("mall_promotion_risk_events", "ruleCode");
    }
    if (await queryRunner.hasTable("mall_promotion_rate_limits")) {
      let table = await queryRunner.getTable("mall_promotion_rate_limits");
      if (!table?.indices.some((index) => index.name === "IDX_mall_promotion_rate_tenant_fk")) await queryRunner.createIndex("mall_promotion_rate_limits", new TableIndex({ name: "IDX_mall_promotion_rate_tenant_fk", columnNames: ["tenantId"] }));
      table = await queryRunner.getTable("mall_promotion_rate_limits");
      const current = table?.indices.find((index) => index.name === "UQ_mall_promotion_rate_window");
      if (current) await queryRunner.dropIndex("mall_promotion_rate_limits", current);
      await queryRunner.createIndex("mall_promotion_rate_limits", new TableIndex({ name: "UQ_mall_promotion_rate_window", columnNames: ["tenantId", "dimension", "keyHash", "windowStartedAt"], isUnique: true }));
      table = await queryRunner.getTable("mall_promotion_rate_limits");
      if (table?.indices.some((index) => index.name === "IDX_mall_promotion_rate_tenant_fk")) await queryRunner.dropIndex("mall_promotion_rate_limits", "IDX_mall_promotion_rate_tenant_fk");
      if (await queryRunner.hasColumn("mall_promotion_rate_limits", "action")) await queryRunner.dropColumn("mall_promotion_rate_limits", "action");
    }
  }
}
