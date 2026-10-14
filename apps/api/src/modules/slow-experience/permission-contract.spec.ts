import { describe, expect, it } from "vitest";
import { resolveAdminRoutePermission } from "../admin/admin-permissions";
import { tenantEntitlementFeatureForAdminPath } from "../admin/tenant-subscription";

describe("slow-experience moderation permission", () => {
  it("uses the existing content management permission for listing and review", () => {
    expect(resolveAdminRoutePermission("GET", "/admin/slow-experiences")).toBe("community.manage");
    expect(resolveAdminRoutePermission("PATCH", "/admin/slow-experiences/:id/review")).toBe("community.manage");
  });
  it("respects community entitlement rather than bypassing subscription restrictions", () => {
    expect(tenantEntitlementFeatureForAdminPath("/admin/slow-experiences/:id/review")).toBe("community");
  });
});
