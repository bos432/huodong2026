import { describe, expect, it } from "vitest";
import { rediscoverFundRisk, shouldRediscoverFundRisk } from "./fund-risk-lifecycle";

describe("rediscoverFundRisk", () => {
  it("increments an existing open alert without changing its workflow state", () => {
    expect(rediscoverFundRisk({ status: "acknowledged", occurrenceCount: 2 }).status).toBe("acknowledged");
    expect(rediscoverFundRisk({ status: "open", occurrenceCount: 2 }).occurrenceCount).toBe(3);
  });

  it("reopens a resolved alert when the anomaly appears again", () => {
    const result = rediscoverFundRisk({ status: "resolved", occurrenceCount: 4, handledBy: "finance", handledAt: new Date(), handlingRemark: "fixed" });
    expect(result).toMatchObject({ status: "open", occurrenceCount: 5, handledBy: null, handledAt: null });
  });

  it("keeps an immutable callback incident resolved while mutable risks can reopen", () => {
    expect(shouldRediscoverFundRisk("callback_failed", "resolved")).toBe(false);
    expect(shouldRediscoverFundRisk("callback_failed", "open")).toBe(true);
    expect(shouldRediscoverFundRisk("negative_wallet", "resolved")).toBe(true);
    expect(shouldRediscoverFundRisk("refund_failed", "resolved")).toBe(true);
  });
});
