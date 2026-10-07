import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from "typeorm";

export class ExperienceProjects1788653400000 implements MigrationInterface {
  async up(q: QueryRunner) {
    if (!(await q.hasTable("experience_projects"))) await q.createTable(new Table({ name: "experience_projects", columns: [
      { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
      { name: "tenantId", type: "int" }, { name: "activityId", type: "int", isNullable: true },
      { name: "title", type: "varchar", length: "160" }, { name: "description", type: "text", isNullable: true },
      { name: "quota", type: "int", default: 0 }, { name: "approvedCount", type: "int", default: 0 },
      { name: "status", type: "varchar", length: "24", default: "'draft'" }, { name: "applyDeadline", type: "datetime", isNullable: true },
      { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
    ], foreignKeys: [new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }), new TableForeignKey({ columnNames: ["activityId"], referencedTableName: "activities", referencedColumnNames: ["id"], onDelete: "SET NULL" })] }));
    if (!(await q.hasTable("experience_applications"))) await q.createTable(new Table({ name: "experience_applications", columns: [
      { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "tenantId", type: "int" }, { name: "projectId", type: "int" }, { name: "userId", type: "int" }, { name: "reason", type: "text", isNullable: true }, { name: "status", type: "varchar", length: "24", default: "'pending'" }, { name: "reviewRemark", type: "text", isNullable: true }, { name: "reviewedAt", type: "datetime", isNullable: true }, { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
    ], uniques: [new TableUnique({ name: "UQ_experience_application_user_project", columnNames: ["projectId", "userId"] })], indices: [new TableIndex({ name: "IDX_experience_application_status", columnNames: ["tenantId", "status"] })], foreignKeys: [["tenantId", "tenants", "CASCADE"], ["projectId", "experience_projects", "CASCADE"], ["userId", "users", "CASCADE"]].map(([column, table, onDelete]) => new TableForeignKey({ columnNames: [column], referencedTableName: table, referencedColumnNames: ["id"], onDelete })) }));
    if (!(await q.hasTable("experience_feedback"))) await q.createTable(new Table({ name: "experience_feedback", columns: [
      { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "tenantId", type: "int" }, { name: "projectId", type: "int" }, { name: "applicationId", type: "int" }, { name: "userId", type: "int" }, { name: "rating", type: "tinyint" }, { name: "content", type: "text" }, { name: "status", type: "varchar", length: "24", default: "'pending'" }, { name: "reviewRemark", type: "text", isNullable: true }, { name: "reviewedAt", type: "datetime", isNullable: true }, { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
    ], uniques: [new TableUnique({ name: "UQ_experience_feedback_application", columnNames: ["applicationId"] })], foreignKeys: [["tenantId", "tenants"], ["projectId", "experience_projects"], ["applicationId", "experience_applications"], ["userId", "users"]].map(([column, table]) => new TableForeignKey({ columnNames: [column], referencedTableName: table, referencedColumnNames: ["id"], onDelete: "CASCADE" })) }));
  }
  async down(q: QueryRunner) { if (await q.hasTable("experience_feedback")) await q.dropTable("experience_feedback"); if (await q.hasTable("experience_applications")) await q.dropTable("experience_applications"); if (await q.hasTable("experience_projects")) await q.dropTable("experience_projects"); }
}
