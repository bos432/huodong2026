import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMallLogisticsCompanies1781715000000 implements MigrationInterface {
  name = "CreateMallLogisticsCompanies1781715000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_logistics_companies")) return;
    await queryRunner.query(`
      CREATE TABLE mall_logistics_companies (
        id INT NOT NULL AUTO_INCREMENT,
        tenantId INT NOT NULL,
        name VARCHAR(80) NOT NULL,
        code VARCHAR(40) NULL,
        servicePhone VARCHAR(40) NULL,
        trackingUrl VARCHAR(255) NULL,
        sortOrder INT NOT NULL DEFAULT 0,
        enabled TINYINT NOT NULL DEFAULT 1,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX IDX_mall_logistics_tenant_name (tenantId, name),
        INDEX IDX_mall_logistics_tenant_enabled_sort (tenantId, enabled, sortOrder),
        PRIMARY KEY (id),
        CONSTRAINT FK_mall_logistics_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_logistics_companies")) await queryRunner.query("DROP TABLE mall_logistics_companies");
  }
}
