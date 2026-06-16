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
const router = read("apps/admin/src/router.ts");
const layout = read("apps/admin/src/views/Layout.vue");
const opsRoutine = read("apps/admin/src/views/OpsRoutine.vue");
const configCheck = read("apps/admin/src/views/ConfigCheck.vue");
const finance = read("apps/admin/src/views/Finance.vue");
const operationSettings = read("apps/admin/src/views/OperationSettings.vue");
const systemSettings = read("apps/admin/src/views/SystemSettings.vue");
const adminLoginLogs = read("apps/admin/src/views/AdminLoginLogs.vue");
const h5CodeLogs = read("apps/admin/src/views/H5CodeLogs.vue");
const operationLogs = read("apps/admin/src/views/OperationLogs.vue");
const admins = read("apps/admin/src/views/Admins.vue");
const permissions = read("apps/admin/src/permissions.ts");
const runbook = read("docs/production-runbook.md");
const launchChecklist = read("docs/launch-checklist.md");
const localAcceptance = read("docs/local-acceptance-test-plan.md");
const progress = read("docs/project-progress.md");

checkSourceIncludes(packageJson.scripts?.["test:preflight-guards"] || "", "node scripts/preflight-ops-routine-guard.mjs", "package preflight guards script");

checkSourceIncludesAll(runbook, [
  "## 8. 日常巡检",
  "每日：",
  "检查 `/api/health/ready`",
  "检查容器状态和重启次数",
  "检查昨日备份是否成功",
  "检查全站报名开关是否处于预期状态",
  "支付对账差异",
  "服务商账单待处理记录",
  "待审核退款",
  "异常验证码发送量",
  "每周：",
  "检查后台登录失败和限流记录",
  "检查操作日志中高风险动作",
  "抽查管理员角色",
  "代理结算打款凭证",
  "每月：",
  "做一次备份恢复演练",
  "检查短信、邮件、微信通知服务商余额和模板状态",
  "检查默认管理员是否已禁用或更换"
], "production runbook routine checks");

checkSourceIncludesAll(router, [
  'path: "finance"',
  'path: "admin-login-logs"',
  'path: "h5-code-logs"',
  'path: "operation-logs"',
  'path: "admins"',
  'path: "config-check"',
  'path: "system-settings"',
  'path: "ops-routine"'
], "admin routine check routes");

checkSourceIncludesAll(layout, [
  "财务对账",
  "上线体检",
  "运营巡检",
  "/ops-routine",
  "管理员",
  "操作日志",
  "登录日志",
  "验证码日志",
  "系统与安全",
  "票务与财务"
], "admin routine check menu");

checkSourceIncludesAll(opsRoutine, [
  "运营巡检",
  "每日巡检",
  "每周巡检",
  "每月巡检",
  "财务对账",
  "登录日志",
  "验证码日志",
  "操作日志",
  "管理员",
  "上线体检",
  "报名通道",
  "代理结算",
  "代理收款",
  "备份恢复演练",
  "通知服务余额",
  "/finance",
  "/admin-login-logs",
  "/h5-code-logs",
  "/operation-logs",
  "/admins",
  "/config-check",
  "/system-settings",
  "/agent-settlements",
  "/agents",
  "localStorage"
], "admin ops routine workbench");

checkSourceIncludesAll(configCheck, [
  "上线体检",
  "配置已通过上线体检",
  "UPLOAD_DIR",
  "TRUST_PROXY"
], "config check operations entry");

checkSourceIncludesAll(finance, [
  "待处理对账",
  "待处理账单",
  "待审退款",
  "失败回调",
  "扫描对账",
  "扫描退款回执",
  "拉取账单",
  "导入账单",
  "支付回调日志",
  "退款审核"
], "finance routine dashboard");

checkSourceIncludesAll(operationSettings + systemSettings, [
  "报名通道",
  "registrationEnabled",
  "registrationDisabledMessage"
], "registration channel routine check");

checkSourceIncludesAll(adminLoginLogs, [
  "登录失败",
  "触发限流",
  "/admin/auth/login-logs",
  "clientIp",
  "userAgent"
], "admin login log routine check");

checkSourceIncludesAll(h5CodeLogs, [
  "H5 验证码日志",
  "发送失败",
  "触发限流",
  "/admin/auth/h5-code-logs",
  "providerMessageId"
], "H5 code log routine check");

checkSourceIncludesAll(operationLogs, [
  "操作日志",
  "确认收款",
  "通过退款",
  "签到核销",
  "候补补位",
  "运营设置"
], "operation log routine check");

checkSourceIncludesAll(admins, [
  "管理员",
  "roleOptions",
  "禁用"
], "admin account routine check");
checkSourceIncludesAll(permissions, [
  'SuperAdmin = "super_admin"',
  'Operator = "operator"',
  'Finance = "finance"',
  'CheckInStaff = "checkin_staff"',
  "roleOptions"
], "admin role routine check");

checkSourceIncludesAll(launchChecklist, [
  "后台“登录日志”页面可以看到登录成功、登录失败和触发限流记录",
  "h5_auth_code_logs",
  "支付对账差异",
  "待处理支付对账差异",
  "操作日志页可查看确认收款",
  "每月至少做一次恢复演练"
], "launch checklist routine coverage");

checkSourceIncludesAll(localAcceptance, [
  "全站报名开关可以保存",
  "后台连续登录失败",
  "npm run db:backup",
  "npm run smoke"
], "local acceptance routine rehearsal");

checkSourceIncludesAll(progress, [
  "运营巡检静态 guard",
  "后台运营巡检台"
], "project progress routine guard entry");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight ops routine guard covers daily, weekly, and monthly operations checks, admin entries, finance queues, logs, and registration switch.");
}
