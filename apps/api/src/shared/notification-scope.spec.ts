import { describe, expect, it } from "vitest";
import { notificationTenantScopeMatches } from "./notification-scope";

describe("notification tenant scope", () => {
  it("allows own tenant notifications without an activity", () => expect(notificationTenantScopeMatches({ actorTenantId: 23, tenantScopeKey: "tenant:23" })).toBe(true));
  it("rejects platform and other tenant rows", () => {
    expect(notificationTenantScopeMatches({ actorTenantId: 23, tenantScopeKey: "platform" })).toBe(false);
    expect(notificationTenantScopeMatches({ actorTenantId: 23, tenantScopeKey: "tenant:42" })).toBe(false);
  });
  it("falls back to the activity tenant for legacy rows", () => {
    expect(notificationTenantScopeMatches({ actorTenantId: 23, activityTenantId: 23 })).toBe(true);
    expect(notificationTenantScopeMatches({ actorTenantId: 23, activityTenantId: 42 })).toBe(false);
  });
});
