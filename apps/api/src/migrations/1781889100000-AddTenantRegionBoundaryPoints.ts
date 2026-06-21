import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddTenantRegionBoundaryPoints1781889100000 implements MigrationInterface {
  name = "AddTenantRegionBoundaryPoints1781889100000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("tenant_regions"))) return;
    if (await queryRunner.hasColumn("tenant_regions", "boundaryPoints")) return;
    await queryRunner.addColumn("tenant_regions", new TableColumn({ name: "boundaryPoints", type: "json", isNullable: true }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("tenant_regions"))) return;
    if (!(await queryRunner.hasColumn("tenant_regions", "boundaryPoints"))) return;
    await queryRunner.dropColumn("tenant_regions", "boundaryPoints");
  }
}
