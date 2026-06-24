import fs from "node:fs";

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

const healthController = read("apps/api/src/modules/health/health.controller.ts");
const appModule = read("apps/api/src/modules/app.module.ts");
const smoke = read("scripts/smoke.mjs");
const smokeFlow = read("scripts/smoke-flow.mjs");
const tenantSmoke = read("scripts/tenant-smoke.mjs");
const doctor = read("scripts/doctor.mjs");
const waitApiReady = read("scripts/wait-api-ready.mjs");
const packageJson = read("package.json");
const compose = read("docker-compose.yml");
const launchChecklist = read("docs/launch-checklist.md");
const runbook = read("docs/production-runbook.md");
const deployDocs = read("docs/线上部署结构与发布说明.md");
const progress = read("docs/project-progress.md");

checkSourceIncludes(healthController, '@Controller("health")', "health controller");
checkSourceIncludesAll(healthController, ['@Get()', '@Get("live")', '@Get("ready")', '@Get("metrics")'], "health controller");
checkSourceIncludes(healthController, "ServiceUnavailableException", "health controller");
checkSourceIncludes(healthController, "inspectRuntimeConfig", "health controller");
checkSourceIncludes(healthController, "release: this.releaseInfo()", "health controller");
checkSourceIncludes(healthController, "buildTime", "health controller");
checkSourceIncludes(healthController, "uptimeSeconds", "health controller");
checkSourceIncludes(healthController, "databaseStatus", "health controller");
checkSourceIncludes(healthController, 'Content-Type", "text/plain; version=0.0.4; charset=utf-8"', "health controller");
checkSourceIncludes(healthController, "metricLabel", "health controller");
checkSourceIncludes(healthController, 'replace(/\\\\/g, "\\\\\\\\")', "health controller");
checkSourceIncludes(healthController, 'replace(/"/g, \'\\\\"\')', "health controller");
checkSourceIncludes(healthController, 'replace(/\\n/g, "\\\\n")', "health controller");

for (const metric of [
  "activity_api_up",
  "activity_database_up",
  "activity_config_error",
  "activity_process_uptime_seconds",
  "activity_build_info"
]) {
  checkSourceIncludes(healthController, metric, "health controller");
  checkSourceIncludes(smoke, metric, "smoke script");
  checkSourceIncludes(runbook, metric, "production runbook");
}

checkSourceIncludes(appModule, "HealthModule", "app module");
checkSourceIncludes(doctor, "/api/health", "doctor");
checkSourceIncludes(doctor, "/api/health/ready", "doctor");
checkSourceIncludes(compose, "http://127.0.0.1:3000/api/health/ready", "docker compose");
checkSourceIncludes(packageJson, "wait:api-ready", "package scripts");
checkSourceIncludes(waitApiReady, "API_READY_URL", "wait api ready script");
checkSourceIncludes(waitApiReady, "API_READY_TIMEOUT_MS", "wait api ready script");
checkSourceIncludes(waitApiReady, "/health/ready", "wait api ready script");
checkSourceIncludes(waitApiReady, "ready=true", "wait api ready script");

checkSourceIncludes(smoke, 'api("/health")', "smoke script");
checkSourceIncludes(smoke, 'api("/health/ready")', "smoke script");
checkSourceIncludes(smoke, "/health/metrics", "smoke script");
checkSourceIncludes(smoke, "release?.version", "smoke script");
checkSourceIncludes(smoke, "release?.commit", "smoke script");
checkSourceIncludes(smoke, "x-content-type-options", "smoke script");
checkSourceIncludes(smoke, "x-frame-options", "smoke script");
checkSourceIncludes(smoke, "x-request-id", "smoke script");
checkSourceIncludes(smokeFlow, 'api("/health")', "smoke flow script");
checkSourceIncludes(tenantSmoke, 'api("/health")', "tenant smoke script");

checkSourceIncludes(launchChecklist, "/api/health", "launch checklist");
checkSourceIncludes(launchChecklist, "/api/health/live", "launch checklist");
checkSourceIncludes(launchChecklist, "/api/health/ready", "launch checklist");
checkSourceIncludes(launchChecklist, "/api/health/metrics", "launch checklist");
checkSourceIncludes(launchChecklist, "release.version", "launch checklist");
checkSourceIncludes(launchChecklist, "release.commit", "launch checklist");
checkSourceIncludes(launchChecklist, "activity_build_info", "launch checklist");

checkSourceIncludes(runbook, "/api/health/live", "production runbook");
checkSourceIncludes(runbook, "/api/health/ready", "production runbook");
checkSourceIncludes(runbook, "/api/health/metrics", "production runbook");
checkSourceIncludes(runbook, "ready: true", "production runbook");
checkSourceIncludes(deployDocs, "npm run wait:api-ready", "online deploy docs");
checkSourceIncludes(deployDocs, "API_READY_URL", "online deploy docs");
checkSourceIncludes(progress, "健康检查静态 guard", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight health guard covers health, readiness, metrics, release, and smoke checks.");
}
