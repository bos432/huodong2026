import fs from "node:fs";

const realPaymentFlags = [
  "REAL_PAYMENT_ENABLED",
  "REAL_PAYMENT_SDK_IMPLEMENTED",
  "REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED",
  "REAL_REFUND_QUERY_IMPLEMENTED",
  "REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED",
  "AGENT_REAL_TRANSFER_IMPLEMENTED",
  "MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED",
  "MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED",
  "REAL_PAYMENT_PREFLIGHT_PASSED"
];

const realPaymentConfigKeys = [
  "REAL_PAYMENT_PREFLIGHT_RESULT_FILE",
  "REAL_PAYMENT_PREFLIGHT_MAX_AGE_HOURS",
  "WECHAT_PAY_ENABLED",
  "WECHAT_PAY_APP_ID",
  "WECHAT_PAY_MCH_ID",
  "WECHAT_PAY_API_V3_KEY",
  "WECHAT_PAY_PRIVATE_KEY_PATH",
  "WECHAT_PAY_CERT_SERIAL_NO",
  "WECHAT_PAY_PLATFORM_CERT_PATH",
  "WECHAT_PAY_NOTIFY_URL",
  "ALIPAY_ENABLED",
  "ALIPAY_APP_ID",
  "ALIPAY_PRIVATE_KEY_PATH",
  "ALIPAY_PUBLIC_CERT_PATH",
  "ALIPAY_ROOT_CERT_PATH",
  "ALIPAY_NOTIFY_URL"
];

const tenantFlags = [
  "MULTI_TENANT_ENABLED",
  "MULTI_TENANT_SCHEMA_IMPLEMENTED",
  "MULTI_TENANT_ACCESS_FILTER_IMPLEMENTED",
  "MULTI_TENANT_PUBLIC_BOUNDARY_IMPLEMENTED",
  "MULTI_TENANT_PREFLIGHT_PASSED"
];

const tenantConfigKeys = [
  "MULTI_TENANT_PREFLIGHT_RESULT_FILE",
  "MULTI_TENANT_PREFLIGHT_MAX_AGE_HOURS"
];

const mallMultiMerchantFlags = [
  "MALL_MULTI_MERCHANT_ENABLED",
  "MALL_MULTI_MERCHANT_PREFLIGHT_PASSED"
];

