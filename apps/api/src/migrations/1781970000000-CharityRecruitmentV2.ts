import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from "typeorm";

export class CharityRecruitmentV21781970000000 implements MigrationInterface {
  name = "CharityRecruitmentV21781970000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(queryRunner, "charity_project_disbursements", new TableColumn({ name: "publicVisible", type: "tinyint", default: 1 }));
    await this.addColumnIfMissing(queryRunner, "ambassador_applications", new TableColumn({ name: "cityResourceScore", type: "int", default: 0 }));
    await this.addColumnIfMissing(queryRunner, "ambassador_applications", new TableColumn({ name: "communityScore", type: "int", default: 0 }));
    await this.addColumnIfMissing(queryRunner, "ambassador_applications", new TableColumn({ name: "contentScore", type: "int", default: 0 }));
    await this.addColumnIfMissing(queryRunner, "ambassador_applications", new TableColumn({ name: "charityScore", type: "int", default: 0 }));
    await this.addColumnIfMissing(queryRunner, "ambassador_applications", new TableColumn({ name: "deliveryScore", type: "int", default: 0 }));

    if (!(await queryRunner.hasTable("charity_project_updates"))) {
      await queryRunner.createTable(new Table({
        name: "charity_project_updates",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "projectId", type: "int" },
          { name: "title", type: "varchar", length: "120" },
          { name: "content", type: "text" },
          { name: "proofUrl", type: "varchar", length: "500", isNullable: true },
          { name: "publicVisible", type: "tinyint", default: 1 },
          { name: "publishedAt", type: "datetime", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ],
        foreignKeys: [{ name: "FK_charity_project_update_project", columnNames: ["projectId"], referencedTableName: "charity_projects", referencedColumnNames: ["id"], onDelete: "CASCADE" }]
      }));
      await queryRunner.createIndex("charity_project_updates", new TableIndex({ name: "IDX_charity_project_updates_project", columnNames: ["projectId", "publicVisible"] }));
    }

    if (!(await queryRunner.hasTable("ambassador_application_followups"))) {
      await queryRunner.createTable(new Table({
        name: "ambassador_application_followups",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "applicationId", type: "int" },
          { name: "operatorId", type: "int", isNullable: true },
          { name: "method", type: "varchar", length: "40", default: "'wechat'" },
          { name: "result", type: "varchar", length: "40", default: "'contacted'" },
          { name: "content", type: "text" },
          { name: "nextFollowAt", type: "datetime", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ],
        foreignKeys: [
          { name: "FK_ambassador_followup_application", columnNames: ["applicationId"], referencedTableName: "ambassador_applications", referencedColumnNames: ["id"], onDelete: "CASCADE" },
          { name: "FK_ambassador_followup_operator", columnNames: ["operatorId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }
        ]
      }));
      await queryRunner.createIndex("ambassador_application_followups", new TableIndex({ name: "IDX_ambassador_followups_application", columnNames: ["applicationId", "createdAt"] }));
    }

    if (!(await queryRunner.hasTable("volunteer_profiles"))) {
      await queryRunner.createTable(new Table({
        name: "volunteer_profiles",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "userId", type: "int", isNullable: true },
          { name: "applicationId", type: "int", isNullable: true },
          { name: "name", type: "varchar", length: "40" },
          { name: "phone", type: "varchar", length: "20" },
          { name: "city", type: "varchar", length: "80" },
          { name: "expertise", type: "varchar", length: "160", isNullable: true },
          { name: "availableTime", type: "varchar", length: "160", isNullable: true },
          { name: "serviceIntent", type: "varchar", length: "160", isNullable: true },
          { name: "status", type: "varchar", length: "24", default: "'pending'" },
          { name: "level", type: "varchar", length: "24", default: "'participant'" },
          { name: "serviceHours", type: "decimal", precision: 8, scale: 2, default: 0 },
          { name: "remark", type: "text", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ],
        foreignKeys: [
          { name: "FK_volunteer_profile_user", columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "SET NULL" },
          { name: "FK_volunteer_profile_application", columnNames: ["applicationId"], referencedTableName: "ambassador_applications", referencedColumnNames: ["id"], onDelete: "SET NULL" }
        ]
      }));
      await queryRunner.createIndex("volunteer_profiles", new TableIndex({ name: "IDX_volunteer_profiles_phone", columnNames: ["phone"] }));
      await queryRunner.createIndex("volunteer_profiles", new TableIndex({ name: "IDX_volunteer_profiles_status", columnNames: ["status", "level"] }));
    }

    if (!(await queryRunner.hasTable("volunteer_tasks"))) {
      await queryRunner.createTable(new Table({
        name: "volunteer_tasks",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "title", type: "varchar", length: "120" },
          { name: "type", type: "varchar", length: "40" },
          { name: "city", type: "varchar", length: "80" },
          { name: "address", type: "varchar", length: "160", isNullable: true },
          { name: "startAt", type: "datetime", isNullable: true },
          { name: "endAt", type: "datetime", isNullable: true },
          { name: "quota", type: "int", default: 1 },
          { name: "status", type: "varchar", length: "24", default: "'open'" },
          { name: "requirement", type: "text", isNullable: true },
          { name: "description", type: "text", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      }));
      await queryRunner.createIndex("volunteer_tasks", new TableIndex({ name: "IDX_volunteer_tasks_status", columnNames: ["status", "city"] }));
    }

    if (!(await queryRunner.hasTable("volunteer_task_applications"))) {
      await queryRunner.createTable(new Table({
        name: "volunteer_task_applications",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "taskId", type: "int" },
          { name: "profileId", type: "int", isNullable: true },
          { name: "userId", type: "int", isNullable: true },
          { name: "name", type: "varchar", length: "40" },
          { name: "phone", type: "varchar", length: "20" },
          { name: "city", type: "varchar", length: "80" },
          { name: "status", type: "varchar", length: "24", default: "'pending'" },
          { name: "message", type: "text", isNullable: true },
          { name: "remark", type: "text", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ],
        foreignKeys: [
          { name: "FK_volunteer_task_application_task", columnNames: ["taskId"], referencedTableName: "volunteer_tasks", referencedColumnNames: ["id"], onDelete: "CASCADE" },
          { name: "FK_volunteer_task_application_profile", columnNames: ["profileId"], referencedTableName: "volunteer_profiles", referencedColumnNames: ["id"], onDelete: "SET NULL" },
          { name: "FK_volunteer_task_application_user", columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "SET NULL" }
        ]
      }));
      await queryRunner.createIndex("volunteer_task_applications", new TableIndex({ name: "IDX_volunteer_task_applications_status", columnNames: ["status", "taskId"] }));
    }

    if (!(await queryRunner.hasTable("volunteer_service_records"))) {
      await queryRunner.createTable(new Table({
        name: "volunteer_service_records",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "profileId", type: "int" },
          { name: "taskId", type: "int", isNullable: true },
          { name: "applicationId", type: "int", isNullable: true },
          { name: "hours", type: "decimal", precision: 8, scale: 2, default: 0 },
          { name: "title", type: "varchar", length: "160" },
          { name: "proofUrl", type: "varchar", length: "500", isNullable: true },
          { name: "feedback", type: "text", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ],
        foreignKeys: [
          { name: "FK_volunteer_service_profile", columnNames: ["profileId"], referencedTableName: "volunteer_profiles", referencedColumnNames: ["id"], onDelete: "CASCADE" },
          { name: "FK_volunteer_service_task", columnNames: ["taskId"], referencedTableName: "volunteer_tasks", referencedColumnNames: ["id"], onDelete: "SET NULL" },
          { name: "FK_volunteer_service_application", columnNames: ["applicationId"], referencedTableName: "volunteer_task_applications", referencedColumnNames: ["id"], onDelete: "SET NULL" }
        ]
      }));
      await queryRunner.createIndex("volunteer_service_records", new TableIndex({ name: "IDX_volunteer_service_profile", columnNames: ["profileId", "createdAt"] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ["volunteer_service_records", "volunteer_task_applications", "volunteer_tasks", "volunteer_profiles", "ambassador_application_followups", "charity_project_updates"]) {
      if (await queryRunner.hasTable(table)) await queryRunner.dropTable(table);
    }
    for (const column of ["deliveryScore", "charityScore", "contentScore", "communityScore", "cityResourceScore"]) {
      if (await queryRunner.hasColumn("ambassador_applications", column)) await queryRunner.dropColumn("ambassador_applications", column);
    }
    if (await queryRunner.hasColumn("charity_project_disbursements", "publicVisible")) await queryRunner.dropColumn("charity_project_disbursements", "publicVisible");
  }

  private async addColumnIfMissing(queryRunner: QueryRunner, table: string, column: TableColumn) {
    if (!(await queryRunner.hasColumn(table, column.name))) await queryRunner.addColumn(table, column);
  }
}
