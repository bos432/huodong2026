import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillTenantRegionPermission1781712100000 implements MigrationInterface {
  name = "BackfillTenantRegionPermission1781712100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("admin_users"))) return;
    const rows = await queryRunner.query("SELECT id, permissions FROM admin_users WHERE (role = 'super_admin' OR role = 'admin') AND tenantId IS NULL");
    for (const row of rows as Array<{ id: number; permissions: string | null }>) {
      if (!row.permissions) continue;
      let permissions: unknown;
      try {
        permissions = typeof row.permissions === "string" ? JSON.parse(row.permissions) : row.permissions;
      } catch {
        continue;
      }
      if (!Array.isArray(permissions) || permissions.includes("tenant_region.manage")) continue;
      permissions.push("tenant_region.manage");
      await queryRunner.query("UPDATE admin_users SET permissions = ? WHERE id = ?", [JSON.stringify(permissions), row.id]);
    }
  }

  public async down(): Promise<void> {
    // Keep granted permissions; removing them during rollback could lock platform admins out of region settings.
  }
}
