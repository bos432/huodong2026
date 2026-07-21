import { describe, expect, it } from "vitest";
import { allocateMallAmountFen, buildMallCheckoutAllocations, buildMallCheckoutDiscountAllocations, mallFreightFen } from "./mall-order-allocation";

describe("mall checkout allocation", () => {
  it("allocates integer cents exactly with stable largest remainders", () => {
    const result = allocateMallAmountFen(10, [{ key: "a", goodsFen: 100 }, { key: "b", goodsFen: 100 }, { key: "c", goodsFen: 100 }]);
    expect(result).toEqual([{ key: "a", amountFen: 4 }, { key: "b", amountFen: 3 }, { key: "c", amountFen: 3 }]);
    expect(result.reduce((sum, row) => sum + row.amountFen, 0)).toBe(10);
  });

  it("calculates merchant freight with a free-shipping threshold", () => {
    const rule = { enabled: true, baseFreightFen: 800, freeThresholdFen: 9900 };
    expect(mallFreightFen(5000, rule)).toBe(800);
    expect(mallFreightFen(9900, rule)).toBe(0);
  });

  it("produces explainable child order totals", () => {
    expect(buildMallCheckoutAllocations([{ key: "m1", goodsFen: 6000, freightFen: 800 }, { key: "m2", goodsFen: 4000, freightFen: 0 }], 1000)).toEqual([
      { key: "m1", goodsFen: 6000, freightFen: 800, discountFen: 600, payableFen: 6200 },
      { key: "m2", goodsFen: 4000, freightFen: 0, discountFen: 400, payableFen: 3600 }
    ]);
  });

  it("keeps merchant coupons within eligible rows and allocates points after coupon", () => {
    const rows = buildMallCheckoutDiscountAllocations([
      { key: "merchant-a", goodsFen: 1000, freightFen: 100, couponEligibleFen: 1000 },
      { key: "merchant-b", goodsFen: 500, freightFen: 0, couponEligibleFen: 0 }
    ], 300, 101);
    expect(rows).toEqual([
      { key: "merchant-a", goodsFen: 1000, freightFen: 100, couponDiscountFen: 300, pointsDiscountFen: 59, discountFen: 359, payableFen: 741 },
      { key: "merchant-b", goodsFen: 500, freightFen: 0, couponDiscountFen: 0, pointsDiscountFen: 42, discountFen: 42, payableFen: 458 }
    ]);
    expect(rows.reduce((sum, row) => sum + row.couponDiscountFen, 0)).toBe(300);
    expect(rows.reduce((sum, row) => sum + row.pointsDiscountFen, 0)).toBe(101);
  });
});
