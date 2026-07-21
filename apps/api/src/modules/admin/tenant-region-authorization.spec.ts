import { describe, expect, it } from "vitest";
import { tenantRegionAuthorizationActive, tenantRegionAuthorizationReminder } from "./tenant-region-authorization";

describe("tenant region authorization", () => {
  const base = { enabled: true, authorizationStatus: "approved", validFrom: null, validUntil: null };

  it("accepts approved permanent and inclusive boundary authorizations", () => {
    expect(tenantRegionAuthorizationActive(base, "2026-07-13")).toBe(true);
    expect(tenantRegionAuthorizationActive({ ...base, validFrom: "2026-07-13", validUntil: "2026-07-13" }, "2026-07-13")).toBe(true);
  });

  it("rejects pending, rejected, disabled, future and expired authorizations", () => {
    expect(tenantRegionAuthorizationActive({ ...base, authorizationStatus: "pending" }, "2026-07-13")).toBe(false);
    expect(tenantRegionAuthorizationActive({ ...base, authorizationStatus: "rejected" }, "2026-07-13")).toBe(false);
    expect(tenantRegionAuthorizationActive({ ...base, enabled: false }, "2026-07-13")).toBe(false);
    expect(tenantRegionAuthorizationActive({ ...base, validFrom: "2026-07-14" }, "2026-07-13")).toBe(false);
    expect(tenantRegionAuthorizationActive({ ...base, validUntil: "2026-07-12" }, "2026-07-13")).toBe(false);
  });

  it("reports pending, expiring and expired authorization reminders", () => {
    expect(tenantRegionAuthorizationReminder({ ...base, authorizationStatus: "pending" }, "2026-07-13")?.code).toBe("pending");
    expect(tenantRegionAuthorizationReminder({ ...base, validUntil: "2026-07-20" }, "2026-07-13")).toMatchObject({ code: "expiring", daysRemaining: 7, level: "danger" });
    expect(tenantRegionAuthorizationReminder({ ...base, validUntil: "2026-07-12" }, "2026-07-13")).toMatchObject({ code: "expired", daysRemaining: -1 });
    expect(tenantRegionAuthorizationReminder({ ...base, validUntil: "2026-09-01" }, "2026-07-13")).toBeNull();
  });
});
