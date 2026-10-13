import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class MemberHostApplicationOwnership1788653800000 implements MigrationInterface {
  name = "MemberHostApplicationOwnership1788653800000";
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of [new TableColumn({ name: "applicantUserId", type: "int", isNullable: true }), new TableColumn({ name: "applicantTenantScopeKey", type: "varchar", length: "80", isNullable: true })]) {
      if (!(await queryRunner.hasColumn("ambassador_applications", column.name))) await queryRunner.addColumn("ambassador_applications", column);
    }
    const table = await queryRunner.getTable("ambassador_applications");
    if (!table?.indices.some((index) => index.name === "IDX_host_application_owner")) await queryRunner.createIndex("ambassador_applications", new TableIndex({ name: "IDX_host_application_owner", columnNames: ["applicantUserId", "applicantTenantScopeKey", "source", "id"] }));
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("ambassador_applications");
    if (table?.indices.some((index) => index.name === "IDX_host_application_owner")) await queryRunner.dropIndex("ambassador_applications", "IDX_host_application_owner");
    for (const column of ["applicantTenantScopeKey", "applicantUserId"]) if (await queryRunner.hasColumn("ambassador_applications", column)) await queryRunner.dropColumn("ambassador_applications", column);
  }
}
