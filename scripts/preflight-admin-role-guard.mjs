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
const apiAdminRoles = read("apps/api/src/modules/admin/admin-roles.ts");
const apiRolesGuard = read("apps/api/src/modules/admin/roles.guard.ts");
const apiAdminController = read("apps/api/src/modules/admin/admin.controller.ts");
const apiAdminRoleSpec = read("apps/api/src/modules/admin/admin-roles.spec.ts");
const adminPermissions = read("apps/admin/src/permissions.ts");
const adminRouter = read("apps/admin/src/router.ts");
const adminLayout = read("apps/admin/src/views/Layout.vue");
const adminActivitiesView = read("apps/admin/src/views/Activities.vue");
const adminRegistrationsView = read("apps/admin/src/views/Registrations.vue");
const adminApi = read("apps/admin/src/api.ts");
const smoke = read("scripts/smoke.mjs");
const launchChecklist = read("docs/launch-checklist.md");
const localAcceptance = read("docs/local-acceptance-test-plan.md");
const runbook = read("docs/production-runbook.md");
const progress = read("docs/project-progress.md");

checkSourceIncludes(packageJson.scripts?.["test:preflight-guards"] || "", "node scripts/preflight-admin-role-guard.mjs", "package preflight guards script");

checkSourceIncludesAll(apiAdminRoles, [
  'SuperAdmin = "super_admin"',
  'Operator = "operator"',
  'Finance = "finance"',
  'CheckInStaff = "checkin_staff"',
  'ROLE_METADATA_KEY = "admin_roles"',
  'role === "admin" ? AdminRole.SuperAdmin',
  "applyDecorators(SetMetadata",
  "UseGuards(JwtAuthGuard, RolesGuard)"
], "API admin roles");

checkSourceIncludesAll(apiRolesGuard, [
  "getAllAndOverride<AdminRole[]>",
  "ROLE_METADATA_KEY",
  "normalizeAdminRole(request.user?.role)",
  "roles.includes(role as AdminRole)",
  "ForbiddenException"
], "API roles guard");

checkSourceIncludesAll(apiAdminController, [
  "const SUPER_ADMIN = [AdminRole.SuperAdmin]",
  "const OVERVIEW_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance]",
  "const OPERATION_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator]",
  "const FINANCE_ROLES = [AdminRole.SuperAdmin, AdminRole.Finance]",
  "const CHECK_IN_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.CheckInStaff]",
  "const ACTIVITY_VIEW_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance, AdminRole.CheckInStaff]",
  "const REGISTRATION_VIEW_ROLES = [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance, AdminRole.CheckInStaff]",
  '@Get("system/config-check")',
  '@Get("agents")',
  '@Post("agents")',
  '@Get("registrations")',
  "@AdminRoles(...REGISTRATION_VIEW_ROLES)",
  '@Get("finance/dashboard")',
  '@Post("finance/reconciliation/scan")',
  '@Post("orders/:id/confirm-offline-payment")',
  '@Post("check-ins")',
  '@Post("registrations/:id/approve")',
  '@Post("settings/operation")'
], "API admin controller");

checkSourceIncludesAll(apiAdminRoleSpec, [
  "admin role permissions",
  "treats legacy admin role as super admin",
  "blocks operator from finance endpoints",
  "blocks finance from system settings",
  "allows check-in staff only for check-in scope",
  "allows homepage builder only for operation roles",
  "allows finance to read merchant overview without operation permissions",
  "allows finance and check-in staff to read registrations but not operate them"
], "API admin role spec");

checkSourceIncludesAll(adminPermissions, [
  'SuperAdmin = "super_admin"',
  'Operator = "operator"',
  'Finance = "finance"',
  'CheckInStaff = "checkin_staff"',
  'role === "admin" ? AdminRole.SuperAdmin',
  "roles.includes(currentRole() as AdminRole)",
  "superAdmin: [AdminRole.SuperAdmin]",
  'overview: ["dashboard.view"]',
  'operation: ["homepage.manage"]',
  'finance: ["finance.view", "finance.manage"]',
  'checkIn: ["checkin.manage"]',
  'activityView: ["activity.view", "activity.manage"]',
  'registrationView: ["registration.view", "registration.manage"]'
], "admin permissions");

