import { MigrationInterface, QueryRunner } from "typeorm";

export class AgentSettlementProofUrl1780515000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if ((await queryRunner.hasTable("agent_settlements")) && !(await queryRunner.hasColumn("agent_settlements", "paidProofUrl"))) {
      await queryRunner.query("ALTER TABLE agent_settlements ADD paidProofUrl varchar(500) NULL");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if ((await queryRunner.hasTable("agent_settlements")) && (await queryRunner.hasColumn("agent_settlements", "paidProofUrl"))) {
      await queryRunner.query("ALTER TABLE agent_settlements DROP COLUMN paidProofUrl");
    }
  }
}
