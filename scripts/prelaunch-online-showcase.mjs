import fs from "node:fs";
import path from "node:path";
import {
  API_BASE,
  TENANT_CODE,
  auth,
  api,
  loginPlatformAdmin,
  optionalEnv,
  pickList,
  tryApi
} from "./online-showcase-lib.mjs";

const root = process.cwd();
const resultFile = optionalEnv("REAL_PAYMENT_PREFLIGHT_RESULT_FILE", "deploy/real-payment-smoke-result.json");
const maxAgeHours = Number(optionalEnv("REAL_PAYMENT_PREFLIGHT_MAX_AGE_HOURS", "168"));
const allowHttp = optionalEnv("PRELAUNCH_ALLOW_HTTP", "false") === "true";

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

const errors = [];
const warnings = [];

function ok(message) {
  console.log(`OK   ${message}`);
}

function warn(message) {
  warnings.push(message);
  console.log(`WARN ${message}`);
}

function fail(message) {
  errors.push(message);
  console.log(`ERR  ${message}`);
}

function resolveRootPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
}

function hasEvidenceValue(value) {
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`真实支付联调结果文件不是合法 JSON：${resultFile}（${error.message}）`);
    return null;
  }
}

function validatePaymentSceneCoverage(result) {
  for (const [provider, scenes] of Object.entries(requiredPaymentScenes)) {
    if (result?.providers?.[provider]?.enabled !== true) continue;
    for (const [scene, evidenceFields] of scenes) {
      const sceneResult = result?.checks?.paymentSceneCoverage?.scenes?.[provider]?.[scene];
      if (sceneResult?.status !== "passed") {
        fail(`真实支付联调缺少通过场景：${provider}.${scene}`);
        continue;
      }
      const merchantScope = sceneResult.merchantScope || result?.providers?.[provider]?.merchantScope;
      if (!["platform", "agent", "platform-or-agent"].includes(merchantScope)) {
        fail(`真实支付场景 ${provider}.${scene} 缺少有效 merchantScope`);
      }
      for (const field of evidenceFields) {
        if (!hasEvidenceValue(sceneResult?.evidence?.[field])) {
          fail(`真实支付场景 ${provider}.${scene} 缺少证据字段：${field}`);
        }
      }
    }
  }
}

function validateAgentTransfer(result) {
  const evidence = result?.checks?.agentTransfer?.evidence || {};
  for (const field of requiredAgentTransferEvidenceFields) {
    if (!hasEvidenceValue(evidence[field])) {
      fail(`代理/结算转账联调缺少证据字段：agentTransfer.evidence.${field}`);
    }
  }
}

function validateRealPaymentEvidence() {
  const fullPath = resolveRootPath(resultFile);
  if (!fs.existsSync(fullPath)) {
    fail(`缺少真实支付联调结果文件：${resultFile}`);
    console.log("     可先执行：npm run smoke:real-payment -- --init");
    return;
  }

  const result = readJson(fullPath);
  if (!result) return;

  if (result.passed !== true) fail(`真实支付联调结果文件 ${resultFile} 必须 passed=true`);
  else ok(`真实支付联调结果已标记通过：${resultFile}`);

  const checkedAt = Date.parse(result.checkedAt || "");
  if (!Number.isFinite(checkedAt)) {
    fail(`真实支付联调结果文件 ${resultFile} 缺少合法 checkedAt`);
  } else {
    const ageHours = (Date.now() - checkedAt) / 3600000;
    if (ageHours < 0) fail(`真实支付联调结果文件 ${resultFile} 的 checkedAt 在未来`);
    else if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) fail("REAL_PAYMENT_PREFLIGHT_MAX_AGE_HOURS 必须是正数");
    else if (ageHours > maxAgeHours) fail(`真实支付联调结果已超过 ${maxAgeHours} 小时，请重新做小额真实支付联调`);
    else ok(`真实支付联调结果仍在有效期内：${ageHours.toFixed(1)} 小时前`);
  }

  for (const key of requiredChecks) {
    if (result?.checks?.[key]?.status !== "passed") fail(`真实支付联调缺少通过项：${key}`);
  }
  validatePaymentSceneCoverage(result);
  validateAgentTransfer(result);
  if (result?.rollback?.documented !== true) fail("真实支付联调结果必须包含 rollback.documented=true");
}

