import { describe, expect, it } from "vitest";
import { mallCheckoutCouponReleaseEligible } from "./mall-checkout-coupon-release";

describe("mall checkout coupon release", () => {
  it("releases only after every checkout child is terminal", () => {
    expect(mallCheckoutCouponReleaseEligible(["closed", "closed"])).toBe(true);
    expect(mallCheckoutCouponReleaseEligible(["closed", "refunded"])).toBe(true);
    expect(mallCheckoutCouponReleaseEligible(["refunded", "refunded"])).toBe(true);
  });

  it("keeps the coupon consumed while any child can still be paid or fulfilled", () => {
    expect(mallCheckoutCouponReleaseEligible(["closed", "pending_payment"])).toBe(false);
    expect(mallCheckoutCouponReleaseEligible(["closed", "paid"])).toBe(false);
    expect(mallCheckoutCouponReleaseEligible(["refunded", "shipped"])).toBe(false);
    expect(mallCheckoutCouponReleaseEligible([])).toBe(false);
  });
});
