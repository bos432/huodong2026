import fs from "node:fs";
import path from "node:path";
import { API_BASE, api, assert, auth, loginPlatformAdmin, loginShowcaseAdmin } from "./online-showcase-lib.mjs";

const runId = `category-ticket-permission-${Date.now()}`;
const outputDir = path.resolve(".local-logs", runId);
fs.mkdirSync(outputDir, { recursive: true });

async function rawJson(pathname, token, method = "GET", body) {
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

function expectDenied(result, label, statuses = [403]) {
  assert(statuses.includes(result.status), `${label} 应为 ${statuses.join("/")}，实际 ${result.status}`);
}

function assertMinimalTenant(value, label) {
  if (!value) return;
  assert(!Object.prototype.hasOwnProperty.call(value, "settings"), `${label} 泄露商家 settings`);
  assert(!Object.prototype.hasOwnProperty.call(value, "contactPhone"), `${label} 泄露商家联系电话`);
}

const platformRead = await loginShowcaseAdmin("showcase_category_read");
const platformManage = await loginShowcaseAdmin("showcase_category_manager");
const tenantRead = await loginShowcaseAdmin("showcase_staff_read");
const tenantManage = await loginShowcaseAdmin("showcase_staff_manager");
const activityManage = await loginShowcaseAdmin("showcase_staff_security");
const platformAdmin = await loginPlatformAdmin();

const platformCategories = await api("/admin/categories", { headers: auth(platformRead.token) });
assert(platformCategories.length > 0, "平台分类只读账号未读取到分类");
platformCategories.slice(0, 50).forEach((row) => assertMinimalTenant(row.tenant, "平台分类列表"));
expectDenied(await rawJson("/admin/categories", platformRead.token, "POST", { name: `${runId}-denied`, scene: "activity", publicVisible: true, sortOrder: 0, enabled: true }), "平台分类只读创建");

const platformCategory = await api("/admin/categories", {
  method: "POST",
  headers: auth(platformManage.token),
  body: JSON.stringify({ name: `平台分类验收-${runId}`, scene: "activity", publicVisible: true, sortOrder: 901, enabled: true })
});
assert(platformCategory.tenant === null, "平台分类不应归属商家");
const updatedPlatformCategory = await api(`/admin/categories/${platformCategory.id}`, {
  method: "PATCH",
  headers: auth(platformManage.token),
  body: JSON.stringify({ name: `平台分类验收-${runId}-已更新`, scene: "activity", publicVisible: false, sortOrder: 902, enabled: true })
});
assert(updatedPlatformCategory.name.endsWith("-已更新") && updatedPlatformCategory.publicVisible === false, "平台分类更新未生效");

const tenantCategories = await api("/admin/categories", { headers: auth(tenantRead.token) });
assert(tenantCategories.length > 0, "商家分类只读账号未读取到分类");
const tenantId = Number(tenantCategories.find((row) => row.tenant?.id)?.tenant?.id || 0);
assert(tenantId > 0 && tenantCategories.every((row) => Number(row.tenant?.id || 0) === tenantId), "商家分类列表泄露其他商家或平台分类");
expectDenied(await rawJson("/admin/categories", tenantRead.token, "POST", { name: `${runId}-tenant-denied`, scene: "activity", publicVisible: true, sortOrder: 0, enabled: true }), "商家分类只读创建");
expectDenied(await rawJson(`/admin/categories/${platformCategory.id}`, tenantManage.token, "PATCH", { name: "cross-tenant", scene: "activity", publicVisible: true, sortOrder: 0, enabled: true }), "商家分类跨作用域更新", [404]);

const tenantCategory = await api("/admin/categories", {
  method: "POST",
  headers: auth(tenantManage.token),
  body: JSON.stringify({ name: `商家分类验收-${runId}`, scene: "activity", publicVisible: true, sortOrder: 903, enabled: true })
});
assert(Number(tenantCategory.tenant?.id || 0) === tenantId, "新建商家分类归属错误");
const updatedTenantCategory = await api(`/admin/categories/${tenantCategory.id}`, {
  method: "PATCH",
  headers: auth(tenantManage.token),
  body: JSON.stringify({ name: `商家分类验收-${runId}-已更新`, scene: "activity", publicVisible: true, sortOrder: 904, enabled: true })
});
assert(updatedTenantCategory.name.endsWith("-已更新"), "商家分类更新未生效");

const ticketOptions = await api("/admin/ticket-types/options", { headers: auth(tenantRead.token) });
assert(ticketOptions.activities?.length > 0, "票种只读账号未获得活动选项");
assert(ticketOptions.activities.every((row) => Number(row.tenant?.id || 0) === tenantId), "票种活动选项泄露其他商家");
assert(ticketOptions.activities.every((row) => !Object.prototype.hasOwnProperty.call(row, "description") && !Object.prototype.hasOwnProperty.call(row, "location")), "票种活动选项返回字段过多");
const activityId = Number(ticketOptions.activities[0].id);
const tenantTickets = await api(`/admin/ticket-types?activityId=${activityId}`, { headers: auth(tenantRead.token) });
tenantTickets.forEach((row) => {
  assertMinimalTenant(row.tenant, "票种列表");
  assert(row.activity && Object.keys(row.activity).every((key) => ["id", "title", "status"].includes(key)), "票种列表活动对象字段过多");
});
expectDenied(await rawJson("/admin/ticket-types", tenantRead.token, "POST", { activityId, name: `${runId}-denied`, price: 0, perUserLimit: 1, tierPrices: [], enabled: true }), "票种只读创建");

const ticket = await api("/admin/ticket-types", {
  method: "POST",
  headers: auth(tenantManage.token),
  body: JSON.stringify({ activityId, name: `票种权限验收-${runId}`, price: 12.34, capacity: 18, perUserLimit: 2, memberPrice: 9.99, tierPrices: [{ minSold: 5, price: 11.11 }], enabled: true })
});
assert(Number(ticket.activity?.id || 0) === activityId && Number(ticket.tenant?.id || 0) === tenantId, "新建票种归属错误");
const updatedTicket = await api(`/admin/ticket-types/${ticket.id}`, {
  method: "PATCH",
  headers: auth(tenantManage.token),
  body: JSON.stringify({ activityId, name: `票种权限验收-${runId}-已更新`, price: 13.45, capacity: 20, perUserLimit: 3, memberPrice: 10.5, tierPrices: [{ minSold: 6, price: 12.22 }], enabled: true })
});
assert(updatedTicket.name.endsWith("-已更新") && Number(updatedTicket.capacity) === 20, "票种更新未生效");

const allActivities = await api("/admin/activities?page=1&pageSize=100", { headers: auth(platformAdmin.token) });
const otherTenantActivity = allActivities.items?.find((row) => row.tenant?.id && Number(row.tenant.id) !== tenantId);
if (otherTenantActivity) {
  expectDenied(await rawJson("/admin/ticket-types", tenantManage.token, "POST", { activityId: otherTenantActivity.id, name: `${runId}-cross`, price: 0, perUserLimit: 1, tierPrices: [], enabled: true }), "票种跨商家活动创建", [404]);
}

const activityOptions = await api("/admin/activities/options", { headers: auth(activityManage.token) });
assert(activityOptions.categories?.length > 0 && activityOptions.memberLevels?.length > 0 && activityOptions.tenants?.length === 1, "最小活动维护账号 options 不完整");
assert(Object.keys(activityOptions.tenants[0].settings || {}).join(",") === "registrationReviewEnabled", "活动 options 商家设置字段过多");
expectDenied(await rawJson("/admin/agents", activityManage.token), "最小活动维护账号直接读取代理");
expectDenied(await rawJson("/admin/member-levels", activityManage.token), "最小活动维护账号直接读取会员等级");
expectDenied(await rawJson("/admin/tenants", activityManage.token), "商家活动维护账号直接读取商家列表");

const auditIds = {};
for (const action of ["category.create", "category.update", "ticket_type.create", "ticket_type.update"]) {
  const page = await api(`/admin/operation-logs?action=${encodeURIComponent(action)}&page=1&pageSize=100`, { headers: auth(platformAdmin.token) });
  const row = page.items?.find((item) => item.action === action && String(item.summary || "").includes(runId));
  assert(row, `未找到 ${action} 审计`);
  auditIds[action] = row.id;
}

const result = {
  runId,
  tenantId,
  counts: { platformCategories: platformCategories.length, tenantCategories: tenantCategories.length, ticketActivities: ticketOptions.activities.length, activityOptionCategories: activityOptions.categories.length, activityOptionAgents: activityOptions.agents.length, memberLevels: activityOptions.memberLevels.length },
  retained: { platformCategoryId: platformCategory.id, tenantCategoryId: tenantCategory.id, ticketTypeId: ticket.id },
  crossTenantActivityChecked: Boolean(otherTenantActivity),
  auditIds,
  createdAt: new Date().toISOString()
};
fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
