import fs from "node:fs";

const securityKeys = [
  "SECURITY_HEADERS_ENABLED",
  "SECURITY_HSTS_ENABLED",
  "VALIDATION_FORBID_NON_WHITELISTED",
  "ACCESS_LOG_ENABLED",
  "ACCESS_LOG_SKIP_HEALTH",
  "TRUST_PROXY"
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
const compose = read("docker-compose.yml");
const systemSettings = read("apps/admin/src/views/SystemSettings.vue");
const launchChecklist = read("docs/launch-checklist.md");
const progress = read("docs/project-progress.md");

for (const key of securityKeys) {
  checkSourceIncludes(doctor, key, "doctor");
  checkSourceIncludes(runtimeValidation, key, "runtime config validation");
  checkSourceIncludes(productionExample, key, "production env example");
  checkSourceIncludes(compose, key, "docker compose");
}

for (const key of securityKeys.filter((key) => key !== "ACCESS_LOG_SKIP_HEALTH")) {
  checkSourceIncludes(preflight, key, "preflight");
}

checkSourceIncludes(preflight, "must enable SECURITY_HEADERS_ENABLED", "preflight");
checkSourceIncludes(preflight, "must enable SECURITY_HSTS_ENABLED", "preflight");
checkSourceIncludes(preflight, "must enable VALIDATION_FORBID_NON_WHITELISTED", "preflight");
checkSourceIncludes(preflight, "must enable ACCESS_LOG_ENABLED", "preflight");
checkSourceIncludes(preflight, "must enable TRUST_PROXY when deploying behind Nginx", "preflight");

checkSourceIncludes(doctor, "booleanCheck(\"SECURITY_HEADERS_ENABLED\"", "doctor");
checkSourceIncludes(doctor, "booleanCheck(\"SECURITY_HSTS_ENABLED\"", "doctor");
checkSourceIncludes(doctor, "booleanCheck(\"VALIDATION_FORBID_NON_WHITELISTED\"", "doctor");
checkSourceIncludes(doctor, "booleanCheck(\"ACCESS_LOG_ENABLED\"", "doctor");
checkSourceIncludes(doctor, "trustProxyCheck", "doctor");

checkSourceIncludes(runtimeValidation, "addSecurityRuntimeChecks", "runtime config validation");
checkSourceIncludes(runtimeValidation, "API 安全响应头", "runtime config validation");
checkSourceIncludes(runtimeValidation, "生产 HSTS", "runtime config validation");
checkSourceIncludes(runtimeValidation, "拒绝多余请求字段", "runtime config validation");
checkSourceIncludes(runtimeValidation, "结构化访问日志", "runtime config validation");
checkSourceIncludes(runtimeValidation, "反向代理真实 IP", "runtime config validation");

checkSourceIncludes(systemSettings, "securityReadiness", "admin deployment settings");
checkSourceIncludes(systemSettings, "buildSecretReadiness", "admin deployment settings");
checkSourceIncludes(systemSettings, "buildBooleanReadiness", "admin deployment settings");
checkSourceIncludes(systemSettings, "securityType", "admin deployment settings");
checkSourceIncludes(systemSettings, "securityHeadersEnabled", "admin deployment settings");
checkSourceIncludes(systemSettings, "securityHstsEnabled", "admin deployment settings");
checkSourceIncludes(systemSettings, "validationForbidNonWhitelisted", "admin deployment settings");
checkSourceIncludes(systemSettings, "accessLogEnabled", "admin deployment settings");
checkSourceIncludes(systemSettings, "accessLogSkipHealth", "admin deployment settings");
checkSourceIncludes(systemSettings, "trustProxy", "admin deployment settings");
checkSourceIncludes(systemSettings, "envLine(\"SECURITY_HEADERS_ENABLED\", boolValue(deployment.securityHeadersEnabled))", "admin deployment settings");
checkSourceIncludes(systemSettings, "envLine(\"TRUST_PROXY\", boolValue(deployment.trustProxy))", "admin deployment settings");
checkSourceIncludes(systemSettings, "数据库与安全密钥", "admin deployment settings");
checkSourceIncludes(systemSettings, "安全响应头", "admin deployment settings");
checkSourceIncludes(systemSettings, "HSTS", "admin deployment settings");
checkSourceIncludes(systemSettings, "字段白名单", "admin deployment settings");
checkSourceIncludes(systemSettings, "访问日志", "admin deployment settings");
checkSourceIncludes(systemSettings, "可信代理", "admin deployment settings");

checkSourceIncludes(launchChecklist, "SECURITY_HEADERS_ENABLED=true", "launch checklist");
checkSourceIncludes(launchChecklist, "SECURITY_HSTS_ENABLED=true", "launch checklist");
checkSourceIncludes(launchChecklist, "VALIDATION_FORBID_NON_WHITELISTED=true", "launch checklist");
checkSourceIncludes(launchChecklist, "ACCESS_LOG_ENABLED=true", "launch checklist");
checkSourceIncludes(launchChecklist, "TRUST_PROXY", "launch checklist");
checkSourceIncludes(progress, "上线准备", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight security guard covers production security and logging checks.");
}
