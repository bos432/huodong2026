import fs from "node:fs";

const originKeys = ["CORS_ORIGIN", "PUBLIC_H5_ORIGIN", "PUBLIC_ADMIN_ORIGIN", "PUBLIC_API_ORIGIN"];
const blockedOriginFragments = ["localhost", "127\\.0\\.0\\.1", "0\\.0\\.0\\.0", "example\\.com"];
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

function checkSourceIncludesAll(source, needles, label) {
  for (const needle of needles) checkSourceIncludes(source, needle, label);
}

const preflight = read("scripts/preflight.mjs");
const doctor = read("scripts/doctor.mjs");
const runtimeValidation = read("apps/api/src/shared/config-validation.ts");
const runtimeValidationSpec = read("apps/api/src/shared/config-validation.spec.ts");
const adminSystemSettings = read("apps/admin/src/views/SystemSettings.vue");
const productionExample = read("deploy/.env.production.example");
const launchChecklist = read("docs/launch-checklist.md");
const runbook = read("docs/production-runbook.md");
const progress = read("docs/project-progress.md");

for (const key of originKeys) {
  checkSourceIncludes(preflight, key, "preflight");
  checkSourceIncludes(doctor, key, "doctor");
  checkSourceIncludes(runtimeValidation, key, "runtime config validation");
  checkSourceIncludes(productionExample, key, "production env example");
  checkSourceIncludes(runbook, key, "production runbook");
}

checkSourceIncludes(preflight, "must replace ${key} with a real production domain", "preflight");
checkSourceIncludes(preflight, "!/localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|example\\.com/.test(value)", "preflight");

checkSourceIncludes(doctor, "originCheck", "doctor");
checkSourceIncludes(doctor, "!value || /localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|example\\.com/.test(value)", "doctor");
checkSourceIncludes(doctor, "startsWith(\"https://\")", "doctor");

checkSourceIncludes(runtimeValidation, "addOriginCheck", "runtime config validation");
checkSourceIncludes(runtimeValidation, "localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|example\\.com", "runtime config validation");
checkSourceIncludes(runtimeValidation, "不能继续使用 localhost 或 example.com", "runtime config validation");

checkSourceIncludesAll(runtimeValidationSpec, ["marks example domains as errors in production", "marks real https domains ok in production"], "runtime config validation spec");

checkSourceIncludesAll(adminSystemSettings, [
  "domainReadiness",
  "buildDomainReadiness",
  "PUBLIC_H5_ORIGIN",
  "PUBLIC_ADMIN_ORIGIN",
  "PUBLIC_API_ORIGIN",
  "必须使用 HTTPS",
  "仍是示例或本地域名",
  "需替换",
  "真实 HTTPS",
  "可用于生产 CORS、公开入口和回调地址"
], "admin system settings domain readiness");

checkSourceIncludesAll(productionExample, ["https://h5.example.com", "https://admin.example.com", "https://api.example.com"], "production env example");
checkSourceIncludes(launchChecklist, "真实 H5 和后台域名", "launch checklist");
checkSourceIncludes(launchChecklist, "PUBLIC_API_ORIGIN", "launch checklist");
checkSourceIncludes(runbook, "真实 HTTPS 域名", "production runbook");
checkSourceIncludes(runbook, "真实 API 入口", "production runbook");
checkSourceIncludes(runbook, "npm run doctor", "production runbook");
checkSourceIncludes(runbook, "npm run preflight", "production runbook");
checkSourceIncludes(progress, "示例域名挡板闭环", "project progress");
checkSourceIncludes(progress, "域名配置就绪度", "project progress");

for (const fragment of blockedOriginFragments) {
  checkSourceIncludes(preflight, fragment, "preflight");
  checkSourceIncludes(doctor, fragment, "doctor");
  checkSourceIncludes(runtimeValidation, fragment, "runtime config validation");
  checkSourceIncludes(runbook, fragment.replace(/\\/g, ""), "production runbook");
}

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight origin guard covers production domain blockers.");
}
