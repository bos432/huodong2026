import { MigrationInterface, QueryRunner } from "typeorm";

export class UserWechatIdentity1780890000000 implements MigrationInterface {
  name = "UserWechatIdentity1780890000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("users");
    if (!table) return;
    if (!table.findColumnByName("wechatAppId")) await queryRunner.query("ALTER TABLE users ADD wechatAppId varchar(64) NULL");
    if (!table.findColumnByName("unionid")) await queryRunner.query("ALTER TABLE users ADD unionid varchar(128) NULL");
    if (!table.findColumnByName("sourceChannel")) await queryRunner.query("ALTER TABLE users ADD sourceChannel varchar(32) NULL");
    if (!table.findColumnByName("lastLoginChannel")) await queryRunner.query("ALTER TABLE users ADD lastLoginChannel varchar(32) NULL");
    if (!table.findColumnByName("lastLoginAt")) await queryRunner.query("ALTER TABLE users ADD lastLoginAt datetime NULL");
    const updated = await queryRunner.getTable("users");
    if (updated && !updated.indices.some((index) => index.name === "IDX_users_unionid")) {
      await queryRunner.query("CREATE INDEX IDX_users_unionid ON users (unionid)");
    }
    if (updated && !updated.indices.some((index) => index.name === "IDX_users_wechat_appid")) {
      await queryRunner.query("CREATE INDEX IDX_users_wechat_appid ON users (wechatAppId)");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("users");
    if (!table) return;
    if (table.indices.some((index) => index.name === "IDX_users_wechat_appid")) await queryRunner.query("DROP INDEX IDX_users_wechat_appid ON users");
    if (table.indices.some((index) => index.name === "IDX_users_unionid")) await queryRunner.query("DROP INDEX IDX_users_unionid ON users");
    if (table.findColumnByName("lastLoginAt")) await queryRunner.query("ALTER TABLE users DROP COLUMN lastLoginAt");
    if (table.findColumnByName("lastLoginChannel")) await queryRunner.query("ALTER TABLE users DROP COLUMN lastLoginChannel");
    if (table.findColumnByName("sourceChannel")) await queryRunner.query("ALTER TABLE users DROP COLUMN sourceChannel");
    if (table.findColumnByName("unionid")) await queryRunner.query("ALTER TABLE users DROP COLUMN unionid");
    if (table.findColumnByName("wechatAppId")) await queryRunner.query("ALTER TABLE users DROP COLUMN wechatAppId");
  }
}
