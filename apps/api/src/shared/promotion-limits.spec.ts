import { describe, expect, it } from "vitest";
import { couponLimitError, redemptionLimitError } from "./promotion-limits";

describe("promotion limits", () => {
  it("blocks exhausted, per-user and unclaimed activity coupons", () => {
    expect(couponLimitError({ usageLimit: 10, usedCount: 10 })).toBe("优惠券已用完");
    expect(couponLimitError({ usageLimit: null, usedCount: 99, perUserLimit: 2, usedByUser: 2 })).toBe("已达到该优惠券每人使用上限");
    expect(couponLimitError({ claimRequired: true, claimedCount: 1, claimUsedCount: 1 })).toBe("请先领取该优惠券");
  });
  it("allows unlimited totals while enforcing redemption user limits", () => {
    expect(redemptionLimitError({ usageLimit: 0, usedCount: 999, perUserLimit: 2, usedByUser: 1 })).toBeNull();
    expect(redemptionLimitError({ usageLimit: 0, usedCount: 999, perUserLimit: 2, usedByUser: 2 })).toBe("已达到该兑换码每人使用上限");
  });
});
