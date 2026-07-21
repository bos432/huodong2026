import { describe, expect, it } from "vitest";
import { ambassadorLevelForPoints, ambassadorProfileEffectiveStatus, ecosystemBusinessKey, nextEcosystemNo, partnerContractIsEffective } from "./ecosystem-crm-policy";

describe("ecosystem CRM policy", () => {
  it("derives ambassador levels from auditable contribution points", () => {
    expect([0, 100, 500, 1500, 5000].map(ambassadorLevelForPoints)).toEqual(["starter", "bronze", "silver", "gold", "core"]);
  });

  it("marks active identities expired after their validity end", () => {
    expect(ambassadorProfileEffectiveStatus("active", new Date("2026-07-01T00:00:00Z"), new Date("2026-07-14T00:00:00Z"))).toBe("expired");
    expect(ambassadorProfileEffectiveStatus("suspended", new Date("2026-07-01T00:00:00Z"), new Date("2026-07-14T00:00:00Z"))).toBe("suspended");
  });

  it("requires active in-window partner contracts", () => {
    const now = new Date("2026-07-14T00:00:00Z");
    expect(partnerContractIsEffective({ status: "active", startsAt: new Date("2026-07-01T00:00:00Z"), endsAt: new Date("2026-08-01T00:00:00Z") }, now)).toBe(true);
    expect(partnerContractIsEffective({ status: "draft", startsAt: new Date("2026-07-01T00:00:00Z"), endsAt: new Date("2026-08-01T00:00:00Z") }, now)).toBe(false);
  });

  it("validates bounded idempotency keys and creates typed identifiers", () => {
    expect(ecosystemBusinessKey("partner:convert:12345678")).toBe("partner:convert:12345678");
    expect(() => ecosystemBusinessKey("short")).toThrow("业务键格式不正确");
    expect(nextEcosystemNo("AMB", new Date("2026-07-14T00:00:00Z"))).toMatch(/^AMB20260714[A-F0-9]{10}$/);
  });
});
