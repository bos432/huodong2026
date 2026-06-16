import fs from "node:fs";

const authKeys = ["H5_AUTH_MODE", "H5_AUTH_SECRET"];
const h5RateLimitKeys = [
  "H5_CODE_EXPIRE_MINUTES",
  "H5_CODE_COOLDOWN_SECONDS",
  "H5_CODE_PHONE_HOURLY_LIMIT",
  "H5_CODE_PHONE_DAILY_LIMIT",
  "H5_CODE_IP_HOURLY_LIMIT"
];
const adminRateLimitKeys = ["ADMIN_LOGIN_WINDOW_MINUTES", "ADMIN_LOGIN_MAX_FAILURES", "ADMIN_LOGIN_LOCK_MINUTES"];
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
const launchChecklist = read("docs/launch-checklist.md");
const progress = read("docs/project-progress.md");

for (const key of [...authKeys, ...h5RateLimitKeys, ...adminRateLimitKeys]) {
  checkSourceIncludes(preflight, key, "preflight");
  checkSourceIncludes(doctor, key, "doctor");
  checkSourceIncludes(runtimeValidation, key, "runtime config validation");
  checkSourceIncludes(productionExample, key, "production env example");
  checkSourceIncludes(compose, key, "docker compose");
}

checkSourceIncludes(preflight, "must use H5_AUTH_MODE=sms", "preflight");
checkSourceIncludes(preflight, 'numberInRange(env, "H5_CODE_EXPIRE_MINUTES", 1, 30, "minutes")', "preflight");
checkSourceIncludes(preflight, 'numberInRange(env, "H5_CODE_COOLDOWN_SECONDS", 10, 600, "seconds")', "preflight");
checkSourceIncludes(preflight, 'numberInRange(env, "H5_CODE_PHONE_HOURLY_LIMIT", 1, 200, "times")', "preflight");
checkSourceIncludes(preflight, 'numberInRange(env, "H5_CODE_PHONE_DAILY_LIMIT", 1, 1000, "times")', "preflight");
checkSourceIncludes(preflight, 'numberInRange(env, "H5_CODE_IP_HOURLY_LIMIT", 1, 5000, "times")', "preflight");
checkSourceIncludes(preflight, 'numberInRange(env, "ADMIN_LOGIN_WINDOW_MINUTES", 1, 1440, "minutes")', "preflight");
checkSourceIncludes(preflight, 'numberInRange(env, "ADMIN_LOGIN_MAX_FAILURES", 1, 100, "times")', "preflight");
checkSourceIncludes(preflight, 'numberInRange(env, "ADMIN_LOGIN_LOCK_MINUTES", 1, 1440, "minutes")', "preflight");

checkSourceIncludes(doctor, "h5AuthModeCheck", "doctor");
checkSourceIncludes(doctor, "H5 SMS login", "doctor");
checkSourceIncludes(doctor, "SMS provider settings are maintained in the admin console", "doctor");
checkSourceIncludes(doctor, 'numberCheck("H5_CODE_EXPIRE_MINUTES"', "doctor");
checkSourceIncludes(doctor, 'numberCheck("ADMIN_LOGIN_MAX_FAILURES"', "doctor");

checkSourceIncludes(runtimeValidation, "addH5AuthCheck", "runtime config validation");
checkSourceIncludes(runtimeValidation, "addH5CodeRateLimitChecks", "runtime config validation");
checkSourceIncludes(runtimeValidation, "addAdminLoginRateLimitChecks", "runtime config validation");
checkSourceIncludes(runtimeValidation, "生产环境不能继续使用开发登录模式", "runtime config validation");
checkSourceIncludes(runtimeValidation, "短信服务商参数在后台系统设置中维护", "runtime config validation");
checkSourceIncludes(runtimeValidation, "后台登录失败上限", "runtime config validation");

checkSourceIncludes(launchChecklist, "H5_AUTH_MODE=sms", "launch checklist");
checkSourceIncludes(launchChecklist, "H5 验证码冷却", "launch checklist");
checkSourceIncludes(launchChecklist, "后台登录失败统计窗口", "launch checklist");
checkSourceIncludes(launchChecklist, "h5_auth_code_logs", "launch checklist");
checkSourceIncludes(progress, "短信模板凭证挡板", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight auth rate limit guard covers H5 auth and admin login throttling checks.");
}
