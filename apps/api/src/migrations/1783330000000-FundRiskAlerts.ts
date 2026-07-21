import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class FundRiskAlerts1783330000000 implements MigrationInterface {
  name = "FundRiskAlerts1783330000000";
  async up(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("fund_risk_alerts")) return;
    await queryRunner.createTable(new Table({ name: "fund_risk_alerts", columns: [
      { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
      { name: "tenantId", type: "int", isNullable: true }, { name: "fingerprint", type: "varchar", length: "160" },
      { name: "type", type: "varchar", length: "48" }, { name: "severity", type: "varchar", length: "16" },
      { name: "status", type: "varchar", length: "16", default: "'open'" }, { name: "title", type: "varchar", length: "120" },
      { name: "message", type: "varchar", length: "500" }, { name: "businessType", type: "varchar", length: "48", isNullable: true },
      { name: "businessNo", type: "varchar", length: "100", isNullable: true }, { name: "evidence", type: "json", isNullable: true },
      { name: "occurrenceCount", type: "int", default: 1 }, { name: "firstDetectedAt", type: "datetime" }, { name: "lastDetectedAt", type: "datetime" },
      { name: "handledBy", type: "varchar", length: "100", isNullable: true }, { name: "handledAt", type: "datetime", isNullable: true },
      { name: "handlingRemark", type: "varchar", length: "500", isNullable: true },
      { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
    ] }));
    await queryRunner.createForeignKey("fund_risk_alerts", new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createIndex("fund_risk_alerts", new TableIndex({ name: "UQ_fund_risk_fingerprint", columnNames: ["fingerprint"], isUnique: true }));
    await queryRunner.createIndex("fund_risk_alerts", new TableIndex({ name: "IDX_fund_risk_status_type", columnNames: ["status", "type"] }));
  }
  async down(queryRunner: QueryRunner) { if (await queryRunner.hasTable("fund_risk_alerts")) await queryRunner.dropTable("fund_risk_alerts"); }
}
