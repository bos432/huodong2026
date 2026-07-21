import fs from "node:fs";
import path from "node:path";
import { API_BASE, TENANT_CODE, api, assert, auth, loginPlatformAdmin, loginShowcaseAdmin } from "./online-showcase-lib.mjs";

const stamp = Date.now();
const runId = `marketing-popup-permission-${stamp}`;
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
  for (const key of ["settings", "contactName", "contactPhone", "remark", "createdAt", "updatedAt"]) assert(!text.includes(`"${key}"`), `${label} 泄露租户字段 ${key}`);
}

async function findPopup(token, id) {
  const page = await api(`/admin/marketing-popups?keyword=${encodeURIComponent(runId)}&page=1&pageSize=100`, { headers: auth(token) });
  return page.items.find((item) => Number(item.id) === Number(id));
}

const readAdmin = await loginShowcaseAdmin("showcase_staff_read");
const manageAdmin = await loginShowcaseAdmin("showcase_staff_manager");
const platformAdmin = await loginPlatformAdmin();

const options = await api("/admin/marketing-popups/options", { headers: auth(readAdmin.token) });
const platformOptions = await api("/admin/marketing-popups/options", { headers: auth(platformAdmin.token) });
assert(options.tenants?.length === 1, "商家营销弹窗只读账号应只获得当前商家选项");
assert(options.memberLevels?.length > 0, "营销弹窗 options 未返回启用会员等级");
assert(options.types?.some((item) => item.value === "wuxing_gold"), "营销弹窗 options 类型不完整");
assert(options.platforms?.some((item) => item.value === "mp-weixin"), "营销弹窗 options 平台不完整");
assert(options.placements?.some((item) => item.value === "mall_product_detail"), "营销弹窗 options 页面不完整");
assert(options.frequencies?.some((item) => item.value === "once_per_day"), "营销弹窗 options 频次不完整");
assertMinimalTenant(options.tenants[0], "营销弹窗 options 商家");
const tenantId = Number(options.tenants[0].id);
const memberLevelId = Number(options.memberLevels[0].id);
const otherTenant = platformOptions.tenants.find((item) => Number(item.id) !== tenantId);

expectDenied(await request("/admin/marketing-popups?pageSize=101", readAdmin.token), "非法营销弹窗分页", [400]);
expectDenied(await request("/admin/marketing-popups?enabled=yes", readAdmin.token), "非法营销弹窗状态", [400]);
expectDenied(await request("/admin/marketing-popups?platform=native", readAdmin.token), "非法营销弹窗平台", [400]);
expectDenied(await request("/admin/marketing-popups", readAdmin.token, "POST", { title: "无权创建" }), "营销弹窗只读账号创建");

const title = `营销弹窗权限验收-${runId}`;
const body = {
  title,
  subtitle: "权限、租户与统计边界验收",
  content: `保留的营销弹窗权限与并发验收数据 ${runId}`,
  emphasis: "服务端严格校验",
  imageUrl: "https://rd.chaimen666.com/uploads/showcase/marketing-popup.jpg",
  type: "notice",
  platforms: ["h5"],
  placements: ["home"],
  audience: { mode: "all", memberLevelIds: [] },
  buttons: [{ text: "查看详情", link: "/pages/index/index", style: "primary" }],
  frequency: "once_per_day",
  priority: 9999,
  enabled: true,
  dismissible: true,
  startAt: null,
  endAt: null
};

expectDenied(await request("/admin/marketing-popups", manageAdmin.token, "POST", { ...body, title: "x".repeat(121) }), "超长营销弹窗标题", [400]);
expectDenied(await request("/admin/marketing-popups", manageAdmin.token, "POST", { ...body, type: "unknown" }), "不支持的营销弹窗类型", [400]);
expectDenied(await request("/admin/marketing-popups", manageAdmin.token, "POST", { ...body, imageUrl: "http://unsafe.example/popup.jpg" }), "非 HTTPS 营销弹窗图片", [400]);
expectDenied(await request("/admin/marketing-popups", manageAdmin.token, "POST", { ...body, platforms: ["mp-weixin"], buttons: [{ text: "外链", link: "https://example.com", style: "primary" }] }), "小程序普通外链", [400]);
expectDenied(await request("/admin/marketing-popups", manageAdmin.token, "POST", { ...body, audience: { mode: "unknown", memberLevelIds: [] } }), "未知营销弹窗受众", [400]);
expectDenied(await request("/admin/marketing-popups", manageAdmin.token, "POST", { ...body, audience: { mode: "member_levels", memberLevelIds: [] } }), "空会员等级受众", [400]);
expectDenied(await request("/admin/marketing-popups", manageAdmin.token, "POST", { ...body, audience: { mode: "member_levels", memberLevelIds: [999999999] } }), "不存在的会员等级受众", [400]);
expectDenied(await request("/admin/marketing-popups", manageAdmin.token, "POST", { ...body, buttons: [{ text: "x".repeat(25), link: "", style: "primary" }] }), "超长营销弹窗按钮", [400]);

