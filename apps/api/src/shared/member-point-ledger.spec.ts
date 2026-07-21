import { describe, expect, it } from "vitest";
import { applyPointMutation, calculatePointRuleAward, cumulativePointClawbackTarget, replayPointAvailability } from "./member-point-ledger";

describe("member point ledger", () => {
  it("rejects an ordinary deduction that would create a negative balance", () => {
    expect(applyPointMutation({ balance: 30, debt: 0, requestedPoints: -40 })).toMatchObject({ allowed: false, balanceAfter: 30, debtAfter: 0 });
  });

  it("turns an insufficient business clawback into tracked debt", () => {
    expect(applyPointMutation({ balance: 30, debt: 0, requestedPoints: -40, negativePolicy: "debt" })).toMatchObject({ allowed: true, appliedPoints: -30, debtAdded: 10, balanceAfter: 0, debtAfter: 10 });
  });

  it("uses later earnings to recover debt before exposing spendable points", () => {
    expect(applyPointMutation({ balance: 0, debt: 10, requestedPoints: 6 })).toMatchObject({ allowed: true, appliedPoints: 6, debtRecovery: 6, balanceAfter: 0, debtAfter: 4 });
    expect(applyPointMutation({ balance: 0, debt: 4, requestedPoints: 10 })).toMatchObject({ allowed: true, debtRecovery: 4, balanceAfter: 6, debtAfter: 0 });
  });

  it("calculates cumulative refund clawback without split-refund rounding gaps", () => {
    expect(cumulativePointClawbackTarget({ earnedPoints: 1, paidAmountFen: 150, refundedAmountFen: 75 })).toBe(0);
    expect(cumulativePointClawbackTarget({ earnedPoints: 1, paidAmountFen: 150, refundedAmountFen: 150 })).toBe(1);
    expect(cumulativePointClawbackTarget({ earnedPoints: 59, paidAmountFen: 5900, refundedAmountFen: 1000 })).toBe(10);
    expect(cumulativePointClawbackTarget({ earnedPoints: 59, paidAmountFen: 5900, refundedAmountFen: 5900 })).toBe(59);
  });

  it("expires only the unspent remainder of the earliest-expiring credits", () => {
    const entries = [
      { id: 1, points: 100, sourceType: "admin_point_adjust", createdAt: "2026-01-01T00:00:00Z", expiresAt: "2026-02-01T00:00:00Z" },
      { id: 2, points: 50, sourceType: "admin_point_adjust", createdAt: "2026-01-02T00:00:00Z", expiresAt: null },
      { id: 3, points: -80, sourceType: "points_redeem", createdAt: "2026-01-03T00:00:00Z", expiresAt: null }
    ];
    expect(replayPointAvailability(entries, new Date("2026-02-02T00:00:00Z"))).toEqual({ availablePoints: 50, expiredPoints: 20 });
  });

  it("does not count accounting reconciliation rows as new spendable lots", () => {
    const entries = [
      { id: 1, points: 100, sourceType: "admin_point_adjust", createdAt: "2026-01-01T00:00:00Z", expiresAt: "2026-02-01T00:00:00Z" },
      { id: 2, points: -80, sourceType: "points_redeem", createdAt: "2026-01-03T00:00:00Z", expiresAt: null },
      { id: 3, points: 80, sourceType: "points_expiry_reconciliation", createdAt: "2026-02-02T00:00:00Z", expiresAt: null }
    ];
    expect(replayPointAvailability(entries, new Date("2026-02-03T00:00:00Z"))).toEqual({ availablePoints: 0, expiredPoints: 20 });
  });

  it("calculates fixed and amount-ratio tenant rules deterministically", () => {
    expect(calculatePointRuleAward({ enabled: true, calculationMode: "fixed", fixedPoints: 20, amountFenPerPoint: 100, growthMode: "same_as_points", fixedGrowth: 0 })).toEqual({ points: 20, growthValue: 20 });
    expect(calculatePointRuleAward({ enabled: true, calculationMode: "amount_ratio", fixedPoints: 1, amountFenPerPoint: 100, growthMode: "fixed", fixedGrowth: 3 }, 5999)).toEqual({ points: 59, growthValue: 3 });
    expect(calculatePointRuleAward({ enabled: false, calculationMode: "fixed", fixedPoints: 20, amountFenPerPoint: 100, growthMode: "same_as_points", fixedGrowth: 0 })).toEqual({ points: 0, growthValue: 0 });
  });
});
