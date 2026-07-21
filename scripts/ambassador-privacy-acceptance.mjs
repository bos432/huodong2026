import { API_BASE, assert, env, loginAdmin, reportStep } from "./online-showcase-lib.mjs";

const password = env("SHOWCASE_PASSWORD");

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { status: response.status, contentType, data };
}

function ok(result, label) {
  assert(result.status >= 200 && result.status < 300, `${label} failed with HTTP ${result.status}`);
  if (!Buffer.isBuffer(result.data)) assert(result.data?.code === 0, `${label} failed: ${result.data?.message || "unknown error"}`);
  return Buffer.isBuffer(result.data) ? result.data : result.data.data;
}

function forbidden(result, label) {
  assert(result.status === 403, `${label} must return 403, got ${result.status}`);
}

const readonly = await loginAdmin("showcase_ambassador_readonly", password);
const sensitive = await loginAdmin("showcase_ambassador_sensitive", password);
const manager = await loginAdmin("showcase_ambassador_manager", password);

const managerRows = ok(await request("/admin/ambassador/applications", { token: manager.token }), "manager application list");
assert(Array.isArray(managerRows) && managerRows.length > 0, "ambassador acceptance needs at least one retained application");
const row = managerRows[0];
assert(/^1\d{2}\*{4}.{4}$/.test(String(row.phone || "")), "application list must return a masked phone");
assert(String(row.wechat || "").includes("*"), "application list must return a masked contact handle");
assert(row.remarkEncrypted === undefined && row.phoneLookupHash === undefined, "application list must not expose storage-only sensitive columns");

const managerReveal = ok(await request(`/admin/ambassador/applications/${row.id}/reveal`, { method: "POST", token: manager.token, body: { reason: "自动化验收：管理账号核对联系方式" } }), "manager reveal");
assert(managerReveal.phone !== row.phone && managerReveal.wechat !== row.wechat, "sensitive reveal must differ from masked list values");
ok(await request(`/admin/ambassador/applications/${row.id}`, { method: "PATCH", token: manager.token, body: { status: row.status } }), "manager update");
const managerExport = await request("/admin/ambassador/applications/export", { token: manager.token });
const managerExportBuffer = ok(managerExport, "manager export");
assert(managerExport.contentType.includes("spreadsheetml"), "manager export must return an Excel workbook");
assert(managerExportBuffer.length > 1000, "manager export workbook is unexpectedly small");
reportStep("管理账号可查看、受控解密、更新并导出大使申请");

ok(await request("/admin/ambassador/applications", { token: readonly.token }), "readonly list");
forbidden(await request(`/admin/ambassador/applications/${row.id}/reveal`, { method: "POST", token: readonly.token, body: { reason: "越权验收" } }), "readonly reveal");
forbidden(await request(`/admin/ambassador/applications/${row.id}`, { method: "PATCH", token: readonly.token, body: { status: row.status } }), "readonly update");
forbidden(await request("/admin/ambassador/applications/export", { token: readonly.token }), "readonly export");
reportStep("只读账号写入、敏感查看和导出均被拦截");

ok(await request("/admin/ambassador/applications", { token: sensitive.token }), "sensitive list");
ok(await request(`/admin/ambassador/applications/${row.id}/reveal`, { method: "POST", token: sensitive.token, body: { reason: "自动化验收：敏感字段权限" } }), "sensitive reveal");
forbidden(await request(`/admin/ambassador/applications/${row.id}`, { method: "PATCH", token: sensitive.token, body: { status: row.status } }), "sensitive update");
forbidden(await request("/admin/ambassador/applications/export", { token: sensitive.token }), "sensitive export");
reportStep("敏感查看账号仅可带理由查看完整联系方式");

const platform = await loginAdmin(env("PLATFORM_ADMIN_USERNAME", "admin"), env("PLATFORM_ADMIN_PASSWORD", "Admin123456"));
const audit = ok(await request("/admin/operation-logs?action=ambassador.sensitive_reveal&pageSize=50", { token: platform.token }), "sensitive reveal audit");
const auditedUsers = new Set((audit.items || []).map((item) => item.adminUsername));
assert(auditedUsers.has("showcase_ambassador_manager") && auditedUsers.has("showcase_ambassador_sensitive"), "sensitive reveal audit must include manager and sensitive accounts");
reportStep("敏感联系方式查看审计已落库");

console.log("\n文化大使隐私与权限专项验收通过。");
