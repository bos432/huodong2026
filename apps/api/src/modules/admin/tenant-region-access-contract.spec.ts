import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { effectivePermissionsForAdmin, resolveAdminRoutePermission } from "./admin-permissions";

const repoRoot = path.resolve(__dirname, "../../../../..");
const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

describe("tenant region access contract", () => {
  it("separates viewing, maintenance and conflict approval", () => {
    expect(resolveAdminRoutePermission("GET", "tenant-regions")).toBe("tenant_region.view");
    expect(resolveAdminRoutePermission("GET", "tenant-regions/options")).toBe("tenant_region.view");
    expect(resolveAdminRoutePermission("POST", "tenant-regions")).toBe("tenant_region.manage");
    expect(resolveAdminRoutePermission("POST", "tenant-regions/bulk-import")).toBe("tenant_region.manage");
    expect(resolveAdminRoutePermission("PATCH", "tenant-regions/:id")).toBe("tenant_region.manage");
    expect(resolveAdminRoutePermission("DELETE", "tenant-regions/:id")).toBe("tenant_region.manage");
    expect(resolveAdminRoutePermission("POST", "tenant-regions/:id/approval")).toBe("tenant_region.approve");

    expect(effectivePermissionsForAdmin({ role: "operator", permissions: ["tenant_region.manage"] })).toEqual(
      expect.arrayContaining(["tenant_region.view", "tenant_region.manage"])
    );
    expect(effectivePermissionsForAdmin({ role: "operator", permissions: ["tenant_region.approve"] })).toEqual(
      expect.arrayContaining(["tenant_region.view", "tenant_region.approve"])
    );
    expect(effectivePermissionsForAdmin({ role: "operator", tenantId: 1, permissions: ["tenant_region.view", "tenant_region.manage", "tenant_region.approve"] })).not.toContain("tenant_region.view");
  });

  it("uses a minimal platform options endpoint and a safe tenant projection", () => {
    const controller = read("apps/api/src/modules/admin/admin.controller.ts");
    const service = read("apps/api/src/modules/admin/admin.service.ts");

    expect(controller).toContain('@Get("tenant-regions/options")');
    expect(service).toContain("tenantRegionOptions(admin?: AdminContext)");
    expect(service).toContain("delegatedRegionAccess");
    expect(service).toContain('if (region.authorizationStatus !== "pending") throw new BadRequestException("仅待审批区域可以执行批准或驳回")');
    expect(service).toContain('tenant: { id: region.tenant.id, code: region.tenant.code, name: region.tenant.name, region: region.tenant.region, enabled: region.tenant.enabled }');
    expect(service).not.toContain("tenant: this.publicTenant(region.tenant)");
  });

  it("makes the route, menu and login fallback available to viewers", () => {
    const router = read("apps/admin/src/router.ts");
    const menu = read("apps/admin/src/navigation/admin-menu.ts");

    expect(router).toContain('{ path: "tenant-regions", component: TenantRegions, meta: { roles: ["tenant_region.view"], scope: "platform" } }');
    expect(router).toContain('{ path: "/tenant-regions", roles: ["tenant_region.view"], scope: "platform" }');
    expect(menu).toContain('{ index: "/tenant-regions", icon: "Location", label: "区域保护", roles: ["tenant_region.view"], scope: "platform" }');
  });

  it("keeps the PC page recoverable and hides unauthorized mutations", () => {
    const page = read("apps/admin/src/views/TenantRegions.vue");

    expect(page).toContain('const canManage = computed(() => canAccess(["tenant_region.manage"]))');
    expect(page).toContain('const canApprove = computed(() => canAccess(["tenant_region.approve"]))');
    expect(page).toContain('/admin/tenant-regions/options');
    expect(page).not.toContain('api.get<any, Tenant[]>("/admin/tenants")');
    expect(page).toContain('v-if="optionsError"');
    expect(page).toContain('v-if="regionsError"');
    expect(page).toContain('v-if="canManage"');
    expect(page).toContain('v-if="canApprove && row.authorizationStatus === \'pending\'"');
    expect(page).toContain("operationBusy('delete', row.id)");
    expect(page).not.toContain("linear-gradient");
    expect(page).not.toContain("下一阶段升级");
  });

  it("keeps dedicated acceptance accounts in the showcase seed", () => {
    const seed = read("scripts/seed-online-showcase.mjs");

    expect(seed).toContain('username: "showcase_region_read"');
    expect(seed).toContain('username: "showcase_region_manager"');
    expect(seed).toContain('username: "showcase_region_approve"');
  });
});
