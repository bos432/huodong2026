import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectPaymentPreflight } from "./payment-preflight";

const now = Date.parse("2026-10-12T12:00:00Z");
const options = { now, maxAgeHours: 168, wechat: true, alipay: false };
function fixture(): any {
  const data = JSON.parse(readFileSync(resolve(__dirname, "../../../../deploy/real-payment-smoke-result.example.json"), "utf8"));
  data.passed = true;
  data.checkedAt = new Date(now).toISOString();
  for (const check of Object.values(data.checks) as any[]) {
    check.status = "passed";
    for (const key of Object.keys(check.evidence || {})) check.evidence[key] = "test-evidence";
  }
  for (const scene of Object.values(data.checks.paymentSceneCoverage.scenes.wechat) as any[]) {
    scene.status = "passed";
    for (const key of Object.keys(scene.evidence)) scene.evidence[key] = "test-evidence";
  }
  for (const key of ["mallPaymentCreate", "mallPaymentCallback", "mallRefund"]) {
    Object.assign(data.checks[key].evidence, { paymentMode: "platform_collect", collectionMode: "platform_collect", receiverType: "platform", merchantScope: "platform", callbackPath: key === "mallRefund" ? "/payment/mall/wechat/refund-callback" : "/payment/mall/wechat/callback" });
  }
  Object.assign(data.checks.mallPaymentRouteGuard.evidence, { merchantId: "9", paymentMode: "merchant_direct", paymentCallbackPath: "/payment/mall/merchants/9/wechat/callback", refundCallbackPath: "/payment/mall/merchants/9/wechat/refund-callback", platformPaymentRouteRejected: true, wrongMerchantPaymentRouteRejected: true, platformRefundRouteRejected: true, wrongMerchantRefundRouteRejected: true });
  data.rollback = { documented: true };
  return data;
}

describe("payment preflight evidence validation (synthetic fixtures only)", () => {
  it("accepts a complete fresh fixture", () => expect(inspectPaymentPreflight(fixture(), options)).toEqual([]));
  it.each([null, {}, { passed: true }])("rejects incomplete reports", (data) => expect(inspectPaymentPreflight(data, options).length).toBeGreaterThan(0));
  it.each([-1, 169])("rejects future or expired evidence (%s hours)", (age) => {
    const data = fixture(); data.checkedAt = new Date(now - age * 3600000).toISOString();
    expect(inspectPaymentPreflight(data, options)).toContain("checkedAt");
  });
  it("rejects invalid age limits", () => expect(inspectPaymentPreflight(fixture(), { ...options, maxAgeHours: 0 })).toContain("maxAgeHours"));
  it("requires coverage of the configured provider", () => {
    const data = fixture(); data.providers.wechat.enabled = false;
    expect(inspectPaymentPreflight(data, options)).toContain("providers.wechat");
  });
  it("rejects absent scene evidence and incomplete refund tests", () => {
    const data = fixture(); data.checks.paymentSceneCoverage.scenes.wechat.jsapi.evidence.prepayId = ""; data.checks.refundNotification.status = "pending";
    const errors = inspectPaymentPreflight(data, options);
    expect(errors).toContain("wechat.jsapi.prepayId"); expect(errors).toContain("checks.refundNotification");
  });
  it("rejects cross-merchant callback routing and false rejection evidence", () => {
    const data = fixture(); data.checks.mallPaymentRouteGuard.evidence.paymentCallbackPath = "/payment/mall/merchants/10/wechat/callback"; data.checks.mallPaymentRouteGuard.evidence.wrongMerchantRefundRouteRejected = false;
    const errors = inspectPaymentPreflight(data, options);
    expect(errors).toContain("mallPaymentRouteGuard.paymentCallbackPath"); expect(errors).toContain("mallPaymentRouteGuard.wrongMerchantRefundRouteRejected");
  });
  it("requires rollback documentation", () => { const data = fixture(); data.rollback.documented = false; expect(inspectPaymentPreflight(data, options)).toContain("rollback.documented"); });
});
