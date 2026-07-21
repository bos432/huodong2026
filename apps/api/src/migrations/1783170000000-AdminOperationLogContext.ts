import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AdminOperationLogContext1783170000000 implements MigrationInterface {
  name = "AdminOperationLogContext1783170000000";
  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("admin_operation_logs"))) return;
    const columns = [new TableColumn({ name: "adminRole", type: "varchar", length: "40", isNullable: true }), new TableColumn({ name: "clientIp", type: "varchar", length: "64", isNullable: true }), new TableColumn({ name: "userAgent", type: "varchar", length: "255", isNullable: true }), new TableColumn({ name: "requestId", type: "varchar", length: "80", isNullable: true })];
    for (const column of columns) if (!(await queryRunner.hasColumn("admin_operation_logs", column.name))) await queryRunner.addColumn("admin_operation_logs", column);
    const table = await queryRunner.getTable("admin_operation_logs");
    if (!table?.indices.some((index) => index.name === "IDX_admin_operation_logs_request")) await queryRunner.createIndex("admin_operation_logs", new TableIndex({ name: "IDX_admin_operation_logs_request", columnNames: ["requestId"] }));
  }
  async down(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("admin_operation_logs"))) return;
    const table = await queryRunner.getTable("admin_operation_logs");
    if (table?.indices.some((index) => index.name === "IDX_admin_operation_logs_request")) await queryRunner.dropIndex("admin_operation_logs", "IDX_admin_operation_logs_request");
    for (const name of ["requestId", "userAgent", "clientIp", "adminRole"]) if (await queryRunner.hasColumn("admin_operation_logs", name)) await queryRunner.dropColumn("admin_operation_logs", name);
  }
}
