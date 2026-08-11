import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class TenantFollowers1784140000000 implements MigrationInterface {
  name = "TenantFollowers1784140000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("tenant_followers")) return;
    await queryRunner.createTable(new Table({
      name: "tenant_followers",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
        { name: "tenantId", type: "int" },
        { name: "userId", type: "int" },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
      ]
    }));
    await queryRunner.createForeignKeys("tenant_followers", [
      new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
      new TableForeignKey({ columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" })
    ]);
    await queryRunner.createIndex("tenant_followers", new TableIndex({ name: "UQ_tenant_followers_tenant_user", columnNames: ["tenantId", "userId"], isUnique: true }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("tenant_followers")) await queryRunner.dropTable("tenant_followers");
  }
}
