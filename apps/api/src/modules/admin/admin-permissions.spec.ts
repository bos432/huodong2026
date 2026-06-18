import { describe, expect, it } from "vitest";
import { resolveAdminRoutePermission } from "./admin-permissions";

describe("admin route permissions", () => {
  it("maps refund review routes to refund permission before generic approve routes", () => {
    expect(resolveAdminRoutePermission("POST", "refunds/:id/approve")).toBe("order.refund");
    expect(resolveAdminRoutePermission("POST", "refunds/:id/reject")).toBe("order.refund");
  });

  it("keeps activity review routes mapped to activity approval", () => {
    expect(resolveAdminRoutePermission("POST", "activities/:id/approve")).toBe("activity.approve");
    expect(resolveAdminRoutePermission("POST", "activities/:id/reject")).toBe("activity.approve");
  });
});
