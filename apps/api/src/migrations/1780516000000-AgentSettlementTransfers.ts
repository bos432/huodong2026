import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class AgentSettlementTransfers1780516000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("agent_settlement_transfers")) return;
    await queryRunner.createTable(
      new Table({
        name: "agent_settlement_transfers",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "settlementId", type: "int" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "agentId", type: "int" },
          { name: "accountId", type: "int", isNullable: true },
          { name: "provider", type: "varchar", length: "40" },
          { name: "mode", type: "varchar", length: "16", default: "'sandbox'" },
          { name: "transferNo", type: "varchar", length: "128", isUnique: true },
          { name: "providerTransferNo", type: "varchar", length: "128", isNullable: true },
          { name: "amount", type: "decimal", precision: 10, scale: 2 },
          { name: "status", type: "varchar", length: "24", default: "'pending'" },
          { name: "failureReason", type: "varchar", length: "500", isNullable: true },
          { name: "requestedBy", type: "varchar", length: "100", isNullable: true },
          { name: "requestedAt", type: "datetime", isNullable: true },
          { name: "syncedAt", type: "datetime", isNullable: true },
          { name: "completedAt", type: "datetime", isNullable: true },
          { name: "retryCount", type: "int", default: 0 },
          { name: "nextQueryAt", type: "datetime", isNullable: true },
          { name: "remark", type: "varchar", length: "255", isNullable: true },
          { name: "payload", type: "json", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      })
    );
    await queryRunner.createForeignKey("agent_settlement_transfers", new TableForeignKey({ columnNames: ["settlementId"], referencedTableName: "agent_settlements", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createForeignKey("agent_settlement_transfers", new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    await queryRunner.createForeignKey("agent_settlement_transfers", new TableForeignKey({ columnNames: ["agentId"], referencedTableName: "agents", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createForeignKey("agent_settlement_transfers", new TableForeignKey({ columnNames: ["accountId"], referencedTableName: "agent_payment_accounts", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    await queryRunner.createIndex("agent_settlement_transfers", new TableIndex({ name: "IDX_agent_settlement_transfers_settlement", columnNames: ["settlementId"] }));
    await queryRunner.createIndex("agent_settlement_transfers", new TableIndex({ name: "IDX_agent_settlement_transfers_tenant", columnNames: ["tenantId"] }));
    await queryRunner.createIndex("agent_settlement_transfers", new TableIndex({ name: "IDX_agent_settlement_transfers_status", columnNames: ["status", "nextQueryAt"] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("agent_settlement_transfers")) await queryRunner.dropTable("agent_settlement_transfers");
  }
}
