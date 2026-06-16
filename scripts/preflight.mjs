import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const errors = [];
const warnings = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readEnv(relativePath) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

function envKeys(relativePath) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.slice(0, line.indexOf("=")));
}

function check(condition, message) {
  if (!condition) errors.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function numberInRange(env, key, min, max, unit) {
  const value = Number(env[key]);
  check(Number.isFinite(value), `deploy/.env.production must set ${key} to a number.`);
  if (!Number.isFinite(value)) return;
  check(value >= min && value <= max, `deploy/.env.production must set ${key} between ${min} and ${max} ${unit}.`);
}

function requireProviderKeys(env, enabledKey, keys, label) {
  if (env[enabledKey] !== "true") return;
  for (const key of keys) check(Boolean(env[key]), `deploy/.env.production enables ${label} but ${key} is empty.`);
}

function requireHttpsUrl(env, key, label) {
  const value = env[key] || "";
  check(value.startsWith("https://"), `deploy/.env.production must set ${label} (${key}) to a public HTTPS URL.`);
}

function isPlaceholderValue(value) {
  const text = String(value || "");
  return !text || text === "local" || text === "unknown" || text.startsWith("change-me") || text.startsWith("replace-with");
}

function resolveRootPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
}

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

const dockerComposeMysqlOnlyKeys = new Set([
  "MYSQL_ROOT_PASSWORD",
  "MYSQL_DATABASE",
  "MYSQL_USER",
  "MYSQL_PASSWORD"
]);

const dockerComposeBackupOnlyKeys = new Set([
  "BACKUP_DIR",
  "BACKUP_RETENTION_DAYS",
  "BACKUP_USE_DOCKER",
  "MYSQL_CONTAINER"
]);

function hasEvidenceValue(value) {
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null;
}

function checkRealPaymentSceneCoverage(result, relativeResultFile) {
  for (const [provider, scenes] of Object.entries(requiredPaymentScenes)) {
    if (result?.providers?.[provider]?.enabled !== true) continue;
    for (const [scene, evidenceFields] of scenes) {
      const sceneResult = result?.checks?.paymentSceneCoverage?.scenes?.[provider]?.[scene];
      check(sceneResult?.status === "passed", `Real payment smoke result file (${relativeResultFile}) must include passed payment scene: ${provider}.${scene}.`);
      const merchantScope = sceneResult?.merchantScope || result?.providers?.[provider]?.merchantScope;
      check(["platform", "agent", "platform-or-agent"].includes(merchantScope), `Real payment smoke result file (${relativeResultFile}) must include ${provider}.${scene}.merchantScope as platform, agent, or platform-or-agent.`);
      for (const field of evidenceFields) {
        check(hasEvidenceValue(sceneResult?.evidence?.[field]), `Real payment smoke result file (${relativeResultFile}) must include ${provider}.${scene}.evidence.${field}.`);
      }
    }
  }
}

function checkRealPaymentAgentTransfer(result, relativeResultFile) {
  check(result?.checks?.agentTransfer?.status === "passed", `Real payment smoke result file (${relativeResultFile}) must include passed check: agentTransfer.`);
  const evidence = result?.checks?.agentTransfer?.evidence || {};
  for (const field of requiredAgentTransferEvidenceFields) {
    check(hasEvidenceValue(evidence[field]), `Real payment smoke result file (${relativeResultFile}) must include agentTransfer.evidence.${field}.`);
  }
}

