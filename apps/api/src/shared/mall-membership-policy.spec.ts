import { describe, expect, it } from "vitest";
import { mallMemberPriceFen, mallMembershipEffective, mallMembershipPurchaseExpiresAt, normalizeMallMemberDiscountRate } from "./mall-membership-policy";

describe("mall membership policy", () => {
  it("normalizes discount rates to a safe two-decimal value", () => {
    expect(normalizeMallMemberDiscountRate(0.803)).toBe(0.8);
    expect(normalizeMallMemberDiscountRate(0, 0.9)).toBe(0.9);
    expect(normalizeMallMemberDiscountRate(1.2)).toBe(1);
  });

  it("rounds member prices in fen without exceeding the original price", () => {
    expect(mallMemberPriceFen(39900, 0.8)).toBe(31920);
    expect(mallMemberPriceFen(101, 0.8)).toBe(81);
    expect(mallMemberPriceFen(100, 2)).toBe(100);
  });

  it("only treats active, unexpired purchases as effective", () => {
    const now = new Date("2026-09-09T00:00:00.000Z");
    expect(mallMembershipEffective({ status: "active", expiresAt: "2026-09-10T00:00:00.000Z" }, now)).toBe(true);
    expect(mallMembershipEffective({ status: "active", expiresAt: "2026-09-08T00:00:00.000Z" }, now)).toBe(false);
    expect(mallMembershipEffective({ status: "revoked", expiresAt: "2026-09-10T00:00:00.000Z" }, now)).toBe(false);
  });

  it("calculates membership expiry with a minimum one-day validity", () => {
    const startsAt = new Date("2026-09-09T08:00:00.000Z");
    expect(mallMembershipPurchaseExpiresAt(startsAt, 365).toISOString()).toBe("2027-09-09T08:00:00.000Z");
    expect(mallMembershipPurchaseExpiresAt(startsAt, 0).toISOString()).toBe("2026-09-10T08:00:00.000Z");
  });
});
