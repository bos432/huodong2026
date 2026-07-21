import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { effectivePermissionsForAdmin, resolveAdminRoutePermission } from "./admin-permissions";

const repoRoot = path.resolve(__dirname, "../../../../..");
const read = (relativePath: string) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

describe("tenant region hit log access contract", () => {
  it("separates view, sensitive and export permissions", () => {
    expect(resolveAdminRoutePermission("GET", "tenant-region-hit-logs")).toBe("tenant_region_hit_log.view");
    expect(resolveAdminRoutePermission("GET", "tenant-region-hit-logs/summary")).toBe("tenant_region_hit_log.view");
    expect(resolveAdminRoutePermission("GET", "tenant-region-hit-logs/options")).toBe("tenant_region_hit_log.view");
    expect(resolveAdminRoutePermission("GET", "tenant-region-hit-logs/export")).toBe("tenant_region_hit_log.export");
    expect(resolveAdminRoutePermission("GET", "tenant-regions")).toBe("tenant_region.view");

    expect(effectivePermissionsForAdmin({ role: "operator", permissions: ["tenant_region_hit_log.export"] })).toEqual(
      expect.arrayContaining(["tenant_region_hit_log.view", "tenant_region_hit_log.sensitive", "tenant_region_hit_log.export"])
    );
    expect(effectivePermissionsForAdmin({ role: "operator", tenantId: 1, permissions: ["tenant_region_hit_log.view"] })).not.toContain("tenant_region_hit_log.view");
  });

  it("projects sensitive location data only for authorized viewers", () => {
    const service = read("apps/api/src/modules/admin/admin.service.ts");

    expect(service).toContain("const includeSensitive = this.canViewSensitiveTenantRegionHitLogs(admin)");
    expect(service).toContain("latitude: includeSensitive ? Number(log.latitude) : null");
    expect(service).toContain("longitude: includeSensitive ? Number(log.longitude) : null");
    expect(service).toContain("clientIp: includeSensitive ? log.clientIp : this.maskClientIp(log.clientIp)");
    expect(service).toContain("userAgent: includeSensitive ? log.userAgent : null");
    expect(service).toContain("sensitiveMasked: !includeSensitive");
    expect(service).toContain("delegatedRegionHitLogAccess");
  });

  it("provides permission-safe filter options and audited Excel export", () => {
    const controller = read("apps/api/src/modules/admin/admin.controller.ts");
    const service = read("apps/api/src/modules/admin/admin.service.ts");

    expect(controller).toContain('@Get("tenant-region-hit-logs/options")');
    expect(controller).toContain('@Get("tenant-region-hit-logs/export")');
    expect(service).toContain("tenantRegionHitLogOptions(admin?: AdminContext)");
    expect(service).toContain("exportTenantRegionHitLogs(query: TenantRegionHitLogQueryDto");
    expect(service).toContain('.take(10000)');
    expect(service).toContain('await this.logExport(admin, "tenant_region_hit_logs", rows.length, query)');
  });

  it("keeps the PC page read-only, recoverable and responsive", () => {
    const page = read("apps/admin/src/views/TenantRegionHitLogs.vue");
    const router = read("apps/admin/src/router.ts");
    const menu = read("apps/admin/src/navigation/admin-menu.ts");

    expect(router).toContain('{ path: "tenant-region-hit-logs", component: TenantRegionHitLogs, meta: { roles: ["tenant_region_hit_log.view"], scope: "platform" } }');
    expect(router).toContain('{ path: "/tenant-region-hit-logs", roles: ["tenant_region_hit_log.view"], scope: "platform" }');
    expect(menu).toContain('{ index: "/tenant-region-hit-logs", icon: "Aim", label: "定位命中日志", roles: ["tenant_region_hit_log.view"], scope: "platform" }');
    expect(page).toContain('/admin/tenant-region-hit-logs/options');
    expect(page).not.toContain('api.get<any, Tenant[]>("/admin/tenants")');
    expect(page).toContain('const canViewSensitive = computed(() => canAccess(["tenant_region_hit_log.sensitive"]))');
    expect(page).toContain('const canExport = computed(() => canAccess(["tenant_region_hit_log.export"]))');
    expect(page).toContain('v-if="optionsError"');
    expect(page).toContain('v-if="summaryError"');
    expect(page).toContain('v-if="listError"');
    expect(page).toContain('v-if="!canViewSensitive"');
    expect(page).toContain('class="masked-value">已隐藏');
    expect(page).toContain('.page > * { min-width: 0; }');
    expect(page).toContain(':deep(.toolbar .el-date-editor)');
    expect(page).toContain('.pager { max-width: 100%');
  });
});
