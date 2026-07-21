import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { effectivePermissionsForAdmin, resolveAdminRoutePermission } from "./admin-permissions";

const repoRoot = path.resolve(__dirname, "../../../../..");
const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

describe("tenant administration access contract", () => {
  it("separates viewing, profile maintenance, rights, subscription and export", () => {
    expect(resolveAdminRoutePermission("GET", "tenants")).toBe("tenant.view");
    expect(resolveAdminRoutePermission("GET", "tenants/export")).toBe("tenant.export");
    expect(resolveAdminRoutePermission("POST", "tenants")).toBe("tenant.manage");
    expect(resolveAdminRoutePermission("PATCH", "tenants/:id")).toBe("tenant.manage");
    expect(resolveAdminRoutePermission("POST", "tenants/:id/permissions")).toBe("tenant.permissions.manage");
    expect(resolveAdminRoutePermission("GET", "tenants/:id/subscription-events")).toBe("tenant.view");
    expect(resolveAdminRoutePermission("POST", "tenants/:id/subscription-change")).toBe("tenant.subscription.manage");

    expect(effectivePermissionsForAdmin({ role: "operator", permissions: ["tenant.manage"] })).toEqual(expect.arrayContaining(["tenant.view", "tenant.manage"]));
    expect(effectivePermissionsForAdmin({ role: "operator", permissions: ["tenant.permissions.manage"] })).toEqual(expect.arrayContaining(["tenant.view", "tenant.permissions.manage"]));
    expect(effectivePermissionsForAdmin({ role: "operator", permissions: ["tenant.subscription.manage"] })).toEqual(expect.arrayContaining(["tenant.view", "tenant.subscription.manage"]));
    expect(effectivePermissionsForAdmin({ role: "operator", permissions: ["tenant.export"] })).toEqual(expect.arrayContaining(["tenant.view", "tenant.export"]));
    expect(effectivePermissionsForAdmin({ role: "operator", tenantId: 1, permissions: ["tenant.view", "tenant.manage", "tenant.permissions.manage", "tenant.subscription.manage", "tenant.export"] })).not.toContain("tenant.view");
  });

  it("masks viewer phone data while preserving authorized export data", () => {
    const service = read("apps/api/src/modules/admin/admin.service.ts");

    expect(service).toContain("listTenants(admin?: AdminContext, options: { includeSensitive?: boolean } = {})");
    expect(service).toContain("publicTenantListItem(tenant, includeSensitive)");
    expect(service).toContain("contactPhone: includeSensitive ? row.contactPhone : maskPhone(row.contactPhone)");
    expect(service).toContain("sensitiveMasked: !includeSensitive");
    expect(service).toContain("listTenants(admin, { includeSensitive: true })");
    expect(service).toContain("delegatedTenantAccess");
  });

  it("prevents profile and rights routes from changing subscription state", () => {
    const service = read("apps/api/src/modules/admin/admin.service.ts");
    const dto = read("apps/api/src/modules/admin/dto.ts");

    expect(service).toContain('actorPermissions.includes("tenant.permissions.manage")');
    expect(service).toContain('actorPermissions.includes("tenant.subscription.manage")');
    expect(service).toContain('for (const key of ["activityPublishReviewRequired", "registrationReviewEnabled", "paymentAccountEditable", "mallEnabled", "entitlements"])');
    expect(service).toContain("remark: dto.remark?.trim() || null");
    expect(service).toContain("新的套餐到期日必须晚于当前到期日");
    expect(dto.slice(dto.indexOf("export class TenantPermissionDto"), dto.indexOf("export class AnalyticsRecomputeDto"))).not.toContain("packagePlan");
    expect(dto.slice(dto.indexOf("export class TenantPermissionDto"), dto.indexOf("export class AnalyticsRecomputeDto"))).not.toContain("packageExpiresAt");
  });

  it("uses tenant viewing for PC and mobile tenant selection", () => {
    const router = read("apps/admin/src/router.ts");
    const menu = read("apps/admin/src/navigation/admin-menu.ts");
    const service = read("apps/api/src/modules/admin/admin.service.ts");

    expect(router).toContain('{ path: "tenants", component: Tenants, meta: { roles: ["tenant.view"], scope: "platform" } }');
    expect(router).toContain('{ path: "/tenants", roles: ["tenant.view"], scope: "platform" }');
    expect(menu).toContain('{ index: "/tenants", icon: "OfficeBuilding", label: "商家/代理列表", roles: ["tenant.view"], scope: "platform" }');
    expect(menu).toContain('{ index: "/tenants?mode=permissions", icon: "Setting", label: "权限配置", roles: ["tenant.permissions.manage"], scope: "platform" }');
    expect(service).toContain('this.listTenants({ ...admin, requiredPermission: "tenant.view" })');
    expect(service).toContain('canViewPaymentAccounts ? this.listAgents(true, { ...admin, requiredPermission: "payment_account.view" }).catch(() => []) : Promise.resolve([])');
    expect(service).toContain('canSelectTenant: hasPermission("tenant.view")');
    expect(service).toContain("delegatedDashboardAccess");
  });

  it("hides unauthorized PC mutations and cross-module entrypoints", () => {
    const page = read("apps/admin/src/views/Tenants.vue");

    expect(page).toContain('const canManageTenant = computed(() => canAccess(["tenant.manage"]))');
    expect(page).toContain('const canManageTenantPermissions = computed(() => canAccess(["tenant.permissions.manage"]))');
    expect(page).toContain('const canManageTenantSubscription = computed(() => canAccess(["tenant.subscription.manage"]))');
    expect(page).toContain('const canExportTenants = computed(() => canAccess(["tenant.export"]))');
    expect(page).toContain('v-if="canExportTenants"');
    expect(page).toContain('v-if="canManageTenant"');
    expect(page).toContain(':disabled="!canManageTenantPermissions || permissionUpdatingId === row.id"');
    expect(page).toContain('v-if="canManageTenantSubscription"');
    expect(page).toContain('...(Object.keys(settings).length ? { settings } : {})');
    expect(page).toContain('<template v-if="canManageTenantPermissions">');
    expect(page).toContain("canHandleTenantNextAction");
    expect(page).toContain("subscriptionError");
  });

  it("keeps dedicated acceptance accounts in the showcase seed", () => {
    const seed = read("scripts/seed-online-showcase.mjs");
    for (const username of ["showcase_tenant_read", "showcase_tenant_manager", "showcase_tenant_rights", "showcase_tenant_plan", "showcase_tenant_export"]) {
      expect(seed).toContain(`username: "${username}"`);
    }
    expect(seed).toContain('{ username: "showcase_tenant_read", role: "operator", platform: true, permissions: ["dashboard.view", "activity.view", "tenant.view"] }');
  });
});
