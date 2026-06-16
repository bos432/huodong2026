import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class AgentSettlements1780514000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("agent_settlements"))) {
      await queryRunner.createTable(
        new Table({
          name: "agent_settlements",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "settlementNo", type: "varchar", length: "128", isUnique: true },
            { name: "agentId", type: "int" },
            { name: "periodStart", type: "datetime" },
            { name: "periodEnd", type: "datetime" },
            { name: "transactionCount", type: "int", default: 0 },
            { name: "refundCount", type: "int", default: 0 },
            { name: "grossAmount", type: "decimal", precision: 10, scale: 2 },
            { name: "refundAmount", type: "decimal", precision: 10, scale: 2 },
            { name: "netAmount", type: "decimal", precision: 10, scale: 2 },
            { name: "commissionRate", type: "decimal", precision: 8, scale: 4, default: "0.0000" },
            { name: "commissionAmount", type: "decimal", precision: 10, scale: 2, default: "0.00" },
            { name: "payableAmount", type: "decimal", precision: 10, scale: 2 },
            { name: "status", type: "varchar", length: "24", default: "'draft'" },
            { name: "generatedBy", type: "varchar", length: "100", isNullable: true },
            { name: "submittedAt", type: "datetime", isNullable: true },
            { name: "reviewedBy", type: "varchar", length: "100", isNullable: true },
            { name: "reviewRemark", type: "varchar", length: "255", isNullable: true },
            { name: "reviewedAt", type: "datetime", isNullable: true },
            { name: "paidBy", type: "varchar", length: "100", isNullable: true },
            { name: "paidReference", type: "varchar", length: "128", isNullable: true },
            { name: "paidProofUrl", type: "varchar", length: "500", isNullable: true },
            { name: "paidRemark", type: "varchar", length: "255", isNullable: true },
            { name: "paidAt", type: "datetime", isNullable: true },
            { name: "payload", type: "json", isNullable: true },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
            { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createForeignKey("agent_settlements", new TableForeignKey({ columnNames: ["agentId"], referencedTableName: "agents", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
      await queryRunner.createIndex("agent_settlements", new TableIndex({ name: "IDX_agent_settlements_agent_period", columnNames: ["agentId", "periodStart", "periodEnd"] }));
      await queryRunner.createIndex("agent_settlements", new TableIndex({ name: "IDX_agent_settlements_status", columnNames: ["status"] }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("agent_settlements")) await queryRunner.dropTable("agent_settlements");
  }
}
