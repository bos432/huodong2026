import fs from "node:fs";

const requiredChecks = [
  "paymentCreate",
  "paymentSceneCoverage",
  "paymentCallback",
  "duplicateCallback",
  "amountMismatchCallback",
  "refundRequest",
  "refundNotification",
  "refundQuery",
  "statementFetch",
  "agentAccountRouting",
  "mallPaymentCreate",
  "mallPaymentCallback",
  "mallPaymentRouteGuard",
  "mallRefund",
  "agentTransfer",
  "rollbackPlan"
];

const requiredPaymentScenes = {
  wechat: [
    ["native", ["codeUrl"]],
    ["h5", ["clientIp", "h5Url"]],
    ["jsapi", ["openId", "prepayId"]]
  ],
  alipay: [
    ["precreate", ["qrCode"]],
    ["wap", ["returnUrl", "formBody"]],
    ["page", ["returnUrl", "formBody"]]
  ]
};

const requiredAgentTransferEvidenceFields = [
  "provider",
  "agentId",
  "settlementNo",
  "transferNo",
  "providerTransferNo",
  "amount",
  "successQueryResult",
  "failureCase",
  "rollbackRecord"
];

const requiredMallPaymentRouteGuardEvidenceFields = [
  "provider",
  "merchantId",
  "paymentMode",
  "paymentCallbackPath",
  "refundCallbackPath",
  "platformPaymentRouteRejected",
  "wrongMerchantPaymentRouteRejected",
  "platformRefundRouteRejected",
  "wrongMerchantRefundRouteRejected",
  "callbackLogIds",
  "operatorMessage",
  "rollbackRecord"
];

const requiredMallPaymentEvidenceFields = [
  "provider",
  "merchantId",
  "merchantScope",
  "paymentMode",
  "collectionMode",
  "receiverType",
  "callbackPath",
  "orderNo",
  "transactionNo",
  "callbackLogId",
  "refundNo",
  "providerRefundNo",
  "rollbackRecord"
];

const failures = [];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function checkSourceIncludes(source, needle, label) {
  check(source.includes(needle), `${label} must include ${needle}.`);
}

function checkSourceIncludesAny(source, needles, label) {
  check(needles.some((needle) => source.includes(needle)), `${label} must include one of: ${needles.join(", ")}.`);
}

const preflight = read("scripts/preflight.mjs");
const prelaunch = read("scripts/prelaunch-online-showcase.mjs");
const mallMerchantsView = read("apps/admin/src/views/MallMerchants.vue");
const mallService = read("apps/api/src/modules/mall/mall.service.ts");
const mallController = read("apps/api/src/modules/mall/mall-admin.controller.ts");
const adminPermissions = read("apps/api/src/modules/admin/admin-permissions.ts");
const mallMerchantPaymentAccountEntity = read("apps/api/src/entities/mall-merchant-payment-account.entity.ts");
const smokeResult = read("scripts/real-payment-smoke-result.mjs");
const example = JSON.parse(read("deploy/real-payment-smoke-result.example.json"));