async function validateOnlineReadiness() {
  if (!API_BASE.startsWith("https://") && !allowHttp) {
    fail(`API_BASE 必须是 HTTPS 线上地址，当前为：${API_BASE}`);
  } else {
    ok(`API 地址：${API_BASE}`);
  }

  const platform = await loginPlatformAdmin();
  ok("平台管理员登录成功");

  const tenants = pickList(await api("/admin/tenants", { headers: auth(platform.token) }));
  const tenant = tenants.find((item) => item.code === TENANT_CODE);
  if (!tenant) {
    fail(`找不到演示商家：${TENANT_CODE}`);
    return;
  }
  ok(`演示商家存在：${tenant.name}(${tenant.code})`);

  const readinessResult = await tryApi(`/admin/mall/payment-readiness?tenantId=${tenant.id}`, { headers: auth(platform.token) });
  if (!readinessResult.ok) {
    fail(`后台商城支付就绪接口不可用：${readinessResult.error.message}`);
    fail("请先部署包含商城 payment-readiness 接口的 API 版本，并完成 npm --prefix apps/api run build + pm2 restart。");
    return;
  }

  const readiness = readinessResult.data;
  if (readiness.status === "real_ready") ok("后台微信支付就绪状态：真实配置就绪");
  else fail(`后台微信支付未达到真实就绪：${readiness.statusText || readiness.status}`);

  if (readiness.real?.notifyUrl) {
    ok(`微信支付回调地址：${readiness.real.notifyUrl}`);
  } else {
    fail("微信支付回调地址为空");
  }

  for (const issue of readiness.issues || []) fail(`微信支付配置缺口：${issue}`);

  const methods = pickList(await api(`/public/mall/payment-methods?tenantCode=${TENANT_CODE}`));
  const wechat = methods.find((item) => item.value === "wechat");
  if (wechat?.enabled && wechat.status === "real_ready") ok("前台商城微信支付可见且为真实就绪");
  else fail(`前台商城微信支付不可正式开放：${wechat?.disabledReason || wechat?.status || "未返回微信支付方式"}`);

  const enabledMethods = methods.filter((item) => item.enabled).map((item) => `${item.name || item.value}(${item.status})`).join("、");
  ok(`前台当前可用支付方式：${enabledMethods || "无"}`);
}

function printChecklist() {
  console.log("\n上线前服务器命令清单");
  console.log("1. npm run db:backup");
  console.log("2. npm --prefix apps/api run migration:run");
  console.log("3. npm --prefix apps/api run build");
  console.log("4. npm --prefix apps/admin run build");
  console.log("5. npm --prefix apps/mobile run build:h5");
  console.log("6. npm run seed:online-showcase");
  console.log("7. npm run smoke:online-showcase");
  console.log("8. npm run smoke:real-payment");
  console.log("9. npm run prelaunch:online-showcase");
}

async function main() {
  console.log(`线上演示商家真实微信支付上线验收：${TENANT_CODE}`);
  console.log(`验收目标：真实微信支付配置、联调证据、前台支付展示、回滚证据全部满足后才建议开启。\n`);

  validateRealPaymentEvidence();
  await validateOnlineReadiness();
  printChecklist();

  console.log("\n上线结论");
  if (warnings.length) console.log(`WARN 共 ${warnings.length} 个提醒，请上线前确认。`);
  if (errors.length) {
    console.log(`NO-GO：暂不能开放真实微信支付，共 ${errors.length} 个阻塞项。保持 REAL_PAYMENT_ENABLED=false。`);
    process.exitCode = 1;
    return;
  }
  console.log("GO：真实微信支付上线验收通过，可以按灰度策略小流量开启。");
}

main().catch((error) => {
  console.error(`ERR  上线验收执行失败：${error.message}`);
  process.exitCode = 1;
});
