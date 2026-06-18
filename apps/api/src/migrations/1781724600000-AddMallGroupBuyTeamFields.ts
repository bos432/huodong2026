import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMallGroupBuyTeamFields1781724600000 implements MigrationInterface {
  name = "AddMallGroupBuyTeamFields1781724600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE mall_group_buy_records ADD COLUMN teamNo varchar(64) NULL");
    await queryRunner.query("UPDATE mall_group_buy_records SET teamNo = CONCAT('MGBT', id) WHERE teamNo IS NULL OR teamNo = ''");
    await queryRunner.query("ALTER TABLE mall_group_buy_records MODIFY teamNo varchar(64) NOT NULL");
    await queryRunner.query("ALTER TABLE mall_group_buy_records ADD COLUMN teamStatus varchar(24) NOT NULL DEFAULT 'forming'");
    await queryRunner.query("ALTER TABLE mall_group_buy_records ADD COLUMN minPeople int NOT NULL DEFAULT 2");
    await queryRunner.query("ALTER TABLE mall_group_buy_records ADD COLUMN paidPeople int NOT NULL DEFAULT 0");
    await queryRunner.query("CREATE INDEX IDX_mall_group_buy_records_team ON mall_group_buy_records (teamNo)");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IDX_mall_group_buy_records_team ON mall_group_buy_records");
    await queryRunner.query("ALTER TABLE mall_group_buy_records DROP COLUMN paidPeople");
    await queryRunner.query("ALTER TABLE mall_group_buy_records DROP COLUMN minPeople");
    await queryRunner.query("ALTER TABLE mall_group_buy_records DROP COLUMN teamStatus");
    await queryRunner.query("ALTER TABLE mall_group_buy_records DROP COLUMN teamNo");
  }
}
