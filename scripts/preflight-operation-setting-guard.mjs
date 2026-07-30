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
const operationSettingEntity = read("apps/api/src/entities/operation-setting.entity.ts");
const adminDto = read("apps/api/src/modules/admin/dto.ts");
const adminController = read("apps/api/src/modules/admin/admin.controller.ts");
const adminService = read("apps/api/src/modules/admin/admin.service.ts");
const publicController = read("apps/api/src/modules/public/public.controller.ts");
const publicService = read("apps/api/src/modules/public/public.service.ts");
const adminRouter = read("apps/admin/src/router.ts");
const systemSettings = read("apps/admin/src/views/SystemSettings.vue");
const mobileTheme = read("apps/mobile/src/theme.ts");
const mobileActivityDetail = read("apps/mobile/src/pages/activity/detail.vue");
const mobileRegister = read("apps/mobile/src/pages/activity/register.vue");
const mobileRegistration = read("apps/mobile/src/pages/user/registration.vue");
const mobileService = read("apps/mobile/src/pages/service/index.vue");
const mobilePages = JSON.parse(read("apps/mobile/src/pages.json"));
const mobilePagePaths = new Set([
  ...mobilePages.pages.map((page) => page.path),
  ...(mobilePages.subPackages || []).flatMap((subpackage) => subpackage.pages.map((page) => `${subpackage.root}/${page.path}`))
]);
const smoke = read("scripts/smoke.mjs");
const tenantSmoke = read("scripts/tenant-smoke.mjs");
const launchChecklist = read("docs/launch-checklist.md");
const runbook = read("docs/production-runbook.md");
const localAcceptance = read("docs/local-acceptance-test-plan.md");
const progress = read("docs/project-progress.md");
const publicOperationSettingMethod = publicService.slice(
  publicService.indexOf("private publicOperationSetting"),
  publicService.indexOf("async availableActivityCoupons")
);

checkSourceIncludes(packageJson.scripts?.["test:preflight-guards"] || "", "node scripts/preflight-operation-setting-guard.mjs", "package preflight guards script");

checkSourceIncludesAll(operationSettingEntity, [
  '@Entity("operation_settings")',
  "tenant",
  "offlinePaymentInstructions",
  "registrationEnabled",
  "registrationDisabledMessage",
  "customerServiceName",
  "customerServicePhone",
  "customerServiceWechat",
  "defaultGroupQrCodeUrl",
  "pageTheme",
  "refundInstructions",
  "invoiceInstructions"
], "operation setting entity");

checkSourceIncludesAll(adminDto, [
  "export class OperationSettingDto",
  "registrationEnabled",
  "registrationDisabledMessage",
  "offlinePaymentInstructions",
  "customerServiceName",
  "customerServicePhone",
  "customerServiceWechat",
  "defaultGroupQrCodeUrl",
  "pageTheme",
  "refundInstructions",
  "invoiceInstructions"
], "operation setting dto");

checkSourceIncludesAll(adminController, [
  '@Get("settings/operation")',
  '@Query("tenantId") tenantId: string | undefined',
  "this.service.getOperationSetting(admin, tenantId)",
  '@Post("settings/operation")',
  "this.service.saveOperationSetting(dto, admin, tenantId)"
], "admin operation setting controller");

checkSourceIncludesAll(adminService, [
  "async getOperationSetting",
  "async saveOperationSetting",
  "private async operationSettingTarget",
  "this.ensureOperationSettingForTarget(admin, scope)",
  "不能修改其他商家的运营设置",
  "if (!scope.tenant && dto.launchConfig !== undefined)",
  "registrationEnabled: dto.registrationEnabled ?? true",
  "registrationDisabledMessage: dto.registrationDisabledMessage?.trim() || null",
  "offlinePaymentInstructions: dto.offlinePaymentInstructions.trim()",
  "defaultGroupQrCodeUrl: dto.defaultGroupQrCodeUrl?.trim() || null",
  "pageTheme: this.isPlainObject(dto.pageTheme) ? dto.pageTheme : {}",
  "refundInstructions: dto.refundInstructions.trim()",
  "invoiceInstructions: dto.invoiceInstructions?.trim() || null",
  '"settings.operation.update"',
  "tenant: tenant || this.tenantRelation(admin)"
], "admin operation setting service");

checkSourceIncludesAll(publicController, [
  '@Get("settings/operation")',
  "this.service.operationSetting(this.tenantContext(req, tenantCode))"
], "public operation setting controller");

