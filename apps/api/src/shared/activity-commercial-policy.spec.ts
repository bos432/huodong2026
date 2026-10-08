import { describe, expect, it } from "vitest";
import { calculateActivityCommercialAmounts, normalizeCommercialRateToBps } from "./activity-commercial-policy";

describe("activity commercial policy", () => {
  it("normalizes percentage and ratio rates to basis points", () => {
    expect(normalizeCommercialRateToBps(0.035, "服务费")).toBe(350);
    expect(normalizeCommercialRateToBps(3.5, "服务费")).toBe(350);
    expect(normalizeCommercialRateToBps(350, "服务费")).toBe(350);
  });

  it("calculates gross, refund, fee, commission, and organizer payable in fen", () => {
    expect(calculateActivityCommercialAmounts({
      grossCollectedFen: 12001,
      refundFen: 2001,
      platformFeeBps: 350,
      organizerCommissionBps: 1000
    })).toEqual({
      grossCollectedFen: 12001,
      refundFen: 2001,
      platformFeeBps: 350,
      organizerCommissionBps: 1000,
      netCollectedFen: 10000,
      platformFeeFen: 350,
      organizerCommissionFen: 1000,
      organizerPayableFen: 8650
    });
  });

  it("keeps refund-only amounts and rounds fee symmetrically", () => {
    expect(calculateActivityCommercialAmounts({
      grossCollectedFen: 0,
      refundFen: 105,
      platformFeeBps: 500,
      organizerCommissionBps: 1000
    })).toMatchObject({ netCollectedFen: -105, platformFeeFen: -5, organizerCommissionFen: -11, organizerPayableFen: -89 });
  });

  it("rejects unsafe or out-of-range rates", () => {
    expect(() => normalizeCommercialRateToBps(-1, "服务费")).toThrow("服务费");
    expect(() => normalizeCommercialRateToBps(10001, "服务费")).toThrow("服务费");
    expect(() => normalizeCommercialRateToBps(Number.NaN, "服务费")).toThrow("服务费");
  });
});
