import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class AgentPaymentAccountGovernance1783860000000 implements MigrationInterface {
  name = "AgentPaymentAccountGovernance1783860000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("agent_payment_accounts"))) return;

    await queryRunner.query(`
      UPDATE agent_payment_accounts account
      INNER JOIN (
        SELECT agentId, provider, MAX(id) AS keepId
        FROM agent_payment_accounts
        WHERE enabled = 1
        GROUP BY agentId, provider
        HAVING COUNT(*) > 1
      ) duplicates
        ON duplicates.agentId = account.agentId
       AND duplicates.provider = account.provider
      SET account.enabled = 0
      WHERE account.enabled = 1
        AND account.id <> duplicates.keepId
    `);

    const table = await queryRunner.getTable("agent_payment_accounts");
    if (!table?.indices.some((index) => index.name === "IDX_agent_payment_accounts_agent_provider")) {
      await queryRunner.createIndex("agent_payment_accounts", new TableIndex({ name: "IDX_agent_payment_accounts_agent_provider", columnNames: ["agentId", "provider"] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("agent_payment_accounts"))) return;
    const table = await queryRunner.getTable("agent_payment_accounts");
    const composite = table?.indices.find((index) => index.name === "IDX_agent_payment_accounts_agent_provider");
    if (composite) await queryRunner.dropIndex("agent_payment_accounts", composite);
  }
}
