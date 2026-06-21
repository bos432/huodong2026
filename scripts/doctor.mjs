import { execFile } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const unsafeValues = new Set(["", "change-me-in-production", "change-me-long-random-secret", "dev-secret-change-me", "activitypass", "rootpass"]);
const unsafePaymentSecrets = new Set(["", "change-me-payment-sandbox-secret", "change-me-wechat-sandbox-secret", "change-me-alipay-sandbox-secret"]);

function readEnv(file) {
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

async function commandVersion(command, args = ["--version"]) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { timeout: 8000, windowsHide: true, shell: process.platform === "win32" });
    return { ok: true, value: (stdout || stderr).trim().split(/\r?\n/)[0] };
  } catch (error) {
    if (process.platform === "win32" && !command.endsWith(".cmd") && !command.endsWith(".exe")) {
      return commandVersion(`${command}.cmd`, args);
    }
    const lowerMessage = error.message.toLowerCase();
    const message = error.code === "ENOENT" || lowerMessage.includes("not recognized") || lowerMessage.includes("command not found") ? "not found" : error.message.split(/\r?\n/)[0];
    return { ok: false, value: message };
  }
}

function checkPort(host, port, timeout = 1200) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (ok) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

function configChecks(env) {
  const nodeEnv = env.NODE_ENV || "development";
  const production = nodeEnv === "production";
  const rows = [];
  rows.push(["NODE_ENV", { ok: true, level: "OK", value: nodeEnv }]);
  rows.push(["APP_VERSION", { ok: Boolean(env.APP_VERSION || "0.1.0"), level: "OK", value: env.APP_VERSION || "0.1.0" }]);
  rows.push(releaseValueCheck("BUILD_COMMIT", env.BUILD_COMMIT || "", production, "replace with the deployed git commit or image revision"));
  rows.push(releaseTimeCheck(env.BUILD_TIME || "", production));
  rows.push(secretCheck("JWT_SECRET", env.JWT_SECRET || "", 32, production, "replace with a strong random value"));
  rows.push(secretCheck("DB_PASSWORD", env.DB_PASSWORD || "", 12, production, "replace default database password"));
  rows.push(dbSynchronizeCheck(env.DB_SYNCHRONIZE ?? (production ? "false" : "true"), production));
  rows.push(originCheck("CORS_ORIGIN", env.CORS_ORIGIN || "", production));
  rows.push(originCheck("PUBLIC_H5_ORIGIN", env.PUBLIC_H5_ORIGIN || "", production));
  rows.push(originCheck("PUBLIC_ADMIN_ORIGIN", env.PUBLIC_ADMIN_ORIGIN || "", production));
  rows.push(originCheck("PUBLIC_API_ORIGIN", env.PUBLIC_API_ORIGIN || "", production));
  rows.push(["UPLOAD_DIR", { ok: Boolean(env.UPLOAD_DIR || "uploads"), level: "OK", value: env.UPLOAD_DIR || "uploads" }]);
  rows.push(booleanCheck("SECURITY_HEADERS_ENABLED", env.SECURITY_HEADERS_ENABLED ?? "true", true, production));
  rows.push(booleanCheck("SECURITY_HSTS_ENABLED", env.SECURITY_HSTS_ENABLED ?? (production ? "true" : "false"), true, production));
  rows.push(booleanCheck("VALIDATION_FORBID_NON_WHITELISTED", env.VALIDATION_FORBID_NON_WHITELISTED ?? (production ? "true" : "false"), true, production));
  rows.push(booleanCheck("ACCESS_LOG_ENABLED", env.ACCESS_LOG_ENABLED ?? "true", true, production));
  rows.push(booleanCheck("ACCESS_LOG_SKIP_HEALTH", env.ACCESS_LOG_SKIP_HEALTH ?? "true", true, false));
  rows.push(trustProxyCheck(env.TRUST_PROXY ?? (production ? "true" : "false"), production));
  rows.push(h5AuthModeCheck(env.H5_AUTH_MODE || "dev", production));
  rows.push(secretCheck("H5_AUTH_SECRET", env.H5_AUTH_SECRET || "", 32, production, "replace with a strong H5 verification signing secret"));
  rows.push(numberCheck("H5_CODE_EXPIRE_MINUTES", Number(env.H5_CODE_EXPIRE_MINUTES || 10), 1, 30, "minutes"));
  rows.push(numberCheck("H5_CODE_COOLDOWN_SECONDS", Number(env.H5_CODE_COOLDOWN_SECONDS ?? 60), 0, 600, "seconds"));
  rows.push(numberCheck("H5_CODE_PHONE_HOURLY_LIMIT", Number(env.H5_CODE_PHONE_HOURLY_LIMIT || 6), 1, 200, "times"));
  rows.push(numberCheck("H5_CODE_PHONE_DAILY_LIMIT", Number(env.H5_CODE_PHONE_DAILY_LIMIT || 20), 1, 1000, "times"));
  rows.push(numberCheck("H5_CODE_IP_HOURLY_LIMIT", Number(env.H5_CODE_IP_HOURLY_LIMIT || 60), 1, 5000, "times"));
  rows.push(numberCheck("ADMIN_LOGIN_WINDOW_MINUTES", Number(env.ADMIN_LOGIN_WINDOW_MINUTES || 10), 1, 1440, "minutes"));
  rows.push(numberCheck("ADMIN_LOGIN_MAX_FAILURES", Number(env.ADMIN_LOGIN_MAX_FAILURES || 5), 1, 100, "times"));
  rows.push(numberCheck("ADMIN_LOGIN_LOCK_MINUTES", Number(env.ADMIN_LOGIN_LOCK_MINUTES || 10), 1, 1440, "minutes"));
  if ((env.H5_AUTH_MODE || "dev") !== "dev") {
    rows.push(["H5 SMS login", { ok: true, level: "WARN", value: "SMS provider settings are maintained in the admin console; verify before production traffic" }]);
  }
  rows.push(paymentSandboxCheck(env.PAYMENT_SANDBOX_ENABLED ?? (production ? "false" : "true"), production));
  if (env.PAYMENT_SANDBOX_ENABLED === "true" || (!production && env.PAYMENT_SANDBOX_ENABLED !== "false")) {
    rows.push(paymentSecretCheck("PAYMENT_SANDBOX_SECRET", env.PAYMENT_SANDBOX_SECRET || "", production));
    rows.push(paymentSecretCheck("WECHAT_PAY_SANDBOX_SECRET", env.WECHAT_PAY_SANDBOX_SECRET || "", production));
    rows.push(paymentSecretCheck("ALIPAY_PAY_SANDBOX_SECRET", env.ALIPAY_PAY_SANDBOX_SECRET || "", production));
  }
  rows.push(...realPaymentRolloutChecks(env, production));
  rows.push(...multiTenantRolloutChecks(env, production));
  rows.push(...mallMultiMerchantRolloutChecks(env, production));
  rows.push(providerCheck("SMS provider", env.SMS_PROVIDER_ENABLED, env, ["SMS_ACCESS_KEY_ID", "SMS_ACCESS_KEY_SECRET", "SMS_SIGN_NAME", "SMS_TEMPLATE_ID"], false));
  rows.push(providerCheck("Email provider", env.EMAIL_PROVIDER_ENABLED, env, ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"], production));
  rows.push(providerCheck("WeChat message provider", env.WECHAT_MESSAGE_PROVIDER_ENABLED, env, ["WECHAT_APP_ID", "WECHAT_APP_SECRET"], production));
  rows.push(notificationForceFailCheck(env.NOTIFICATION_FORCE_FAIL ?? "false", production));
  if (env.NOTIFICATION_SCHEDULE_WORKER_ENABLED === "true") rows.push(numberCheck("NOTIFICATION_SCHEDULE_WORKER_INTERVAL_SECONDS", Number(env.NOTIFICATION_SCHEDULE_WORKER_INTERVAL_SECONDS || 60), 30, 3600, "seconds"));
  else rows.push(["NOTIFICATION_SCHEDULE_WORKER_ENABLED", { ok: true, level: "WARN", value: "disabled; scheduled notifications will not auto-send" }]);
  rows.push(numberCheck("OFFLINE_PAYMENT_EXPIRE_MINUTES", Number(env.OFFLINE_PAYMENT_EXPIRE_MINUTES || 1440), 5, 43200, "minutes"));
  if (env.ORDER_CLOSE_WORKER_ENABLED === "true") rows.push(numberCheck("ORDER_CLOSE_WORKER_INTERVAL_SECONDS", Number(env.ORDER_CLOSE_WORKER_INTERVAL_SECONDS || 300), 30, 3600, "seconds"));
  else rows.push(["ORDER_CLOSE_WORKER_ENABLED", { ok: true, level: "WARN", value: "disabled; pending orders will not auto-close" }]);
  rows.push(backupDirCheck(env.BACKUP_DIR || "", production));
  rows.push(numberCheck("BACKUP_RETENTION_DAYS", Number(env.BACKUP_RETENTION_DAYS || 0), 7, 3650, "days"));
  rows.push(["BACKUP_USE_DOCKER", { ok: true, level: "OK", value: env.BACKUP_USE_DOCKER || "false" }]);
  rows.push(["MYSQL_CONTAINER", { ok: true, level: env.BACKUP_USE_DOCKER === "true" && !env.MYSQL_CONTAINER ? "WARN" : "OK", value: env.MYSQL_CONTAINER || "default activity-mysql" }]);
  return rows;
}

function secretCheck(name, value, minLength, production, advice) {
  const weak = unsafeValues.has(value) || value.startsWith("change-me") || value.length < minLength;
  return [name, { ok: !production || !weak, level: weak ? (production ? "ERR" : "WARN") : "OK", value: weak ? advice : `configured, length ${value.length}` }];
}

function releaseValueCheck(name, value, production, advice) {
  const placeholder = !value || value === "local" || value === "unknown" || value.startsWith("change-me") || value.startsWith("replace-with");
  return [name, { ok: !production || !placeholder, level: placeholder ? (production ? "ERR" : "WARN") : "OK", value: placeholder ? advice : value }];
}

function releaseTimeCheck(value, production) {
  const placeholder = !value || value === "local" || value === "unknown" || value.startsWith("change-me") || value.startsWith("replace-with");
  const valid = Number.isFinite(Date.parse(value));
  return ["BUILD_TIME", { ok: !production || (!placeholder && valid), level: placeholder || !valid ? (production ? "ERR" : "WARN") : "OK", value: placeholder ? "replace with the release build timestamp" : valid ? value : "invalid timestamp" }];
}

function originCheck(name, value, production) {
  const bad = !value || /localhost|127\.0\.0\.1|0\.0\.0\.0|example\.com/.test(value) || value.split(",").some((item) => item.trim() && !item.trim().startsWith("https://"));
  return [name, { ok: !production || !bad, level: bad ? (production ? "ERR" : "WARN") : "OK", value: value || "missing" }];
}

function dbSynchronizeCheck(value, production) {
  const enabled = String(value).toLowerCase() === "true";
  return ["DB_SYNCHRONIZE", { ok: !production || !enabled, level: enabled ? (production ? "ERR" : "WARN") : "OK", value: enabled ? "enabled; local development only" : "disabled" }];
}

function paymentSecretCheck(name, value, production) {
  const weak = unsafePaymentSecrets.has(value) || value.startsWith("change-me");
  return [name, { ok: !production || !weak, level: weak ? (production ? "ERR" : "WARN") : "OK", value: weak ? "replace default sandbox secret" : `configured, length ${value.length}` }];
}

function paymentSandboxCheck(value, production) {
  const enabled = String(value).toLowerCase() === "true";
  return ["PAYMENT_SANDBOX_ENABLED", { ok: !production || !enabled, level: enabled ? (production ? "ERR" : "WARN") : "OK", value: enabled ? "enabled; local/staging only" : "disabled" }];
}

function rolloutFlagCheck(name, value, production, preflightPassed, advice) {
  const enabled = String(value).toLowerCase() === "true";
  if (!enabled) return [name, { ok: true, level: "OK", value: "disabled" }];
  const ok = preflightPassed || name.endsWith("_PREFLIGHT_PASSED");
  return [name, { ok: !production || ok, level: ok ? "OK" : production ? "ERR" : "WARN", value: ok ? "enabled; preflight evidence declared" : advice }];
}

function resultFileCheck(name, value, defaultPath) {
  return [name, { ok: true, level: "OK", value: value || defaultPath }];
}

function maxAgeCheck(name, value) {
  const hours = Number(value || 168);
  const ok = Number.isFinite(hours) && hours > 0;
  return [name, { ok, level: ok ? "OK" : "WARN", value: ok ? `${hours} hours` : "expected a positive hour value" }];
}

function realPaymentRolloutChecks(env, production) {
  const preflightPassed = env.REAL_PAYMENT_PREFLIGHT_PASSED === "true";
  const advice = "requires REAL_PAYMENT_PREFLIGHT_PASSED=true and fresh real payment smoke evidence";
  return [
    rolloutFlagCheck("REAL_PAYMENT_ENABLED", env.REAL_PAYMENT_ENABLED, production, preflightPassed, advice),
    rolloutFlagCheck("REAL_PAYMENT_SDK_IMPLEMENTED", env.REAL_PAYMENT_SDK_IMPLEMENTED, production, preflightPassed, advice),
    rolloutFlagCheck("REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED", env.REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED, production, preflightPassed, advice),
    rolloutFlagCheck("REAL_REFUND_QUERY_IMPLEMENTED", env.REAL_REFUND_QUERY_IMPLEMENTED, production, preflightPassed, advice),
    rolloutFlagCheck("REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED", env.REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED, production, preflightPassed, advice),
    rolloutFlagCheck("AGENT_REAL_TRANSFER_IMPLEMENTED", env.AGENT_REAL_TRANSFER_IMPLEMENTED, production, preflightPassed, advice),
    rolloutFlagCheck("MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED", env.MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED, production, preflightPassed, advice),
    rolloutFlagCheck("MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED", env.MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED, production, preflightPassed, advice),
    rolloutFlagCheck("REAL_PAYMENT_PREFLIGHT_PASSED", env.REAL_PAYMENT_PREFLIGHT_PASSED, production, preflightPassed, "real payment preflight not declared"),
    resultFileCheck("REAL_PAYMENT_PREFLIGHT_RESULT_FILE", env.REAL_PAYMENT_PREFLIGHT_RESULT_FILE, "deploy/real-payment-smoke-result.json"),
    maxAgeCheck("REAL_PAYMENT_PREFLIGHT_MAX_AGE_HOURS", env.REAL_PAYMENT_PREFLIGHT_MAX_AGE_HOURS)
  ];
}

function multiTenantRolloutChecks(env, production) {
  const preflightPassed = env.MULTI_TENANT_PREFLIGHT_PASSED === "true";
  const advice = "requires MULTI_TENANT_PREFLIGHT_PASSED=true and fresh tenant smoke evidence";
  return [
    rolloutFlagCheck("MULTI_TENANT_ENABLED", env.MULTI_TENANT_ENABLED, production, preflightPassed, advice),
    rolloutFlagCheck("MULTI_TENANT_SCHEMA_IMPLEMENTED", env.MULTI_TENANT_SCHEMA_IMPLEMENTED, production, preflightPassed, advice),
    rolloutFlagCheck("MULTI_TENANT_ACCESS_FILTER_IMPLEMENTED", env.MULTI_TENANT_ACCESS_FILTER_IMPLEMENTED, production, preflightPassed, advice),
    rolloutFlagCheck("MULTI_TENANT_PUBLIC_BOUNDARY_IMPLEMENTED", env.MULTI_TENANT_PUBLIC_BOUNDARY_IMPLEMENTED, production, preflightPassed, advice),
    rolloutFlagCheck("MULTI_TENANT_PREFLIGHT_PASSED", env.MULTI_TENANT_PREFLIGHT_PASSED, production, preflightPassed, "multi-tenant preflight not declared"),
    resultFileCheck("MULTI_TENANT_PREFLIGHT_RESULT_FILE", env.MULTI_TENANT_PREFLIGHT_RESULT_FILE, "deploy/tenant-smoke-result.json"),
    maxAgeCheck("MULTI_TENANT_PREFLIGHT_MAX_AGE_HOURS", env.MULTI_TENANT_PREFLIGHT_MAX_AGE_HOURS)
  ];
}

function mallMultiMerchantRolloutChecks(env, production) {
  const preflightPassed = env.MALL_MULTI_MERCHANT_PREFLIGHT_PASSED === "true";
  const advice = "requires MALL_MULTI_MERCHANT_PREFLIGHT_PASSED=true and fresh smoke:mall-multi-merchant evidence";
  return [
    rolloutFlagCheck("MALL_MULTI_MERCHANT_ENABLED", env.MALL_MULTI_MERCHANT_ENABLED, production, preflightPassed, advice),
    rolloutFlagCheck("MALL_MULTI_MERCHANT_PREFLIGHT_PASSED", env.MALL_MULTI_MERCHANT_PREFLIGHT_PASSED, production, preflightPassed, "multi-merchant mall preflight not declared"),
    resultFileCheck("MALL_MULTI_MERCHANT_SMOKE_RESULT_FILE", env.MALL_MULTI_MERCHANT_SMOKE_RESULT_FILE, "deploy/mall-multi-merchant-smoke-result.json"),
    maxAgeCheck("MALL_MULTI_MERCHANT_SMOKE_MAX_AGE_HOURS", env.MALL_MULTI_MERCHANT_SMOKE_MAX_AGE_HOURS)
  ];
}

function notificationForceFailCheck(value, production) {
  const enabled = String(value).toLowerCase() === "true";
  return ["NOTIFICATION_FORCE_FAIL", { ok: !production || !enabled, level: enabled ? (production ? "ERR" : "WARN") : "OK", value: enabled ? "enabled; production must disable forced failures" : "disabled" }];
}

function booleanCheck(name, value, expected, production) {
  const normalized = String(value).toLowerCase();
  const ok = normalized === String(expected);
  return [name, { ok: !production || ok, level: ok ? "OK" : production ? "ERR" : "WARN", value: normalized }];
}

function trustProxyCheck(value, production) {
  const normalized = String(value).toLowerCase();
  const ok = normalized !== "false" && normalized !== "";
  return ["TRUST_PROXY", { ok: !production || ok, level: ok ? "OK" : production ? "ERR" : "WARN", value: normalized }];
}

function h5AuthModeCheck(value, production) {
  const valid = ["dev", "sms"].includes(value);
  if (!valid) return ["H5_AUTH_MODE", { ok: false, level: "ERR", value: "expected dev or sms" }];
  const devInProduction = production && value === "dev";
  return ["H5_AUTH_MODE", { ok: !devInProduction, level: devInProduction ? "ERR" : value === "dev" ? "WARN" : "OK", value: devInProduction ? "production must use sms" : value }];
}

function providerCheck(name, enabledValue, env, keys, production) {
  if (enabledValue !== "true") return [name, { ok: true, level: "WARN", value: "disabled" }];
  const missing = keys.filter((key) => !env[key]);
  return [name, { ok: !production || missing.length === 0, level: missing.length ? (production ? "ERR" : "WARN") : "OK", value: missing.length ? `missing ${missing.join(", ")}` : "enabled" }];
}

function numberCheck(name, value, min, max, unit) {
  const ok = Number.isFinite(value) && value >= min && value <= max;
  return [name, { ok, level: ok ? "OK" : "WARN", value: ok ? `${value} ${unit}` : `expected ${min}-${max} ${unit}` }];
}

function backupDirCheck(value, production) {
  const configured = Boolean(value);
  return ["BACKUP_DIR", { ok: !production || configured, level: configured ? "OK" : production ? "ERR" : "WARN", value: configured ? value : "missing" }];
}

async function main() {
  const envFile = path.join(root, "apps", "api", ".env");
  const productionEnvFile = path.join(root, "deploy", ".env.production");
  const productionExampleFile = path.join(root, "deploy", ".env.production.example");
  const localEnv = readEnv(envFile);
  const productionEnv = fs.existsSync(productionEnvFile) ? { ...readEnv(productionExampleFile), ...readEnv(productionEnvFile) } : { ...readEnv(productionExampleFile), NODE_ENV: "production" };
  const dbHost = localEnv.DB_HOST || "127.0.0.1";
  const dbPort = Number(localEnv.DB_PORT || 3306);
  const apiPort = Number(localEnv.API_PORT || 3000);
  const checks = [];

  checks.push(["Node", await commandVersion("node")]);
  checks.push(["npm", await commandVersion("npm")]);
  checks.push(["Docker", await commandVersion("docker")]);
  checks.push(["Docker Compose", await commandVersion("docker", ["compose", "version"])]);
  checks.push([`MySQL ${dbHost}:${dbPort}`, { ok: await checkPort(dbHost, dbPort), value: envFile }]);
  checks.push([`API port ${apiPort}`, { ok: await checkPort("127.0.0.1", apiPort), value: "http://localhost:" + apiPort + "/api/health" }]);
  checks.push(["API readiness", await httpCheck("http://localhost:" + apiPort + "/api/health/ready")]);
  checks.push(["H5 port 5173", { ok: await checkPort("127.0.0.1", 5173), value: "http://localhost:5173/" }]);
  checks.push(["Admin port 5174", { ok: await checkPort("127.0.0.1", 5174), value: "http://localhost:5174/login" }]);

  console.log("\nActivity Registration Doctor\n");
  for (const [name, result] of checks) {
    const mark = result.ok ? "OK " : "WARN";
    console.log(`${mark.padEnd(5)} ${name.padEnd(24)} ${result.value}`);
  }

  console.log("\nProduction Configuration Readiness\n");
  if (!fs.existsSync(productionEnvFile)) {
    console.log("WARN  deploy/.env.production             missing; copy deploy/.env.production.example and replace every change-me value before release.");
  }
  const readiness = configChecks(productionEnv);
  for (const [name, result] of readiness) {
    console.log(`${result.level.padEnd(5)} ${name.padEnd(34)} ${result.value}`);
  }

  const failed = checks.filter(([, result]) => !result.ok).map(([name]) => name);
  const configErrors = readiness.filter(([, result]) => result.level === "ERR").map(([name]) => name);
  if (failed.length) {
    console.log("\nSome checks need attention:");
    for (const name of failed) console.log(`- ${name}`);
    console.log("\nCommon fixes:");
    console.log("- Docker path: docker compose up -d mysql");
    console.log("- Local path: make sure apps/api/.env DB_PORT matches the running MySQL port.");
    console.log("- Start dev servers: npm run dev:api, npm run dev:mobile:h5, npm run dev:admin.");
  }
  if (configErrors.length) {
    console.log("\nProduction config errors:");
    for (const name of configErrors) console.log(`- ${name}`);
    process.exitCode = 1;
  }
}

async function httpCheck(url) {
  try {
    const res = await fetch(url);
    return { ok: res.ok, value: `${res.status} ${url}` };
  } catch (error) {
    return { ok: false, value: `${url} ${error.message}` };
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
