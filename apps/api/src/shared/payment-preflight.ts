type Options = { now?: number; maxAgeHours: number; wechat: boolean; alipay: boolean };

const requiredChecks = ["paymentCreate", "paymentSceneCoverage", "paymentCallback", "duplicateCallback", "amountMismatchCallback", "refundRequest", "refundNotification", "refundQuery", "statementFetch", "agentAccountRouting", "mallPaymentCreate", "mallPaymentCallback", "mallPaymentRouteGuard", "mallRefund", "agentTransfer", "rollbackPlan"];
const scenes: Record<string, Record<string, string[]>> = {
  wechat: { native: ["codeUrl"], h5: ["clientIp", "h5Url"], jsapi: ["openId", "prepayId"] },
  alipay: { precreate: ["qrCode"], wap: ["returnUrl", "formBody"], page: ["returnUrl", "formBody"] }
};
const mallFields = ["provider", "merchantId", "merchantScope", "paymentMode", "collectionMode", "receiverType", "callbackPath", "orderNo", "transactionNo", "callbackLogId", "refundNo", "providerRefundNo", "rollbackRecord"];
const rejectionFields = ["platformPaymentRouteRejected", "wrongMerchantPaymentRouteRejected", "platformRefundRouteRejected", "wrongMerchantRefundRouteRejected"];
const transferFields = ["provider", "agentId", "settlementNo", "transferNo", "providerTransferNo", "amount", "successQueryResult", "failureCase", "rollbackRecord"];

function present(value: unknown) {
  return typeof value === "string" ? Boolean(value.trim()) : value !== null && value !== undefined;
}
function affirmative(value: unknown) {
  return value === true || (typeof value === "string" && ["true", "passed", "ok", "yes"].includes(value.trim().toLowerCase()));
}
function callbackMatches(value: unknown, expected: string) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value, "https://preflight.invalid");
    return url.pathname === expected || url.pathname === `/api${expected}`;
  } catch { return false; }
}

// Mirrors the release preflight evidence schema; returned errors contain field names, never credentials.
export function inspectPaymentPreflight(value: unknown, options: Options): string[] {
  const data = (value && typeof value === "object" ? value : {}) as Record<string, any>;
  const errors: string[] = [];
  const check = (ok: boolean, field: string) => { if (!ok) errors.push(field); };
  const fields = (evidence: Record<string, unknown> | undefined, names: string[], prefix: string) => {
    for (const name of names) check(present(evidence?.[name]), `${prefix}.${name}`);
  };
  check(data.passed === true, "passed");
  check(Number.isFinite(options.maxAgeHours) && options.maxAgeHours > 0, "maxAgeHours");
  const checkedAt = typeof data.checkedAt === "string" ? Date.parse(data.checkedAt) : NaN;
  const age = ((options.now ?? Date.now()) - checkedAt) / 3600000;
  check(Number.isFinite(age) && age >= 0 && age <= options.maxAgeHours, "checkedAt");
  for (const key of requiredChecks) check(data.checks?.[key]?.status === "passed", `checks.${key}`);
  for (const provider of ["wechat", "alipay"] as const) {
    if (options[provider]) check(data.providers?.[provider]?.enabled === true, `providers.${provider}`);
    if (!options[provider] && data.providers?.[provider]?.enabled !== true) continue;
    for (const [scene, names] of Object.entries(scenes[provider])) {
      const result = data.checks?.paymentSceneCoverage?.scenes?.[provider]?.[scene];
      check(result?.status === "passed", `${provider}.${scene}.status`);
      check(["platform", "agent", "platform-or-agent"].includes(result?.merchantScope || data.providers?.[provider]?.merchantScope), `${provider}.${scene}.merchantScope`);
      fields(result?.evidence, names, `${provider}.${scene}`);
    }
  }
  for (const key of ["mallPaymentCreate", "mallPaymentCallback", "mallRefund"]) {
    const evidence = data.checks?.[key]?.evidence || {};
    fields(evidence, mallFields, key);
    check(["platform_collect", "merchant_direct"].includes(evidence.paymentMode), `${key}.paymentMode`);
    check(evidence.collectionMode === evidence.paymentMode, `${key}.collectionMode`);
    const direct = evidence.paymentMode === "merchant_direct";
    const base = direct ? `/payment/mall/merchants/${evidence.merchantId}/wechat` : "/payment/mall/wechat";
    check(callbackMatches(evidence.callbackPath, `${base}/${key === "mallRefund" ? "refund-callback" : "callback"}`), `${key}.callbackPath`);
    check(evidence.receiverType === (direct ? "merchant" : "platform"), `${key}.receiverType`);
    check((direct ? ["merchant", "agent"] : ["platform"]).includes(evidence.merchantScope), `${key}.merchantScope`);
  }
  const guard = data.checks?.mallPaymentRouteGuard?.evidence || {};
  fields(guard, ["provider", "merchantId", "paymentMode", "paymentCallbackPath", "refundCallbackPath", "callbackLogIds", "operatorMessage", "rollbackRecord"], "mallPaymentRouteGuard");
  check(guard.paymentMode === "merchant_direct", "mallPaymentRouteGuard.paymentMode");
  check(callbackMatches(guard.paymentCallbackPath, `/payment/mall/merchants/${guard.merchantId}/wechat/callback`), "mallPaymentRouteGuard.paymentCallbackPath");
  check(callbackMatches(guard.refundCallbackPath, `/payment/mall/merchants/${guard.merchantId}/wechat/refund-callback`), "mallPaymentRouteGuard.refundCallbackPath");
  for (const field of rejectionFields) check(affirmative(guard[field]), `mallPaymentRouteGuard.${field}`);
  fields(data.checks?.agentTransfer?.evidence, transferFields, "agentTransfer");
  check(data.rollback?.documented === true, "rollback.documented");
  return errors;
}
