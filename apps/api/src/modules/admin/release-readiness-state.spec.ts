import { describe, expect, it } from "vitest";
import { RELEASE_READINESS_ITEMS, nextReleaseReadinessStatus, readinessDecision, sanitizeReleaseEvidence } from "./release-readiness-state";

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

  it("recursively removes sensitive evidence fields and bounds free-text values", () => {
    expect(sanitizeReleaseEvidence({ summary: "x".repeat(1200), details: [{ privateKey: "key", phone: "13983747433", result: "ok" }] })).toEqual({
      summary: "x".repeat(1000),
      details: [{ phone: "***7433", result: "ok" }]
    });
  });

  it("redacts credentials pasted into free-text evidence summaries", () => {
    const fakeKey = [
      ["-----BEGIN", "PRIVATE KEY-----"].join(" "),
      "secret-material",
      ["-----END", "PRIVATE KEY-----"].join(" ")
    ].join("\n");
    const evidence = sanitizeReleaseEvidence({
      summary: "回调已验证，APIv3 Key=12345678901234567890123456789012; Bearer eyJhbGciOiJub25lIn0.abc.def",
      details: `private key: ${fakeKey}`
    });

    expect(JSON.stringify(evidence)).not.toContain("12345678901234567890123456789012");
    expect(JSON.stringify(evidence)).not.toContain("eyJhbGciOiJub25lIn0.abc.def");
    expect(JSON.stringify(evidence)).not.toContain("secret-material");
    expect(evidence.summary).toContain("[已脱敏]");
    expect(evidence.details).toContain("[已脱敏]");
  });

  it("returns explicit launch blockers until every external capability is accepted", () => {
    const decision = readinessDecision([
      { itemKey: "payment_config", label: "支付配置", status: "accepted" },
      { itemKey: "payment_callbacks", label: "支付/退款回调", status: "external_pending" },
      { itemKey: "sms", label: "短信配置", status: "accepted" }
    ]);

    expect(decision.ready).toBe(false);
    expect(decision.blockers).toEqual(["支付/退款回调：外部验收中", "微信订阅消息：未登记验收状态", "真机与体验版验收：未登记验收状态", "测试账号与测试订单：未登记验收状态"]);
  });
});
