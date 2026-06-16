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
const smokeResult = read("scripts/real-payment-smoke-result.mjs");
const example = JSON.parse(read("deploy/real-payment-smoke-result.example.json"));

checkSourceIncludes(preflight, "requiredAgentTransferEvidenceFields", "preflight");
checkSourceIncludes(preflight, "checkRealPaymentAgentTransfer(result, relativeResultFile)", "preflight");
checkSourceIncludes(preflight, "must include passed check: agentTransfer", "preflight");
checkSourceIncludes(preflight, "checkRealPaymentSceneCoverage(result, relativeResultFile)", "preflight");
checkSourceIncludes(smokeResult, '"agentTransfer"', "real payment smoke script");

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

check(example?.checks?.agentTransfer?.status === "pending", "real-payment-smoke-result.example.json must keep checks.agentTransfer.status=pending.");
check(example?.checks?.agentTransfer?.note, "real-payment-smoke-result.example.json must document checks.agentTransfer.note.");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight real payment guard covers checks, scenes and agentTransfer evidence.");
}
