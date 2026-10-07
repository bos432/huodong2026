import { MigrationInterface, QueryRunner } from "typeorm";

export class CourseContentGovernance1783450000000 implements MigrationInterface {
  name = "CourseContentGovernance1783450000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE IF NOT EXISTS `course_teachers` (`id` int NOT NULL AUTO_INCREMENT, `tenantId` int NULL, `name` varchar(100) NOT NULL, `avatarUrl` varchar(500) NULL, `title` varchar(160) NULL, `bio` text NULL, `status` varchar(32) NOT NULL DEFAULT 'active', `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX `IDX_course_teachers_tenant_status` (`tenantId`, `status`), PRIMARY KEY (`id`), CONSTRAINT `FK_course_teachers_tenant` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION) ENGINE=InnoDB");
    const courses = await queryRunner.getTable("courses");
    if (courses && !courses.columns.some((column) => column.name === "teacherId")) {
      await queryRunner.query("ALTER TABLE `courses` ADD COLUMN `teacherId` int NULL");
    }
    const coursesAfterColumn = await queryRunner.getTable("courses");
    if (coursesAfterColumn && !coursesAfterColumn.foreignKeys.some((key) => key.name === "FK_courses_teacher")) {
      await queryRunner.query("ALTER TABLE `courses` ADD CONSTRAINT `FK_courses_teacher` FOREIGN KEY (`teacherId`) REFERENCES `course_teachers`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION");
    }
    const lessons = await queryRunner.getTable("course_lessons");
    if (lessons) {
      const definitions = [
        ["contentType", "varchar(24) NOT NULL DEFAULT 'video'"],
        ["audioUrl", "varchar(500) NULL"],
        ["attachmentUrl", "varchar(500) NULL"],
        ["attachmentName", "varchar(160) NULL"],
        ["status", "varchar(24) NOT NULL DEFAULT 'published'"],
      ] as const;
      for (const [name, definition] of definitions) {
        if (!lessons.columns.some((column) => column.name === name)) {
          await queryRunner.query(`ALTER TABLE \`course_lessons\` ADD COLUMN \`${name}\` ${definition}`);
        }
      }
      const lessonsAfterColumns = await queryRunner.getTable("course_lessons");
      if (lessonsAfterColumns && !lessonsAfterColumns.indices.some((index) => index.name === "IDX_course_lessons_chapter_status_sort")) {
        await queryRunner.query("CREATE INDEX `IDX_course_lessons_chapter_status_sort` ON `course_lessons` (`chapterId`, `status`, `sortOrder`)");
      }
    }
    await queryRunner.query("CREATE TABLE IF NOT EXISTS `course_resource_access_logs` (`id` int NOT NULL AUTO_INCREMENT, `userId` int NOT NULL, `courseId` int NOT NULL, `lessonId` int NOT NULL, `resourceType` varchar(24) NOT NULL, `clientIp` varchar(64) NULL, `userAgent` varchar(255) NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_course_resource_access_user_course_created` (`userId`, `courseId`, `createdAt`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS `course_resource_access_logs`");
    const lessons = await queryRunner.getTable("course_lessons");
    if (lessons?.indices.some((index) => index.name === "IDX_course_lessons_chapter_status_sort")) await queryRunner.query("DROP INDEX `IDX_course_lessons_chapter_status_sort` ON `course_lessons`");
    const lessonColumns = ["status", "attachmentName", "attachmentUrl", "audioUrl", "contentType"];
    for (const column of lessonColumns) {
      const current = await queryRunner.getTable("course_lessons");
      if (current?.columns.some((item) => item.name === column)) await queryRunner.query(`ALTER TABLE \`course_lessons\` DROP COLUMN \`${column}\``);
    }
    const courses = await queryRunner.getTable("courses");
    if (courses?.foreignKeys.some((key) => key.name === "FK_courses_teacher")) await queryRunner.query("ALTER TABLE `courses` DROP FOREIGN KEY `FK_courses_teacher`");
    if ((await queryRunner.getTable("courses"))?.columns.some((column) => column.name === "teacherId")) await queryRunner.query("ALTER TABLE `courses` DROP COLUMN `teacherId`");
    await queryRunner.query("DROP TABLE IF EXISTS `course_teachers`");
  }
}
