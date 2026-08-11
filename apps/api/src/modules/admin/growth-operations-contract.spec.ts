import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveAdminRoutePermission } from "./admin-permissions";

const root = join(__dirname, "..", "..", "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("growth operations contract", () => {
  it("keeps the platform activity pool city filter in list and status counts", () => {
    const service = read("apps/api/src/modules/admin/admin.service.ts");
    const page = read("apps/admin/src/views/Activities.vue");
    expect(service.match(/activity\.locationCity LIKE :locationCity/g)?.length).toBe(2);
    expect(page).toContain('params.locationCity = filters.locationCity.trim()');
    expect(page).toContain('"平台活动池"');
  });

  it("keeps city and resource analytics tenant scoped", () => {
    const service = read("apps/api/src/modules/admin/admin.service.ts");
    expect(service).toContain("this.applyAnalyticsScope(builder, \"event\", scope, admin)");
    expect(service).toContain("this.applyTenantScope(venueBuilder, \"activity\", admin)");
    expect(service).toContain("this.applyTenantScope(hostBuilder, \"activity\", admin)");
    expect(resolveAdminRoutePermission("GET", "resource-network")).toBe("analytics.view");
  });

  it("registers the resource network in routes and both admin scopes", () => {
    const router = read("apps/admin/src/router.ts");
    const menu = read("apps/admin/src/navigation/admin-menu.ts");
    expect(router).toContain('path: "resource-network"');
    expect(menu.match(/index: "\/resource-network"/g)?.length).toBe(2);
  });
});
