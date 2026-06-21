import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMallGroupBuyTeamFields1781724600000 implements MigrationInterface {
  name = "AddMallGroupBuyTeamFields1781724600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("mall_group_buy_records");
    if (!table?.findColumnByName("teamNo")) await queryRunner.query("ALTER TABLE mall_group_buy_records ADD COLUMN teamNo varchar(64) NULL");
    await queryRunner.query("UPDATE mall_group_buy_records SET teamNo = CONCAT('MGBT', id) WHERE teamNo IS NULL OR teamNo = ''");
    await queryRunner.query("ALTER TABLE mall_group_buy_records MODIFY teamNo varchar(64) NOT NULL");
    if (!table?.findColumnByName("teamStatus")) await queryRunner.query("ALTER TABLE mall_group_buy_records ADD COLUMN teamStatus varchar(24) NOT NULL DEFAULT 'forming'");
    if (!table?.findColumnByName("minPeople")) await queryRunner.query("ALTER TABLE mall_group_buy_records ADD COLUMN minPeople int NOT NULL DEFAULT 2");
    if (!table?.findColumnByName("paidPeople")) await queryRunner.query("ALTER TABLE mall_group_buy_records ADD COLUMN paidPeople int NOT NULL DEFAULT 0");
    if (!table?.indices.some((index) => index.name === "IDX_mall_group_buy_records_team")) await queryRunner.query("CREATE INDEX IDX_mall_group_buy_records_team ON mall_group_buy_records (teamNo)");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("mall_group_buy_records");
    if (table?.indices.some((index) => index.name === "IDX_mall_group_buy_records_team")) await queryRunner.query("DROP INDEX IDX_mall_group_buy_records_team ON mall_group_buy_records");
    if (table?.findColumnByName("paidPeople")) await queryRunner.query("ALTER TABLE mall_group_buy_records DROP COLUMN paidPeople");
    if (table?.findColumnByName("minPeople")) await queryRunner.query("ALTER TABLE mall_group_buy_records DROP COLUMN minPeople");
    if (table?.findColumnByName("teamStatus")) await queryRunner.query("ALTER TABLE mall_group_buy_records DROP COLUMN teamStatus");
    if (table?.findColumnByName("teamNo")) await queryRunner.query("ALTER TABLE mall_group_buy_records DROP COLUMN teamNo");
  }
}
