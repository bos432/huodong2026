import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class CourseOrderIdempotency1783770000000 implements MigrationInterface {
  name = "CourseOrderIdempotency1783770000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("course_orders"))) return;
    if (!(await queryRunner.hasColumn("course_orders", "clientOrderKey"))) {
      await queryRunner.addColumn("course_orders", new TableColumn({ name: "clientOrderKey", type: "varchar", length: "120", isNullable: true }));
    }
    const table = await queryRunner.getTable("course_orders");
    if (table && !table.indices.some(index => index.name === "UQ_course_orders_user_client_key")) {
      await queryRunner.createIndex("course_orders", new TableIndex({ name: "UQ_course_orders_user_client_key", columnNames: ["userId", "clientOrderKey"], isUnique: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("course_orders"))) return;
    const table = await queryRunner.getTable("course_orders");
    if (table?.indices.some(index => index.name === "UQ_course_orders_user_client_key")) await queryRunner.dropIndex("course_orders", "UQ_course_orders_user_client_key");
    if (await queryRunner.hasColumn("course_orders", "clientOrderKey")) await queryRunner.dropColumn("course_orders", "clientOrderKey");
  }
}