checkSourceIncludesAll(adminRouter, [
  "roles: permissions.overview",
  "roles: permissions.operation",
  "roles: permissions.finance",
  "roles: permissions.checkIn",
  "roles: permissions.registrationView",
  "roles: permissions.superAdmin",
  'path: "activities", component: Activities, meta: { roles: permissions.activityView',
  'path: "registrations", component: Registrations, meta: { roles: permissions.registrationView',
  'if (canAccess(permissions.overview)) return "/dashboard"',
  'if (canAccess(permissions.checkIn)) return "/check-in"',
  "to.meta.roles && !canAccess"
], "admin router");

checkSourceIncludesAll(adminLayout, [
  "item.roles",
  "canAccess(item.roles)",
  "menuItemLabel",
  'role === AdminRole.Finance && item.index === "/dashboard"',
  'role === AdminRole.CheckInStaff && item.index === "/activities"',
  'role === AdminRole.CheckInStaff && item.index === "/registrations"',
  "permissions.overview",
  "permissions.operation",
  "permissions.finance",
  "permissions.checkIn",
  "permissions.activityView",
  "permissions.registrationView",
  "permissions.superAdmin",
  'index: "/registrations"',
  'index: "/finance"',
  'index: "/check-in"',
  'index: "/config-check"',
  'index: "/admins"'
], "admin layout");

checkSourceIncludes(adminApi, 'error.response?.status === 403 ? "当前账号无权限，请联系超级管理员"', "admin API");

checkSourceIncludesAll(smoke, [
  "OK admin role permissions",
  "createRoleAdmin",
  'createRoleAdmin("operator")',
  'createRoleAdmin("finance")',
  'createRoleAdmin("checkin_staff")',
  'createRoleAdmin("super_admin")',
  '"/admin/finance/dashboard"',
  '"/admin/settings/operation"',
  '"/admin/registrations/1/approve"',
  '"/admin/registrations"',
  '"/admin/registrations/export"',
  "Finance should read registrations in readonly mode",
  "Check-in staff should read activities",
  "Check-in staff should read registrations in readonly mode",
  '"当前账号无权限"',
  "roleSuperAuth",
  '"/admin/system/config-check"'
], "smoke script");

checkSourceIncludesAll(adminActivitiesView, [
  "canOperateActivities",
  'canAccess(["activity.manage"])',
  "当前账号只能只读查看活动列表",
  'v-if="canOperateActivities"',
  "if (!canOperateActivities.value)",
  'api.get<any, any[]>("/admin/categories")'
], "admin activities readonly view");

checkSourceIncludesAll(adminRegistrationsView, [
  "canOperateRegistrations",
  "canViewRegistrationOrders",
  'canAccess(["registration.manage"])',
  'canAccess(["order.view", "finance.view", "finance.manage"])',
  "只读模式",
  "关联订单",
  'v-if="canViewRegistrationOrders"',
  'v-if="canOperateRegistrations"',
  "orderStatusText"
], "admin registrations readonly view");

checkSourceIncludesAll(launchChecklist, [
  "## 4.1 后台角色权限",
  "`super_admin`",
  "`operator`",
  "`finance`",
  "`checkin_staff`",
  "左侧菜单",
  "后端 403",
  "历史 `admin` 角色"
], "launch checklist");

checkSourceIncludesAll(localAcceptance, [
  "权限验收",
  "operator_test",
  "finance_test",
  "当前账号无权限，请联系超级管理员"
], "local acceptance test plan");

checkSourceIncludes(runbook, "抽查管理员角色", "production runbook");
checkSourceIncludes(progress, "管理员角色权限静态 guard", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight admin role guard covers RBAC roles, menus, routes, backend guards, and smoke checks.");
}
