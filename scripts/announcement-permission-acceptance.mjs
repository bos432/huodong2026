import fs from "node:fs";
import path from "node:path";
import { API_BASE, api, assert, auth, loginPlatformAdmin, loginShowcaseAdmin } from "./online-showcase-lib.mjs";

const stamp = Date.now();
const runId = `announcement-permission-${stamp}`;
const outputDir = path.resolve(".local-logs", runId);
fs.mkdirSync(outputDir, { recursive: true });

async function request(pathname, token, method = "GET", body) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { ...(token ? auth(token) : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, payload, data: payload?.data };
}

function expectDenied(result, label, statuses = [403]) {
  assert(statuses.includes(result.status), `${label} 应为 ${statuses.join("/")}，实际 ${result.status}`);
}

function assertMinimalTenant(value, label) {
  const tenant = value?.tenant || value;
  const keys = Object.keys(tenant || {}).sort();
  assert(JSON.stringify(keys) === JSON.stringify(["code", "enabled", "id", "name"]), `${label} 字段不是最小投影：${keys.join(",")}`);
  const text = JSON.stringify(tenant);
  for (const key of ["settings", "contactName", "contactPhone", "remark", "createdAt", "updatedAt"]) {
    assert(!text.includes(`\"${key}\"`), `${label} 泄露租户字段 ${key}`);
  }
}

const readAdmin = await loginShowcaseAdmin("showcase_staff_read");
const manageAdmin = await loginShowcaseAdmin("showcase_staff_manager");
const platformAdmin = await loginPlatformAdmin();

const options = await api("/admin/announcements/options", { headers: auth(readAdmin.token) });
assert(options.tenants?.length === 1, "商家公告只读账号应只获得当前商家选项");
assert(options.memberLevels?.length > 0, "公告专属 options 未返回启用会员等级");
assert(options.types?.some((item) => item.value === "operation"), "公告类型未兼容 operation");
assertMinimalTenant(options.tenants[0], "公告 options 商家");
const tenantId = Number(options.tenants[0].id);
const memberLevelId = Number(options.memberLevels[0].id);

expectDenied(await request("/admin/announcements?pageSize=101", readAdmin.token), "非法公告分页", [400]);
expectDenied(await request("/admin/announcements?enabled=yes", readAdmin.token), "非法公告状态", [400]);
expectDenied(await request("/admin/announcements?type=unknown", readAdmin.token), "非法公告类型", [400]);
expectDenied(await request("/admin/announcements", readAdmin.token, "POST", { title: "无权创建", content: runId }), "公告只读账号创建");

const title = `公告权限验收-${runId}`;
const body = {
  title,
  content: `保留的公告权限与并发验收数据 ${runId}`,
  type: "operation",
  enabled: true,
  pinned: false,
  audience: { mode: "member_levels", memberLevelIds: [memberLevelId] }
};
expectDenied(await request("/admin/announcements", manageAdmin.token, "POST", { ...body, title: "x".repeat(121) }), "超长公告标题", [400]);
expectDenied(await request("/admin/announcements", manageAdmin.token, "POST", { ...body, type: "unknown" }), "不支持的公告类型", [400]);
expectDenied(await request("/admin/announcements", manageAdmin.token, "POST", { ...body, audience: { mode: "member_levels", memberLevelIds: [] } }), "空会员等级受众", [400]);
expectDenied(await request("/admin/announcements", manageAdmin.token, "POST", { ...body, audience: { mode: "member_levels", memberLevelIds: [999999999] } }), "不存在的会员等级受众", [400]);

