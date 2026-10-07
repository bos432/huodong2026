import { describe, expect, it } from "vitest";
import { ActivityService } from "./activity.service";

describe("ActivityService", () => {
  it("maps an activity through the public contract without exposing entity fields", () => {
    const service = new ActivityService({ get: () => "production" } as any);
    const result = service.toPublicSummary({
      id: 8,
      title: "城市漫步",
      tenant: { id: 2, code: "cq", name: "慢π重庆" },
      fields: [],
      isTest: false,
      secretToken: "must-not-leak"
    } as any, {
      toTenant: (tenant) => ({ id: tenant?.id, code: tenant?.code, name: tenant?.name }),
      toMemberLevel: () => null
    });

    expect(result).toMatchObject({ id: 8, title: "城市漫步", tenant: { id: 2, code: "cq" } });
    expect(result).not.toHaveProperty("secretToken");
  });

  it("preserves compatibility metadata and normalizes optional eligibility flags", () => {
    const service = new ActivityService({ get: () => "production" } as any);
    const result = service.toPublicSummary({
      id: 9,
      title: "活动",
      tenant: null,
      fields: [],
      eligibilityRules: { requirePrivacyConsent: undefined, allowCompanions: undefined },
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-02T00:00:00.000Z"
    } as any, { toTenant: () => null, toMemberLevel: () => null });

    expect(result).toMatchObject({
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-02T00:00:00.000Z",
      eligibilityRules: { requirePrivacyConsent: false, allowCompanions: false }
    });
  });
});
