import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class CourseRefundProviderRecovery1783970000000 implements MigrationInterface {
  name = "CourseRefundProviderRecovery1783970000000";

  async up(queryRunner: QueryRunner) {
    const columns = [
      new TableColumn({ name: "providerRefundStatus", type: "varchar", length: "40", isNullable: true }),
      new TableColumn({ name: "providerRefundSyncedAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "providerRefundPayload", type: "json", isNullable: true }),
      new TableColumn({ name: "providerRefundRetryCount", type: "int", default: 0 }),
      new TableColumn({ name: "providerRefundNextQueryAt", type: "datetime", isNullable: true })
    ];
    for (const column of columns) {
      if (!(await queryRunner.hasColumn("course_refunds", column.name))) await queryRunner.addColumn("course_refunds", column);
    }
  }

  async down(queryRunner: QueryRunner) {
    for (const name of ["providerRefundNextQueryAt", "providerRefundRetryCount", "providerRefundPayload", "providerRefundSyncedAt", "providerRefundStatus"]) {
      if (await queryRunner.hasColumn("course_refunds", name)) await queryRunner.dropColumn("course_refunds", name);
    }
  }
}
