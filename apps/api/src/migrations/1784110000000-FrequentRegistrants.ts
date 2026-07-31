import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class FrequentRegistrants1784110000000 implements MigrationInterface {
  name = "FrequentRegistrants1784110000000";

  async up(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("frequent_registrants")) return;
    await queryRunner.createTable(new Table({ name: "frequent_registrants", columns: [
      { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
      { name: "userId", type: "int" }, { name: "tenantId", type: "int", isNullable: true },
      { name: "name", type: "varchar", length: "80" }, { name: "phone", type: "varchar", length: "32", isNullable: true }, { name: "idCard", type: "varchar", length: "64", isNullable: true },
      { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
    ] }));
    await queryRunner.createIndex("frequent_registrants", new TableIndex({ name: "IDX_frequent_registrants_user_tenant_updated", columnNames: ["userId", "tenantId", "updatedAt"] }));
    await queryRunner.createForeignKey("frequent_registrants", new TableForeignKey({ columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createForeignKey("frequent_registrants", new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
  }

  async down(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("frequent_registrants")) await queryRunner.dropTable("frequent_registrants", true);
  }
}
