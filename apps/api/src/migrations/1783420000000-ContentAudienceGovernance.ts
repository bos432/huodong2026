import { MigrationInterface, QueryRunner } from "typeorm";

export class ContentAudienceGovernance1783420000000 implements MigrationInterface {
  name = "ContentAudienceGovernance1783420000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const addColumns = async (tableName: string, columns: Array<[string, string]>) => {
      const table = await queryRunner.getTable(tableName);
      const missing = columns.filter(([name]) => !table?.findColumnByName(name));
      if (missing.length) await queryRunner.query(`ALTER TABLE \`${tableName}\` ${missing.map(([, definition]) => `ADD ${definition}`).join(", ")}`);
    };
    await addColumns("announcements", [["endAt", "`endAt` datetime NULL"], ["audience", "`audience` json NULL"], ["viewCount", "`viewCount` int NOT NULL DEFAULT 0"], ["clickCount", "`clickCount` int NOT NULL DEFAULT 0"]]);
    await addColumns("marketing_popups", [["audience", "`audience` json NULL"]]);
    await addColumns("ad_campaigns", [["audience", "`audience` json NULL"]]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const dropColumns = async (tableName: string, names: string[]) => {
      const table = await queryRunner.getTable(tableName);
      const existing = names.filter((name) => table?.findColumnByName(name));
      if (existing.length) await queryRunner.query(`ALTER TABLE \`${tableName}\` ${existing.map((name) => `DROP COLUMN \`${name}\``).join(", ")}`);
    };
    await dropColumns("ad_campaigns", ["audience"]);
    await dropColumns("marketing_popups", ["audience"]);
    await dropColumns("announcements", ["clickCount", "viewCount", "audience", "endAt"]);
  }
}
