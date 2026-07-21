import fs from "node:fs";
import path from "node:path";
import { API_BASE, api, assert, auth, loginPlatformAdmin, loginShowcaseAdmin } from "./online-showcase-lib.mjs";

const runId = `admin-account-permission-${Date.now()}`;
const outputDir = path.resolve(".local-logs", runId);
fs.mkdirSync(outputDir, { recursive: true });

async function rawJson(pathname, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { ...auth(token), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, payload };
}

function expectStatus(result, status, label) {
  assert(result.status === status, `${label} 应为 ${status}，实际 ${result.status}`);
}

const platformRead = await loginShowcaseAdmin("showcase_admin_read");
const platformManager = await loginShowcaseAdmin("showcase_admin_manager");
const platformSecurity = await loginShowcaseAdmin("showcase_admin_security");
const tenantRead = await loginShowcaseAdmin("showcase_staff_read");
const tenantManager = await loginShowcaseAdmin("showcase_staff_manager");
const tenantSecurity = await loginShowcaseAdmin("showcase_staff_security");
const platformAdmin = await loginPlatformAdmin();

const tenantManagerMe = await api("/admin/auth/me", { headers: auth(tenantManager.token) });
const tenantId = Number(tenantManagerMe.tenantId || tenantManagerMe.tenant?.id || 0);
assert(tenantId > 0, "商家账号管理测试账号缺少 tenantId");

const options = await api("/admin/admins/options", { headers: auth(platformManager.token) });
assert(Array.isArray(options.tenants) && options.tenants.length >= 2, "账号选项接口未返回至少两个商家");
const ownTenant = options.tenants.find((item) => Number(item.id) === tenantId);
const otherTenant = options.tenants.find((item) => Number(item.id) !== tenantId);
assert(ownTenant && otherTenant, "未找到本商家和跨商家测试范围");

const platformReadRows = await api("/admin/admins?page=1&pageSize=100", { headers: auth(platformRead.token) });
assert(Array.isArray(platformReadRows.items) && platformReadRows.items.length > 0, "平台只读账号无法查看后台账号");
await api("/admin/admin-invitations", { headers: auth(platformRead.token) });
expectStatus(await rawJson("/admin/admins", { method: "POST", token: platformRead.token, body: { username: `blocked_read_${Date.now()}`, password: "Qiwai123456", role: "operator", tenantId } }), 403, "平台只读账号创建账号");
expectStatus(await rawJson(`/admin/admins/${platformReadRows.items[0].id}/password`, { method: "POST", token: platformRead.token, body: { password: "Qiwai654321" } }), 403, "平台只读账号重置密码");

const suffix = Date.now();
const targetUsername = `admin_perm_${suffix}`;
const target = await api("/admin/admins", {
  method: "POST",
  headers: auth(platformManager.token),
  body: JSON.stringify({ username: targetUsername, password: "Qiwai123456", role: "operator", tenantId, permissions: ["admin.view"], dataScope: { type: "all" } })
});
assert(target.id && target.tenant?.id === tenantId, "平台账号管理员创建商家员工失败");

expectStatus(await rawJson("/admin/admins", { method: "POST", token: platformManager.token, body: { username: `blocked_platform_${suffix}`, password: "Qiwai123456", role: "operator", permissions: ["admin.view"] } }), 403, "委派管理员创建平台账号");
expectStatus(await rawJson("/admin/admins", { method: "POST", token: platformManager.token, body: { username: `blocked_role_${suffix}`, password: "Qiwai123456", role: "super_admin", tenantId, permissions: ["admin.view"] } }), 403, "委派管理员设置超级管理员角色");

const otherOptions = await api(`/admin/admins/options?tenantId=${otherTenant.id}`, { headers: auth(platformManager.token) });
const ownOptions = await api(`/admin/admins/options?tenantId=${tenantId}`, { headers: auth(platformManager.token) });
if (otherOptions.activities?.length) {
  expectStatus(await rawJson("/admin/admins", {
    method: "POST",
    token: platformManager.token,
    body: { username: `blocked_scope_${suffix}`, password: "Qiwai123456", role: "operator", tenantId, permissions: ["activity.view"], dataScope: { type: "activity_ids", activityIds: [otherOptions.activities[0].id] } }
  }), 400, "跨商家活动数据范围");
}

