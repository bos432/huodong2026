import { MigrationInterface, QueryRunner } from "typeorm";
export class HomepagePublications1783410000000 implements MigrationInterface {
  name = "HomepagePublications1783410000000";
  async up(queryRunner: QueryRunner) { await queryRunner.query(`CREATE TABLE IF NOT EXISTS homepage_publications (id INT NOT NULL AUTO_INCREMENT, tenantId INT NULL, tenantScopeKey VARCHAR(32) NOT NULL DEFAULT 'platform', pageKey VARCHAR(40) NOT NULL DEFAULT 'home', sections JSON NOT NULL, versionId INT NULL, publishedById INT NULL, publishedByName VARCHAR(80) NULL, publishedAt DATETIME NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id), UNIQUE KEY UQ_homepage_publication_scope_page (tenantScopeKey, pageKey), KEY IDX_homepage_publication_tenant_page (tenantId, pageKey), CONSTRAINT FK_homepage_publication_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE) ENGINE=InnoDB`); }
  async down(queryRunner: QueryRunner) { await queryRunner.query("DROP TABLE IF EXISTS homepage_publications"); }
}