checkSourceIncludes(preflight, "requiredAgentTransferEvidenceFields", "preflight");
checkSourceIncludes(preflight, "checkRealPaymentAgentTransfer(result, relativeResultFile)", "preflight");
checkSourceIncludes(preflight, "checkRealPaymentMallPayment(result, relativeResultFile)", "preflight");
checkSourceIncludes(preflight, "checkRealPaymentMallRouteGuard(result, relativeResultFile)", "preflight");
checkSourceIncludes(preflight, "checkMallPaymentRoutingEvidence", "preflight");
checkSourceIncludes(preflight, "must include passed check: agentTransfer", "preflight");
checkSourceIncludes(preflight, "checkRealPaymentSceneCoverage(result, relativeResultFile)", "preflight");
checkSourceIncludes(smokeResult, '"agentTransfer"', "real payment smoke script");
checkSourceIncludes(smokeResult, '"mallPaymentCreate"', "real payment smoke script");
checkSourceIncludes(smokeResult, '"mallPaymentRouteGuard"', "real payment smoke script");
checkSourceIncludes(smokeResult, "function blankMallPaymentEvidence()", "real payment smoke script");
checkSourceIncludes(smokeResult, "evidence: blankMallPaymentEvidence()", "real payment smoke script");
checkSourceIncludes(smokeResult, "validateMallPaymentRouting", "real payment smoke script");
checkSourceIncludes(smokeResult, "validateMallPaymentRouteGuard", "real payment smoke script");
checkSourceIncludes(prelaunch, "refundNotifyUrl", "prelaunch script");
checkSourceIncludes(prelaunch, "validateMallPaymentRouting", "prelaunch script");
checkSourceIncludes(prelaunch, "validateMallPaymentRouteGuard", "prelaunch script");
checkSourceIncludes(prelaunch, "微信退款回调地址", "prelaunch script");
checkSourceIncludes(prelaunch, "smoke:mall-multi-merchant", "prelaunch script");
checkSourceIncludes(mallMerchantsView, "支付就绪", "mall merchants admin view");
checkSourceIncludes(mallMerchantsView, "/admin/mall/payment-readiness", "mall merchants admin view");
checkSourceIncludes(mallMerchantsView, "刷新支付状态", "mall merchants admin view");
checkSourceIncludes(mallMerchantsView, "店铺收款账户", "mall merchants admin view");
checkSourceIncludes(mallMerchantsView, "/admin/mall/merchant-payment-accounts", "mall merchants admin view");
checkSourceIncludes(mallController, "merchant-payment-accounts", "mall admin controller");
checkSourceIncludes(adminPermissions, "mall/merchant-payment-accounts", "admin route permissions");
checkSourceIncludes(adminPermissions, "mall.payment.manage", "admin route permissions");
checkSourceIncludes(mallService, "mallMerchantWechatRuntimeConfig", "mall service");
checkSourceIncludes(mallService, "mallWechatPaymentRoutingSummary", "mall service");
checkSourceIncludes(mallService, "/payment/mall/merchants/${order.merchant!.id}/wechat/callback", "mall service");
checkSourceIncludes(mallService, "/payment/mall/merchants/${order.merchant!.id}/wechat/refund-callback", "mall service");
checkSourceIncludes(mallService, "商户直收订单不能走平台微信回调地址", "mall service");
checkSourceIncludes(mallService, "回调店铺与订单店铺不一致", "mall service");
checkSourceIncludes(mallService, "商户直收退款通知必须走店铺专属退款回调地址", "mall service");
checkSourceIncludes(mallService, "退款通知店铺与商城订单店铺不一致", "mall service");
checkSourceIncludes(mallService, "mallMerchantScope", "mall service");
checkSourceIncludes(mallService, "merchantPaymentAccounts", "mall service");
checkSourceIncludes(mallService, "accountUnreadableFiles", "mall service");
checkSourceIncludes(mallMerchantPaymentAccountEntity, '@Entity("mall_merchant_payment_accounts")', "mall merchant payment account entity");

for (const checkKey of requiredChecks) {
  checkSourceIncludes(smokeResult, JSON.stringify(checkKey), "real payment smoke script");
  check(
    Object.prototype.hasOwnProperty.call(example?.checks || {}, checkKey),
    `real-payment-smoke-result.example.json must include checks.${checkKey}.`
  );
  if (checkKey !== "agentTransfer") {
    checkSourceIncludes(preflight, JSON.stringify(checkKey), "preflight");
  }
}

