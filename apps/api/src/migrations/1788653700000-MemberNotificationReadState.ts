import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class MemberNotificationReadState1788653700000 implements MigrationInterface {
  name = "MemberNotificationReadState1788653700000";
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("notifications", "readAt"))) {
      await queryRunner.addColumn("notifications", new TableColumn({ name: "readAt", type: "datetime", isNullable: true }));
    }
    const table = await queryRunner.getTable("notifications");
    if (!table?.indices.some((index) => index.name === "IDX_notification_member_inbox")) {
      await queryRunner.createIndex("notifications", new TableIndex({ name: "IDX_notification_member_inbox", columnNames: ["userId", "tenantScopeKey", "channel", "status", "id"] }));
    }
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("notifications");
    if (table?.indices.some((index) => index.name === "IDX_notification_member_inbox")) {
      // InnoDB may replace the implicit FK index with this composite index.
      const needsUserIndex = table.foreignKeys?.some((key) => key.columnNames.length === 1 && key.columnNames[0] === "userId")
        && !table.indices.some((index) => index.name !== "IDX_notification_member_inbox" && index.columnNames[0] === "userId");
      if (needsUserIndex) await queryRunner.createIndex("notifications", new TableIndex({ name: "IDX_notification_member_user", columnNames: ["userId"] }));
      await queryRunner.dropIndex("notifications", "IDX_notification_member_inbox");
    }
    if (await queryRunner.hasColumn("notifications", "readAt")) await queryRunner.dropColumn("notifications", "readAt");
  }
}
