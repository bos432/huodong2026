import { describe, expect, it } from "vitest";
import { merchantAccessAllows, merchantAccessIsActive, merchantGovernanceTenantScopeId, normalizedMerchantFeeBps } from "./mall-merchant-governance";

describe("mall merchant governance policy", () => {
  it("validates fee basis points as an integer between zero and ten thousand", () => {
    expect(normalizedMerchantFeeBps(125.8)).toBe(125);
    expect(normalizedMerchantFeeBps(0)).toBe(0);
    expect(normalizedMerchantFeeBps(10000)).toBe(10000);
    expect(normalizedMerchantFeeBps(-1)).toBeNull();
    expect(normalizedMerchantFeeBps(10001)).toBeNull();
    expect(normalizedMerchantFeeBps("not-a-number")).toBeNull();
  });

  it("honors authorization start and expiry boundaries", () => {
    const now = new Date("2026-07-13T08:00:00.000Z");
    expect(merchantAccessIsActive({ enabled: true, validFrom: "2026-07-13T07:59:59.000Z", validUntil: "2026-07-13T08:00:01.000Z" }, now)).toBe(true);
    expect(merchantAccessIsActive({ enabled: true, validFrom: "2026-07-13T08:00:01.000Z" }, now)).toBe(false);
    expect(merchantAccessIsActive({ enabled: true, validUntil: "2026-07-13T08:00:00.000Z" }, now)).toBe(false);
    expect(merchantAccessIsActive({ enabled: false }, now)).toBe(false);
  });

  it("requires one of the requested operation permissions and supports legacy role defaults", () => {
    expect(merchantAccessAllows({ permissions: ["product.manage"] }, ["product.manage", "merchant.manage"])).toBe(true);
    expect(merchantAccessAllows({ permissions: ["finance.view"] }, "refund.manage")).toBe(false);
    expect(merchantAccessAllows({ permissions: null }, "order.manage", ["order.manage", "shipment.manage"])).toBe(true);
  });

  it("scopes tenant administrators while leaving system workers platform-wide", () => {
    expect(merchantGovernanceTenantScopeId({ tenantId: 9 })).toBe(9);
    expect(merchantGovernanceTenantScopeId({ tenantId: null })).toBeNull();
    expect(merchantGovernanceTenantScopeId()).toBeNull();
  });
});
