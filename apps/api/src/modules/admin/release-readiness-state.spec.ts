import { describe, expect, it } from "vitest";
import { RELEASE_READINESS_ITEMS, nextReleaseReadinessStatus, sanitizeReleaseEvidence } from "./release-readiness-state";

describe("release readiness state", () => {
  it("defines all externally validated launch areas", () => {
    expect(RELEASE_READINESS_ITEMS.map((item) => item.key)).toEqual([
      "payment_config",
      "payment_callbacks",
      "sms",
      "wechat_subscription",
      "miniprogram_acceptance",
      "test_fixtures"
    ]);
  });

  it("does not turn a saved configuration into an accepted external capability", () => {
    expect(nextReleaseReadinessStatus("unconfigured", "save")).toBe("configured");
    expect(nextReleaseReadinessStatus("configured", "check")).toBe("external_pending");
    expect(nextReleaseReadinessStatus("external_pending", "save")).toBe("configured");
  });

  it("requires explicit verification before accepted and strips secrets from evidence", () => {
    expect(nextReleaseReadinessStatus("external_pending", "verify")).toBe("accepted");
    expect(() => nextReleaseReadinessStatus("configured", "verify")).toThrow("外部验收证据");
    expect(sanitizeReleaseEvidence({ apiV3Key: "secret", password: "secret", phone: "13983747433", note: "ok" })).toEqual({
      phone: "***7433",
      note: "ok"
    });
  });
});