checkSourceIncludesAll(publicService, [
  "operationSetting(context",
  "publicOperationSetting",
  "assertRegistrationEnabled",
  "registrationDisabledMessage ||",
  "offlinePaymentInstructions",
  "customerServiceName",
  "customerServicePhone",
  "customerServiceWechat",
  "defaultGroupQrCodeUrl",
  "pageTheme",
  "refundInstructions",
  "invoiceInstructions"
], "public operation setting service");

checkSourceIncludesAll(publicOperationSettingMethod, [
  "registrationEnabled: setting.registrationEnabled",
  "offlinePaymentInstructions: setting.offlinePaymentInstructions",
  "customerServiceName: setting.customerServiceName",
  "pageTheme: setting.pageTheme || {}",
  "launchConfig: this.publicLaunchConfig",
  "refundInstructions: setting.refundInstructions"
], "public operation setting allowlist");
check(!publicOperationSettingMethod.includes("...setting"), "public operation setting must use an explicit field allowlist.");
for (const field of ["defaultGroupQrCodeUrl", "smsAccessKeyId", "smsAccessKeySecret", "smsTemplateId", "tenant"]) {
  check(!publicOperationSettingMethod.includes(`${field}: setting.${field}`), `public operation setting must not expose ${field}.`);
}

checkSourceIncludesAll(adminRouter, [
  "SystemSettings",
  'path: "system-settings"',
  'roles: ["system.view", "operation_settings.view"]',
  'path: "operation-settings", redirect: "/system-settings"'
], "admin operation setting route");

checkSourceIncludesAll(systemSettings, [
  "/admin/settings/operation",
  'v-model="operationTenantId"',
  "operationRequestConfig()",
  "商家前端实时生效",
  "registrationEnabled",
  "registrationDisabledMessage",
  "offlinePaymentInstructions",
  "customerServiceName",
  "customerServicePhone",
  "customerServiceWechat",
  "defaultGroupQrCodeUrl",
  "pageTheme",
  "refundInstructions",
  "invoiceInstructions",
  "请填写暂停报名提示",
  "请填写线下付款说明",
  "请填写退款说明",
  "pageThemePreviewStyle",
  "pageThemeCardStyle"
], "admin system settings view");

checkSourceIncludesAll(mobileTheme, [
  "/public/settings/operation",
  "applyPageTheme"
], "mobile theme loader");

checkSourceIncludesAll(mobileActivityDetail, [
  "/public/settings/operation",
  "registrationEnabled",
  "registrationDisabledMessage",
  "customerServiceName",
  "customerServicePhone",
  "customerServiceWechat",
  "refundInstructions",
  "/pages/service/index"
], "mobile activity detail operation setting");

checkSourceIncludesAll(mobileRegister, [
  "/public/settings/operation",
  "registrationEnabled",
  "registrationDisabledMessage"
], "mobile register operation setting");

checkSourceIncludesAll(mobileRegistration, [
  "offlinePaymentInstructions",
  "customerServiceName",
  "customerServicePhone",
  "customerServiceWechat",
  "refundInstructions",
  "invoiceInstructions",
  "groupQrCodeUrl"
], "mobile registration detail operation setting");

checkSourceIncludesAll(mobileService, [
  "/public/settings/operation",
  "服务中心",
  "offlinePaymentInstructions",
  "refundInstructions",
  "invoiceInstructions",
  "customerServiceName",
  "customerServicePhone",
  "customerServiceWechat"
], "mobile service center");

check(mobilePagePaths.has("pages/service/index"), "mobile pages must include pages/service/index.");

checkSourceIncludesAll(smoke, [
  "/admin/settings/operation",
  "/public/settings/operation",
  "Operation setting should pause registrations",
  "Public operation setting should include customer service name",
  "Public operation setting should include refund instructions",
  "Public operation setting should include invoice instructions",
  "Public operation setting should include page theme",
  "Public operation setting should not expose default group QR code",
  "Registration detail should include operation settings",
  "settings.operation.update"
], "main smoke operation setting coverage");

checkSourceIncludesAll(tenantSmoke, [
  "saveOperationSetting",
  "/admin/settings/operation",
  "/public/settings/operation?tenantCode",
  "Tenant A public operation setting mismatch",
  "Tenant B public operation setting mismatch"
], "tenant smoke operation setting coverage");

checkSourceIncludesAll(launchChecklist, [
  "运营设置",
  "线下付款说明",
  "客服",
  "退款说明",
  "发票说明"
], "launch checklist");
checkSourceIncludesAll(runbook, ["运营设置", "报名通道"], "production runbook");
checkSourceIncludesAll(localAcceptance, ["系统设置保存", "图片上传和展示通过"], "local acceptance test plan");
checkSourceIncludes(progress, "运营设置静态 guard", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight operation setting guard covers admin settings, public settings, H5 usage, smoke checks, and docs.");
}
