import { MigrationInterface, QueryRunner } from "typeorm";

export class CourseAccessModes1783460000000 implements MigrationInterface {
  name = "CourseAccessModes1783460000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    const definitions = [
      ["accessMode", "varchar(24) NOT NULL DEFAULT 'price'"],
      ["requiredMemberLevelId", "int NULL"],
      ["completionThreshold", "int NOT NULL DEFAULT 100"],
    ] as const;
    for (const [name, definition] of definitions) {
      if (!(await queryRunner.hasColumn("courses", name))) await queryRunner.query(`ALTER TABLE \`courses\` ADD COLUMN \`${name}\` ${definition}`);
    }
    const courses = await queryRunner.getTable("courses");
    if (courses && !courses.foreignKeys.some((key) => key.name === "FK_courses_required_member_level")) {
      await queryRunner.query("ALTER TABLE `courses` ADD CONSTRAINT `FK_courses_required_member_level` FOREIGN KEY (`requiredMemberLevelId`) REFERENCES `member_levels`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION");
    }
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    const courses = await queryRunner.getTable("courses");
    if (courses?.foreignKeys.some((key) => key.name === "FK_courses_required_member_level")) await queryRunner.query("ALTER TABLE `courses` DROP FOREIGN KEY `FK_courses_required_member_level`");
    for (const name of ["completionThreshold", "requiredMemberLevelId", "accessMode"]) {
      if (await queryRunner.hasColumn("courses", name)) await queryRunner.query(`ALTER TABLE \`courses\` DROP COLUMN \`${name}\``);
    }
  }
}
