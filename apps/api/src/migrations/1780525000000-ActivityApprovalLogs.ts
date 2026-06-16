import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class ActivityApprovalLogs1780525000000 implements MigrationInterface {
  name = "ActivityApprovalLogs1780525000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("activity_approval_logs")) return;
    await queryRunner.createTable(
      new Table({
        name: "activity_approval_logs",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "activityId", type: "int", isNullable: true },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "action", type: "varchar", length: "40" },
          { name: "operator", type: "varchar", length: "100", isNullable: true },
          { name: "fromStatus", type: "varchar", length: "40", isNullable: true },
          { name: "toStatus", type: "varchar", length: "40", isNullable: true },
          { name: "remark", type: "varchar", length: "255", isNullable: true },
          { name: "snapshot", type: "json", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ],
        foreignKeys: [
          { columnNames: ["activityId"], referencedTableName: "activities", referencedColumnNames: ["id"], onDelete: "CASCADE" },
          { columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }
        ]
      })
    );
    await queryRunner.createIndex("activity_approval_logs", new TableIndex({ name: "IDX_activity_approval_logs_activity", columnNames: ["activityId"] }));
    await queryRunner.createIndex("activity_approval_logs", new TableIndex({ name: "IDX_activity_approval_logs_tenant", columnNames: ["tenantId"] }));
    await queryRunner.createIndex("activity_approval_logs", new TableIndex({ name: "IDX_activity_approval_logs_created", columnNames: ["createdAt"] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("activity_approval_logs")) await queryRunner.dropTable("activity_approval_logs");
  }
}