function checkTenantSmokeResult(env, envPath) {
  const relativeResultFile = env.MULTI_TENANT_PREFLIGHT_RESULT_FILE || "deploy/tenant-smoke-result.json";
  const resultFile = resolveRootPath(relativeResultFile);
  const maxAgeHours = Number(env.MULTI_TENANT_PREFLIGHT_MAX_AGE_HOURS || 168);
  check(Number.isFinite(maxAgeHours) && maxAgeHours > 0, `${envPath} must set MULTI_TENANT_PREFLIGHT_MAX_AGE_HOURS to a positive number.`);
  check(fs.existsSync(resultFile), `${envPath} requires a fresh tenant smoke result file (${relativeResultFile}). Run npm run smoke:tenant:seed && npm run smoke:tenant before enabling multi-tenant traffic.`);
  if (!fs.existsSync(resultFile)) return;

  let result;
  try {
    result = JSON.parse(fs.readFileSync(resultFile, "utf8"));
  } catch (error) {
    check(false, `Tenant smoke result file is not valid JSON: ${relativeResultFile} (${error.message}).`);
    return;
  }

  check(result?.passed === true, `Tenant smoke result file (${relativeResultFile}) must have passed=true. Re-run npm run smoke:tenant without TENANT_SMOKE_SKIP_PAYMENT=true.`);
  const checkedAt = Date.parse(result?.checkedAt || "");
  check(Number.isFinite(checkedAt), `Tenant smoke result file (${relativeResultFile}) must include a valid checkedAt timestamp.`);
  if (Number.isFinite(checkedAt) && Number.isFinite(maxAgeHours)) {
    const ageHours = (Date.now() - checkedAt) / 3600000;
    check(ageHours >= 0, `Tenant smoke result file (${relativeResultFile}) has a future checkedAt timestamp.`);
    check(ageHours <= maxAgeHours, `Tenant smoke result file (${relativeResultFile}) is older than ${maxAgeHours} hours. Re-run npm run smoke:tenant.`);
  }

  const tenantACode = result?.tenantA?.code;
  const tenantBCode = result?.tenantB?.code;
  check(Boolean(tenantACode && tenantBCode), `Tenant smoke result file (${relativeResultFile}) must include tenantA.code and tenantB.code.`);
  check(Boolean(tenantACode && tenantBCode && tenantACode !== tenantBCode), `Tenant smoke result file (${relativeResultFile}) must be produced with two different tenant codes.`);
  for (const key of ["operationContent", "activityBoundary", "exportBoundary", "paymentBoundary", "settlementBoundary"]) {
    check(result?.checks?.[key]?.status === "passed", `Tenant smoke result file (${relativeResultFile}) must include passed check: ${key}.`);
  }
}

function checkRealPaymentSmokeResult(env, envPath) {
  const relativeResultFile = env.REAL_PAYMENT_PREFLIGHT_RESULT_FILE || "deploy/real-payment-smoke-result.json";
  const resultFile = resolveRootPath(relativeResultFile);
  const maxAgeHours = Number(env.REAL_PAYMENT_PREFLIGHT_MAX_AGE_HOURS || 168);
  check(Number.isFinite(maxAgeHours) && maxAgeHours > 0, `${envPath} must set REAL_PAYMENT_PREFLIGHT_MAX_AGE_HOURS to a positive number.`);
  check(fs.existsSync(resultFile), `${envPath} requires a fresh real payment smoke result file (${relativeResultFile}). Run npm run smoke:real-payment after staging provider tests pass.`);
  if (!fs.existsSync(resultFile)) return;

  let result;
  try {
    result = JSON.parse(fs.readFileSync(resultFile, "utf8"));
  } catch (error) {
    check(false, `Real payment smoke result file is not valid JSON: ${relativeResultFile} (${error.message}).`);
    return;
  }

  check(result?.passed === true, `Real payment smoke result file (${relativeResultFile}) must have passed=true.`);
  const checkedAt = Date.parse(result?.checkedAt || "");
  check(Number.isFinite(checkedAt), `Real payment smoke result file (${relativeResultFile}) must include a valid checkedAt timestamp.`);
  if (Number.isFinite(checkedAt) && Number.isFinite(maxAgeHours)) {
    const ageHours = (Date.now() - checkedAt) / 3600000;
    check(ageHours >= 0, `Real payment smoke result file (${relativeResultFile}) has a future checkedAt timestamp.`);
    check(ageHours <= maxAgeHours, `Real payment smoke result file (${relativeResultFile}) is older than ${maxAgeHours} hours. Re-run staging provider tests.`);
  }

  for (const key of ["paymentCreate", "paymentSceneCoverage", "paymentCallback", "duplicateCallback", "amountMismatchCallback", "refundRequest", "refundNotification", "refundQuery", "statementFetch", "agentAccountRouting", "rollbackPlan"]) {
    check(result?.checks?.[key]?.status === "passed", `Real payment smoke result file (${relativeResultFile}) must include passed check: ${key}.`);
  }
  checkRealPaymentSceneCoverage(result, relativeResultFile);
  checkRealPaymentAgentTransfer(result, relativeResultFile);
  check(result?.rollback?.documented === true, `Real payment smoke result file (${relativeResultFile}) must include rollback.documented=true.`);
}

