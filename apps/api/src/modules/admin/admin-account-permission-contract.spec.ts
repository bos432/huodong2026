import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");
const readRepoFile = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const adminPage = readRepoFile("apps/admin/src/views/Admins.vue");
const adminRouter = readRepoFile("apps/admin/src/router.ts");
const adminMenu = readRepoFile("apps/admin/src/navigation/admin-menu.ts");
const adminPermissions = readRepoFile("apps/admin/src/permissions.ts");
const adminService = readRepoFile("apps/api/src/modules/admin/admin.service.ts");

describe("admin account permission contract", () => {
  it("opens the route and menu to read-only account viewers", () => {
    expect(adminRouter).toContain('path: "admins", component: Admins, meta: { roles: ["admin.view"]');
    expect(adminRouter).toContain('{ path: "/admins", roles: ["admin.view"]');
    expect(adminMenu).toContain('index: "/admins", icon: "UserFilled", label: "商家账号", roles: ["admin.view"]');
    expect(adminMenu).toContain('index: "/admins", icon: "UserFilled", label: "员工账号", roles: ["admin.view"]');
  });

  it("keeps write and security controls separated in the page", () => {
    expect(adminPage).toContain('const canManageAccounts = computed(() => hasPermission("admin.manage"))');
    expect(adminPage).toContain('const canManageSecurity = computed(() => hasPermission("admin.security.manage"))');
    expect(adminPage).toContain('v-if="canManageAccounts" class="table-card create-card"');
    expect(adminPage).toContain('v-if="canManageAccounts && canOperateRow(row)" size="small" :icon="Edit"');
    expect(adminPage).toContain('v-if="canManageSecurity && canOperateRow(row)" size="small" :icon="Key"');
    expect(adminPage).toContain('if (canManageSecurity.value) payload.enabled = editForm.enabled');
    expect(adminPage).toContain('v-if="canManageAccounts" label="操作" width="100"');
  });

  it("uses account-specific options without requiring tenant or activity permissions", () => {
    expect(adminPage).toContain('api.get<any, { tenants: TenantRow[] }>("/admin/admins/options")');
    expect(adminPage).toContain('api.get<any, { activities: Array<{ id: number; title: string }> }>("/admin/admins/options"');
    expect(adminPage).not.toContain('api.get<any, TenantRow[]>("/admin/tenants")');
    expect(adminPage).not.toContain('api.get<any, any>("/admin/activities"');
  });

  it("blocks privilege and data-scope escalation in the service layer", () => {
    expect(adminService).toContain('if (!this.isPlatformAdmin(admin) && !row.tenant?.id) throw new ForbiddenException("委派账号不能操作平台账号")');
    expect(adminService).toContain('if (dto.enabled !== undefined && dto.enabled !== row.enabled) this.assertAdminSecurityPermission(admin)');
    expect(adminService).toContain('if ((target.tenant?.id || null) !== (source.tenant?.id || null)) throw new BadRequestException("只能在同一商家范围内复制角色权限")');
    expect(adminService).toContain('throw new BadRequestException("活动数据范围包含其他商家或不存在的活动")');
  });

  it("keeps frontend permission dependencies aligned with the API", () => {
    expect(adminPermissions).toContain('"admin.manage": ["admin.view"]');
    expect(adminPermissions).toContain('"admin.security.manage": ["admin.view"]');
  });
});
