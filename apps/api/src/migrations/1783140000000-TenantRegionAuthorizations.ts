import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class TenantRegionAuthorizations1783140000000 implements MigrationInterface {
  name = "TenantRegionAuthorizations1783140000000";

  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("tenant_regions"))) return;
    if (!(await queryRunner.hasColumn("tenant_regions", "authorizationStatus"))) await queryRunner.addColumn("tenant_regions", new TableColumn({ name: "authorizationStatus", type: "varchar", length: "20", default: "'approved'" }));
    if (!(await queryRunner.hasColumn("tenant_regions", "validFrom"))) await queryRunner.addColumn("tenant_regions", new TableColumn({ name: "validFrom", type: "date", isNullable: true }));
    if (!(await queryRunner.hasColumn("tenant_regions", "validUntil"))) await queryRunner.addColumn("tenant_regions", new TableColumn({ name: "validUntil", type: "date", isNullable: true }));
    if (!(await queryRunner.hasColumn("tenant_regions", "approvalRemark"))) await queryRunner.addColumn("tenant_regions", new TableColumn({ name: "approvalRemark", type: "varchar", length: "500", isNullable: true }));
    const table = await queryRunner.getTable("tenant_regions");
    if (!table?.indices.some((index) => index.name === "IDX_tenant_regions_authorization_validity")) await queryRunner.createIndex("tenant_regions", new TableIndex({ name: "IDX_tenant_regions_authorization_validity", columnNames: ["enabled", "authorizationStatus", "validFrom", "validUntil"] }));
  }

  async down(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("tenant_regions"))) return;
    const table = await queryRunner.getTable("tenant_regions");
    if (table?.indices.some((index) => index.name === "IDX_tenant_regions_authorization_validity")) await queryRunner.dropIndex("tenant_regions", "IDX_tenant_regions_authorization_validity");
    for (const column of ["approvalRemark", "validUntil", "validFrom", "authorizationStatus"]) if (await queryRunner.hasColumn("tenant_regions", column)) await queryRunner.dropColumn("tenant_regions", column);
  }
}
