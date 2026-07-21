import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class ActivityLifecycle1783220000000 implements MigrationInterface {
  name = "ActivityLifecycle1783220000000";
  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("activities"))) return;
    await queryRunner.query("ALTER TABLE `activities` MODIFY `status` enum('draft','pending_approval','rejected','open','closed','cancelled','ended') NOT NULL DEFAULT 'draft'");
    const columns = [
      new TableColumn({ name: "scheduledPublishAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "cancelledAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "cancellationReason", type: "varchar", length: "500", isNullable: true })
    ];
    for (const column of columns) if (!(await queryRunner.hasColumn("activities", column.name))) await queryRunner.addColumn("activities", column);
  }
  async down(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("activities"))) return;
    await queryRunner.query("UPDATE `activities` SET `status` = 'closed' WHERE `status` = 'cancelled'");
    for (const name of ["cancellationReason", "cancelledAt", "scheduledPublishAt"]) if (await queryRunner.hasColumn("activities", name)) await queryRunner.dropColumn("activities", name);
    await queryRunner.query("ALTER TABLE `activities` MODIFY `status` enum('draft','pending_approval','rejected','open','closed','ended') NOT NULL DEFAULT 'draft'");
  }
}
