import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from "typeorm";

export class SocialProfiles1784150000000 implements MigrationInterface {
  name = "SocialProfiles1784150000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("social_profiles")) return;
    await queryRunner.createTable(new Table({
      name: "social_profiles",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
        { name: "userId", type: "int" },
        { name: "tenantId", type: "int", isNullable: true },
        { name: "tenantScopeKey", type: "varchar", length: "32", default: "'platform'" },
        { name: "displayName", type: "varchar", length: "60" },
        { name: "city", type: "varchar", length: "80", isNullable: true },
        { name: "industry", type: "varchar", length: "80", isNullable: true },
        { name: "roleTitle", type: "varchar", length: "100", isNullable: true },
        { name: "introduction", type: "varchar", length: "1000" },
        { name: "offers", type: "json", isNullable: true },
        { name: "needs", type: "json", isNullable: true },
        { name: "status", type: "varchar", length: "20", default: "'pending'" },
        { name: "visible", type: "tinyint", width: 1, default: 1 },
        { name: "reviewRemark", type: "varchar", length: "500", isNullable: true },
        { name: "reviewedAt", type: "datetime", isNullable: true },
        { name: "reviewedByAdminId", type: "int", isNullable: true },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
        { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
      ],
      uniques: [new TableUnique({ name: "UQ_social_profiles_scope_user", columnNames: ["tenantScopeKey", "userId"] })],
      indices: [new TableIndex({ name: "IDX_social_profiles_public", columnNames: ["tenantScopeKey", "status", "visible", "updatedAt"] })]
    }));
    await queryRunner.createForeignKeys("social_profiles", [
      new TableForeignKey({ name: "FK_social_profiles_user", columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
      new TableForeignKey({ name: "FK_social_profiles_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" })
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("social_profiles")) await queryRunner.dropTable("social_profiles");
  }
}
