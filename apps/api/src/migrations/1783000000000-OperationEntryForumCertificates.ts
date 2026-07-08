import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class OperationEntryForumCertificates1783000000000 implements MigrationInterface {
  name = "OperationEntryForumCertificates1783000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(queryRunner, "operation_settings", new TableColumn({ name: "defaultTenantCode", type: "varchar", length: "64", isNullable: true }));

    await this.addColumnIfMissing(queryRunner, "certificates", new TableColumn({ name: "certificateNo", type: "varchar", length: "80", isNullable: true, isUnique: true }));
    await this.addColumnIfMissing(queryRunner, "certificates", new TableColumn({ name: "templateKey", type: "varchar", length: "40", default: "'volunteer_service'" }));
    await this.addColumnIfMissing(queryRunner, "certificates", new TableColumn({ name: "holderName", type: "varchar", length: "80", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "certificates", new TableColumn({ name: "serviceHours", type: "decimal", precision: 8, scale: 2, default: 0 }));
    await this.addColumnIfMissing(queryRunner, "certificates", new TableColumn({ name: "level", type: "varchar", length: "24", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "certificates", new TableColumn({ name: "serviceRecordId", type: "int", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "certificates", new TableColumn({ name: "issuerId", type: "int", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "certificates", new TableColumn({ name: "status", type: "varchar", length: "24", default: "'active'" }));
    await this.addColumnIfMissing(queryRunner, "certificates", new TableColumn({ name: "revokedAt", type: "datetime", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "certificates", new TableColumn({ name: "revokedBy", type: "varchar", length: "120", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "certificates", new TableColumn({ name: "revokeReason", type: "text", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "certificates", new TableColumn({ name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }));
    await this.addForeignKeyIfMissing(queryRunner, "certificates", "FK_certificates_service_record", ["serviceRecordId"], "volunteer_service_records", ["id"], "SET NULL");
    await this.addForeignKeyIfMissing(queryRunner, "certificates", "FK_certificates_issuer", ["issuerId"], "admin_users", ["id"], "SET NULL");

    await this.createForumTables(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ["forum_notifications", "forum_view_logs", "forum_favorites", "forum_reports", "forum_replies", "forum_topics", "forum_categories"]) {
      if (await queryRunner.hasTable(table)) await queryRunner.dropTable(table);
    }
    if (await queryRunner.hasTable("certificates")) {
      for (const fk of ["FK_certificates_issuer", "FK_certificates_service_record"]) {
        if (await this.hasForeignKey(queryRunner, "certificates", fk)) await queryRunner.dropForeignKey("certificates", fk);
      }
      for (const column of ["updatedAt", "revokeReason", "revokedBy", "revokedAt", "status", "issuerId", "serviceRecordId", "level", "serviceHours", "holderName", "templateKey", "certificateNo"]) {
        if (await queryRunner.hasColumn("certificates", column)) await queryRunner.dropColumn("certificates", column);
      }
    }
    if (await queryRunner.hasColumn("operation_settings", "defaultTenantCode")) await queryRunner.dropColumn("operation_settings", "defaultTenantCode");
  }

  private async createForumTables(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("forum_categories"))) {
      await queryRunner.createTable(new Table({
        name: "forum_categories",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "name", type: "varchar", length: "80" },
          { name: "description", type: "varchar", length: "255", isNullable: true },
          { name: "sortOrder", type: "int", default: 0 },
          { name: "enabled", type: "tinyint", default: 1 },
          { name: "postPermission", type: "varchar", length: "20", default: "'user'" },
          { name: "auditMode", type: "varchar", length: "20", default: "'pre'" },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      }));
      await this.addForeignKeyIfMissing(queryRunner, "forum_categories", "FK_forum_categories_tenant", ["tenantId"], "tenants", ["id"], "SET NULL");
      await this.addIndexIfMissing(queryRunner, "forum_categories", new TableIndex({ name: "IDX_forum_categories_tenant_sort", columnNames: ["tenantId", "enabled", "sortOrder"] }));
    }

    if (!(await queryRunner.hasTable("forum_topics"))) {
      await queryRunner.createTable(new Table({
        name: "forum_topics",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "categoryId", type: "int", isNullable: true },
          { name: "userId", type: "int", isNullable: true },
          { name: "title", type: "varchar", length: "120" },
          { name: "content", type: "text" },
          { name: "images", type: "text", isNullable: true },
          { name: "tags", type: "text", isNullable: true },
          { name: "activityId", type: "int", isNullable: true },
          { name: "courseId", type: "int", isNullable: true },
          { name: "charityProjectId", type: "int", isNullable: true },
          { name: "pinned", type: "tinyint", default: 0 },
          { name: "featured", type: "tinyint", default: 0 },
          { name: "heat", type: "int", default: 0 },
          { name: "viewCount", type: "int", default: 0 },
          { name: "replyCount", type: "int", default: 0 },
          { name: "favoriteCount", type: "int", default: 0 },
          { name: "reportCount", type: "int", default: 0 },
          { name: "status", type: "varchar", length: "24", default: "'pending'" },
          { name: "reviewRemark", type: "text", isNullable: true },
          { name: "approvedAt", type: "datetime", isNullable: true },
          { name: "lastReplyAt", type: "datetime", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      }));
      await this.addForeignKeyIfMissing(queryRunner, "forum_topics", "FK_forum_topics_tenant", ["tenantId"], "tenants", ["id"], "SET NULL");
      await this.addForeignKeyIfMissing(queryRunner, "forum_topics", "FK_forum_topics_category", ["categoryId"], "forum_categories", ["id"], "SET NULL");
      await this.addForeignKeyIfMissing(queryRunner, "forum_topics", "FK_forum_topics_user", ["userId"], "users", ["id"], "SET NULL");
      await this.addForeignKeyIfMissing(queryRunner, "forum_topics", "FK_forum_topics_activity", ["activityId"], "activities", ["id"], "SET NULL");
      await this.addForeignKeyIfMissing(queryRunner, "forum_topics", "FK_forum_topics_course", ["courseId"], "courses", ["id"], "SET NULL");
      await this.addForeignKeyIfMissing(queryRunner, "forum_topics", "FK_forum_topics_charity_project", ["charityProjectId"], "charity_projects", ["id"], "SET NULL");
      await this.addIndexIfMissing(queryRunner, "forum_topics", new TableIndex({ name: "IDX_forum_topics_flow", columnNames: ["tenantId", "status", "pinned", "featured", "lastReplyAt"] }));
      await this.addIndexIfMissing(queryRunner, "forum_topics", new TableIndex({ name: "IDX_forum_topics_category_status", columnNames: ["categoryId", "status", "createdAt"] }));
      await this.addIndexIfMissing(queryRunner, "forum_topics", new TableIndex({ name: "IDX_forum_topics_user_status", columnNames: ["userId", "status"] }));
    }

    if (!(await queryRunner.hasTable("forum_replies"))) {
      await queryRunner.createTable(new Table({
        name: "forum_replies",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "topicId", type: "int" },
          { name: "parentId", type: "int", isNullable: true },
          { name: "depth", type: "int", default: 1 },
          { name: "userId", type: "int", isNullable: true },
          { name: "content", type: "text" },
          { name: "images", type: "text", isNullable: true },
          { name: "authorRole", type: "varchar", length: "20", default: "'user'" },
          { name: "status", type: "varchar", length: "24", default: "'pending'" },
          { name: "reviewRemark", type: "text", isNullable: true },
          { name: "approvedAt", type: "datetime", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      }));
      await this.addForeignKeyIfMissing(queryRunner, "forum_replies", "FK_forum_replies_tenant", ["tenantId"], "tenants", ["id"], "SET NULL");
      await this.addForeignKeyIfMissing(queryRunner, "forum_replies", "FK_forum_replies_topic", ["topicId"], "forum_topics", ["id"], "CASCADE");
      await this.addForeignKeyIfMissing(queryRunner, "forum_replies", "FK_forum_replies_parent", ["parentId"], "forum_replies", ["id"], "CASCADE");
      await this.addForeignKeyIfMissing(queryRunner, "forum_replies", "FK_forum_replies_user", ["userId"], "users", ["id"], "SET NULL");
      await this.addIndexIfMissing(queryRunner, "forum_replies", new TableIndex({ name: "IDX_forum_replies_topic_status_created", columnNames: ["topicId", "status", "createdAt"] }));
      await this.addIndexIfMissing(queryRunner, "forum_replies", new TableIndex({ name: "IDX_forum_replies_user_status", columnNames: ["userId", "status"] }));
    }

    if (!(await queryRunner.hasTable("forum_reports"))) {
      await queryRunner.createTable(new Table({
        name: "forum_reports",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "topicId", type: "int", isNullable: true },
          { name: "replyId", type: "int", isNullable: true },
          { name: "reporterId", type: "int", isNullable: true },
          { name: "type", type: "varchar", length: "40" },
          { name: "description", type: "text", isNullable: true },
          { name: "status", type: "varchar", length: "24", default: "'pending'" },
          { name: "handlerId", type: "int", isNullable: true },
          { name: "handleRemark", type: "text", isNullable: true },
          { name: "handledAt", type: "datetime", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      }));
      await this.addForeignKeyIfMissing(queryRunner, "forum_reports", "FK_forum_reports_tenant", ["tenantId"], "tenants", ["id"], "SET NULL");
      await this.addForeignKeyIfMissing(queryRunner, "forum_reports", "FK_forum_reports_topic", ["topicId"], "forum_topics", ["id"], "CASCADE");
      await this.addForeignKeyIfMissing(queryRunner, "forum_reports", "FK_forum_reports_reply", ["replyId"], "forum_replies", ["id"], "CASCADE");
      await this.addForeignKeyIfMissing(queryRunner, "forum_reports", "FK_forum_reports_reporter", ["reporterId"], "users", ["id"], "SET NULL");
      await this.addForeignKeyIfMissing(queryRunner, "forum_reports", "FK_forum_reports_handler", ["handlerId"], "admin_users", ["id"], "SET NULL");
      await this.addIndexIfMissing(queryRunner, "forum_reports", new TableIndex({ name: "IDX_forum_reports_status_created", columnNames: ["status", "createdAt"] }));
    }

    if (!(await queryRunner.hasTable("forum_favorites"))) {
      await queryRunner.createTable(new Table({
        name: "forum_favorites",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "topicId", type: "int" },
          { name: "userId", type: "int" },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ],
        uniques: [{ name: "UQ_forum_favorites_topic_user", columnNames: ["topicId", "userId"] }]
      }));
      await this.addForeignKeyIfMissing(queryRunner, "forum_favorites", "FK_forum_favorites_tenant", ["tenantId"], "tenants", ["id"], "SET NULL");
      await this.addForeignKeyIfMissing(queryRunner, "forum_favorites", "FK_forum_favorites_topic", ["topicId"], "forum_topics", ["id"], "CASCADE");
      await this.addForeignKeyIfMissing(queryRunner, "forum_favorites", "FK_forum_favorites_user", ["userId"], "users", ["id"], "CASCADE");
    }

    if (!(await queryRunner.hasTable("forum_view_logs"))) {
      await queryRunner.createTable(new Table({
        name: "forum_view_logs",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "topicId", type: "int" },
          { name: "userId", type: "int", isNullable: true },
          { name: "clientIp", type: "varchar", length: "64", isNullable: true },
          { name: "userAgent", type: "varchar", length: "255", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      }));
      await this.addForeignKeyIfMissing(queryRunner, "forum_view_logs", "FK_forum_view_logs_tenant", ["tenantId"], "tenants", ["id"], "SET NULL");
      await this.addForeignKeyIfMissing(queryRunner, "forum_view_logs", "FK_forum_view_logs_topic", ["topicId"], "forum_topics", ["id"], "CASCADE");
      await this.addForeignKeyIfMissing(queryRunner, "forum_view_logs", "FK_forum_view_logs_user", ["userId"], "users", ["id"], "SET NULL");
      await this.addIndexIfMissing(queryRunner, "forum_view_logs", new TableIndex({ name: "IDX_forum_view_logs_topic_created", columnNames: ["topicId", "createdAt"] }));
    }

    if (!(await queryRunner.hasTable("forum_notifications"))) {
      await queryRunner.createTable(new Table({
        name: "forum_notifications",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "userId", type: "int" },
          { name: "topicId", type: "int", isNullable: true },
          { name: "replyId", type: "int", isNullable: true },
          { name: "type", type: "varchar", length: "24" },
          { name: "title", type: "varchar", length: "120" },
          { name: "content", type: "varchar", length: "255", isNullable: true },
          { name: "readAt", type: "datetime", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      }));
      await this.addForeignKeyIfMissing(queryRunner, "forum_notifications", "FK_forum_notifications_tenant", ["tenantId"], "tenants", ["id"], "SET NULL");
      await this.addForeignKeyIfMissing(queryRunner, "forum_notifications", "FK_forum_notifications_user", ["userId"], "users", ["id"], "CASCADE");
      await this.addForeignKeyIfMissing(queryRunner, "forum_notifications", "FK_forum_notifications_topic", ["topicId"], "forum_topics", ["id"], "CASCADE");
      await this.addForeignKeyIfMissing(queryRunner, "forum_notifications", "FK_forum_notifications_reply", ["replyId"], "forum_replies", ["id"], "CASCADE");
      await this.addIndexIfMissing(queryRunner, "forum_notifications", new TableIndex({ name: "IDX_forum_notifications_user_read", columnNames: ["userId", "readAt", "createdAt"] }));
    }
  }

  private async addColumnIfMissing(queryRunner: QueryRunner, tableName: string, column: TableColumn) {
    if (!(await queryRunner.hasTable(tableName))) return;
    if (!(await queryRunner.hasColumn(tableName, column.name))) await queryRunner.addColumn(tableName, column);
  }

  private async addForeignKeyIfMissing(queryRunner: QueryRunner, tableName: string, name: string, columnNames: string[], referencedTableName: string, referencedColumnNames: string[], onDelete: string) {
    if (!(await queryRunner.hasTable(tableName)) || !(await queryRunner.hasTable(referencedTableName))) return;
    if (await this.hasForeignKey(queryRunner, tableName, name)) return;
    await queryRunner.createForeignKey(tableName, new TableForeignKey({ name, columnNames, referencedTableName, referencedColumnNames, onDelete }));
  }

  private async hasForeignKey(queryRunner: QueryRunner, tableName: string, name: string) {
    const table = await queryRunner.getTable(tableName);
    return Boolean(table?.foreignKeys.some((item) => item.name === name));
  }

  private async addIndexIfMissing(queryRunner: QueryRunner, tableName: string, index: TableIndex) {
    const table = await queryRunner.getTable(tableName);
    if (!table?.indices.some((item) => item.name === index.name)) await queryRunner.createIndex(tableName, index);
  }
}
