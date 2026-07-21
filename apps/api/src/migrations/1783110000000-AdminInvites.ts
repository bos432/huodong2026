import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class AdminInvites1783110000000 implements MigrationInterface {
  name = "AdminInvites1783110000000";
  async up(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("admin_invites")) return;
    await queryRunner.createTable(new Table({ name: "admin_invites", columns: [
      { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "username", type: "varchar", length: "80" },
      { name: "tokenHash", type: "varchar", length: "64", isUnique: true }, { name: "role", type: "varchar", length: "40" }, { name: "permissions", type: "json", isNullable: true }, { name: "dataScope", type: "json", isNullable: true },
      { name: "tenantId", type: "int", isNullable: true }, { name: "invitedById", type: "int", isNullable: true }, { name: "acceptedAdminId", type: "int", isNullable: true },
      { name: "status", type: "varchar", length: "20", default: "'pending'" }, { name: "expiresAt", type: "datetime" }, { name: "acceptedAt", type: "datetime", isNullable: true }, { name: "revokedAt", type: "datetime", isNullable: true },
      { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
    ] }));
    await queryRunner.createIndex("admin_invites", new TableIndex({ name: "IDX_admin_invites_tenant_status", columnNames: ["tenantId", "status", "expiresAt"] }));
    await queryRunner.createIndex("admin_invites", new TableIndex({ name: "IDX_admin_invites_username_status", columnNames: ["username", "status"] }));
    await queryRunner.createForeignKey("admin_invites", new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
    await queryRunner.createForeignKey("admin_invites", new TableForeignKey({ columnNames: ["invitedById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    await queryRunner.createForeignKey("admin_invites", new TableForeignKey({ columnNames: ["acceptedAdminId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
  }
  async down(queryRunner: QueryRunner) { if (await queryRunner.hasTable("admin_invites")) await queryRunner.dropTable("admin_invites", true); }
}
