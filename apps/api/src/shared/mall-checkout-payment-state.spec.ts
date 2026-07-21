import { describe, expect, it } from "vitest";
import { mallCheckoutPaymentQueryState } from "./mall-checkout-payment-state";

describe("mall checkout payment query state", () => {
  it("keeps fully pending and fully closed groups distinct", () => {
    expect(mallCheckoutPaymentQueryState(["pending_payment", "pending_payment"])).toBe("pending");
    expect(mallCheckoutPaymentQueryState(["closed", "closed"])).toBe("closed");
  });

  it("marks every paid-like fulfillment state as successful", () => {
    expect(mallCheckoutPaymentQueryState(["paid", "shipped", "completed", "refund_pending", "refunded"])).toBe("success");
  });

  it("never retries unified payment for a partially paid group", () => {
    expect(mallCheckoutPaymentQueryState(["paid", "pending_payment"])).toBe("partial");
    expect(mallCheckoutPaymentQueryState(["completed", "closed"])).toBe("partial");
  });
});
