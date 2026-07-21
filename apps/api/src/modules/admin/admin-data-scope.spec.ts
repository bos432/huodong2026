import { describe, expect, it, vi } from "vitest";
import { activityIdFromScopedRow, adminCanAccessActivity, applyAdminActivityDataScope, normalizeAdminDataScope } from "./admin-data-scope";

describe("admin data scope", () => {
  it("normalizes selected activity ids and removes invalid values", () => {
    expect(normalizeAdminDataScope({ type: "activity_ids", activityIds: [3, "2", 3, 0, "bad"] })).toEqual({ type: "activity_ids", activityIds: [3, 2] });
    expect(normalizeAdminDataScope(null)).toEqual({ type: "all" });
  });

  it("denies all activity data for an empty selected scope", () => {
    const andWhere = vi.fn();
    applyAdminActivityDataScope({ andWhere }, "activity", { type: "activity_ids", activityIds: [] });
    expect(andWhere).toHaveBeenCalledWith("1 = 0");
  });

  it("applies direct and order-linked activity filters", () => {
    const direct = vi.fn();
    applyAdminActivityDataScope({ andWhere: direct }, "registration", { type: "activity_ids", activityIds: [8] });
    expect(direct.mock.calls[0][0]).toContain("registration.activityId IN");
    const event = vi.fn();
    applyAdminActivityDataScope({ andWhere: event }, "event", { type: "activity_ids", activityIds: [8] });
    expect(event.mock.calls[0][0]).toContain("event.activityId IN");
    const order = vi.fn();
    applyAdminActivityDataScope({ andWhere: order }, "order", { type: "activity_ids", activityIds: [8] });
    expect(order.mock.calls[0][0]).toContain("order.id IN");
    expect(order.mock.calls[0][0]).not.toContain("order.orderId");
    const linked = vi.fn();
    applyAdminActivityDataScope({ andWhere: linked }, "refund", { type: "activity_ids", activityIds: [8] });
    expect(linked.mock.calls[0][0]).toContain("refund.orderId IN");
    expect(linked.mock.calls[0][0]).toContain("JOIN registrations");
  });

  it("checks activity ids from nested business rows", () => {
    expect(activityIdFromScopedRow({ order: { registration: { activity: { id: 12 } } } })).toBe(12);
    expect(adminCanAccessActivity({ type: "activity_ids", activityIds: [12] }, 12)).toBe(true);
    expect(adminCanAccessActivity({ type: "activity_ids", activityIds: [12] }, 13)).toBe(false);
  });
});
