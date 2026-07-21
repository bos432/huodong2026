import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class MallSettlementLedger1783690000000 implements MigrationInterface {
  name = "MallSettlementLedger1783690000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_settlements")) {
      const columns = [
        new TableColumn({ name: "businessKey", type: "varchar", length: "160", isNullable: true }),
        new TableColumn({ name: "netAmount", type: "decimal", precision: 12, scale: 2, default: 0 }),
        new TableColumn({ name: "platformCollectedAmount", type: "decimal", precision: 12, scale: 2, default: 0 }),
        new TableColumn({ name: "merchantDirectAmount", type: "decimal", precision: 12, scale: 2, default: 0 }),
        new TableColumn({ name: "commissionAmount", type: "decimal", precision: 12, scale: 2, default: 0 }),
        new TableColumn({ name: "commissionClawbackAmount", type: "decimal", precision: 12, scale: 2, default: 0 }),
        new TableColumn({ name: "adjustmentAmount", type: "decimal", precision: 12, scale: 2, default: 0 }),
        new TableColumn({ name: "lineCount", type: "int", default: 0 }),
        new TableColumn({ name: "calculationVersion", type: "varchar", length: "32", default: "'settlement_v2'" }),
        new TableColumn({ name: "lockedAt", type: "datetime", isNullable: true }),
        new TableColumn({ name: "generatedByAdminId", type: "int", isNullable: true }),
        new TableColumn({ name: "reviewedByAdminId", type: "int", isNullable: true }),
        new TableColumn({ name: "reviewRemark", type: "varchar", length: "500", isNullable: true }),
        new TableColumn({ name: "paidByAdminId", type: "int", isNullable: true }),
        new TableColumn({ name: "paidRemark", type: "varchar", length: "500", isNullable: true }),
        new TableColumn({ name: "paymentAccountSnapshot", type: "json", isNullable: true }),
        new TableColumn({ name: "version", type: "int", default: 1 })
      ];
      for (const column of columns) if (!(await queryRunner.hasColumn("mall_settlements", column.name))) await queryRunner.addColumn("mall_settlements", column);
      await queryRunner.query("UPDATE `mall_settlements` SET `businessKey` = CONCAT('legacy-settlement:', `id`), `netAmount` = `orderAmount` - `refundAmount`, `platformCollectedAmount` = `payableAmount` + `serviceFeeAmount`, `merchantDirectAmount` = (`orderAmount` - `refundAmount`) - (`payableAmount` + `serviceFeeAmount`), `calculationVersion` = 'legacy_v1' WHERE `businessKey` IS NULL");
      await queryRunner.changeColumn("mall_settlements", "businessKey", new TableColumn({ name: "businessKey", type: "varchar", length: "160", isNullable: false }));
      const settlements = await queryRunner.getTable("mall_settlements");
      if (!settlements?.indices.some((index) => index.name === "IDX_mall_settlements_business_key")) await queryRunner.createIndex("mall_settlements", new TableIndex({ name: "IDX_mall_settlements_business_key", columnNames: ["businessKey"], isUnique: true }));
      if (!settlements?.indices.some((index) => index.name === "IDX_mall_settlements_scope_status")) await queryRunner.createIndex("mall_settlements", new TableIndex({ name: "IDX_mall_settlements_scope_status", columnNames: ["tenantId", "merchantId", "status", "periodStart", "periodEnd"] }));
    }

    if (!(await queryRunner.hasTable("mall_settlement_lines"))) {
      await queryRunner.createTable(new Table({
        name: "mall_settlement_lines",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int" },
          { name: "merchantId", type: "int" },
          { name: "settlementId", type: "int" },
          { name: "orderId", type: "int", isNullable: true },
          { name: "refundId", type: "int", isNullable: true },
          { name: "commissionId", type: "int", isNullable: true },
          { name: "commissionAdjustmentId", type: "int", isNullable: true },
          { name: "operationKey", type: "varchar", length: "160" },
          { name: "lineType", type: "varchar", length: "32" },
          { name: "sourceType", type: "varchar", length: "32" },
          { name: "sourceId", type: "varchar", length: "80" },
          { name: "businessNo", type: "varchar", length: "100", isNullable: true },
          { name: "direction", type: "varchar", length: "8" },
          { name: "grossAmount", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "feeAmount", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "commissionAmount", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "payableAmount", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "snapshot", type: "json", isNullable: true },
          { name: "remark", type: "varchar", length: "500", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      }));
      for (const key of [
        new TableForeignKey({ name: "FK_mall_settlement_line_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_mall_settlement_line_merchant", columnNames: ["merchantId"], referencedTableName: "mall_merchants", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_mall_settlement_line_settlement", columnNames: ["settlementId"], referencedTableName: "mall_settlements", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_mall_settlement_line_order", columnNames: ["orderId"], referencedTableName: "mall_orders", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
        new TableForeignKey({ name: "FK_mall_settlement_line_refund", columnNames: ["refundId"], referencedTableName: "mall_refunds", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
        new TableForeignKey({ name: "FK_mall_settlement_line_commission", columnNames: ["commissionId"], referencedTableName: "mall_commissions", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
        new TableForeignKey({ name: "FK_mall_settlement_line_commission_adjustment", columnNames: ["commissionAdjustmentId"], referencedTableName: "mall_commission_adjustments", referencedColumnNames: ["id"], onDelete: "SET NULL" })
      ]) await queryRunner.createForeignKey("mall_settlement_lines", key);
      await queryRunner.createIndex("mall_settlement_lines", new TableIndex({ name: "UQ_mall_settlement_line_operation", columnNames: ["operationKey"], isUnique: true }));
      await queryRunner.createIndex("mall_settlement_lines", new TableIndex({ name: "IDX_mall_settlement_line_settlement", columnNames: ["settlementId", "lineType", "createdAt"] }));
      await queryRunner.createIndex("mall_settlement_lines", new TableIndex({ name: "IDX_mall_settlement_line_source", columnNames: ["tenantId", "merchantId", "sourceType", "sourceId"] }));
    }

    if (!(await queryRunner.hasTable("mall_settlement_events"))) {
      await queryRunner.createTable(new Table({
        name: "mall_settlement_events",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int" },
          { name: "merchantId", type: "int" },
          { name: "settlementId", type: "int" },
          { name: "eventKey", type: "varchar", length: "160" },
          { name: "action", type: "varchar", length: "32" },
          { name: "fromStatus", type: "varchar", length: "32", isNullable: true },
          { name: "toStatus", type: "varchar", length: "32" },
          { name: "operatorAdminId", type: "int", isNullable: true },
          { name: "operator", type: "varchar", length: "100", isNullable: true },
          { name: "remark", type: "varchar", length: "500", isNullable: true },
          { name: "snapshot", type: "json", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      }));
      for (const key of [
        new TableForeignKey({ name: "FK_mall_settlement_event_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_mall_settlement_event_merchant", columnNames: ["merchantId"], referencedTableName: "mall_merchants", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_mall_settlement_event_settlement", columnNames: ["settlementId"], referencedTableName: "mall_settlements", referencedColumnNames: ["id"], onDelete: "CASCADE" })
      ]) await queryRunner.createForeignKey("mall_settlement_events", key);
      await queryRunner.createIndex("mall_settlement_events", new TableIndex({ name: "UQ_mall_settlement_event_key", columnNames: ["eventKey"], isUnique: true }));
      await queryRunner.createIndex("mall_settlement_events", new TableIndex({ name: "IDX_mall_settlement_event_settlement", columnNames: ["settlementId", "createdAt"] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_settlement_events")) await queryRunner.dropTable("mall_settlement_events", true);
    if (await queryRunner.hasTable("mall_settlement_lines")) await queryRunner.dropTable("mall_settlement_lines", true);
    if (await queryRunner.hasTable("mall_settlements")) {
      for (const name of ["version", "paymentAccountSnapshot", "paidRemark", "paidByAdminId", "reviewRemark", "reviewedByAdminId", "generatedByAdminId", "lockedAt", "calculationVersion", "lineCount", "adjustmentAmount", "commissionClawbackAmount", "commissionAmount", "merchantDirectAmount", "platformCollectedAmount", "netAmount", "businessKey"]) {
        if (await queryRunner.hasColumn("mall_settlements", name)) await queryRunner.dropColumn("mall_settlements", name);
      }
    }
  }
}