function checkBuildArtifacts() {
  check(exists("apps/api/dist/main.js"), "API build artifact missing: apps/api/dist/main.js");
  check(exists("apps/admin/dist/index.html"), "Admin build artifact missing: apps/admin/dist/index.html");
  check(exists("apps/mobile/dist/build/h5/index.html"), "H5 build artifact missing: apps/mobile/dist/build/h5/index.html");
  check(exists("apps/api/dist/data-source.js"), "API data-source build artifact missing; migration commands may fail.");
}

function checkAdminBuildBase() {
  const viteConfig = read("apps/admin/vite.config.ts");
  const indexHtml = exists("apps/admin/dist/index.html") ? read("apps/admin/dist/index.html") : "";
  check(viteConfig.includes('base: "./"') || viteConfig.includes("base: './'") || viteConfig.includes('base: "/admin/"') || viteConfig.includes("base: '/admin/'"), "Admin Vite config must use a sub-path-safe base for Nginx /admin/ deployment.");
  if (indexHtml) check(!indexHtml.includes('src="/assets/') && !indexHtml.includes('href="/assets/'), "Admin build output should not reference root /assets/.");
}

function checkProductionEnv() {
  const envPath = "deploy/.env.production";
  check(exists(envPath), "Production env file missing: deploy/.env.production");
  if (!exists(envPath)) return;
  const env = readEnv(envPath);
  const production = env.NODE_ENV === "production";
  check(production, `${envPath} must set NODE_ENV=production before release.`);
  check(Boolean(env.APP_VERSION), `${envPath} must set APP_VERSION.`);
  check(!isPlaceholderValue(env.BUILD_COMMIT), `${envPath} must set BUILD_COMMIT to the deployed git commit or image revision.`);
  check(!isPlaceholderValue(env.BUILD_TIME) && Number.isFinite(Date.parse(env.BUILD_TIME || "")), `${envPath} must set BUILD_TIME to a valid release build timestamp.`);
  const sandboxEnabled = env.PAYMENT_SANDBOX_ENABLED === "true";
  const requiredStrong = ["JWT_SECRET", "DB_PASSWORD", "H5_AUTH_SECRET"];
  if (sandboxEnabled) requiredStrong.push("PAYMENT_SANDBOX_SECRET", "WECHAT_PAY_SANDBOX_SECRET", "ALIPAY_PAY_SANDBOX_SECRET");
  for (const key of requiredStrong) {
    const value = env[key] || "";
    check(value && !value.startsWith("change-me") && !["activitypass", "rootpass", "dev-secret-change-me"].includes(value), `${envPath} must replace ${key}.`);
  }
  for (const key of ["CORS_ORIGIN", "PUBLIC_H5_ORIGIN", "PUBLIC_ADMIN_ORIGIN", "PUBLIC_API_ORIGIN"]) {
    const value = env[key] || "";
    check(value && !/localhost|127\.0\.0\.1|0\.0\.0\.0|example\.com/.test(value), `${envPath} must replace ${key} with a real production domain.`);
  }
  check(env.H5_AUTH_MODE === "sms", `${envPath} must use H5_AUTH_MODE=sms.`);
  check(env.DB_SYNCHRONIZE !== "true", `${envPath} must keep DB_SYNCHRONIZE=false and use migrations in production.`);
  check(env.PAYMENT_SANDBOX_ENABLED !== "true", `${envPath} must keep PAYMENT_SANDBOX_ENABLED=false for production traffic.`);
  if (env.REAL_PAYMENT_ENABLED === "true") {
    check(env.WECHAT_PAY_ENABLED === "true" || env.ALIPAY_ENABLED === "true", `${envPath} enables REAL_PAYMENT_ENABLED but no real payment provider is enabled.`);
    requireProviderKeys(env, "WECHAT_PAY_ENABLED", ["WECHAT_PAY_APP_ID", "WECHAT_PAY_MCH_ID", "WECHAT_PAY_API_V3_KEY", "WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_PAY_CERT_SERIAL_NO", "WECHAT_PAY_PLATFORM_CERT_PATH", "WECHAT_PAY_NOTIFY_URL"], "WeChat Pay");
    requireProviderKeys(env, "ALIPAY_ENABLED", ["ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY_PATH", "ALIPAY_PUBLIC_CERT_PATH", "ALIPAY_ROOT_CERT_PATH", "ALIPAY_NOTIFY_URL"], "Alipay");
    if (env.WECHAT_PAY_ENABLED === "true" && env.AGENT_REAL_TRANSFER_IMPLEMENTED === "true") {
      requireProviderKeys(env, "WECHAT_PAY_ENABLED", ["WECHAT_TRANSFER_APP_ID", "WECHAT_TRANSFER_SCENE_ID"], "WeChat merchant transfer");
    }
    if (env.WECHAT_PAY_ENABLED === "true") requireHttpsUrl(env, "WECHAT_PAY_NOTIFY_URL", "WeChat Pay callback");
    if (env.ALIPAY_ENABLED === "true") requireHttpsUrl(env, "ALIPAY_NOTIFY_URL", "Alipay callback");
    check(env.REAL_PAYMENT_SDK_IMPLEMENTED === "true", `${envPath} enables REAL_PAYMENT_ENABLED but official payment SDK/signature implementation is still marked incomplete.`);
    check(env.REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED === "true", `${envPath} enables REAL_PAYMENT_ENABLED but official callback verification/decrypt is still marked incomplete.`);
    check(env.REAL_REFUND_QUERY_IMPLEMENTED === "true", `${envPath} enables REAL_PAYMENT_ENABLED but official refund query/notification handling is still marked incomplete.`);
    check(env.REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED === "true", `${envPath} enables REAL_PAYMENT_ENABLED but official statement download/parser is still marked incomplete.`);
    check(env.AGENT_REAL_TRANSFER_IMPLEMENTED === "true", `${envPath} enables REAL_PAYMENT_ENABLED but real agent transfer SDK is still marked incomplete; keep automatic transfer UI disabled.`);
  }
  if (env.REAL_PAYMENT_ENABLED === "true" || env.REAL_PAYMENT_PREFLIGHT_PASSED === "true" || env.REAL_PAYMENT_SDK_IMPLEMENTED === "true" || env.REAL_REFUND_QUERY_IMPLEMENTED === "true" || env.REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED === "true" || env.AGENT_REAL_TRANSFER_IMPLEMENTED === "true") {
    check(env.REAL_PAYMENT_PREFLIGHT_PASSED === "true", `${envPath} declares real payment implementation or enables real payment but REAL_PAYMENT_PREFLIGHT_PASSED is not true.`);
    checkRealPaymentSmokeResult(env, envPath);
  }
  if (env.MULTI_TENANT_ENABLED === "true") {
    check(env.MULTI_TENANT_SCHEMA_IMPLEMENTED === "true", `${envPath} enables MULTI_TENANT_ENABLED but tenant schema/migration is still marked incomplete.`);
    check(env.MULTI_TENANT_ACCESS_FILTER_IMPLEMENTED === "true", `${envPath} enables MULTI_TENANT_ENABLED but admin access filtering is still marked incomplete.`);
    check(env.MULTI_TENANT_PUBLIC_BOUNDARY_IMPLEMENTED === "true", `${envPath} enables MULTI_TENANT_ENABLED but public tenant routing/boundary is still marked incomplete.`);
    check(env.MULTI_TENANT_PREFLIGHT_PASSED === "true", `${envPath} enables MULTI_TENANT_ENABLED but tenant isolation preflight is still marked incomplete.`);
  }
  if (env.MULTI_TENANT_ENABLED === "true" || env.MULTI_TENANT_PREFLIGHT_PASSED === "true") checkTenantSmokeResult(env, envPath);
  warn(env.SMS_PROVIDER_ENABLED === "true", `${envPath} does not enable SMS_PROVIDER_ENABLED; H5 SMS provider settings may be maintained in the admin console, but production traffic must verify the backend settings page before release.`);
  if (env.SMS_PROVIDER_ENABLED === "true") {
    const missingSmsEnvKeys = ["SMS_ACCESS_KEY_ID", "SMS_ACCESS_KEY_SECRET", "SMS_SIGN_NAME", "SMS_TEMPLATE_ID"].filter((key) => !env[key]);
    warn(!missingSmsEnvKeys.length, `${envPath} SMS env credentials are incomplete (${missingSmsEnvKeys.join(", ")}); this is allowed only when the admin System Settings page contains the production SMS provider credentials.`);
  }
  requireProviderKeys(env, "EMAIL_PROVIDER_ENABLED", ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"], "email provider");
  requireProviderKeys(env, "WECHAT_MESSAGE_PROVIDER_ENABLED", ["WECHAT_APP_ID", "WECHAT_APP_SECRET"], "WeChat message provider");
  check(env.NOTIFICATION_FORCE_FAIL !== "true", `${envPath} must keep NOTIFICATION_FORCE_FAIL=false in production.`);
  check(env.SECURITY_HEADERS_ENABLED === "true", `${envPath} must enable SECURITY_HEADERS_ENABLED.`);
  check(env.SECURITY_HSTS_ENABLED === "true", `${envPath} must enable SECURITY_HSTS_ENABLED.`);
  check(env.VALIDATION_FORBID_NON_WHITELISTED === "true", `${envPath} must enable VALIDATION_FORBID_NON_WHITELISTED.`);
  check(env.ACCESS_LOG_ENABLED === "true", `${envPath} must enable ACCESS_LOG_ENABLED.`);
  check((env.TRUST_PROXY || "false") !== "false", `${envPath} must enable TRUST_PROXY when deploying behind Nginx.`);
  check(Boolean(env.BACKUP_DIR), `${envPath} must set BACKUP_DIR.`);
  check(Number(env.BACKUP_RETENTION_DAYS || 0) >= 7, `${envPath} must set BACKUP_RETENTION_DAYS to at least 7.`);
  numberInRange(env, "H5_CODE_EXPIRE_MINUTES", 1, 30, "minutes");
  numberInRange(env, "H5_CODE_COOLDOWN_SECONDS", 10, 600, "seconds");
  numberInRange(env, "H5_CODE_PHONE_HOURLY_LIMIT", 1, 200, "times");
  numberInRange(env, "H5_CODE_PHONE_DAILY_LIMIT", 1, 1000, "times");
  numberInRange(env, "H5_CODE_IP_HOURLY_LIMIT", 1, 5000, "times");
  numberInRange(env, "ADMIN_LOGIN_WINDOW_MINUTES", 1, 1440, "minutes");
  numberInRange(env, "ADMIN_LOGIN_MAX_FAILURES", 1, 100, "times");
  numberInRange(env, "ADMIN_LOGIN_LOCK_MINUTES", 1, 1440, "minutes");
  numberInRange(env, "OFFLINE_PAYMENT_EXPIRE_MINUTES", 5, 43200, "minutes");
  check(env.ORDER_CLOSE_WORKER_ENABLED === "true", `${envPath} should enable ORDER_CLOSE_WORKER_ENABLED=true so unpaid orders release seats automatically.`);
  if (env.ORDER_CLOSE_WORKER_ENABLED === "true") numberInRange(env, "ORDER_CLOSE_WORKER_INTERVAL_SECONDS", 30, 3600, "seconds");
  if (env.NOTIFICATION_SCHEDULE_WORKER_ENABLED === "true") numberInRange(env, "NOTIFICATION_SCHEDULE_WORKER_INTERVAL_SECONDS", 30, 3600, "seconds");
}

function checkNginx() {
  const conf = read("deploy/nginx/default.conf");
  check(conf.includes("server_tokens off"), "Nginx should disable server_tokens.");
  check(conf.includes("X-Content-Type-Options"), "Nginx should set X-Content-Type-Options.");
  check(conf.includes("X-Frame-Options"), "Nginx should set X-Frame-Options.");
  check(conf.includes("X-Forwarded-For"), "Nginx should forward X-Forwarded-For.");
  check(conf.includes("X-Forwarded-Proto"), "Nginx should forward X-Forwarded-Proto.");
  check(conf.includes("no-store"), "SPA HTML should use no-store/no-cache cache policy.");
}

function checkDockerCompose() {
  const compose = read("docker-compose.yml");
  const apiKeys = envKeys("deploy/.env.production.example").filter(
    (key) => !dockerComposeMysqlOnlyKeys.has(key) && !dockerComposeBackupOnlyKeys.has(key)
  );
  for (const key of apiKeys) {
    check(compose.includes(`${key}:`), `docker-compose.yml should pass ${key} to API.`);
  }
  for (const key of dockerComposeMysqlOnlyKeys) {
    check(compose.includes(`${key}:`), `docker-compose.yml should pass ${key} to MySQL.`);
  }
  check(compose.includes("uploads-data:/app/uploads"), "docker-compose.yml should persist API uploads.");
  check(compose.includes("uploads-data:/usr/share/nginx/uploads"), "docker-compose.yml should expose uploads through Nginx.");
}

function checkBackupScripts() {
  check(exists("scripts/db-backup.mjs"), "Database backup script missing.");
  check(exists("scripts/db-restore.mjs"), "Database restore script missing.");
  check(exists("scripts/db-prune-backups.mjs"), "Database backup prune script missing.");
  const packageJson = JSON.parse(read("package.json"));
  check(Boolean(packageJson.scripts?.["db:backup"]), "package.json must expose db:backup.");
  check(Boolean(packageJson.scripts?.["db:restore"]), "package.json must expose db:restore.");
  check(Boolean(packageJson.scripts?.["db:prune-backups"]), "package.json must expose db:prune-backups.");
}

function checkMigrations() {
  try {
    const output = execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["--prefix", "apps/api", "run", "migration:show"], { cwd: root, encoding: "utf8", shell: process.platform === "win32" });
    warn(!output.includes("[ ]"), "There are pending migrations. Run npm --prefix apps/api run migration:run on the target database after backup.");
  } catch (error) {
    warnings.push(`Could not run migration:show: ${error.message}`);
  }
}

checkBuildArtifacts();
checkAdminBuildBase();
checkProductionEnv();
checkNginx();
checkDockerCompose();
checkBackupScripts();
checkMigrations();

console.log("\nRelease Preflight\n");
for (const message of warnings) console.log(`WARN ${message}`);
for (const message of errors) console.log(`ERR  ${message}`);

if (!warnings.length && !errors.length) console.log("OK   release preflight passed");
if (errors.length) process.exitCode = 1;
