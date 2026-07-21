import fs from "node:fs";
import path from "node:path";
import { API_BASE, api, assert, auth, loginPlatformAdmin, loginShowcaseAdmin } from "./online-showcase-lib.mjs";

const runId = `log-permission-${Date.now()}`;
const outputDir = path.resolve(".local-logs", runId);
fs.mkdirSync(outputDir, { recursive: true });

async function rawJson(pathname, token) {
  const response = await fetch(`${API_BASE}${pathname}`, { headers: auth(token) });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, payload };
}

async function rawBinary(pathname, token) {
  const response = await fetch(`${API_BASE}${pathname}`, { headers: auth(token) });
  return { status: response.status, contentType: response.headers.get("content-type") || "", bytes: Buffer.from(await response.arrayBuffer()) };
}

function expectDenied(result, label) {
  assert(result.status === 403, `${label} 应为 403，实际 ${result.status}`);
}

function assertXlsx(result, label) {
  assert(result.status === 200, `${label} 导出失败：${result.status}`);
  assert(result.contentType.includes("spreadsheetml"), `${label} Content-Type 错误：${result.contentType}`);
  assert(result.bytes[0] === 0x50 && result.bytes[1] === 0x4b, `${label} 不是有效 XLSX`);
}

const operationRead = await loginShowcaseAdmin("showcase_log_read");
const operationSensitive = await loginShowcaseAdmin("showcase_log_sensitive");
const operationExport = await loginShowcaseAdmin("showcase_log_export");
const securityRead = await loginShowcaseAdmin("showcase_security_log_read");
const securitySensitive = await loginShowcaseAdmin("showcase_security_log_sensitive");
const securityExport = await loginShowcaseAdmin("showcase_security_log_export");
const tenantRead = await loginShowcaseAdmin("showcase_staff_read");
const tenantSensitive = await loginShowcaseAdmin("showcase_staff_manager");
const tenantExport = await loginShowcaseAdmin("showcase_staff_security");
const platformAdmin = await loginPlatformAdmin();

const operationOptions = await api("/admin/operation-logs/options", { headers: auth(operationRead.token) });
assert(operationOptions.tenants?.length >= 2, "平台操作日志账号未获得商家筛选选项");
const operationReadPage = await api("/admin/operation-logs?page=1&pageSize=100", { headers: auth(operationRead.token) });
assert(operationReadPage.items?.length > 0 && operationReadPage.items.every((row) => row.sensitiveMasked === true && row.userAgent === null), "操作日志只读投影未脱敏");
expectDenied(await rawJson("/admin/auth/login-logs", operationRead.token), "操作日志账号访问后台登录日志");
expectDenied(await rawBinary("/admin/operation-logs/export", operationRead.token), "操作日志只读账号导出");

const operationSensitivePage = await api("/admin/operation-logs?page=1&pageSize=100", { headers: auth(operationSensitive.token) });
assert(operationSensitivePage.items.every((row) => row.sensitiveMasked === false), "操作日志敏感账号仍被标记为脱敏");
const comparableOperation = operationSensitivePage.items.find((row) => row.clientIp && operationReadPage.items.some((item) => item.id === row.id));
if (comparableOperation) {
  const masked = operationReadPage.items.find((row) => row.id === comparableOperation.id);
  assert(masked.clientIp !== comparableOperation.clientIp && String(masked.clientIp || "").includes("*"), "操作日志 IP 未按权限区分");
}
expectDenied(await rawBinary("/admin/operation-logs/export", operationSensitive.token), "操作日志敏感账号导出");

const operationExportPage = await api("/admin/operation-logs?page=1&pageSize=20", { headers: auth(operationExport.token) });
assert(operationExportPage.items.every((row) => row.sensitiveMasked === true), "操作日志导出账号列表不应自动获得敏感字段");
const operationXlsx = await rawBinary("/admin/operation-logs/export", operationExport.token);
assertXlsx(operationXlsx, "操作日志");
fs.writeFileSync(path.join(outputDir, "operation-logs.xlsx"), operationXlsx.bytes);

