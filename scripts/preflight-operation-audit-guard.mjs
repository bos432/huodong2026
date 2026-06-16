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
const operationLogEntity = read("apps/api/src/entities/admin-operation-log.entity.ts");
const adminController = read("apps/api/src/modules/admin/admin.controller.ts");
const adminService = read("apps/api/src/modules/admin/admin.service.ts");
const operationLogsView = read("apps/admin/src/views/OperationLogs.vue");
const layoutView = read("apps/admin/src/views/Layout.vue");
const smoke = read("scripts/smoke.mjs");
const smokeFlow = read("scripts/smoke-flow.mjs");
const launchChecklist = read("docs/launch-checklist.md");
const runbook = read("docs/production-runbook.md");
const localAcceptance = read("docs/local-acceptance-test-plan.md");
const progress = read("docs/project-progress.md");

checkSourceIncludes(packageJson.scripts?.["test:preflight-guards"] || "", "node scripts/preflight-operation-audit-guard.mjs", "package preflight guards script");

checkSourceIncludesAll(operationLogEntity, [
  '@Entity("admin_operation_logs")',
  "adminId",
  "adminUsername",
  "tenantId",
  "action",
  "targetType",
  "targetId",
  "summary",
  "detail",
  "createdAt"
], "admin operation log entity");

checkSourceIncludesAll(adminController, [
  '@Get("operation-logs")',
  'operationLogs(@Query("tenantId") tenantId?: string',
  "return this.service.listOperationLogs(admin, tenantId ? Number(tenantId) : undefined)",
  '@Post("orders/:id/confirm-offline-payment")',
  '@Post("orders/:id/refund")',
  '@Post("refunds/:id/approve")',
  '@Post("refunds/:id/reject")',
  '@Post("check-ins")',
  '@Post("waitlists/:id/promote")',
  '@Post("waitlists/:id/cancel")',
  '@Post("settings/operation")'
], "admin controller");

checkSourceIncludesAll(adminService, [
  "listOperationLogs(admin?: AdminContext, tenantId?: number)",
  'this.operationLogs.createQueryBuilder("log")',
  'builder.andWhere("log.tenantId = :tenantId"',
  "take: 300",
  "private logOperation",
  "this.operationLogs.save",
  "adminId: admin?.id",
  "adminUsername: admin?.username || null",
  "tenantId: admin?.tenantId",
  "targetId: targetId === null || targetId === undefined ? null : String(targetId)",
  '"order.confirm_offline_payment"',
  '"refund.request"',
  '"refund.approve"',
  '"refund.reject"',
  '"refund.provider_scan"',
  '"check_in.verify"',
  '"waitlist.promote"',
  '"waitlist.cancel"',
  '"settings.operation.update"',
  "`wallet.${dto.type}`",
  '"activity.create"'
], "admin service");

checkSourceIncludesAll(adminService, [
  "更新商家：",
  "更新商家权限：",
  "提交活动审核：",
  "审核通过活动：",
  "驳回活动：",
  "确认线下收款：",
  "更新订单备注：",
  "服务商退款失败：",
  "拒绝退款申请：",
  "打款成功："
], "admin service readable operation summaries");

check(!adminService.includes("\uFFFD"), "admin service operation summaries must not contain replacement characters.");
check(!adminService.includes("?${"), "admin service operation summaries must not contain broken template separators.");
check(!adminService.includes("?{"), "admin service operation summaries must not contain broken template braces.");

checkSourceIncludesAll(operationLogsView, [
  '"/admin/operation-logs"',
  '"order.confirm_offline_payment"',
  '"refund.request"',
  '"refund.approve"',
  '"refund.reject"',
  '"check_in.verify"',
  '"waitlist.promote"',
  '"waitlist.cancel"',
  '"wallet.recharge"',
  '"wallet.deduct"',
  '"wallet.adjust"',
  '"settings.operation.update"',
  "adminUsername",
  "targetType",
  "targetId",
  "detailText"
], "operation logs view");

checkSourceIncludesAll(layoutView, [
  'index: "/operation-logs"',
  "permissions.superAdmin"
], "admin layout");

checkSourceIncludesAll(smoke, [
  'api("/admin/operation-logs"',
  '"activity.create"',
  '"refund.request"',
  '"refund.approve"',
  '"settings.operation.update"',
  "Activity creation should be audited",
  "Refund request should be audited",
  "Refund approval should be audited",
  "Operation setting update should be audited"
], "smoke script");

checkSourceIncludesAll(smokeFlow, [
  "assertOperationLog",
  'api("/admin/operation-logs"',
  '"check_in.verify"',
  '"wallet.recharge"',
  '"waitlist.promote"',
  '"waitlist.cancel"',
  "Check-in operation should be audited",
  "Wallet recharge should be audited",
  "Waitlist promotion should be audited",
  "Waitlist cancellation should be audited"
], "smoke flow script");

checkSourceIncludesAll(launchChecklist, [
  "操作日志页可查看确认收款、退款申请、退款审核、签到核销、候补补位和运营设置修改记录",
  "上线前用管理员账号执行一次确认收款、退款申请、退款审核和签到核销",
  "确认操作日志均能记录操作者和对象"
], "launch checklist");

checkSourceIncludesAll(runbook, [
  "后台操作日志",
  "检查操作日志中高风险动作"
], "production runbook");

checkSourceIncludes(localAcceptance, "权限验收", "local acceptance test plan");
checkSourceIncludes(progress, "操作审计静态 guard", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight operation audit guard covers high-risk admin operation logs and smoke checks.");
}