const updated = await api(`/admin/admins/${target.id}`, {
  method: "PATCH",
  headers: auth(platformManager.token),
  body: JSON.stringify({ role: "finance", tenantId, permissions: ["admin.view", "finance.view"], dataScope: ownOptions.activities?.length ? { type: "activity_ids", activityIds: [ownOptions.activities[0].id] } : { type: "all" } })
});
assert(updated.role === "finance" && Boolean(updated.enabled) && updated.permissions.includes("finance.view"), "账号管理员编辑角色权限失败");
expectStatus(await rawJson(`/admin/admins/${target.id}`, { method: "PATCH", token: platformManager.token, body: { enabled: false } }), 403, "账号管理员通过编辑接口夹带停用");
for (const [pathName, body] of [
  [`/admin/admins/${target.id}/password`, { password: "Qiwai654321" }],
  [`/admin/admins/${target.id}/status`, { enabled: false }],
  [`/admin/admins/${target.id}/force-logout`, undefined]
]) {
  expectStatus(await rawJson(pathName, { method: "POST", token: platformManager.token, body }), 403, `账号管理员安全接口 ${pathName}`);
}

const inviteUsername = `invite_perm_${suffix}`;
const invitation = await api("/admin/admin-invitations", {
  method: "POST",
  headers: auth(platformManager.token),
  body: JSON.stringify({ username: inviteUsername, role: "operator", tenantId, permissions: ["admin.view"], dataScope: { type: "all" }, expiresInHours: 48 })
});
assert(invitation.id && invitation.status === "pending", "账号管理员创建邀请失败");
const revoked = await api(`/admin/admin-invitations/${invitation.id}/revoke`, { method: "POST", headers: auth(platformManager.token) });
assert(revoked.status === "revoked", "账号管理员撤销邀请失败");

const tenantRows = await api("/admin/admins?page=1&pageSize=100", { headers: auth(tenantRead.token) });
assert(tenantRows.items.every((item) => Number(item.tenant?.id) === tenantId), "商家只读账号后台账号列表泄露跨商家数据");
const tenantOptions = await api(`/admin/admins/options?tenantId=${otherTenant.id}`, { headers: auth(tenantRead.token) });
assert(tenantOptions.tenants.length === 1 && Number(tenantOptions.tenants[0].id) === tenantId, "商家只读账号通过 options 猜测其他商家");
expectStatus(await rawJson(`/admin/admins/${target.id}`, { method: "PATCH", token: tenantRead.token, body: { role: "operator" } }), 403, "商家只读账号编辑账号");

const platformAllRows = await api("/admin/admins?includeSmoke=true&page=1&pageSize=100", { headers: auth(platformAdmin.token) });
const otherTenantAdmin = platformAllRows.items.find((item) => item.tenant?.id && Number(item.tenant.id) !== tenantId);
const platformAccountRows = await api("/admin/admins?includeSmoke=true&keyword=showcase_admin_read&page=1&pageSize=20", { headers: auth(platformAdmin.token) });
const platformAccount = platformAccountRows.items.find((item) => !item.tenant?.id);
assert(otherTenantAdmin && platformAccount, "未找到跨商家或平台账号测试对象");
expectStatus(await rawJson(`/admin/admins/${otherTenantAdmin.id}`, { method: "PATCH", token: tenantManager.token, body: { role: "operator" } }), 404, "商家账号管理员跨租户 ID 猜测");
expectStatus(await rawJson(`/admin/admins/${platformAccount.id}/password`, { method: "POST", token: platformSecurity.token, body: { password: "Qiwai654321" } }), 403, "委派安全管理员操作平台账号");

const otherTenantTarget = platformAllRows.items.find((item) => Number(item.tenant?.id) === Number(otherTenant.id));
assert(otherTenantTarget, "未找到跨商家角色复制来源");
expectStatus(await rawJson(`/admin/admins/${target.id}/copy-role`, { method: "POST", token: platformManager.token, body: { sourceAdminId: otherTenantTarget.id } }), 400, "跨商家复制角色权限");

