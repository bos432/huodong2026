import { describe, expect, it } from "vitest";
import { assertRefundCapacity, canClaimRefundReview, resetRefundProviderForRetry } from "./refund-capacity";

describe("refund capacity", () => {
  it("allows exact remaining cents and reports no balance", () => {
    expect(assertRefundCapacity("100.00", 6500, "35.00")).toEqual({ orderFen: 10000, occupiedFen: 6500, requestFen: 3500, remainingFen: 0 });
  });

  it("rejects concurrent reservations that exceed the order amount by one cent", () => {
    expect(() => assertRefundCapacity("100.00", 6500, "35.01")).toThrow("退款金额不能超过订单可退金额");
  });

  it("rejects zero, negative and sub-cent refund requests", () => {
    expect(() => assertRefundCapacity("100.00", 0, "0")).toThrow("退款金额必须大于 0");
    expect(() => assertRefundCapacity("100.00", 0, "-1")).toThrow("退款金额必须大于 0");
    expect(() => assertRefundCapacity("100.00", 0, "0.001")).toThrow();
  });

  it("claims pending review once and treats terminal in-flight states idempotently", () => {
    expect(canClaimRefundReview("pending")).toBe("claim");
    expect(canClaimRefundReview("processing")).toBe("idempotent");
    expect(canClaimRefundReview("completed")).toBe("idempotent");
    expect(canClaimRefundReview("failed")).toBe("reject");
    expect(canClaimRefundReview("submitting")).toBe("reject");
  });

  it("clears stale provider state before retrying while preserving retry history", () => {
    const refund = {
      providerRefundNo: "provider-refund-1",
      providerRefundStatus: "failed",
      providerRefundSyncedAt: new Date("2026-07-16T08:00:00.000Z"),
      providerRefundPayload: { status: "failed" },
      providerRefundFailureReason: "controlled failure",
      providerRefundNextQueryAt: new Date("2026-07-16T08:10:00.000Z"),
      providerRefundRetryCount: 2
    };

    expect(resetRefundProviderForRetry(refund)).toMatchObject({
      providerRefundNo: null,
      providerRefundStatus: null,
      providerRefundSyncedAt: null,
      providerRefundPayload: null,
      providerRefundFailureReason: null,
      providerRefundNextQueryAt: null,
      providerRefundRetryCount: 2
    });
  });
});
