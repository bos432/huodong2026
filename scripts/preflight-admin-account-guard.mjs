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
const disableSmokeAdmins = read("scripts/disable-smoke-admins.mjs");
const adminService = read("apps/api/src/modules/admin/admin.service.ts");
const adminController = read("apps/api/src/modules/admin/admin.controller.ts");
const adminDto = read("apps/api/src/modules/admin/dto.ts");
const adminLoginLogEntity = read("apps/api/src/entities/admin-login-log.entity.ts");
const adminLoginLogMigration = read("apps/api/src/migrations/1780524000000-AdminLoginLogTenant.ts");
const adminListView = read("apps/admin/src/views/Admins.vue");
const adminLoginLogsView = read("apps/admin/src/views/AdminLoginLogs.vue");
const layoutView = read("apps/admin/src/views/Layout.vue");
const router = read("apps/admin/src/router.ts");
const smoke = read("scripts/smoke.mjs");
const launchChecklist = read("docs/launch-checklist.md");
const localAcceptance = read("docs/local-acceptance-test-plan.md");
const runbook = read("docs/production-runbook.md");
const progress = read("docs/project-progress.md");

check(packageJson.scripts?.["admins:disable-smoke"] === "node scripts/disable-smoke-admins.mjs", "package.json must expose admins:disable-smoke.");

checkSourceIncludesAll(disableSmokeAdmins, [
  'process.env.ADMIN_USERNAME || "admin"',
  'process.env.ADMIN_PASSWORD || "Admin123456"',
  "/admin/auth/login",
  "includeSmoke=true",
  "keyword=smoke_",
  "admin.username.startsWith(\"smoke_\")",
  "/admins/${admin.id}/status",
  "Disabled ${disabled} smoke admin account(s)."
], "disable smoke admins script");

checkSourceIncludesAll(adminService, [
  "ensureDefaultAdmin",
  'username: "admin"',
  'bcrypt.hash("Admin123456"',
  'query.includeSmoke !== "true"',
  String.raw`smoke\\_%`,
  "hasDefaultAdminEnabled",
  "changeOwnPassword",
  "validateAdminPassword",
  "recordAdminLogin",
  "tenantId: admin.tenant?.id",
  "listAdminLoginLogs(query: { username?: string; status?: string; tenantId?: number }",
  'builder.andWhere("log.tenantId = :tenantId"',
  "rate_limited",
  "admin.password.change",
  "admin.password.reset",
  "admin.enable",
  "admin.disable"
], "admin service");

checkSourceIncludesAll(adminController, [
  '@Post("auth/change-password")',
  '@Get("auth/login-logs")',
  '@Query("tenantId") tenantId?: string',
  '@Get("admins")',
  '@Post("admins/:id/password")',
  '@Post("admins/:id/status")'
], "admin controller");

checkSourceIncludesAll(adminLoginLogEntity, [
  "tenantId",
  '@Column({ type: "int", nullable: true })'
], "admin login log entity");

checkSourceIncludesAll(adminLoginLogMigration, [
  "ALTER TABLE admin_login_logs ADD tenantId int NULL",
  "UPDATE admin_login_logs log LEFT JOIN admin_users admin",
  "IDX_admin_login_logs_tenant"
], "admin login log tenant migration");

checkSourceIncludesAll(adminDto, [
  "includeSmoke",
  "ChangeOwnPasswordDto",
  "UpdateAdminPasswordDto",
  "UpdateAdminStatusDto"
], "admin DTO");

checkSourceIncludesAll(adminListView, [
  "hasDefaultAdminEnabled",
  "默认 admin 账号仍处于启用状态",
  "显示烟测账号",
  "row.username.startsWith('smoke_')",
  "/admin/admins",
  "/admins/${row.id}/password",
  "/admins/${row.id}/status",
  "密码至少需要 10 位",
  "密码需要包含大小写字母和数字"
], "admin list view");

checkSourceIncludesAll(layoutView, [
  "修改密码",
  "/admin/auth/change-password",
  "保存并重新登录",
  "current-password",
  "new-password"
], "admin layout view");

checkSourceIncludesAll(adminLoginLogsView, [
  "/admin/auth/login-logs",
  "tenantDisplayName",
  'placeholder="全部商家"',
  'label="所属商家"',
  "登录成功",
  "登录失败",
  "触发限流",
  "invalid_username",
  "invalid_password",
  "too_many_failures"
], "admin login logs view");
checkSourceIncludes(router, "admin-login-logs", "admin router");

checkSourceIncludesAll(smoke, [
  "OK admin account security",
  "/admin/admins",
  "/admins/${smokeAdmin.id}/password",
  "/admins/${smokeAdmin.id}/status",
  "/admin/auth/change-password",
  "/admin/auth/login-logs",
  "Admin login failure should be audited",
  "Self password change should be audited"
], "smoke script");

checkSourceIncludes(launchChecklist, "admin / Admin123456", "launch checklist");
checkSourceIncludes(launchChecklist, "禁用默认 `admin` 账号", "launch checklist");
checkSourceIncludes(launchChecklist, "后台“登录日志”", "launch checklist");
checkSourceIncludes(launchChecklist, "super_admin", "launch checklist");
checkSourceIncludes(localAcceptance, "默认 `admin / Admin123456` 已改强密码或禁用", "local acceptance test plan");
checkSourceIncludes(runbook, "后台登录问题查看后台登录日志", "production runbook");
checkSourceIncludes(progress, "管理员账号静态 guard", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight admin account guard covers default admin, smoke admins, password changes, and login logs.");
}
