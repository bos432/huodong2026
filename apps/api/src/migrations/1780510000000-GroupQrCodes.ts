import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class GroupQrCodes1780510000000 implements MigrationInterface {
  name = "GroupQrCodes1780510000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("activities")) {
      if (!(await queryRunner.hasColumn("activities", "groupQrCodeUrl"))) {
        await queryRunner.addColumn("activities", new TableColumn({ name: "groupQrCodeUrl", type: "varchar", length: "500", isNullable: true }));
      }
    }
    if (await queryRunner.hasTable("operation_settings")) {
      if (!(await queryRunner.hasColumn("operation_settings", "defaultGroupQrCodeUrl"))) {
        await queryRunner.addColumn("operation_settings", new TableColumn({ name: "defaultGroupQrCodeUrl", type: "varchar", length: "500", isNullable: true }));
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("operation_settings")) {
      if (await queryRunner.hasColumn("operation_settings", "defaultGroupQrCodeUrl")) await queryRunner.dropColumn("operation_settings", "defaultGroupQrCodeUrl");
    }
    if (await queryRunner.hasTable("activities")) {
      if (await queryRunner.hasColumn("activities", "groupQrCodeUrl")) await queryRunner.dropColumn("activities", "groupQrCodeUrl");
    }
  }
}