const tenantManaged = await api(`/admin/admins/${target.id}`, {
  method: "PATCH",
  headers: auth(tenantManager.token),
  body: JSON.stringify({ role: "operator", permissions: ["admin.view"], dataScope: { type: "all" } })
});
assert(tenantManaged.role === "operator", "商家账号管理员编辑本商家员工失败");
expectStatus(await rawJson(`/admin/admins/${target.id}/status`, { method: "POST", token: tenantManager.token, body: { enabled: false } }), 403, "商家账号管理员执行停用");

expectStatus(await rawJson(`/admin/admins/${target.id}`, { method: "PATCH", token: platformSecurity.token, body: { role: "finance" } }), 403, "安全管理员编辑角色权限");
await api(`/admin/admins/${target.id}/password`, { method: "POST", headers: auth(platformSecurity.token), body: JSON.stringify({ password: "Qiwai654321" }) });
const targetSession = await loginShowcaseAdmin(targetUsername).catch(() => null);
assert(!targetSession, "重置为专项密码后不应再使用演示默认密码登录");
const targetLoginResponse = await rawJson("/admin/auth/login", { method: "POST", body: { username: targetUsername, password: "Qiwai654321" } });
expectStatus(targetLoginResponse, 201, "重置密码后登录");
const targetToken = targetLoginResponse.payload?.data?.token || targetLoginResponse.payload?.token;
assert(targetToken, "重置密码后登录未返回 token");
await api(`/admin/admins/${target.id}/force-logout`, { method: "POST", headers: auth(platformSecurity.token) });
expectStatus(await rawJson("/admin/admins?page=1&pageSize=20", { token: targetToken }), 401, "强制下线后的旧会话");
await api(`/admin/admins/${target.id}/status`, { method: "POST", headers: auth(tenantSecurity.token), body: JSON.stringify({ enabled: false }) });
expectStatus(await rawJson("/admin/auth/login", { method: "POST", body: { username: targetUsername, password: "Qiwai654321" } }), 401, "停用账号登录");
await api(`/admin/admins/${target.id}/status`, { method: "POST", headers: auth(tenantSecurity.token), body: JSON.stringify({ enabled: true }) });
await api(`/admin/admins/${target.id}/password`, { method: "POST", headers: auth(tenantSecurity.token), body: JSON.stringify({ password: "Qiwai123456" }) });
const finalLogin = await loginShowcaseAdmin(targetUsername);
assert(finalLogin.token, "恢复后的保留验收账号无法使用统一演示密码登录");

const auditActions = ["admin.create", "admin.update", "admin.password.reset", "admin.force_logout", "admin.disable", "admin.enable", "admin.invitation.create", "admin.invitation.revoke"];
const auditIds = {};
for (const action of auditActions) {
  const page = await api(`/admin/operation-logs?action=${encodeURIComponent(action)}&pageSize=100`, { headers: auth(platformAdmin.token) });
  const row = page.items?.find((item) => action.startsWith("admin.invitation") ? Number(item.targetId) === Number(invitation.id) : Number(item.targetId) === Number(target.id));
  assert(row, `未找到 ${action} 审计记录`);
  auditIds[action] = row.id;
}

const result = {
  runId,
  tenant: { id: tenantId, name: ownTenant.name },
  target: { id: target.id, username: targetUsername, password: "Qiwai123456", enabled: true, role: "operator" },
  invitation: { id: invitation.id, username: inviteUsername, status: revoked.status },
  platform: { readCount: platformReadRows.items.length, tenantOptionCount: options.tenants.length, delegatedPlatformAccountStatus: 403 },
  tenantScope: { rowCount: tenantRows.items.length, optionsTenantId: tenantOptions.tenants[0].id, crossTenantStatus: 404 },
  security: { passwordReset: true, forceLogoutStatus: 401, disabledLoginStatus: 401, restoredLogin: true },
  auditIds,
  createdAt: new Date().toISOString()
};
fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
