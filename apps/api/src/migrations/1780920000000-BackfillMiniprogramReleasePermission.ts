import { MigrationInterface, QueryRunner } from "typeorm";

const MINIPROGRAM_RELEASE_PERMISSION = "miniprogram_release.manage";

export class BackfillMiniprogramReleasePermission1780920000000 implements MigrationInterface {
  name = "BackfillMiniprogramReleasePermission1780920000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("admin_users"))) return;
    if (!(await queryRunner.hasColumn("admin_users", "permissions"))) return;

    const hasTenantId = await queryRunner.hasColumn("admin_users", "tenantId");
    const tenantFilter = hasTenantId ? "AND (`tenantId` IS NULL OR `tenantId` = 0)" : "";
    const rows = await queryRunner.query(
      `SELECT id, permissions FROM admin_users WHERE role IN (?, ?) ${tenantFilter} AND permissions IS NOT NULL`,
      ["super_admin", "admin"]
    );

    for (const row of rows as Array<{ id: number; permissions: unknown }>) {
      const permissions = this.parsePermissions(row.permissions);
      if (permissions.includes(MINIPROGRAM_RELEASE_PERMISSION)) continue;
      permissions.push(MINIPROGRAM_RELEASE_PERMISSION);
      await queryRunner.query("UPDATE admin_users SET permissions = ? WHERE id = ?", [JSON.stringify(Array.from(new Set(permissions))), row.id]);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("admin_users"))) return;
    if (!(await queryRunner.hasColumn("admin_users", "permissions"))) return;

    const hasTenantId = await queryRunner.hasColumn("admin_users", "tenantId");
    const tenantFilter = hasTenantId ? "AND (`tenantId` IS NULL OR `tenantId` = 0)" : "";
    const rows = await queryRunner.query(
      `SELECT id, permissions FROM admin_users WHERE role IN (?, ?) ${tenantFilter} AND permissions IS NOT NULL`,
      ["super_admin", "admin"]
    );
    for (const row of rows as Array<{ id: number; permissions: unknown }>) {
      const permissions = this.parsePermissions(row.permissions).filter((item) => item !== MINIPROGRAM_RELEASE_PERMISSION);
      await queryRunner.query("UPDATE admin_users SET permissions = ? WHERE id = ?", [JSON.stringify(permissions), row.id]);
    }
  }

  private parsePermissions(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (Buffer.isBuffer(value)) return this.parsePermissions(value.toString("utf8"));
    if (typeof value !== "string") return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
}
