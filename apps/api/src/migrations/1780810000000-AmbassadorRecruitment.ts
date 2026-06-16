import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class AmbassadorRecruitment1780810000000 implements MigrationInterface {
  name = "AmbassadorRecruitment1780810000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("ambassador_landing_settings"))) {
      await queryRunner.createTable(
        new Table({
          name: "ambassador_landing_settings",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "enabled", type: "tinyint", default: 1 },
            { name: "config", type: "json", isNullable: true },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
            { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
          ]
        })
      );
    }
    if (!(await queryRunner.hasTable("ambassador_cases"))) {
      await queryRunner.createTable(
        new Table({
          name: "ambassador_cases",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "name", type: "varchar", length: "80" },
            { name: "field", type: "varchar", length: "80", isNullable: true },
            { name: "avatarUrl", type: "varchar", length: "500", isNullable: true },
            { name: "metrics", type: "varchar", length: "160", isNullable: true },
            { name: "quote", type: "text", isNullable: true },
            { name: "sortOrder", type: "int", default: 0 },
            { name: "enabled", type: "tinyint", default: 1 },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
            { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createIndex("ambassador_cases", new TableIndex({ name: "IDX_ambassador_cases_enabled_sort", columnNames: ["enabled", "sortOrder"] }));
    }
    if (!(await queryRunner.hasTable("ambassador_applications"))) {
      await queryRunner.createTable(
        new Table({
          name: "ambassador_applications",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "name", type: "varchar", length: "40" },
            { name: "phone", type: "varchar", length: "20" },
            { name: "city", type: "varchar", length: "80" },
            { name: "expertise", type: "varchar", length: "120" },
            { name: "experience", type: "text" },
            { name: "wechat", type: "varchar", length: "80" },
            { name: "status", type: "varchar", length: "24", default: "'pending'" },
            { name: "remark", type: "text", isNullable: true },
            { name: "reviewedBy", type: "int", isNullable: true },
            { name: "reviewedAt", type: "datetime", isNullable: true },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
            { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createIndex("ambassador_applications", new TableIndex({ name: "IDX_ambassador_applications_phone", columnNames: ["phone"] }));
      await queryRunner.createIndex("ambassador_applications", new TableIndex({ name: "IDX_ambassador_applications_status", columnNames: ["status"] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("ambassador_applications")) await queryRunner.dropTable("ambassador_applications");
    if (await queryRunner.hasTable("ambassador_cases")) await queryRunner.dropTable("ambassador_cases");
    if (await queryRunner.hasTable("ambassador_landing_settings")) await queryRunner.dropTable("ambassador_landing_settings");
  }
}
