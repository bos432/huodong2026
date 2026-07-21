import { calculateMallSettlementAmounts, mallSettlementConsistency, settlementBpsAmountFen } from "./mall-settlement-policy";
import { describe, expect, it } from "vitest";

describe("mall settlement policy", () => {
  it("calculates platform collection, direct collection, commission and fee in integer fen", () => {
    expect(calculateMallSettlementAmounts({ orderFen: 12001, refundFen: 2001, merchantDirectOrderFen: 3000, merchantDirectRefundFen: 1000, serviceFeeBps: 350, commissionFen: 500, commissionClawbackFen: 100, adjustmentFen: -50 })).toEqual({
      netFen: 10000,
      platformCollectedFen: 8000,
      merchantDirectFen: 2000,
      serviceFeeFen: 350,
      commissionFen: 500,
      commissionClawbackFen: 100,
      adjustmentFen: -50,
      payableFen: 7200
    });
  });

  it("reverses the service fee for a refund-only settlement with symmetric rounding", () => {
    expect(settlementBpsAmountFen(-105, 500)).toBe(-5);
    expect(calculateMallSettlementAmounts({ orderFen: 0, refundFen: 105, merchantDirectOrderFen: 0, merchantDirectRefundFen: 0, serviceFeeBps: 500 }).payableFen).toBe(-100);
  });

  it("detects line ledger differences", () => {
    const amounts = calculateMallSettlementAmounts({ orderFen: 1000, refundFen: 0, merchantDirectOrderFen: 0, merchantDirectRefundFen: 0, serviceFeeBps: 100 });
    expect(mallSettlementConsistency(amounts, 990).consistent).toBe(true);
    expect(mallSettlementConsistency(amounts, 989)).toMatchObject({ consistent: false, linesConsistent: false, differenceFen: -1 });
  });
});