const mallMultiMerchantConfigKeys = [
  "MALL_MULTI_MERCHANT_SMOKE_RESULT_FILE",
  "MALL_MULTI_MERCHANT_SMOKE_MAX_AGE_HOURS"
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

const preflight = read("scripts/preflight.mjs");
const doctor = read("scripts/doctor.mjs");
const runtimeValidation = read("apps/api/src/shared/config-validation.ts");
const productionExample = read("deploy/.env.production.example");
const initProductionEnv = read("scripts/init-production-env.mjs");
const compose = read("docker-compose.yml");
const systemSettings = read("apps/admin/src/views/SystemSettings.vue");
const realPaymentPlan = read("docs/real-payment-integration-plan.md");
const tenantPlan = read("docs/multi-tenant-isolation-plan.md");
const launchChecklist = read("docs/launch-checklist.md");
const progress = read("docs/project-progress.md");

for (const flag of realPaymentFlags) {
  checkSourceIncludes(preflight, flag, "preflight");
  checkSourceIncludes(doctor, flag, "doctor");
  checkSourceIncludes(runtimeValidation, flag, "runtime config validation");
  checkSourceIncludes(productionExample, `${flag}=false`, "production env example");
  checkSourceIncludes(initProductionEnv, `["${flag}", "false"]`, "production env init script");
  checkSourceIncludes(compose, `${flag}: \${${flag}:-false}`, "docker compose");
  checkSourceIncludes(systemSettings, `envLine("${flag}"`, "admin deployment settings");
}

for (const key of realPaymentConfigKeys) {
  checkSourceIncludes(preflight, key, "preflight");
  checkSourceIncludes(productionExample, `${key}=`, "production env example");
  checkSourceIncludes(compose, `${key}: \${${key}`, "docker compose");
  checkSourceIncludes(systemSettings, `envLine("${key}"`, "admin deployment settings");
  if (key.startsWith("REAL_PAYMENT_PREFLIGHT_")) {
    checkSourceIncludes(initProductionEnv, `["${key}",`, "production env init script");
  }
}

for (const key of realPaymentConfigKeys.filter((key) => !key.startsWith("REAL_PAYMENT_PREFLIGHT_"))) {
  checkSourceIncludes(runtimeValidation, key, "runtime config validation");
}

for (const flag of tenantFlags) {
  checkSourceIncludes(preflight, flag, "preflight");
  checkSourceIncludes(doctor, flag, "doctor");
  checkSourceIncludes(runtimeValidation, flag, "runtime config validation");
  checkSourceIncludes(productionExample, `${flag}=false`, "production env example");
  checkSourceIncludes(initProductionEnv, `["${flag}", "false"]`, "production env init script");
  checkSourceIncludes(compose, `${flag}: \${${flag}:-false}`, "docker compose");
  checkSourceIncludes(systemSettings, `envLine("${flag}"`, "admin deployment settings");
}

for (const key of tenantConfigKeys) {
  checkSourceIncludes(preflight, key, "preflight");
  checkSourceIncludes(doctor, key, "doctor");
  checkSourceIncludes(productionExample, `${key}=`, "production env example");
  checkSourceIncludes(initProductionEnv, `["${key}",`, "production env init script");
  checkSourceIncludes(compose, `${key}: \${${key}`, "docker compose");
  checkSourceIncludes(systemSettings, `envLine("${key}"`, "admin deployment settings");
}

for (const flag of mallMultiMerchantFlags) {
  checkSourceIncludes(preflight, flag, "preflight");
  checkSourceIncludes(doctor, flag, "doctor");
  checkSourceIncludes(runtimeValidation, flag, "runtime config validation");
  checkSourceIncludes(productionExample, `${flag}=false`, "production env example");
  checkSourceIncludes(initProductionEnv, `["${flag}", "false"]`, "production env init script");
  checkSourceIncludes(compose, `${flag}: \${${flag}:-false}`, "docker compose");
  checkSourceIncludes(systemSettings, `envLine("${flag}"`, "admin deployment settings");
}

for (const key of mallMultiMerchantConfigKeys) {
  checkSourceIncludes(preflight, key, "preflight");
  checkSourceIncludes(doctor, key, "doctor");
  checkSourceIncludes(productionExample, `${key}=`, "production env example");
  checkSourceIncludes(initProductionEnv, `["${key}",`, "production env init script");
  checkSourceIncludes(compose, `${key}: \${${key}`, "docker compose");
  checkSourceIncludes(systemSettings, `envLine("${key}"`, "admin deployment settings");
}

checkSourceIncludes(preflight, "checkRealPaymentSmokeResult(env, envPath)", "preflight");
checkSourceIncludes(preflight, "REAL_PAYMENT_PREFLIGHT_PASSED is not true", "preflight");
checkSourceIncludes(preflight, "checkTenantSmokeResult(env, envPath)", "preflight");
checkSourceIncludes(preflight, "tenant isolation preflight is still marked incomplete", "preflight");
checkSourceIncludes(preflight, "checkMallMultiMerchantSmokeResult(env, envPath)", "preflight");
checkSourceIncludes(preflight, "multi-merchant mall preflight is still marked incomplete", "preflight");
checkSourceIncludes(doctor, "realPaymentRolloutChecks", "doctor");
checkSourceIncludes(doctor, "multiTenantRolloutChecks", "doctor");
checkSourceIncludes(doctor, "mallMultiMerchantRolloutChecks", "doctor");
checkSourceIncludes(doctor, "REAL_PAYMENT_PREFLIGHT_RESULT_FILE", "doctor");
checkSourceIncludes(doctor, "MULTI_TENANT_PREFLIGHT_RESULT_FILE", "doctor");
checkSourceIncludes(doctor, "MALL_MULTI_MERCHANT_SMOKE_RESULT_FILE", "doctor");

checkSourceIncludes(runtimeValidation, "addRealPaymentRuntimeChecks", "runtime config validation");
checkSourceIncludes(runtimeValidation, "addMultiTenantRuntimeChecks", "runtime config validation");
checkSourceIncludes(runtimeValidation, "addMallMultiMerchantRuntimeChecks", "runtime config validation");
checkSourceIncludes(runtimeValidation, "真实支付总开关", "runtime config validation");
checkSourceIncludes(runtimeValidation, "多机构隔离开关", "runtime config validation");
checkSourceIncludes(runtimeValidation, "多商户商城开关", "runtime config validation");

checkSourceIncludes(systemSettings, "rolloutReadiness", "admin deployment settings");
checkSourceIncludes(systemSettings, "buildRolloutReadiness", "admin deployment settings");
checkSourceIncludes(systemSettings, "hasRolloutValue", "admin deployment settings");
checkSourceIncludes(systemSettings, "真实支付总开关", "admin deployment settings");
checkSourceIncludes(systemSettings, "微信支付", "admin deployment settings");
checkSourceIncludes(systemSettings, "支付宝", "admin deployment settings");
checkSourceIncludes(systemSettings, "代理真实打款", "admin deployment settings");
checkSourceIncludes(systemSettings, "商城微信支付", "admin deployment settings");
checkSourceIncludes(systemSettings, "店铺直收支付", "admin deployment settings");
checkSourceIncludes(systemSettings, "预发验收结果", "admin deployment settings");
checkSourceIncludes(systemSettings, "WECHAT_PAY_ENABLED 或 ALIPAY_ENABLED", "admin deployment settings");
checkSourceIncludes(systemSettings, "WECHAT_PAY_NOTIFY_URL", "admin deployment settings");
checkSourceIncludes(systemSettings, "ALIPAY_NOTIFY_URL", "admin deployment settings");
checkSourceIncludes(systemSettings, "multiTenantEnabled", "admin deployment settings");
checkSourceIncludes(systemSettings, "multiTenantPreflightResultFile", "admin deployment settings");
checkSourceIncludes(systemSettings, "multiTenantPreflightMaxAgeHours", "admin deployment settings");
checkSourceIncludes(systemSettings, "mallMultiMerchantEnabled", "admin deployment settings");
checkSourceIncludes(systemSettings, "mallMultiMerchantSmokeResultFile", "admin deployment settings");
checkSourceIncludes(systemSettings, "mallMultiMerchantSmokeMaxAgeHours", "admin deployment settings");

checkSourceIncludes(realPaymentPlan, "REAL_PAYMENT_ENABLED=false", "real payment integration plan");
checkSourceIncludes(realPaymentPlan, "AGENT_REAL_TRANSFER_IMPLEMENTED=false", "real payment integration plan");
checkSourceIncludes(realPaymentPlan, "MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED=false", "real payment integration plan");
checkSourceIncludes(realPaymentPlan, "MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED=false", "real payment integration plan");
checkSourceIncludes(realPaymentPlan, "REAL_PAYMENT_PREFLIGHT_PASSED=false", "real payment integration plan");
checkSourceIncludes(realPaymentPlan, "真实支付预发验收必须包含代理真实打款证据", "real payment integration plan");

checkSourceIncludes(tenantPlan, "MULTI_TENANT_ENABLED=false", "multi-tenant isolation plan");
checkSourceIncludes(tenantPlan, "MULTI_TENANT_PREFLIGHT_PASSED=false", "multi-tenant isolation plan");
checkSourceIncludes(tenantPlan, "deploy/tenant-smoke-result.json", "multi-tenant isolation plan");

checkSourceIncludes(launchChecklist, "REAL_PAYMENT_ENABLED=false", "launch checklist");
checkSourceIncludes(launchChecklist, "MULTI_TENANT_ENABLED=false", "launch checklist");
checkSourceIncludes(launchChecklist, "MALL_MULTI_MERCHANT_ENABLED=false", "launch checklist");
checkSourceIncludes(progress, "真实支付上线挡板", "project progress");
checkSourceIncludes(progress, "多机构隔离计划与挡板", "project progress");
checkSourceIncludes(progress, "多商户商城上线挡板", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight rollout flags guard covers real payment, multi-tenant, and multi-merchant mall rollout defaults.");
}
