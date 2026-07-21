import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class MallCommissionRules1783680000000 implements MigrationInterface {
  name = "MallCommissionRules1783680000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("agents")) {
      if (!(await queryRunner.hasColumn("agents", "parentAgentId"))) await queryRunner.addColumn("agents", new TableColumn({ name: "parentAgentId", type: "int", isNullable: true }));
      const agents = await queryRunner.getTable("agents");
      if (!agents?.foreignKeys.some((key) => key.name === "FK_agents_parent_agent")) await queryRunner.createForeignKey("agents", new TableForeignKey({ name: "FK_agents_parent_agent", columnNames: ["parentAgentId"], referencedTableName: "agents", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
      if (!agents?.indices.some((index) => index.name === "IDX_agents_parent_agent")) await queryRunner.createIndex("agents", new TableIndex({ name: "IDX_agents_parent_agent", columnNames: ["parentAgentId"] }));
    }

    if (!(await queryRunner.hasTable("mall_commission_rules"))) {
      await queryRunner.createTable(new Table({
        name: "mall_commission_rules",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int" },
          { name: "merchantId", type: "int", isNullable: true },
          { name: "productId", type: "int", isNullable: true },
          { name: "promotionCodeId", type: "int", isNullable: true },
          { name: "ruleKey", type: "varchar", length: "64" },
          { name: "name", type: "varchar", length: "120" },
          { name: "scopeType", type: "varchar", length: "16" },
          { name: "version", type: "int", default: 1 },
          { name: "priority", type: "int", default: 0 },
          { name: "directRateBps", type: "int", default: 0 },
          { name: "agentLevelRatesBps", type: "json", isNullable: true },
          { name: "status", type: "varchar", length: "16", default: "'active'" },
          { name: "startsAt", type: "datetime", isNullable: true },
          { name: "endsAt", type: "datetime", isNullable: true },
          { name: "createdByAdminId", type: "int", isNullable: true },
          { name: "createdBy", type: "varchar", length: "100", isNullable: true },
          { name: "remark", type: "varchar", length: "500", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      }));
      for (const key of [
        new TableForeignKey({ name: "FK_mall_commission_rule_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_mall_commission_rule_merchant", columnNames: ["merchantId"], referencedTableName: "mall_merchants", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_mall_commission_rule_product", columnNames: ["productId"], referencedTableName: "mall_products", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_mall_commission_rule_promotion", columnNames: ["promotionCodeId"], referencedTableName: "mall_promotion_codes", referencedColumnNames: ["id"], onDelete: "CASCADE" })
      ]) await queryRunner.createForeignKey("mall_commission_rules", key);
      await queryRunner.createIndex("mall_commission_rules", new TableIndex({ name: "UQ_mall_commission_rule_version", columnNames: ["tenantId", "ruleKey", "version"], isUnique: true }));
      await queryRunner.createIndex("mall_commission_rules", new TableIndex({ name: "IDX_mall_commission_rule_scope", columnNames: ["tenantId", "scopeType", "status", "startsAt", "endsAt"] }));
    }

    if (await queryRunner.hasTable("mall_commissions")) {
      const columns: TableColumn[] = [
        new TableColumn({ name: "orderItemId", type: "int", isNullable: true }),
        new TableColumn({ name: "productId", type: "int", isNullable: true }),
        new TableColumn({ name: "ruleId", type: "int", isNullable: true }),
        new TableColumn({ name: "operationKey", type: "varchar", length: "160", isNullable: true }),
        new TableColumn({ name: "beneficiaryType", type: "varchar", length: "16", default: "'unassigned'" }),
        new TableColumn({ name: "beneficiaryKey", type: "varchar", length: "80", default: "'unassigned'" }),
        new TableColumn({ name: "beneficiaryLevel", type: "int", default: 0 }),
        new TableColumn({ name: "originalCommissionAmount", type: "decimal", precision: 10, scale: 2, default: 0 }),
        new TableColumn({ name: "ruleSnapshot", type: "json", isNullable: true }),
        new TableColumn({ name: "calculationSnapshot", type: "json", isNullable: true }),
        new TableColumn({ name: "clawbackSettledAmount", type: "decimal", precision: 10, scale: 2, default: 0 }),
        new TableColumn({ name: "clawbackSettledAt", type: "datetime", isNullable: true }),
        new TableColumn({ name: "clawbackSettledByAdminId", type: "int", isNullable: true }),
        new TableColumn({ name: "clawbackSettledBy", type: "varchar", length: "100", isNullable: true }),
        new TableColumn({ name: "clawbackSettleRemark", type: "varchar", length: "500", isNullable: true }),
        new TableColumn({ name: "clawbackOperationKey", type: "varchar", length: "160", isNullable: true }),
        new TableColumn({ name: "settleOperationKey", type: "varchar", length: "160", isNullable: true }),
        new TableColumn({ name: "riskReviewReason", type: "varchar", length: "1000", isNullable: true }),
        new TableColumn({ name: "riskReviewedByAdminId", type: "int", isNullable: true }),
        new TableColumn({ name: "riskReviewedBy", type: "varchar", length: "100", isNullable: true }),
        new TableColumn({ name: "riskReviewedAt", type: "datetime", isNullable: true })
      ];
      for (const column of columns) if (!(await queryRunner.hasColumn("mall_commissions", column.name))) await queryRunner.addColumn("mall_commissions", column);
      await queryRunner.query("UPDATE mall_commissions SET operationKey = CONCAT('legacy-order:', orderId), originalCommissionAmount = commissionAmount, beneficiaryType = CASE WHEN promoterUserId IS NOT NULL THEN 'promoter' WHEN agentId IS NOT NULL THEN 'agent' ELSE 'unassigned' END, beneficiaryKey = CASE WHEN promoterUserId IS NOT NULL THEN CONCAT('promoter:', promoterUserId) WHEN agentId IS NOT NULL THEN CONCAT('agent:', agentId) ELSE CONCAT('unassigned:', id) END WHERE operationKey IS NULL");
      await queryRunner.changeColumn("mall_commissions", "operationKey", new TableColumn({ name: "operationKey", type: "varchar", length: "160", isNullable: false }));
      const commissionTable = await queryRunner.getTable("mall_commissions");
      if (!commissionTable?.indices.some((index) => index.name === "IDX_mall_commission_order")) await queryRunner.createIndex("mall_commissions", new TableIndex({ name: "IDX_mall_commission_order", columnNames: ["orderId"] }));
      const legacyUniqueIndexes = await queryRunner.query("SELECT INDEX_NAME AS name FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mall_commissions' AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY' GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') = 'orderId'") as Array<{ name: string }>;
      for (const row of legacyUniqueIndexes) await queryRunner.query(`ALTER TABLE \`mall_commissions\` DROP INDEX \`${String(row.name).replace(/`/g, "``")}\``);
      for (const key of [
        new TableForeignKey({ name: "FK_mall_commission_order_item", columnNames: ["orderItemId"], referencedTableName: "mall_order_items", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
        new TableForeignKey({ name: "FK_mall_commission_product", columnNames: ["productId"], referencedTableName: "mall_products", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
        new TableForeignKey({ name: "FK_mall_commission_rule", columnNames: ["ruleId"], referencedTableName: "mall_commission_rules", referencedColumnNames: ["id"], onDelete: "SET NULL" })
      ]) if (!(await queryRunner.getTable("mall_commissions"))?.foreignKeys.some((existing) => existing.name === key.name)) await queryRunner.createForeignKey("mall_commissions", key);
      const current = await queryRunner.getTable("mall_commissions");
      if (!current?.indices.some((index) => index.name === "UQ_mall_commission_operation")) await queryRunner.createIndex("mall_commissions", new TableIndex({ name: "UQ_mall_commission_operation", columnNames: ["operationKey"], isUnique: true }));
      if (!current?.indices.some((index) => index.name === "IDX_mall_commission_beneficiary")) await queryRunner.createIndex("mall_commissions", new TableIndex({ name: "IDX_mall_commission_beneficiary", columnNames: ["tenantId", "beneficiaryType", "beneficiaryKey", "status"] }));
      if (!current?.indices.some((index) => index.name === "IDX_mall_commission_order")) await queryRunner.createIndex("mall_commissions", new TableIndex({ name: "IDX_mall_commission_order", columnNames: ["orderId"] }));
    }

    if (!(await queryRunner.hasTable("mall_commission_adjustments"))) {
      await queryRunner.createTable(new Table({
        name: "mall_commission_adjustments",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int" },
          { name: "merchantId", type: "int", isNullable: true },
          { name: "commissionId", type: "int" },
          { name: "orderId", type: "int" },
          { name: "refundId", type: "int", isNullable: true },
          { name: "operationKey", type: "varchar", length: "160" },
          { name: "type", type: "varchar", length: "32" },
          { name: "direction", type: "varchar", length: "8" },
          { name: "amount", type: "decimal", precision: 10, scale: 2 },
          { name: "beforeAmount", type: "decimal", precision: 10, scale: 2 },
          { name: "afterAmount", type: "decimal", precision: 10, scale: 2 },
          { name: "snapshot", type: "json", isNullable: true },
          { name: "operatorAdminId", type: "int", isNullable: true },
          { name: "operator", type: "varchar", length: "100", isNullable: true },
          { name: "remark", type: "varchar", length: "500", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      }));
      for (const key of [
        new TableForeignKey({ name: "FK_mall_commission_adjustment_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_mall_commission_adjustment_merchant", columnNames: ["merchantId"], referencedTableName: "mall_merchants", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
        new TableForeignKey({ name: "FK_mall_commission_adjustment_commission", columnNames: ["commissionId"], referencedTableName: "mall_commissions", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_mall_commission_adjustment_order", columnNames: ["orderId"], referencedTableName: "mall_orders", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_mall_commission_adjustment_refund", columnNames: ["refundId"], referencedTableName: "mall_refunds", referencedColumnNames: ["id"], onDelete: "SET NULL" })
      ]) await queryRunner.createForeignKey("mall_commission_adjustments", key);
      await queryRunner.createIndex("mall_commission_adjustments", new TableIndex({ name: "UQ_mall_commission_adjustment_operation", columnNames: ["operationKey"], isUnique: true }));
      await queryRunner.createIndex("mall_commission_adjustments", new TableIndex({ name: "IDX_mall_commission_adjustment_scope", columnNames: ["tenantId", "merchantId", "createdAt"] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_commission_adjustments")) await queryRunner.dropTable("mall_commission_adjustments", true);
    if (await queryRunner.hasTable("mall_commissions")) {
      const columns = ["riskReviewedAt", "riskReviewedBy", "riskReviewedByAdminId", "riskReviewReason", "settleOperationKey", "clawbackOperationKey", "clawbackSettleRemark", "clawbackSettledBy", "clawbackSettledByAdminId", "clawbackSettledAt", "clawbackSettledAmount", "calculationSnapshot", "ruleSnapshot", "originalCommissionAmount", "beneficiaryLevel", "beneficiaryKey", "beneficiaryType", "operationKey", "ruleId", "productId", "orderItemId"];
      for (const name of columns) if (await queryRunner.hasColumn("mall_commissions", name)) await queryRunner.dropColumn("mall_commissions", name);
    }
    if (await queryRunner.hasTable("mall_commission_rules")) await queryRunner.dropTable("mall_commission_rules", true);
    if (await queryRunner.hasTable("agents") && await queryRunner.hasColumn("agents", "parentAgentId")) await queryRunner.dropColumn("agents", "parentAgentId");
  }
}