const retained = await api("/admin/marketing-popups", { method: "POST", headers: { ...auth(manageAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify(body) });
assert(retained.id && retained.tenant?.id === tenantId, "营销弹窗创建未绑定当前商家");
assertMinimalTenant(retained, "营销弹窗创建响应租户");

const filtered = await api(`/admin/marketing-popups?keyword=${encodeURIComponent(runId)}&enabled=true&platform=h5&placement=home&page=1&pageSize=10`, { headers: auth(readAdmin.token) });
assert(filtered.items?.some((item) => item.id === retained.id), "营销弹窗 SQL 筛选未命中保留数据");
assert(filtered.total >= 1 && filtered.page === 1 && filtered.pageSize === 10, "营销弹窗分页元数据错误");
assertMinimalTenant(filtered.items.find((item) => item.id === retained.id), "营销弹窗列表响应租户");

expectDenied(await request(`/admin/marketing-popups/${retained.id}`, readAdmin.token, "PATCH", { ...body, title: `${title}-无权更新` }), "营销弹窗只读账号更新");
expectDenied(await request(`/admin/marketing-popups/${retained.id}`, readAdmin.token, "DELETE"), "营销弹窗只读账号删除");

const check = await api(`/admin/marketing-popups/effective-check?id=${retained.id}&pageKey=home&platform=h5`, { headers: auth(readAdmin.token) });
assert(check.matched && check.hit?.id === retained.id && check.publicPopup?.id === retained.id, "营销弹窗生效检测未命中保留数据");
assertMinimalTenant(check.publicPopup, "营销弹窗生效检测响应租户");

const beforeEvent = await findPopup(readAdmin.token, retained.id);
const correctEvent = await request(`/public/marketing-popups/${retained.id}/events?tenantCode=${encodeURIComponent(TENANT_CODE)}`, null, "POST", { event: "impression", pageKey: "home", platform: "h5" });
assert(correctEvent.status === 201 && correctEvent.data?.ok === true && !correctEvent.data?.ignored, "正确营销弹窗曝光未计数");
const wrongPage = await request(`/public/marketing-popups/${retained.id}/events?tenantCode=${encodeURIComponent(TENANT_CODE)}`, null, "POST", { event: "click", pageKey: "activity_detail", platform: "h5" });
assert(wrongPage.status === 201 && wrongPage.data?.ignored === true, "错误页面营销弹窗事件未被忽略");
const wrongTenant = otherTenant
  ? await request(`/public/marketing-popups/${retained.id}/events?tenantCode=${encodeURIComponent(otherTenant.code)}`, null, "POST", { event: "click", pageKey: "home", platform: "h5" })
  : { status: 201, data: { ignored: true } };
assert(wrongTenant.status === 201 && wrongTenant.data?.ignored === true, "跨商家营销弹窗事件未被忽略");
expectDenied(await request(`/public/marketing-popups/${retained.id}/events?tenantCode=${encodeURIComponent(TENANT_CODE)}`, null, "POST", { event: "unknown", pageKey: "home", platform: "h5" }), "非法营销弹窗事件", [400]);
const afterEvent = await findPopup(readAdmin.token, retained.id);
assert(Number(afterEvent.impressionCount) === Number(beforeEvent.impressionCount) + 1, "营销弹窗曝光计数没有精确增加 1");
assert(Number(afterEvent.clickCount) === Number(beforeEvent.clickCount), "错误页面或跨商家事件污染了点击计数");

const updateRace = await Promise.all([
  request(`/admin/marketing-popups/${retained.id}`, manageAdmin.token, "PATCH", { ...body, title: `${title}-并发A`, enabled: false }),
  request(`/admin/marketing-popups/${retained.id}`, manageAdmin.token, "PATCH", { ...body, title: `${title}-并发B`, enabled: true })
]);
assert(updateRace.every((item) => item.status === 200), `并发营销弹窗更新状态错误：${updateRace.map((item) => item.status).join("/")}`);
const retainedAfterRace = await findPopup(readAdmin.token, retained.id);
assert(retainedAfterRace && [`${title}-并发A`, `${title}-并发B`].includes(retainedAfterRace.title), "并发营销弹窗更新产生异常状态");

const finalRetained = await api(`/admin/marketing-popups/${retained.id}`, { method: "PATCH", headers: { ...auth(manageAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ ...body, title: `${title}-保留`, audience: { mode: "member_levels", memberLevelIds: [memberLevelId] } }) });
assert(finalRetained.enabled === true && finalRetained.audience?.memberLevelIds?.includes(memberLevelId), "保留营销弹窗最终状态错误");

const temporary = await api("/admin/marketing-popups", { method: "POST", headers: { ...auth(manageAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ ...body, title: `营销弹窗删除并发-${runId}`, priority: 10 }) });
const deleteRace = await Promise.all([
  request(`/admin/marketing-popups/${temporary.id}`, manageAdmin.token, "PATCH", { ...body, title: `营销弹窗删除并发更新-${runId}`, priority: 10 }),
  request(`/admin/marketing-popups/${temporary.id}`, manageAdmin.token, "DELETE")
]);
assert(deleteRace.some((item) => item.status === 200), "营销弹窗并发更新/删除没有成功请求");
assert(deleteRace.every((item) => [200, 404].includes(item.status)), `营销弹窗并发更新/删除出现异常状态：${deleteRace.map((item) => item.status).join("/")}`);
assert(!(await findPopup(readAdmin.token, temporary.id)), "营销弹窗并发删除后仍可见");

let crossTenantPopupId = null;
if (otherTenant) {
  const crossTenant = await api("/admin/marketing-popups", { method: "POST", headers: { ...auth(platformAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ ...body, tenantId: otherTenant.id, title: `跨商家营销弹窗边界-${runId}`, priority: 5 }) });
  crossTenantPopupId = crossTenant.id;
  expectDenied(await request(`/admin/marketing-popups/${crossTenant.id}`, manageAdmin.token, "PATCH", { ...body, title: "跨商家更新" }), "跨商家营销弹窗更新", [404]);
  expectDenied(await request(`/admin/marketing-popups/${crossTenant.id}`, manageAdmin.token, "DELETE"), "跨商家营销弹窗删除", [404]);
}

const auditPage = await api("/admin/operation-logs?page=1&pageSize=100", { headers: auth(platformAdmin.token) });
const createAudit = auditPage.items.find((item) => item.action === "marketing_popup.create" && Number(item.targetId) === Number(retained.id));
const updateAudit = auditPage.items.find((item) => item.action === "marketing_popup.update" && Number(item.targetId) === Number(retained.id));
const deleteAudit = auditPage.items.find((item) => item.action === "marketing_popup.delete" && Number(item.targetId) === Number(temporary.id));
assert(createAudit && updateAudit && deleteAudit, "营销弹窗创建、更新、删除审计不完整");

const result = {
  runId,
  tenantId,
  retained: { popupId: retained.id, finalTitle: finalRetained.title, memberLevelId, crossTenantPopupId },
  counts: { optionsTenants: options.tenants.length, memberLevels: options.memberLevels.length, filteredTotal: filtered.total, impressionBefore: beforeEvent.impressionCount, impressionAfter: afterEvent.impressionCount, clickBefore: beforeEvent.clickCount, clickAfter: afterEvent.clickCount },
  races: { updateStatuses: updateRace.map((item) => item.status), deleteStatuses: deleteRace.map((item) => item.status) },
  events: { correct: correctEvent.status, wrongPageIgnored: wrongPage.data?.ignored, wrongTenantIgnored: wrongTenant.data?.ignored },
  auditIds: { create: createAudit.id, update: updateAudit.id, delete: deleteAudit.id },
  createdAt: new Date().toISOString()
};

fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
