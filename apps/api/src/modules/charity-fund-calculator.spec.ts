import { describe, expect, it } from "vitest";
import { charityAccrualAmount, charityBasisAmount, charityReversalAmount } from "./charity-fund-calculator";

describe("charity fund calculator", () => {
  it("accrues 5 percent from paid amount by default", () => {
    expect(charityBasisAmount({ paidAmount: 100, originalAmount: 120, ratePercent: 5 })).toBe(100);
    expect(charityAccrualAmount({ paidAmount: 100, originalAmount: 120, ratePercent: 5 })).toBe(5);
  });

  it("uses original amount when configured", () => {
    expect(charityBasisAmount({ paidAmount: 100, originalAmount: 120, ratePercent: 5, accrualBasis: "original_amount" })).toBe(120);
    expect(charityAccrualAmount({ paidAmount: 100, originalAmount: 120, ratePercent: 5, accrualBasis: "original_amount" })).toBe(6);
  });

  it("uses manual basis amount when configured", () => {
    expect(charityBasisAmount({ paidAmount: 100, manualBasisAmount: 80, ratePercent: 5, accrualBasis: "manual" })).toBe(80);
    expect(charityAccrualAmount({ paidAmount: 100, manualBasisAmount: 80, ratePercent: 5, accrualBasis: "manual" })).toBe(4);
  });

  it("reverses charity amount proportionally on refund", () => {
    expect(charityReversalAmount(5, 40, 100)).toBe(2);
    expect(charityReversalAmount(5, 100, 100)).toBe(5);
  });
});
