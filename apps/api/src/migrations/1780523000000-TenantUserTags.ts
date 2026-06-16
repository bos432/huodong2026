import { MigrationInterface, QueryRunner, TableForeignKey, TableIndex } from "typeorm";

export class TenantUserTags1780523000000 implements MigrationInterface {
  name = "TenantUserTags1780523000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("user_tags"))) return;
    await this.addTenantColumn(queryRunner);
    const tenantId = await this.defaultTenantId(queryRunner);
    if (tenantId) await queryRunner.query("UPDATE user_tags SET tenantId = ? WHERE tenantId IS NULL", [tenantId]);
    await this.addUserIndex(queryRunner);
    await this.dropUniqueIndex(queryRunner, ["userId", "name"]);
    await this.addTenantIndex(queryRunner);
    await this.addTenantUserNameUniqueIndex(queryRunner);
    await this.addTenantForeignKey(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("user_tags")) || !(await queryRunner.hasColumn("user_tags", "tenantId"))) return;
    const table = await queryRunner.getTable("user_tags");
    const foreignKey = table?.foreignKeys.find((key) => key.columnNames.includes("tenantId"));
    if (foreignKey) await queryRunner.dropForeignKey("user_tags", foreignKey);
    const uniqueIndex = table?.indices.find((item) => item.name === "IDX_user_tags_tenant_user_name");
    if (uniqueIndex) await queryRunner.dropIndex("user_tags", uniqueIndex);
    const index = table?.indices.find((item) => item.name === "IDX_user_tags_tenantId");
    if (index) await queryRunner.dropIndex("user_tags", index);
    await queryRunner.dropColumn("user_tags", "tenantId");
  }

  private async defaultTenantId(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("tenants"))) return null;
    const rows = await queryRunner.query("SELECT id FROM tenants WHERE code = ? LIMIT 1", ["platform"]);
    return rows[0]?.id ? Number(rows[0].id) : null;
  }

  private async addTenantColumn(queryRunner: QueryRunner) {
    if (await queryRunner.hasColumn("user_tags", "tenantId")) return;
    await queryRunner.query("ALTER TABLE user_tags ADD tenantId int NULL");
  }

  private async addTenantIndex(queryRunner: QueryRunner) {
    const table = await queryRunner.getTable("user_tags");
    if (table?.indices.some((index) => index.name === "IDX_user_tags_tenantId")) return;
    await queryRunner.createIndex("user_tags", new TableIndex({ name: "IDX_user_tags_tenantId", columnNames: ["tenantId"] }));
  }

  private async addUserIndex(queryRunner: QueryRunner) {
    const table = await queryRunner.getTable("user_tags");
    if (table?.indices.some((index) => this.sameColumns(index.columnNames, ["userId"]))) return;
    await queryRunner.createIndex("user_tags", new TableIndex({ name: "IDX_user_tags_userId", columnNames: ["userId"] }));
  }

  private async addTenantUserNameUniqueIndex(queryRunner: QueryRunner) {
    const table = await queryRunner.getTable("user_tags");
    if (table?.indices.some((index) => index.name === "IDX_user_tags_tenant_user_name")) return;
    await queryRunner.createIndex("user_tags", new TableIndex({ name: "IDX_user_tags_tenant_user_name", columnNames: ["tenantId", "userId", "name"], isUnique: true }));
  }

  private async dropUniqueIndex(queryRunner: QueryRunner, columnNames: string[]) {
    const table = await queryRunner.getTable("user_tags");
    const uniqueIndex = table?.indices.find((index) => index.isUnique && this.sameColumns(index.columnNames, columnNames));
    if (uniqueIndex) await queryRunner.dropIndex("user_tags", uniqueIndex);
  }

  private sameColumns(left: string[], right: string[]) {
    return left.length === right.length && left.every((column, index) => column === right[index]);
  }

  private async addTenantForeignKey(queryRunner: QueryRunner) {
    const table = await queryRunner.getTable("user_tags");
    if (table?.foreignKeys.some((key) => key.columnNames.includes("tenantId"))) return;
    await queryRunner.createForeignKey(
      "user_tags",
      new TableForeignKey({
        columnNames: ["tenantId"],
        referencedTableName: "tenants",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL"
      })
    );
  }
}
