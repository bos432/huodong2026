import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class CharityProjectGovernance1783710000000 implements MigrationInterface {
  name = "CharityProjectGovernance1783710000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("charity_projects")) {
      const columns = [
        new TableColumn({ name: "projectNo", type: "varchar", length: "64", isNullable: true }),
        new TableColumn({ name: "applicantId", type: "int", isNullable: true }),
        new TableColumn({ name: "reviewerId", type: "int", isNullable: true }),
        new TableColumn({ name: "submitBusinessKey", type: "varchar", length: "160", isNullable: true }),
        new TableColumn({ name: "reviewBusinessKey", type: "varchar", length: "160", isNullable: true }),
        new TableColumn({ name: "submittedAt", type: "datetime", isNullable: true }),
        new TableColumn({ name: "reviewedAt", type: "datetime", isNullable: true }),
        new TableColumn({ name: "reviewRemark", type: "varchar", length: "500", isNullable: true }),
        new TableColumn({ name: "applicationSnapshot", type: "json", isNullable: true }),
        new TableColumn({ name: "version", type: "int", default: 1 })
      ];
      for (const column of columns) if (!(await queryRunner.hasColumn("charity_projects", column.name))) await queryRunner.addColumn("charity_projects", column);
      await queryRunner.query("UPDATE `charity_projects` SET `projectNo` = CONCAT('CP', DATE_FORMAT(`createdAt`, '%Y%m%d'), LPAD(`id`, 8, '0')) WHERE `projectNo` IS NULL");
      await queryRunner.changeColumn("charity_projects", "projectNo", new TableColumn({ name: "projectNo", type: "varchar", length: "64", isNullable: false }));
      const table = await queryRunner.getTable("charity_projects");
      for (const key of [
        new TableForeignKey({ name: "FK_charity_project_applicant", columnNames: ["applicantId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
        new TableForeignKey({ name: "FK_charity_project_reviewer", columnNames: ["reviewerId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" })
      ]) if (!table?.foreignKeys.some((existing) => existing.name === key.name)) await queryRunner.createForeignKey("charity_projects", key);
      if (!table?.indices.some((index) => index.name === "UQ_charity_project_no")) await queryRunner.createIndex("charity_projects", new TableIndex({ name: "UQ_charity_project_no", columnNames: ["projectNo"], isUnique: true }));
      if (!table?.indices.some((index) => index.name === "UQ_charity_project_submit_key")) await queryRunner.createIndex("charity_projects", new TableIndex({ name: "UQ_charity_project_submit_key", columnNames: ["submitBusinessKey"], isUnique: true }));
      if (!table?.indices.some((index) => index.name === "UQ_charity_project_review_key")) await queryRunner.createIndex("charity_projects", new TableIndex({ name: "UQ_charity_project_review_key", columnNames: ["reviewBusinessKey"], isUnique: true }));
    }

    if (!(await queryRunner.hasTable("charity_project_events"))) {
      await queryRunner.createTable(new Table({
        name: "charity_project_events",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "projectId", type: "int" },
          { name: "operatorId", type: "int", isNullable: true },
          { name: "businessKey", type: "varchar", length: "160" },
          { name: "action", type: "varchar", length: "32" },
          { name: "fromStatus", type: "varchar", length: "32", isNullable: true },
          { name: "toStatus", type: "varchar", length: "32" },
          { name: "remark", type: "varchar", length: "500", isNullable: true },
          { name: "snapshot", type: "json", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      }));
      for (const key of [
        new TableForeignKey({ name: "FK_charity_project_event_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
        new TableForeignKey({ name: "FK_charity_project_event_project", columnNames: ["projectId"], referencedTableName: "charity_projects", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_charity_project_event_operator", columnNames: ["operatorId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" })
      ]) await queryRunner.createForeignKey("charity_project_events", key);
      await queryRunner.createIndex("charity_project_events", new TableIndex({ name: "UQ_charity_project_event_key", columnNames: ["businessKey"], isUnique: true }));
      await queryRunner.createIndex("charity_project_events", new TableIndex({ name: "IDX_charity_project_event_timeline", columnNames: ["projectId", "createdAt"] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("charity_project_events")) await queryRunner.dropTable("charity_project_events", true);
    if (await queryRunner.hasTable("charity_projects")) {
      for (const name of ["version", "applicationSnapshot", "reviewRemark", "reviewedAt", "submittedAt", "reviewBusinessKey", "submitBusinessKey", "reviewerId", "applicantId", "projectNo"]) {
        if (await queryRunner.hasColumn("charity_projects", name)) await queryRunner.dropColumn("charity_projects", name);
      }
    }
  }
}
