import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class NotificationGovernance1783380000000 implements MigrationInterface {
  name = "NotificationGovernance1783380000000";
  async up(queryRunner: QueryRunner) {
    for (const column of [
      new TableColumn({ name: "tenantId", type: "int", isNullable: true }),
      new TableColumn({ name: "tenantScopeKey", type: "varchar", length: "32", default: "'platform'" }),
      new TableColumn({ name: "variablesSnapshot", type: "json", isNullable: true }),
      new TableColumn({ name: "suppressedReason", type: "varchar", length: "255", isNullable: true })
    ]) if (!(await queryRunner.hasColumn("notifications", column.name))) await queryRunner.addColumn("notifications", column);
    await queryRunner.query("UPDATE notifications n LEFT JOIN activities a ON a.id = n.activityId SET n.tenantId = a.tenantId, n.tenantScopeKey = CASE WHEN a.tenantId IS NULL THEN 'platform' ELSE CONCAT('tenant:', a.tenantId) END");
    const table = await queryRunner.getTable("notifications");
    if (!table?.indices.some(index => index.name === "IDX_notifications_scope_channel_created")) await queryRunner.createIndex("notifications", new TableIndex({ name: "IDX_notifications_scope_channel_created", columnNames: ["tenantScopeKey", "channel", "createdAt"] }));
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS notification_preferences (id INT NOT NULL AUTO_INCREMENT, userId INT NOT NULL, tenantId INT NULL, tenantScopeKey VARCHAR(32) NOT NULL DEFAULT 'platform', channel VARCHAR(40) NOT NULL, subscribed TINYINT NOT NULL DEFAULT 1, reason VARCHAR(255) NULL, unsubscribedAt DATETIME NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY UQ_notification_preference_user_scope_channel (userId, tenantScopeKey, channel), KEY IDX_notification_preference_scope_channel (tenantScopeKey, channel, subscribed), CONSTRAINT FK_notification_preference_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE, CONSTRAINT FK_notification_preference_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner) {
    await queryRunner.query("DROP TABLE IF EXISTS notification_preferences");
    const table = await queryRunner.getTable("notifications");
    if (table?.indices.some(index => index.name === "IDX_notifications_scope_channel_created")) await queryRunner.dropIndex("notifications", "IDX_notifications_scope_channel_created");
    for (const name of ["suppressedReason", "variablesSnapshot", "tenantScopeKey", "tenantId"]) if (await queryRunner.hasColumn("notifications", name)) await queryRunner.dropColumn("notifications", name);
  }
}
