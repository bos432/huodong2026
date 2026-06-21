import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const resultFile = process.env.REAL_PAYMENT_PREFLIGHT_RESULT_FILE || "deploy/real-payment-smoke-result.json";
const fullPath = path.isAbsolute(resultFile) ? resultFile : path.join(root, resultFile);
const init = process.argv.includes("--init");
const force = process.argv.includes("--force");

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

const requiredMallPaymentRouteRejectionFields = [
  "platformPaymentRouteRejected",
  "wrongMerchantPaymentRouteRejected",
  "platformRefundRouteRejected",
  "wrongMerchantRefundRouteRejected"
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

function template() {
  const checks = Object.fromEntries(requiredChecks.map((key) => [key, { status: "pending", note: "" }]));
  checks.paymentSceneCoverage = {
    status: "pending",
    note: "Verify every enabled provider scene with the intended platform or agent merchant account.",
    scenes: Object.fromEntries(
      Object.entries(requiredPaymentScenes).map(([provider, scenes]) => [
        provider,
        Object.fromEntries(
          scenes.map(([scene, evidenceFields]) => [
            scene,
            {
              status: "pending",
              merchantScope: "platform-or-agent",
              evidence: Object.fromEntries(evidenceFields.map((field) => [field, ""])),
              note: ""
            }
          ])
        )
      ])
    )
  };
  checks.agentTransfer = {
    status: "pending",
    note: "Verify agent automatic transfer in staging after the provider transfer product is enabled.",
    evidence: {
      provider: "",
      agentId: "",
      settlementNo: "",
      transferNo: "",
      providerTransferNo: "",
      amount: "",
      successQueryResult: "",
      failureCase: "",
      rollbackRecord: ""
    }
  };
  checks.mallPaymentCreate = {
    status: "pending",
    note: "Verify mall order creates a real provider payment task with the intended store collection mode.",
    evidence: blankMallPaymentEvidence()
  };
  checks.mallPaymentCallback = {
    status: "pending",
    note: "Verify real mall payment callback is signed, idempotent, matched to the mall order and scoped to the store.",
    evidence: { ...checks.mallPaymentCreate.evidence }
  };
  checks.mallPaymentRouteGuard = {
    status: "pending",
    note: "Verify merchant-direct mall payment and refund callbacks reject the platform route and the wrong store route before enabling direct collection.",
    evidence: {
      provider: "wechat",
      merchantId: "",
      paymentMode: "merchant_direct",
      paymentCallbackPath: "",
      refundCallbackPath: "",
      platformPaymentRouteRejected: false,
      wrongMerchantPaymentRouteRejected: false,
      platformRefundRouteRejected: false,
      wrongMerchantRefundRouteRejected: false,
      callbackLogIds: "",
      operatorMessage: "",
      rollbackRecord: ""
    }
  };
  checks.mallRefund = {
    status: "pending",
    note: "Verify mall after-sale refund reaches provider or the documented offline fallback and updates mall finance logs.",
    evidence: { ...checks.mallPaymentCreate.evidence }
  };
  return {
    passed: false,
    checkedAt: new Date().toISOString(),
    environment: "staging",
    providers: {
      wechat: { enabled: true, merchantScope: "agent" },
      alipay: { enabled: false, merchantScope: "none" }
    },
    checks,
    rollback: {
      documented: false,
      steps: [
        "Set REAL_PAYMENT_ENABLED=false and redeploy API.",
        "Keep PAYMENT_SANDBOX_ENABLED=false in production.",
        "Disable WECHAT_PAY_ENABLED/ALIPAY_ENABLED if provider callbacks keep failing.",
        "Use finance reconciliation and refund provider scan before re-opening real payment."
      ]
    }
  };
}

function blankMallPaymentEvidence() {
  return Object.fromEntries(requiredMallPaymentEvidenceFields.map((field) => [field, ""]));
}

function fail(message) {
  console.error(`ERR  ${message}`);
  process.exitCode = 1;
}

function validate(result) {
  if (result?.passed !== true) fail("Real payment smoke result must have passed=true.");
  if (!Number.isFinite(Date.parse(result?.checkedAt || ""))) fail("Real payment smoke result must include a valid checkedAt timestamp.");
  for (const key of requiredChecks) {
    if (result?.checks?.[key]?.status !== "passed") fail(`Real payment smoke result must include passed check: ${key}.`);
  }
  validatePaymentSceneCoverage(result);
  validateMallPayment(result);
  validateMallPaymentRouteGuard(result);
  validateAgentTransfer(result);
  if (result?.rollback?.documented !== true) fail("Real payment smoke result must include rollback.documented=true.");
  if (process.exitCode) return;
  console.log(`OK   real payment smoke result passed: ${resultFile}`);
}

function validateMallPayment(result) {
  for (const checkKey of ["mallPaymentCreate", "mallPaymentCallback", "mallRefund"]) {
    const evidence = result?.checks?.[checkKey]?.evidence || {};
    for (const field of requiredMallPaymentEvidenceFields) {
      if (!hasEvidenceValue(evidence[field])) {
        fail(`Real payment smoke result ${checkKey} must include evidence.${field}.`);
      }
    }
    validateMallPaymentRouting(checkKey, evidence);
  }
}

function validateMallPaymentRouteGuard(result) {
  const evidence = result?.checks?.mallPaymentRouteGuard?.evidence || {};
  for (const field of requiredMallPaymentRouteGuardEvidenceFields) {
    if (!hasEvidenceValue(evidence[field])) {
      fail(`Real payment smoke result mallPaymentRouteGuard must include evidence.${field}.`);
    }
  }
  const merchantId = String(evidence.merchantId || "").trim();
  const paymentMode = String(evidence.paymentMode || "").trim();
  const paymentCallbackPath = String(evidence.paymentCallbackPath || "").trim();
  const refundCallbackPath = String(evidence.refundCallbackPath || "").trim();
  const expectedPaymentPath = merchantId ? `/payment/mall/merchants/${merchantId}/wechat/callback` : "";
  const expectedRefundPath = merchantId ? `/payment/mall/merchants/${merchantId}/wechat/refund-callback` : "";
  if (paymentMode !== "merchant_direct") fail("Real payment smoke result mallPaymentRouteGuard paymentMode must be merchant_direct.");
  if (merchantId) {
    if (!paymentCallbackPath.includes(expectedPaymentPath)) fail(`Real payment smoke result mallPaymentRouteGuard paymentCallbackPath must include ${expectedPaymentPath}.`);
    if (!refundCallbackPath.includes(expectedRefundPath)) fail(`Real payment smoke result mallPaymentRouteGuard refundCallbackPath must include ${expectedRefundPath}.`);
  }
  for (const field of requiredMallPaymentRouteRejectionFields) {
    if (!isAffirmativeEvidence(evidence[field])) {
      fail(`Real payment smoke result mallPaymentRouteGuard evidence.${field} must be true or passed.`);
    }
  }
}

function validateMallPaymentRouting(checkKey, evidence) {
  const merchantId = String(evidence.merchantId || "").trim();
  const paymentMode = String(evidence.paymentMode || "").trim();
  const collectionMode = String(evidence.collectionMode || "").trim();
  const receiverType = String(evidence.receiverType || "").trim();
  const merchantScope = String(evidence.merchantScope || "").trim();
  const callbackPath = String(evidence.callbackPath || "").trim();
  const isRefund = checkKey === "mallRefund";
  const platformPath = isRefund ? "/payment/mall/wechat/refund-callback" : "/payment/mall/wechat/callback";
  const directPath = merchantId ? (isRefund ? `/payment/mall/merchants/${merchantId}/wechat/refund-callback` : `/payment/mall/merchants/${merchantId}/wechat/callback`) : "";
  if (paymentMode === "merchant_direct" || collectionMode === "merchant_direct") {
    if (!merchantId) fail(`Real payment smoke result ${checkKey} merchant_direct must include evidence.merchantId.`);
    if (!directPath || !callbackPath.includes(directPath)) fail(`Real payment smoke result ${checkKey} merchant_direct callbackPath must include ${directPath}.`);
    if (receiverType !== "merchant") fail(`Real payment smoke result ${checkKey} merchant_direct receiverType must be merchant.`);
    if (!["merchant", "agent"].includes(merchantScope)) fail(`Real payment smoke result ${checkKey} merchant_direct merchantScope must be merchant or agent.`);
  }
  if (paymentMode === "platform_collect" || collectionMode === "platform_collect") {
    if (!callbackPath.includes(platformPath) || callbackPath.includes("/payment/mall/merchants/")) fail(`Real payment smoke result ${checkKey} platform_collect callbackPath must use ${platformPath}.`);
    if (receiverType !== "platform") fail(`Real payment smoke result ${checkKey} platform_collect receiverType must be platform.`);
    if (merchantScope !== "platform") fail(`Real payment smoke result ${checkKey} platform_collect merchantScope must be platform.`);
  }
}

function validateAgentTransfer(result) {
  const evidence = result?.checks?.agentTransfer?.evidence || {};
  for (const field of ["provider", "agentId", "settlementNo", "transferNo", "providerTransferNo", "amount", "successQueryResult", "failureCase", "rollbackRecord"]) {
    if (!hasEvidenceValue(evidence[field])) {
      fail(`Real payment smoke result agentTransfer must include evidence.${field}.`);
    }
  }
}

function validatePaymentSceneCoverage(result) {
  for (const [provider, scenes] of Object.entries(requiredPaymentScenes)) {
    if (result?.providers?.[provider]?.enabled !== true) continue;
    for (const [scene, evidenceFields] of scenes) {
      const sceneResult = result?.checks?.paymentSceneCoverage?.scenes?.[provider]?.[scene];
      if (sceneResult?.status !== "passed") {
        fail(`Real payment smoke result must include passed payment scene: ${provider}.${scene}.`);
        continue;
      }
      const merchantScope = sceneResult.merchantScope || result?.providers?.[provider]?.merchantScope;
      if (!["platform", "agent", "platform-or-agent"].includes(merchantScope)) {
        fail(`Real payment scene ${provider}.${scene} must include merchantScope as platform, agent, or platform-or-agent.`);
      }
      for (const field of evidenceFields) {
        if (!hasEvidenceValue(sceneResult?.evidence?.[field])) {
          fail(`Real payment scene ${provider}.${scene} must include evidence.${field}.`);
        }
      }
    }
  }
}

function hasEvidenceValue(value) {
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null;
}

function isAffirmativeEvidence(value) {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  return ["true", "passed", "ok", "yes"].includes(value.trim().toLowerCase());
}

if (init) {
  if (fs.existsSync(fullPath) && !force) {
    fail(`${resultFile} already exists. Use --force to overwrite the template.`);
  } else {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${JSON.stringify(template(), null, 2)}\n`, "utf8");
    console.log(`Created ${resultFile}. Fill it with real staging evidence after provider tests pass.`);
  }
} else {
  if (!fs.existsSync(fullPath)) {
    fail(`${resultFile} does not exist. Run npm run smoke:real-payment -- --init to create the template.`);
  } else {
    validate(JSON.parse(fs.readFileSync(fullPath, "utf8")));
  }
}