const retained = await api("/admin/announcements", { method: "POST", headers: { ...auth(manageAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify(body) });
assert(retained.id && retained.tenant?.id === tenantId, "公告创建未绑定当前商家");
assert(retained.audience?.memberLevelIds?.includes(memberLevelId), "公告会员等级受众未保存");
assertMinimalTenant(retained, "公告创建响应租户");

const filtered = await api(`/admin/announcements?keyword=${encodeURIComponent(runId)}&type=operation&enabled=true&page=1&pageSize=10`, { headers: auth(readAdmin.token) });
assert(filtered.items?.some((item) => item.id === retained.id), "公告筛选未命中保留数据");
assert(filtered.total >= 1 && filtered.page === 1 && filtered.pageSize === 10, "公告分页元数据错误");
assertMinimalTenant(filtered.items.find((item) => item.id === retained.id), "公告列表响应租户");

expectDenied(await request(`/admin/announcements/${retained.id}`, readAdmin.token, "PATCH", { ...body, title: `${title}-无权更新` }), "公告只读账号更新");
expectDenied(await request(`/admin/announcements/${retained.id}`, readAdmin.token, "DELETE"), "公告只读账号删除");

const updateRace = await Promise.all([
  request(`/admin/announcements/${retained.id}`, manageAdmin.token, "PATCH", { ...body, title: `${title}-并发A`, enabled: false, pinned: true }),
  request(`/admin/announcements/${retained.id}`, manageAdmin.token, "PATCH", { ...body, title: `${title}-并发B`, enabled: true, pinned: false })
]);
assert(updateRace.every((item) => item.status === 200), `并发公告更新状态错误：${updateRace.map((item) => item.status).join("/")}`);
const afterRace = await api(`/admin/announcements?keyword=${encodeURIComponent(title)}&page=1&pageSize=20`, { headers: auth(readAdmin.token) });
const retainedAfterRace = afterRace.items.find((item) => item.id === retained.id);
assert(retainedAfterRace && [`${title}-并发A`, `${title}-并发B`].includes(retainedAfterRace.title), "并发公告更新产生异常状态");

const temporary = await api("/admin/announcements", { method: "POST", headers: { ...auth(manageAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ ...body, title: `公告删除并发-${runId}`, audience: { mode: "all", memberLevelIds: [] } }) });
const deleteRace = await Promise.all([
  request(`/admin/announcements/${temporary.id}`, manageAdmin.token, "PATCH", { ...body, title: `公告删除并发更新-${runId}`, audience: { mode: "all", memberLevelIds: [] } }),
  request(`/admin/announcements/${temporary.id}`, manageAdmin.token, "DELETE")
]);
assert(deleteRace.some((item) => item.status === 200), "公告并发更新/删除没有成功请求");
assert(deleteRace.every((item) => [200, 404].includes(item.status)), `公告并发更新/删除出现异常状态：${deleteRace.map((item) => item.status).join("/")}`);
const deletedSearch = await api(`/admin/announcements?keyword=${encodeURIComponent(`公告删除并发-${runId}`)}&page=1&pageSize=20`, { headers: auth(readAdmin.token) });
assert(!deletedSearch.items.some((item) => item.id === temporary.id), "公告并发删除后仍可见");

const platformOptions = await api("/admin/announcements/options", { headers: auth(platformAdmin.token) });
const otherTenant = platformOptions.tenants.find((item) => Number(item.id) !== tenantId);
let crossTenantAnnouncementId = null;
if (otherTenant) {
  const crossTenant = await api("/admin/announcements", { method: "POST", headers: { ...auth(platformAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ ...body, tenantId: otherTenant.id, title: `跨商家公告边界-${runId}`, audience: { mode: "all", memberLevelIds: [] } }) });
  crossTenantAnnouncementId = crossTenant.id;
  expectDenied(await request(`/admin/announcements/${crossTenant.id}`, manageAdmin.token, "PATCH", { ...body, title: "跨商家更新", audience: { mode: "all", memberLevelIds: [] } }), "跨商家公告更新", [404]);
  expectDenied(await request(`/admin/announcements/${crossTenant.id}`, manageAdmin.token, "DELETE"), "跨商家公告删除", [404]);
}

const auditPage = await api("/admin/operation-logs?page=1&pageSize=100", { headers: auth(platformAdmin.token) });
const createAudit = auditPage.items.find((item) => item.action === "announcement.create" && Number(item.targetId) === Number(retained.id));
const updateAudit = auditPage.items.find((item) => item.action === "announcement.update" && Number(item.targetId) === Number(retained.id));
const deleteAudit = auditPage.items.find((item) => item.action === "announcement.delete" && Number(item.targetId) === Number(temporary.id));
assert(createAudit && updateAudit && deleteAudit, "公告创建、更新、删除审计不完整");

const result = {
  runId,
  tenantId,
  retained: { announcementId: retained.id, finalTitle: retainedAfterRace.title, memberLevelId, crossTenantAnnouncementId },
  counts: { optionsTenants: options.tenants.length, memberLevels: options.memberLevels.length, filteredTotal: filtered.total },
  races: { updateStatuses: updateRace.map((item) => item.status), deleteStatuses: deleteRace.map((item) => item.status) },
  auditIds: { create: createAudit.id, update: updateAudit.id, delete: deleteAudit.id },
  createdAt: new Date().toISOString()
};

fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
