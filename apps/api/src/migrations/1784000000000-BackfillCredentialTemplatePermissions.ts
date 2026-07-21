import { MigrationInterface, QueryRunner } from "typeorm";

const VIEW_PERMISSION = "certificate_template.view";
const MANAGE_PERMISSION = "certificate_template.manage";

export class BackfillCredentialTemplatePermissions1784000000000 implements MigrationInterface {
  name = "BackfillCredentialTemplatePermissions1784000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("admin_users")) || !(await queryRunner.hasColumn("admin_users", "permissions"))) return;
    const rows = await queryRunner.query("SELECT id, permissions FROM admin_users WHERE permissions IS NOT NULL");
    for (const row of rows as Array<{ id: number; permissions: unknown }>) {
      const permissions = this.parsePermissions(row.permissions);
      if (!permissions.includes("charity.manage") && !permissions.includes("course.manage")) continue;
      const updated = Array.from(new Set([...permissions, VIEW_PERMISSION, MANAGE_PERMISSION]));
      if (updated.length !== permissions.length) await queryRunner.query("UPDATE admin_users SET permissions = ? WHERE id = ?", [JSON.stringify(updated), row.id]);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("admin_users")) || !(await queryRunner.hasColumn("admin_users", "permissions"))) return;
    const rows = await queryRunner.query("SELECT id, permissions FROM admin_users WHERE permissions IS NOT NULL");
    for (const row of rows as Array<{ id: number; permissions: unknown }>) {
      const permissions = this.parsePermissions(row.permissions).filter((permission) => permission !== VIEW_PERMISSION && permission !== MANAGE_PERMISSION);
      await queryRunner.query("UPDATE admin_users SET permissions = ? WHERE id = ?", [JSON.stringify(permissions), row.id]);
    }
  }

  private parsePermissions(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String);
    if (Buffer.isBuffer(value)) return this.parsePermissions(value.toString("utf8"));
    if (typeof value !== "string") return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
}
