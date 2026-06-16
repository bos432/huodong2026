import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class AgentsAndPaymentAccounts1780513000000 implements MigrationInterface {
  name = "AgentsAndPaymentAccounts1780513000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("agents"))) {
      await queryRunner.createTable(
        new Table({
          name: "agents",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "name", type: "varchar", length: "120" },
            { name: "region", type: "varchar", length: "80", isNullable: true },
            { name: "contactName", type: "varchar", length: "100", isNullable: true },
            { name: "contactPhone", type: "varchar", length: "40", isNullable: true },
            { name: "enabled", type: "boolean", default: true },
            { name: "settlementConfig", type: "json", isNullable: true },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
            { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createIndex("agents", new TableIndex({ name: "IDX_agents_region", columnNames: ["region"] }));
    }

    if (!(await queryRunner.hasTable("agent_payment_accounts"))) {
      await queryRunner.createTable(
        new Table({
          name: "agent_payment_accounts",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "agentId", type: "int" },
            { name: "provider", type: "varchar", length: "40" },
            { name: "merchantName", type: "varchar", length: "120", isNullable: true },
            { name: "merchantNo", type: "varchar", length: "128", isNullable: true },
            { name: "enabled", type: "boolean", default: true },
            { name: "config", type: "json", isNullable: true },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
            { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createForeignKey("agent_payment_accounts", new TableForeignKey({ columnNames: ["agentId"], referencedTableName: "agents", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
      await queryRunner.createIndex("agent_payment_accounts", new TableIndex({ name: "IDX_agent_payment_accounts_provider", columnNames: ["agentId", "provider"] }));
    }

    if (!(await queryRunner.hasColumn("activities", "agentId"))) {
      await queryRunner.query("ALTER TABLE activities ADD agentId int NULL");
      await queryRunner.createForeignKey("activities", new TableForeignKey({ columnNames: ["agentId"], referencedTableName: "agents", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    }
    if (!(await queryRunner.hasColumn("orders", "agentId"))) {
      await queryRunner.query("ALTER TABLE orders ADD agentId int NULL");
      await queryRunner.createForeignKey("orders", new TableForeignKey({ columnNames: ["agentId"], referencedTableName: "agents", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("orders", "agentId")) await queryRunner.query("ALTER TABLE orders DROP COLUMN agentId");
    if (await queryRunner.hasColumn("activities", "agentId")) await queryRunner.query("ALTER TABLE activities DROP COLUMN agentId");
    if (await queryRunner.hasTable("agent_payment_accounts")) await queryRunner.dropTable("agent_payment_accounts");
    if (await queryRunner.hasTable("agents")) await queryRunner.dropTable("agents");
  }
}