for (const [provider, scenes] of Object.entries(requiredPaymentScenes)) {
  checkSourceIncludesAny(smokeResult, [JSON.stringify(provider), `${provider}:`], "real payment smoke script");
  checkSourceIncludesAny(preflight, [JSON.stringify(provider), `${provider}:`], "preflight");
  check(
    Object.prototype.hasOwnProperty.call(example?.providers || {}, provider),
    `real-payment-smoke-result.example.json must include providers.${provider}.`
  );
  for (const [scene, evidenceFields] of scenes) {
    const exampleScene = example?.checks?.paymentSceneCoverage?.scenes?.[provider]?.[scene];
    checkSourceIncludes(smokeResult, JSON.stringify(scene), "real payment smoke script");
    checkSourceIncludes(preflight, JSON.stringify(scene), "preflight");
    check(exampleScene?.status === "pending", `real-payment-smoke-result.example.json must keep ${provider}.${scene}.status=pending.`);
    check(exampleScene?.merchantScope === "platform-or-agent", `real-payment-smoke-result.example.json must keep ${provider}.${scene}.merchantScope=platform-or-agent.`);
    for (const field of evidenceFields) {
      checkSourceIncludes(smokeResult, JSON.stringify(field), "real payment smoke script");
      checkSourceIncludes(preflight, JSON.stringify(field), "preflight");
      check(
        Object.prototype.hasOwnProperty.call(exampleScene?.evidence || {}, field),
        `real-payment-smoke-result.example.json must include ${provider}.${scene}.evidence.${field}.`
      );
    }
  }
}

for (const field of requiredAgentTransferEvidenceFields) {
  checkSourceIncludes(preflight, JSON.stringify(field), "preflight");
  checkSourceIncludes(smokeResult, JSON.stringify(field), "real payment smoke script");
  check(
    Object.prototype.hasOwnProperty.call(example?.checks?.agentTransfer?.evidence || {}, field),
    `real-payment-smoke-result.example.json must include checks.agentTransfer.evidence.${field}.`
  );
}

for (const checkKey of ["mallPaymentCreate", "mallPaymentCallback", "mallRefund"]) {
  check(example?.checks?.[checkKey]?.status === "pending", `real-payment-smoke-result.example.json must keep checks.${checkKey}.status=pending.`);
  check(example?.checks?.[checkKey]?.note, `real-payment-smoke-result.example.json must document checks.${checkKey}.note.`);
  for (const field of requiredMallPaymentEvidenceFields) {
    checkSourceIncludes(preflight, JSON.stringify(field), "preflight");
    checkSourceIncludes(smokeResult, JSON.stringify(field), "real payment smoke script");
    check(
      Object.prototype.hasOwnProperty.call(example?.checks?.[checkKey]?.evidence || {}, field),
      `real-payment-smoke-result.example.json must include checks.${checkKey}.evidence.${field}.`
    );
  }
}

check(example?.checks?.mallPaymentRouteGuard?.status === "pending", "real-payment-smoke-result.example.json must keep checks.mallPaymentRouteGuard.status=pending.");
check(example?.checks?.mallPaymentRouteGuard?.note, "real-payment-smoke-result.example.json must document checks.mallPaymentRouteGuard.note.");
checkSourceIncludes(preflight, "requiredMallPaymentRouteGuardEvidenceFields", "preflight");
checkSourceIncludes(smokeResult, "requiredMallPaymentRouteGuardEvidenceFields", "real payment smoke script");
checkSourceIncludes(prelaunch, "requiredMallPaymentRouteGuardEvidenceFields", "prelaunch script");
for (const field of requiredMallPaymentRouteGuardEvidenceFields) {
  checkSourceIncludes(preflight, JSON.stringify(field), "preflight");
  checkSourceIncludes(smokeResult, JSON.stringify(field), "real payment smoke script");
  checkSourceIncludes(prelaunch, JSON.stringify(field), "prelaunch script");
  check(
    Object.prototype.hasOwnProperty.call(example?.checks?.mallPaymentRouteGuard?.evidence || {}, field),
    `real-payment-smoke-result.example.json must include checks.mallPaymentRouteGuard.evidence.${field}.`
  );
}

check(example?.checks?.agentTransfer?.status === "pending", "real-payment-smoke-result.example.json must keep checks.agentTransfer.status=pending.");
check(example?.checks?.agentTransfer?.note, "real-payment-smoke-result.example.json must document checks.agentTransfer.note.");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight real payment guard covers checks, scenes, mall payment evidence, mall route guard evidence, and agentTransfer evidence.");
}
