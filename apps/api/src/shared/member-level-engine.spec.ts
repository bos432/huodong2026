import { describe, expect, it } from "vitest";
import { expiredLevelCycle, growthFromPointLog, levelExpiry, manualLevelOverrideActive, memberLevelScopeKey, memberLevelSnapshot, resolveGrowthLevel } from "./member-level-engine";

describe("member growth level engine", () => {
  const levels = [{ id: 1, minGrowth: 0 }, { id: 2, minGrowth: 300 }, { id: 3, minGrowth: 1000, validityDays: 365 }];
  it("uses independent growth instead of spendable points", () => expect(resolveGrowthLevel(levels, 350)?.id).toBe(2));
  it("does not reduce or inflate growth for redemption returns", () => {
    expect(growthFromPointLog({ points: -100, sourceType: "points_redeem" })).toBe(0);
    expect(growthFromPointLog({ points: 100, sourceType: "points_return" })).toBe(0);
    expect(growthFromPointLog({ points: 20, sourceType: "check_in" })).toBe(20);
  });
  it("calculates a fixed level validity period", () => expect(levelExpiry(levels[2], new Date("2030-01-01T00:00:00Z"))?.toISOString()).toBe("2031-01-01T00:00:00.000Z"));
  it("starts a fresh growth cycle after level expiry", () => expect(expiredLevelCycle(new Date("2031-01-01T00:00:00Z"))).toMatchObject({ growthValue: 0, level: null, levelSource: "expiry_recalculation" }));
  it("keeps manual level overrides until their explicit expiry", () => {
    const now = new Date("2026-07-19T00:00:00Z");
    expect(manualLevelOverrideActive("admin_adjustment", null, now)).toBe(true);
    expect(manualLevelOverrideActive("admin_adjustment", "2026-07-20T00:00:00Z", now)).toBe(true);
    expect(manualLevelOverrideActive("admin_adjustment", "2026-07-18T00:00:00Z", now)).toBe(false);
    expect(manualLevelOverrideActive("growth", null, now)).toBe(false);
  });
  it("uses stable platform and tenant scope keys", () => {
    expect(memberLevelScopeKey(null)).toBe("platform");
    expect(memberLevelScopeKey({ id: 23 })).toBe("tenant:23");
  });
  it("freezes the entitlement fields used by pricing and access checks", () => {
    expect(memberLevelSnapshot({ id: 9, name: "VIP", minPoints: 100, minGrowth: 200, validityDays: 365, discountRate: "0.90", priorityBooking: true, sortOrder: 3, benefits: [{ key: "course_access", name: "课程权益" }], tenantScopeKey: "tenant:23", version: 4 })).toEqual({
      id: 9, name: "VIP", minPoints: 100, minGrowth: 200, validityDays: 365, discountRate: "0.90", priorityBooking: true, sortOrder: 3, benefits: [{ key: "course_access", name: "课程权益" }], tenantScopeKey: "tenant:23", version: 4
    });
  });
});
