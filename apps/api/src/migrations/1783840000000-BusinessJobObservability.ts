import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class BusinessJobObservability1783840000000 implements MigrationInterface {
  name = "BusinessJobObservability1783840000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("business_jobs"))) return;
    if (!(await queryRunner.hasColumn("business_jobs", "lastWorkerId"))) await queryRunner.addColumn("business_jobs", new TableColumn({ name: "lastWorkerId", type: "varchar", length: "80", isNullable: true }));
    if (!(await queryRunner.hasColumn("business_jobs", "lastStartedAt"))) await queryRunner.addColumn("business_jobs", new TableColumn({ name: "lastStartedAt", type: "datetime", isNullable: true }));
    if (!(await queryRunner.hasColumn("business_jobs", "lastFinishedAt"))) await queryRunner.addColumn("business_jobs", new TableColumn({ name: "lastFinishedAt", type: "datetime", isNullable: true }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("business_jobs"))) return;
    if (await queryRunner.hasColumn("business_jobs", "lastFinishedAt")) await queryRunner.dropColumn("business_jobs", "lastFinishedAt");
    if (await queryRunner.hasColumn("business_jobs", "lastStartedAt")) await queryRunner.dropColumn("business_jobs", "lastStartedAt");
    if (await queryRunner.hasColumn("business_jobs", "lastWorkerId")) await queryRunner.dropColumn("business_jobs", "lastWorkerId");
  }
}
