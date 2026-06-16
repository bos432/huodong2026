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

const packageJson = JSON.parse(read("package.json"));
const main = read("apps/api/src/main.ts");
const exceptionFilter = read("apps/api/src/shared/api-exception.filter.ts");
const responseInterceptor = read("apps/api/src/shared/api-response.interceptor.ts");
const healthController = read("apps/api/src/modules/health/health.controller.ts");
const smoke = read("scripts/smoke.mjs");
const smokeFlow = read("scripts/smoke-flow.mjs");
const tenantSmoke = read("scripts/tenant-smoke.mjs");
const doctor = read("scripts/doctor.mjs");
const launchChecklist = read("docs/launch-checklist.md");
const runbook = read("docs/production-runbook.md");
const progress = read("docs/project-progress.md");

checkSourceIncludes(packageJson.scripts?.["test:preflight-guards"] || "", "node scripts/preflight-monitoring-guard.mjs", "package preflight guards script");

checkSourceIncludesAll(main, [
  "randomUUID",
  'req.headers["x-request-id"]',
  "req.requestId = requestId",
  'res.setHeader("X-Request-Id", requestId)',
  'config.get("ACCESS_LOG_ENABLED", "true") === "true"',
  'config.get("ACCESS_LOG_SKIP_HEALTH", "true") === "true"',
  'req.path?.startsWith("/api/health")',
  'type: "access"',
  "requestId: req.requestId",
  "statusCode: res.statusCode",
  "durationMs: Date.now() - start",
  "ip: req.ip",
  'userAgent: req.headers["user-agent"] || null'
], "API bootstrap monitoring middleware");

checkSourceIncludesAll(exceptionFilter, [
  "requestId?: string",
  "request?.requestId",
  "timestamp: new Date().toISOString()",
  "status >= 500",
  "request?.originalUrl || request?.url"
], "API exception filter request trace");

checkSourceIncludesAll(responseInterceptor, [
  "requestId",
  "context.switchToHttp().getRequest",
  'message: "ok"'
], "API response interceptor request trace");

checkSourceIncludesAll(healthController, [
  '@Get("live")',
  '@Get("ready")',
  '@Get("metrics")',
  "activity_api_up",
  "activity_database_up",
  "activity_config_error",
  "activity_process_uptime_seconds",
  "activity_build_info"
], "health and metrics controller");

checkSourceIncludesAll(smoke, [
  'api("/health")',
  'api("/health/ready")',
  "/health/metrics",
  "activity_api_up 1",
  "activity_database_up 1",
  "activity_build_info",
  "X-Request-Id should be echoed"
], "smoke monitoring assertions");
checkSourceIncludes(smokeFlow, 'api("/health")', "smoke flow health assertion");
checkSourceIncludes(tenantSmoke, 'api("/health")', "tenant smoke health assertion");

checkSourceIncludesAll(doctor, [
  "API readiness",
  "/api/health/ready",
  "API port",
  "H5 port 5173",
  "Admin port 5174"
], "doctor runtime checks");

checkSourceIncludesAll(launchChecklist, [
  "监控 API `/api/health/live`",
  "监控 API `/api/health/ready`",
  "采集 API `/api/health/metrics`",
  "监控 Docker 容器状态和重启次数",
  "保留 Nginx 访问日志",
  "保留 API 错误日志"
], "launch checklist monitoring section");

checkSourceIncludesAll(runbook, [
  "## 3. 健康检查",
  "## 4. 请求排障",
  "X-Request-Id",
  "API JSON 访问日志",
  "requestId",
  "检查容器状态和重启次数",
  "检查昨日备份是否成功"
], "production runbook monitoring and troubleshooting");

checkSourceIncludes(progress, "监控与日志", "project progress monitoring entry");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight monitoring guard covers request tracing, access logs, health metrics, doctor checks, smoke assertions, and operations docs.");
}
