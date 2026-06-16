import { MigrationInterface, QueryRunner } from "typeorm";

export class ActivityChannelsAndConversionEvents1780540000000 implements MigrationInterface {
  name = "ActivityChannelsAndConversionEvents1780540000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS activity_channels (
        id int NOT NULL AUTO_INCREMENT,
        activityId int NOT NULL,
        tenantId int NULL,
        createdById int NULL,
        name varchar(80) NOT NULL,
        code varchar(48) NOT NULL,
        source varchar(80) NULL,
        remark varchar(500) NULL,
        enabled tinyint NOT NULL DEFAULT 1,
        qrCodeUrl varchar(500) NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY IDX_activity_channel_activity_code (activityId, code),
        UNIQUE KEY IDX_activity_channel_code (code),
        INDEX IDX_activity_channel_tenant (tenantId),
        CONSTRAINT FK_activity_channel_activity FOREIGN KEY (activityId) REFERENCES activities(id) ON DELETE CASCADE,
        CONSTRAINT FK_activity_channel_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE SET NULL,
        CONSTRAINT FK_activity_channel_admin FOREIGN KEY (createdById) REFERENCES admin_users(id) ON DELETE SET NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS conversion_events (
        id int NOT NULL AUTO_INCREMENT,
        tenantId int NULL,
        activityId int NULL,
        channelId int NULL,
        userId int NULL,
        registrationId int NULL,
        orderId int NULL,
        type varchar(32) NOT NULL,
        source varchar(80) NULL,
        idempotencyKey varchar(64) NULL,
        amount decimal(12,2) NOT NULL DEFAULT 0,
        clientIp varchar(80) NULL,
        userAgent varchar(255) NULL,
        payload json NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_conversion_event_tenant_type (tenantId, type),
        INDEX IDX_conversion_event_activity_type (activityId, type),
        INDEX IDX_conversion_event_channel_type (channelId, type),
        INDEX IDX_conversion_event_created (createdAt),
        UNIQUE KEY IDX_conversion_event_idempotency (idempotencyKey),
        CONSTRAINT FK_conversion_event_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE SET NULL,
        CONSTRAINT FK_conversion_event_activity FOREIGN KEY (activityId) REFERENCES activities(id) ON DELETE CASCADE,
        CONSTRAINT FK_conversion_event_channel FOREIGN KEY (channelId) REFERENCES activity_channels(id) ON DELETE SET NULL,
        CONSTRAINT FK_conversion_event_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT FK_conversion_event_registration FOREIGN KEY (registrationId) REFERENCES registrations(id) ON DELETE SET NULL,
        CONSTRAINT FK_conversion_event_order FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query("ALTER TABLE activity_view_logs ADD COLUMN channelId int NULL").catch(() => undefined);
    await queryRunner.query("ALTER TABLE activity_view_logs ADD INDEX IDX_activity_view_channel (channelId)").catch(() => undefined);
    await queryRunner.query("ALTER TABLE activity_view_logs ADD CONSTRAINT FK_activity_view_channel FOREIGN KEY (channelId) REFERENCES activity_channels(id) ON DELETE SET NULL").catch(() => undefined);
    await queryRunner.query("ALTER TABLE registrations ADD COLUMN channelId int NULL").catch(() => undefined);
    await queryRunner.query("ALTER TABLE registrations ADD INDEX IDX_registration_channel (channelId)").catch(() => undefined);
    await queryRunner.query("ALTER TABLE registrations ADD CONSTRAINT FK_registration_channel FOREIGN KEY (channelId) REFERENCES activity_channels(id) ON DELETE SET NULL").catch(() => undefined);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE registrations DROP FOREIGN KEY FK_registration_channel").catch(() => undefined);
    await queryRunner.query("ALTER TABLE registrations DROP INDEX IDX_registration_channel").catch(() => undefined);
    await queryRunner.query("ALTER TABLE registrations DROP COLUMN channelId").catch(() => undefined);
    await queryRunner.query("ALTER TABLE activity_view_logs DROP FOREIGN KEY FK_activity_view_channel").catch(() => undefined);
    await queryRunner.query("ALTER TABLE activity_view_logs DROP INDEX IDX_activity_view_channel").catch(() => undefined);
    await queryRunner.query("ALTER TABLE activity_view_logs DROP COLUMN channelId").catch(() => undefined);
    await queryRunner.query("DROP TABLE IF EXISTS conversion_events");
    await queryRunner.query("DROP TABLE IF EXISTS activity_channels");
  }
}
