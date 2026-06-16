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

function checkExportService(source, methodName, label) {
  const start = source.indexOf(`async ${methodName}`);
  check(start >= 0, `${label} must define ${methodName}.`);
  if (start < 0) return;
  const nextMethod = source.indexOf("\n  async ", start + 1);
  const tail = source.slice(start, nextMethod > start ? nextMethod : undefined);
  checkSourceIncludes(tail, "new ExcelJS.Workbook()", label);
  checkSourceIncludes(tail, "workbook.xlsx.writeBuffer()", label);
}

const packageJson = JSON.parse(read("package.json"));
const adminController = read("apps/api/src/modules/admin/admin.controller.ts");
const adminService = read("apps/api/src/modules/admin/admin.service.ts");
const v1AdminController = read("apps/api/src/modules/v1/v1-admin.controller.ts");
const v1Service = read("apps/api/src/modules/v1/v1.service.ts");
const adminApi = read("apps/admin/src/api.ts");
const registrationsView = read("apps/admin/src/views/Registrations.vue");
const ordersView = read("apps/admin/src/views/Orders.vue");
const financeView = read("apps/admin/src/views/Finance.vue");
const agentSettlementsView = read("apps/admin/src/views/AgentSettlements.vue");
const recapsView = read("apps/admin/src/views/Recaps.vue");
const smoke = read("scripts/smoke.mjs");
const tenantSmoke = read("scripts/tenant-smoke.mjs");
const launchChecklist = read("docs/launch-checklist.md");
const localAcceptance = read("docs/local-acceptance-test-plan.md");
const runbook = read("docs/production-runbook.md");
const multiTenantPlan = read("docs/multi-tenant-isolation-plan.md");
const progress = read("docs/project-progress.md");

checkSourceIncludes(packageJson.scripts?.["test:preflight-guards"] || "", "node scripts/preflight-export-guard.mjs", "package preflight guards script");

checkSourceIncludesAll(adminController, [
  '@Get("registrations/export")',
  "this.service.exportRegistrations(query, admin)",
  "filename=registrations.xlsx",
  '@Get("orders/export")',
  "this.service.exportOrders(query, admin)",
  "filename=orders.xlsx",
  '@Get("finance/export")',
  "this.service.exportFinance(query, admin)",
  "filename=finance.xlsx",
  '@Get("agent-settlements/export")',
  "this.service.exportAgentSettlements(query, admin)",
  "filename=agent-settlements.xlsx",
  "Content-Type",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "Content-Disposition"
], "admin export controller");

checkExportService(adminService, "exportRegistrations", "registration export service");
checkExportService(adminService, "exportOrders", "orders export service");
checkExportService(adminService, "exportFinance", "finance export service");
checkExportService(adminService, "exportAgentSettlements", "agent settlements export service");

checkSourceIncludesAll(v1AdminController, [
  '@Get("activities/:id/recap/export")',
  "this.service.exportActivityRecap",
  "Content-Type",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "Content-Disposition",
  "activity-recap-${id}.xlsx"
], "activity recap export controller");
checkSourceIncludesAll(v1Service, [
  "exportActivityRecap",
  "new ExcelJS.Workbook()",
  "workbook.xlsx.writeBuffer()"
], "activity recap export service");

checkSourceIncludesAll(adminApi, [
  "downloadExport(params",
  "/api/admin/registrations/export",
  "downloadFile(path",
  "URL.createObjectURL"
], "admin download helpers");

checkSourceIncludesAll(registrationsView, ["downloadExport", "exportRows", "导出 Excel"], "registrations export view");
checkSourceIncludesAll(ordersView, ["downloadFile", "/admin/orders/export", "exportOrders", "导出 Excel"], "orders export view");
checkSourceIncludesAll(financeView, ["downloadFile", "/admin/finance/export", "exportFinance", "导出 Excel"], "finance export view");
checkSourceIncludesAll(agentSettlementsView, ["downloadFile", "/admin/agent-settlements/export", "exportRows", "导出 Excel"], "agent settlements export view");
checkSourceIncludesAll(recapsView, ["downloadFile", "/recap/export", "exportRecap", "导出 Excel"], "recap export view");

checkSourceIncludesAll(smoke, [
  "/admin/registrations/export",
  "/admin/orders/export",
  "/admin/finance/export",
  "/recap/export",
  "OK registration, orders and finance exports"
], "main smoke export coverage");

checkSourceIncludesAll(tenantSmoke, [
  "ExcelJS",
  "downloadWorkbookText",
  "/admin/registrations/export",
  "/admin/agent-settlements/export"
], "tenant smoke export coverage");

checkSourceIncludesAll(launchChecklist, [
  "Excel 导出报名记录",
  "Excel 导出订单记录",
  "Excel 导出财务对账",
  "后台活动复盘可导出 Excel"
], "launch checklist");
checkSourceIncludesAll(localAcceptance, [
  "## 10. 导出验收",
  "报名管理导出 Excel",
  "订单管理导出 Excel",
  "财务导出 Excel",
  "活动复盘导出 Excel"
], "local acceptance test plan");
checkSourceIncludes(runbook, "导出", "production runbook");
checkSourceIncludesAll(multiTenantPlan, [
  "报名导出",
  "代理结算导出",
  "exportBoundary",
  "settlementBoundary"
], "multi tenant isolation plan");
checkSourceIncludes(progress, "preflight-export-guard", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight export guard covers Excel exports, admin UI actions, smoke checks, and docs.");
}
