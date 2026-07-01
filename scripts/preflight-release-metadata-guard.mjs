import fs from "node:fs";

const releaseKeys = ["APP_VERSION", "BUILD_COMMIT", "BUILD_TIME"];
const placeholderValues = ["local", "unknown", "change-me", "replace-with"];
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
const initProductionEnv = read("scripts/init-production-env.mjs");
const launchChecklist = read("docs/launch-checklist.md");
const runbook = read("docs/production-runbook.md");
const progress = read("docs/project-progress.md");

for (const key of releaseKeys) {
  checkSourceIncludes(preflight, key, "preflight");
  checkSourceIncludes(doctor, key, "doctor");
  checkSourceIncludes(runtimeValidation, key, "runtime config validation");
  checkSourceIncludes(productionExample, key, "production env example");
  checkSourceIncludes(launchChecklist, key, "launch checklist");
  checkSourceIncludes(runbook, key, "production runbook");
}

checkSourceIncludes(preflight, "isPlaceholderValue", "preflight");
checkSourceIncludes(runtimeValidation, "isPlaceholderValue", "runtime config validation");
checkSourceIncludes(runtimeValidation, "addReleaseChecks", "runtime config validation");
checkSourceIncludes(doctor, "releaseValueCheck", "doctor");
checkSourceIncludes(doctor, "releaseTimeCheck", "doctor");

checkSourceIncludesAll(preflight, placeholderValues, "preflight");
checkSourceIncludesAll(doctor, placeholderValues, "doctor");
checkSourceIncludesAll(runtimeValidation, placeholderValues, "runtime config validation");
checkSourceIncludesAll(runtimeValidationSpec, ["placeholder release metadata", "release metadata ok"], "runtime config validation spec");

checkSourceIncludes(preflight, "Date.parse", "preflight");
checkSourceIncludes(doctor, "Date.parse", "doctor");
checkSourceIncludes(runtimeValidation, "Date.parse", "runtime config validation");
checkSourceIncludes(runtimeValidationSpec, "2026-06-10T01:00:00.000Z", "runtime config validation spec");

checkSourceIncludes(productionExample, "BUILD_COMMIT=change-me-git-commit", "production env example");
checkSourceIncludes(productionExample, "BUILD_TIME=change-me-build-time", "production env example");
checkSourceIncludes(initProductionEnv, "BUILD_COMMIT=replace-with-release-commit-or-image-digest", "production env init script");
checkSourceIncludes(initProductionEnv, "new Date().toISOString()", "production env init script");

checkSourceIncludesAll(adminSystemSettings, [
  "releaseReadiness",
  "buildReleaseReadiness",
  "buildCommit",
  'envLine("BUILD_COMMIT", deployment.buildCommit)',
  "发布提交",
  "BUILD_COMMIT",
  "staticVersionSummary",
  "copyStaticVersionSummary",
  "复制版本信息",
  "小程序体验版验收",
  "copyMiniprogramAcceptanceTemplate",
  "仍是占位值",
  "生成配置时自动写入",
  "可用于上线体检、健康检查和回滚定位"
], "admin system settings release readiness");

checkSourceIncludes(launchChecklist, "release.version", "launch checklist");
checkSourceIncludes(launchChecklist, "release.commit", "launch checklist");
checkSourceIncludes(runbook, "发布记录", "production runbook");
checkSourceIncludes(runbook, "release.version", "production runbook");
checkSourceIncludes(runbook, "release.commit", "production runbook");
checkSourceIncludes(runbook, "回滚版本", "production runbook");
checkSourceIncludes(progress, "发布标识挡板闭环", "project progress");
checkSourceIncludes(progress, "发布标识就绪度", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight release metadata guard covers release keys and placeholder blockers.");
}
