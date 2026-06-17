import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CourseCommunityBaseTables1780850000000 implements MigrationInterface {
  name = "CourseCommunityBaseTables1780850000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("courses"))) {
      await queryRunner.createTable(
        new Table({
          name: "courses",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "title", type: "varchar", length: "255" },
            { name: "description", type: "text", isNullable: true },
            { name: "coverUrl", type: "varchar", length: "500", isNullable: true },
            { name: "teacherName", type: "varchar", length: "100", isNullable: true },
            { name: "teacherAvatar", type: "varchar", length: "500", isNullable: true },
            { name: "categoryId", type: "int", isNullable: true },
            { name: "price", type: "decimal", precision: 10, scale: 2, default: "0" },
            { name: "originalPrice", type: "decimal", precision: 10, scale: 2, default: "0" },
            { name: "rating", type: "decimal", precision: 2, scale: 1, default: "0" },
            { name: "reviewCount", type: "int", default: "0" },
            { name: "hotCount", type: "int", default: "0" },
            { name: "status", type: "varchar", length: "50", default: "'draft'" },
            { name: "tags", type: "text", isNullable: true },
            { name: "tenantId", type: "int", isNullable: true },
            { name: "sortOrder", type: "int", default: "0" },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
            { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createIndex("courses", new TableIndex({ name: "IDX_courses_status_sort_created", columnNames: ["status", "sortOrder", "createdAt"] }));
      await queryRunner.createIndex("courses", new TableIndex({ name: "IDX_courses_tenant_status", columnNames: ["tenantId", "status"] }));
    }

    if (!(await queryRunner.hasTable("course_chapters"))) {
      await queryRunner.createTable(
        new Table({
          name: "course_chapters",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "courseId", type: "int" },
            { name: "title", type: "varchar", length: "255" },
            { name: "sortOrder", type: "int", default: "0" },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
            { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createIndex("course_chapters", new TableIndex({ name: "IDX_course_chapters_course_sort", columnNames: ["courseId", "sortOrder"] }));
    }

    if (!(await queryRunner.hasTable("course_lessons"))) {
      await queryRunner.createTable(
        new Table({
          name: "course_lessons",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "chapterId", type: "int" },
            { name: "title", type: "varchar", length: "255" },
            { name: "videoUrl", type: "varchar", length: "500", isNullable: true },
            { name: "duration", type: "varchar", length: "20", isNullable: true },
            { name: "isFree", type: "tinyint", width: 1, default: "0" },
            { name: "sortOrder", type: "int", default: "0" },
            { name: "content", type: "text", isNullable: true },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
            { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createIndex("course_lessons", new TableIndex({ name: "IDX_course_lessons_chapter_sort", columnNames: ["chapterId", "sortOrder"] }));
    }

    if (!(await queryRunner.hasTable("community_activities"))) {
      await queryRunner.createTable(
        new Table({
          name: "community_activities",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "title", type: "varchar", length: "255" },
            { name: "description", type: "text", isNullable: true },
            { name: "startTime", type: "datetime", isNullable: true },
            { name: "location", type: "varchar", length: "200", isNullable: true },
            { name: "coverUrl", type: "varchar", length: "500", isNullable: true },
            { name: "registeredCount", type: "int", default: "0" },
            { name: "status", type: "varchar", length: "30", default: "'draft'" },
            { name: "sortOrder", type: "int", default: "0" },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
            { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createIndex("community_activities", new TableIndex({ name: "IDX_community_activities_status_start", columnNames: ["status", "startTime"] }));
    }

    if (!(await queryRunner.hasTable("community_posts"))) {
      await queryRunner.createTable(
        new Table({
          name: "community_posts",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "userId", type: "int" },
            { name: "content", type: "text" },
            { name: "images", type: "text", isNullable: true },
            { name: "likes", type: "int", default: "0" },
            { name: "comments", type: "int", default: "0" },
            { name: "visible", type: "tinyint", width: 1, default: "1" },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
            { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createIndex("community_posts", new TableIndex({ name: "IDX_community_posts_visible_created", columnNames: ["visible", "createdAt"] }));
    }

    if (!(await queryRunner.hasTable("checkin_tasks"))) {
      await queryRunner.createTable(
        new Table({
          name: "checkin_tasks",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "date", type: "date" },
            { name: "title", type: "varchar", length: "255" },
            { name: "description", type: "text", isNullable: true },
            { name: "completedCount", type: "int", default: "0" },
            { name: "enabled", type: "tinyint", width: 1, default: "1" },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
            { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createIndex("checkin_tasks", new TableIndex({ name: "IDX_checkin_tasks_date_enabled", columnNames: ["date", "enabled"] }));
    }

    if (!(await queryRunner.hasTable("user_learning"))) {
      await queryRunner.createTable(
        new Table({
          name: "user_learning",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "userId", type: "int" },
            { name: "courseId", type: "int" },
            { name: "lessonId", type: "int" },
            { name: "progress", type: "decimal", precision: 5, scale: 2, default: "0" },
            { name: "completedAt", type: "datetime", isNullable: true },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
            { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createIndex("user_learning", new TableIndex({ name: "IDX_user_learning_user_course_lesson", columnNames: ["userId", "courseId", "lessonId"], isUnique: true }));
    }

    if (!(await queryRunner.hasTable("user_favorites"))) {
      await queryRunner.createTable(
        new Table({
          name: "user_favorites",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "userId", type: "int" },
            { name: "courseId", type: "int" },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createIndex("user_favorites", new TableIndex({ name: "IDX_user_favorites_user_course", columnNames: ["userId", "courseId"], isUnique: true }));
    }

    if (!(await queryRunner.hasTable("certificates"))) {
      await queryRunner.createTable(
        new Table({
          name: "certificates",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "userId", type: "int" },
            { name: "name", type: "varchar", length: "255" },
            { name: "imageUrl", type: "varchar", length: "500", isNullable: true },
            { name: "threshold", type: "int", isNullable: true },
            { name: "issuedAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createIndex("certificates", new TableIndex({ name: "IDX_certificates_user", columnNames: ["userId"] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // These are data-bearing base tables and may already exist on some installs.
    // Keep rollback non-destructive; deploy rollback should switch code, not drop user data.
    void queryRunner;
  }
}
