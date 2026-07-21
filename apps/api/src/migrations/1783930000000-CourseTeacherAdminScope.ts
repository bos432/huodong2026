import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class CourseTeacherAdminScope1783930000000 implements MigrationInterface {
  name = "CourseTeacherAdminScope1783930000000";

  async up(queryRunner: QueryRunner) {
    const table = await queryRunner.getTable("course_teachers");
    if (!table) return;
    if (!table.findColumnByName("adminUserId")) {
      await queryRunner.addColumn("course_teachers", new TableColumn({ name: "adminUserId", type: "int", isNullable: true }));
    }
    const refreshed = await queryRunner.getTable("course_teachers");
    if (!refreshed?.indices.some((index) => index.name === "UQ_course_teachers_admin_user")) {
      await queryRunner.createIndex("course_teachers", new TableIndex({ name: "UQ_course_teachers_admin_user", columnNames: ["adminUserId"], isUnique: true }));
    }
    const withIndex = await queryRunner.getTable("course_teachers");
    if (!withIndex?.foreignKeys.some((foreignKey) => foreignKey.columnNames.includes("adminUserId"))) {
      await queryRunner.createForeignKey("course_teachers", new TableForeignKey({ name: "FK_course_teachers_admin_user", columnNames: ["adminUserId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    }
  }

  async down(queryRunner: QueryRunner) {
    const table = await queryRunner.getTable("course_teachers");
    if (!table?.findColumnByName("adminUserId")) return;
    const foreignKey = table.foreignKeys.find((item) => item.columnNames.includes("adminUserId"));
    if (foreignKey) await queryRunner.dropForeignKey("course_teachers", foreignKey);
    const index = (await queryRunner.getTable("course_teachers"))?.indices.find((item) => item.name === "UQ_course_teachers_admin_user");
    if (index) await queryRunner.dropIndex("course_teachers", index);
    await queryRunner.dropColumn("course_teachers", "adminUserId");
  }
}
