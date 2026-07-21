import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class CouponTenantGovernance1783850000000 implements MigrationInterface {
  name = "CouponTenantGovernance1783850000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.replaceGlobalCodeIndex(queryRunner, "coupons", "UQ_coupons_tenant_code");
    await this.replaceGlobalCodeIndex(queryRunner, "redemption_codes", "UQ_redemption_codes_tenant_code");
    await this.ensureIndex(queryRunner, "coupon_claims", "IDX_coupon_claims_tenant_created", ["tenantId", "createdAt"]);
    await this.ensureIndex(queryRunner, "coupon_usages", "IDX_coupon_usages_tenant_created", ["tenantId", "createdAt"]);
    await this.ensureIndex(queryRunner, "redemption_code_usages", "IDX_redemption_code_usages_tenant_created", ["tenantId", "createdAt"]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropIndex(queryRunner, "redemption_code_usages", "IDX_redemption_code_usages_tenant_created");
    await this.dropIndex(queryRunner, "coupon_usages", "IDX_coupon_usages_tenant_created");
    await this.dropIndex(queryRunner, "coupon_claims", "IDX_coupon_claims_tenant_created");
    await this.restoreGlobalCodeIndex(queryRunner, "redemption_codes", "UQ_redemption_codes_tenant_code", "UQ_redemption_code");
    await this.restoreGlobalCodeIndex(queryRunner, "coupons", "UQ_coupons_tenant_code", "IDX_coupons_code");
  }

  private async replaceGlobalCodeIndex(queryRunner: QueryRunner, tableName: string, compositeName: string) {
    if (!(await queryRunner.hasTable(tableName))) return;
    const table = await queryRunner.getTable(tableName);
    if (!table) return;
    for (const index of table.indices.filter((item) => item.isUnique && item.columnNames.length === 1 && item.columnNames[0] === "code")) {
      await queryRunner.dropIndex(tableName, index);
    }
    const refreshed = await queryRunner.getTable(tableName);
    if (!refreshed?.indices.some((index) => index.name === compositeName)) {
      await queryRunner.createIndex(tableName, new TableIndex({ name: compositeName, columnNames: ["tenantId", "code"], isUnique: true }));
    }
  }

  private async restoreGlobalCodeIndex(queryRunner: QueryRunner, tableName: string, compositeName: string, globalName: string) {
    if (!(await queryRunner.hasTable(tableName))) return;
    const duplicateRows = await queryRunner.query(`SELECT code FROM \`${tableName}\` GROUP BY code HAVING COUNT(*) > 1 LIMIT 1`);
    if (duplicateRows.length) throw new Error(`Cannot restore global ${tableName}.code uniqueness while duplicate tenant codes exist`);
    await this.dropIndex(queryRunner, tableName, compositeName);
    const table = await queryRunner.getTable(tableName);
    if (!table?.indices.some((index) => index.name === globalName)) {
      await queryRunner.createIndex(tableName, new TableIndex({ name: globalName, columnNames: ["code"], isUnique: true }));
    }
  }

  private async ensureIndex(queryRunner: QueryRunner, tableName: string, indexName: string, columnNames: string[]) {
    if (!(await queryRunner.hasTable(tableName))) return;
    const table = await queryRunner.getTable(tableName);
    if (!table?.indices.some((index) => index.name === indexName)) {
      await queryRunner.createIndex(tableName, new TableIndex({ name: indexName, columnNames }));
    }
  }

  private async dropIndex(queryRunner: QueryRunner, tableName: string, indexName: string) {
    if (!(await queryRunner.hasTable(tableName))) return;
    const table = await queryRunner.getTable(tableName);
    const index = table?.indices.find((item) => item.name === indexName);
    if (index) await queryRunner.dropIndex(tableName, index);
  }
}
