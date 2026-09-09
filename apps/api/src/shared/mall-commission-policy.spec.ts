import { allocateMallCommissionBaseFen, buildMallCommissionBeneficiaries, commissionAmountFen, fixedCommissionAmountFen, refundedCommissionFen, selectMallCommissionRule } from "./mall-commission-policy";
import { describe, expect, it } from "vitest";

describe("mall commission policy", () => {
  it("uses product, channel, merchant and tenant precedence in that order", () => {
    const rules = [
      { id: 1, scopeType: "tenant" as const, directRateBps: 100 },
      { id: 2, scopeType: "merchant" as const, merchantId: 7, directRateBps: 200 },
      { id: 3, scopeType: "channel" as const, promotionCodeId: 9, directRateBps: 300 },
      { id: 4, scopeType: "product" as const, productId: 11, directRateBps: 400 }
    ];
    expect(selectMallCommissionRule(rules, { merchantId: 7, promotionCodeId: 9, productId: 11 })?.id).toBe(4);
    expect(selectMallCommissionRule(rules, { merchantId: 7, promotionCodeId: 9, productId: 12 })?.id).toBe(3);
    expect(selectMallCommissionRule(rules, { merchantId: 7, productId: 12 })?.id).toBe(2);
    expect(selectMallCommissionRule(rules, { merchantId: 8, productId: 12 })?.id).toBe(1);
  });

  it("allocates the paid amount exactly across product lines", () => {
    const allocated = allocateMallCommissionBaseFen([1000, 1000, 1000], 1000);
    expect(allocated).toEqual([334, 333, 333]);
    expect(allocated.reduce((sum, value) => sum + value, 0)).toBe(1000);
  });

  it("builds exactly one direct beneficiary and ignores all parent levels", () => {
    expect(buildMallCommissionBeneficiaries({ promoterUserId: 5, directAgentId: 10, parentAgentIds: [11, 12], directRateBps: 500, agentLevelRatesBps: [200, 100, 50] })).toEqual([
      { beneficiaryType: "promoter", beneficiaryId: 5, level: 0, rateBps: 500, fixedAmountFen: 0 }
    ]);
    expect(buildMallCommissionBeneficiaries({ directAgentId: 10, parentAgentIds: [11], directRateBps: 500, agentLevelRatesBps: [200] })).toEqual([
      { beneficiaryType: "agent", beneficiaryId: 10, level: 0, rateBps: 500, fixedAmountFen: 0 }
    ]);
    expect(buildMallCommissionBeneficiaries({ promoterUserId: 5, directRateBps: 0, directFixedAmountFen: 20000 })).toEqual([
      { beneficiaryType: "promoter", beneficiaryId: 5, level: 0, rateBps: 0, fixedAmountFen: 20000 }
    ]);
  });

  it("calculates integer-fen commission and cumulative refund reductions", () => {
    expect(commissionAmountFen(999, 333)).toBe(33);
    expect(fixedCommissionAmountFen(39900, 20000)).toBe(20000);
    expect(fixedCommissionAmountFen(30000, 20000, 2)).toBe(30000);
    expect(refundedCommissionFen(500, 10000, 2500)).toBe(375);
    expect(refundedCommissionFen(500, 10000, 10000)).toBe(0);
  });
});
