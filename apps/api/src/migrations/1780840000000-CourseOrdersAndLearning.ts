import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CourseOrdersAndLearning1780840000000 implements MigrationInterface {
  name = "CourseOrdersAndLearning1780840000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("course_orders"))) {
      await queryRunner.createTable(
        new Table({
          name: "course_orders",
          columns: [
            { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
            { name: "orderNo", type: "varchar", length: "64", isUnique: true },
            { name: "userId", type: "int" },
            { name: "courseId", type: "int" },
            { name: "amount", type: "decimal", precision: 10, scale: 2 },
            { name: "paymentMethod", type: "enum", enum: ["free", "wechat", "alipay", "balance", "offline"] },
            { name: "status", type: "enum", enum: ["pending_payment", "paid", "closed"] },
            { name: "transactionNo", type: "varchar", length: "128", isNullable: true },
            { name: "paidAt", type: "datetime", isNullable: true },
            { name: "expiresAt", type: "datetime", isNullable: true },
            { name: "closedAt", type: "datetime", isNullable: true },
            { name: "closeReason", type: "varchar", length: "255", isNullable: true },
            { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
            { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
          ]
        })
      );
      await queryRunner.createIndex("course_orders", new TableIndex({ name: "IDX_course_orders_user_course_status", columnNames: ["userId", "courseId", "status"] }));
      await queryRunner.createIndex("course_orders", new TableIndex({ name: "IDX_course_orders_order_no", columnNames: ["orderNo"] }));
    } else {
      const table = await queryRunner.getTable("course_orders");
      const indexNames = new Set((table?.indices || []).map((index) => index.name));
      if (!indexNames.has("IDX_course_orders_user_course_status")) {
        await queryRunner.createIndex("course_orders", new TableIndex({ name: "IDX_course_orders_user_course_status", columnNames: ["userId", "courseId", "status"] }));
      }
      if (!indexNames.has("IDX_course_orders_order_no")) {
        await queryRunner.createIndex("course_orders", new TableIndex({ name: "IDX_course_orders_order_no", columnNames: ["orderNo"] }));
      }
    }

    if (await queryRunner.hasTable("user_learning")) {
      const table = await queryRunner.getTable("user_learning");
      const hasIndex = table?.indices.some((index) => index.name === "IDX_user_learning_user_course_lesson");
      if (!hasIndex) {
        await queryRunner.createIndex("user_learning", new TableIndex({ name: "IDX_user_learning_user_course_lesson", columnNames: ["userId", "courseId", "lessonId"], isUnique: true }));
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("user_learning")) {
      const table = await queryRunner.getTable("user_learning");
      const index = table?.indices.find((item) => item.name === "IDX_user_learning_user_course_lesson");
      if (index) await queryRunner.dropIndex("user_learning", index);
    }
    if (await queryRunner.hasTable("course_orders")) await queryRunner.dropTable("course_orders");
  }
}
