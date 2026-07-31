import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class ActivitySpace1784100000000 implements MigrationInterface {
  name = "ActivitySpace1784100000000";

  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("activity_space_announcements"))) {
      await queryRunner.createTable(new Table({ name: "activity_space_announcements", columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
        { name: "activityId", type: "int" }, { name: "tenantId", type: "int", isNullable: true },
        { name: "title", type: "varchar", length: "160" }, { name: "content", type: "text" },
        { name: "status", type: "varchar", length: "20", default: "'draft'" }, { name: "pinned", type: "tinyint", default: 0 },
        { name: "publishAt", type: "datetime", isNullable: true }, { name: "createdByAdminId", type: "int", isNullable: true },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
      ] }));
      await queryRunner.createIndex("activity_space_announcements", new TableIndex({ name: "IDX_activity_space_announcements_activity_status", columnNames: ["activityId", "status", "publishAt"] }));
      await queryRunner.createForeignKey("activity_space_announcements", new TableForeignKey({ columnNames: ["activityId"], referencedTableName: "activities", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
      await queryRunner.createForeignKey("activity_space_announcements", new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    }
    if (!(await queryRunner.hasTable("activity_space_posts"))) {
      await queryRunner.createTable(new Table({ name: "activity_space_posts", columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
        { name: "activityId", type: "int" }, { name: "tenantId", type: "int", isNullable: true }, { name: "userId", type: "int" },
        { name: "content", type: "text" }, { name: "status", type: "varchar", length: "20", default: "'visible'" },
        { name: "adminReply", type: "varchar", length: "500", isNullable: true }, { name: "reportCount", type: "int", default: 0 },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
      ] }));
      await queryRunner.createIndex("activity_space_posts", new TableIndex({ name: "IDX_activity_space_posts_activity_status_created", columnNames: ["activityId", "status", "createdAt"] }));
      await queryRunner.createForeignKey("activity_space_posts", new TableForeignKey({ columnNames: ["activityId"], referencedTableName: "activities", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
      await queryRunner.createForeignKey("activity_space_posts", new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
      await queryRunner.createForeignKey("activity_space_posts", new TableForeignKey({ columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    }
    if (!(await queryRunner.hasTable("activity_space_post_reports"))) {
      await queryRunner.createTable(new Table({ name: "activity_space_post_reports", columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "postId", type: "int" }, { name: "userId", type: "int" },
        { name: "reason", type: "varchar", length: "500" }, { name: "status", type: "varchar", length: "20", default: "'pending'" }, { name: "resolution", type: "varchar", length: "500", isNullable: true },
        { name: "handledByAdminId", type: "int", isNullable: true }, { name: "handledAt", type: "datetime", isNullable: true }, { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
      ] }));
      await queryRunner.createIndex("activity_space_post_reports", new TableIndex({ name: "UQ_activity_space_post_reports_post_user", columnNames: ["postId", "userId"], isUnique: true }));
      await queryRunner.createForeignKey("activity_space_post_reports", new TableForeignKey({ columnNames: ["postId"], referencedTableName: "activity_space_posts", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
      await queryRunner.createForeignKey("activity_space_post_reports", new TableForeignKey({ columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    }
  }

  async down(queryRunner: QueryRunner) {
    for (const table of ["activity_space_post_reports", "activity_space_posts", "activity_space_announcements"]) if (await queryRunner.hasTable(table)) await queryRunner.dropTable(table, true);
  }
}
