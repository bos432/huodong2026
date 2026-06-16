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
  validateAgentTransfer(result);
  if (result?.rollback?.documented !== true) fail("Real payment smoke result must include rollback.documented=true.");
  if (process.exitCode) return;
  console.log(`OK   real payment smoke result passed: ${resultFile}`);
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