const tenantOptions = await api(`/admin/operation-logs/options`, { headers: auth(tenantRead.token) });
assert(tenantOptions.tenants?.length === 1, "商家操作日志 options 泄露其他商家");
const tenantId = Number(tenantOptions.tenants[0].id);
const tenantReadPage = await api("/admin/operation-logs?page=1&pageSize=100", { headers: auth(tenantRead.token) });
assert(tenantReadPage.items.every((row) => Number(row.tenantId) === tenantId && row.sensitiveMasked === true), "商家操作日志只读范围或脱敏错误");
const tenantSensitivePage = await api("/admin/operation-logs?page=1&pageSize=100", { headers: auth(tenantSensitive.token) });
assert(tenantSensitivePage.items.every((row) => Number(row.tenantId) === tenantId && row.sensitiveMasked === false), "商家操作日志敏感范围错误");
const tenantXlsx = await rawBinary("/admin/operation-logs/export", tenantExport.token);
assertXlsx(tenantXlsx, "商家操作日志");
fs.writeFileSync(path.join(outputDir, "tenant-operation-logs.xlsx"), tenantXlsx.bytes);
expectDenied(await rawJson("/admin/auth/login-logs", tenantRead.token), "商家账号访问平台安全日志");

const securityOptions = await api("/admin/auth/log-options", { headers: auth(securityRead.token) });
assert(securityOptions.tenants?.length === operationOptions.tenants.length, "安全日志商家选项不完整");
const loginReadPage = await api("/admin/auth/login-logs", { headers: auth(securityRead.token) });
const codeReadPage = await api("/admin/auth/h5-code-logs", { headers: auth(securityRead.token) });
assert(loginReadPage.items?.length > 0 && loginReadPage.items.every((row) => row.sensitiveMasked === true && row.userAgent === null), "后台登录日志只读投影未脱敏");
assert(codeReadPage.items?.length > 0 && codeReadPage.items.every((row) => row.sensitiveMasked === true && row.providerMessageId === null), "验证码日志只读投影未脱敏");
assert(codeReadPage.items.some((row) => String(row.phone).includes("****")), "验证码日志手机号未脱敏");
expectDenied(await rawJson("/admin/operation-logs", securityRead.token), "安全日志账号访问操作日志");
expectDenied(await rawBinary("/admin/auth/login-logs/export", securityRead.token), "安全日志只读账号导出登录日志");
expectDenied(await rawBinary("/admin/auth/h5-code-logs/export", securityRead.token), "安全日志只读账号导出验证码日志");

const loginSensitivePage = await api("/admin/auth/login-logs", { headers: auth(securitySensitive.token) });
const codeSensitivePage = await api("/admin/auth/h5-code-logs", { headers: auth(securitySensitive.token) });
assert(loginSensitivePage.items.every((row) => row.sensitiveMasked === false), "后台登录日志敏感账号仍被脱敏");
assert(codeSensitivePage.items.every((row) => row.sensitiveMasked === false), "验证码日志敏感账号仍被脱敏");
assert(codeSensitivePage.items.some((row) => /^1\d{10}$/.test(String(row.phone))), "验证码日志敏感账号未获得完整手机号");
expectDenied(await rawBinary("/admin/auth/login-logs/export", securitySensitive.token), "安全日志敏感账号导出");

const securityExportLoginPage = await api("/admin/auth/login-logs", { headers: auth(securityExport.token) });
assert(securityExportLoginPage.items.every((row) => row.sensitiveMasked === true), "安全日志导出账号不应自动获得敏感字段");
const loginXlsx = await rawBinary("/admin/auth/login-logs/export", securityExport.token);
const codeXlsx = await rawBinary("/admin/auth/h5-code-logs/export", securityExport.token);
assertXlsx(loginXlsx, "后台登录日志");
assertXlsx(codeXlsx, "验证码日志");
fs.writeFileSync(path.join(outputDir, "admin-login-logs.xlsx"), loginXlsx.bytes);
fs.writeFileSync(path.join(outputDir, "h5-code-logs.xlsx"), codeXlsx.bytes);

const auditIds = {};
for (const action of ["export.operation_logs", "export.admin_login_logs", "export.h5_code_logs"]) {
  const page = await api(`/admin/operation-logs?action=${encodeURIComponent(action)}&page=1&pageSize=100`, { headers: auth(platformAdmin.token) });
  const row = page.items?.find((item) => item.action === action);
  assert(row, `未找到 ${action} 审计记录`);
  auditIds[action] = row.id;
}

const result = {
  runId,
  operation: { optionCount: operationOptions.tenants.length, readCount: operationReadPage.total, exportBytes: operationXlsx.bytes.length, tenantExportBytes: tenantXlsx.bytes.length },
  security: { loginCount: loginReadPage.total, codeCount: codeReadPage.total, loginExportBytes: loginXlsx.bytes.length, codeExportBytes: codeXlsx.bytes.length },
  tenant: { id: tenantId, rowCount: tenantReadPage.total, optionCount: tenantOptions.tenants.length },
  auditIds,
  createdAt: new Date().toISOString()
};
fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
