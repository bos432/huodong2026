import fs from "node:fs";
import path from "node:path";
import { API_BASE, api, assert, auth, loginPlatformAdmin, loginShowcaseAdmin } from "./online-showcase-lib.mjs";

const runId = `tenant-permission-${Date.now()}`;
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
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { status: response.status, payload };
}

async function rawBinary(pathname, token) {
  const response = await fetch(`${API_BASE}${pathname}`, { headers: auth(token) });
  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    bytes: Buffer.from(await response.arrayBuffer())
  };
}

function expectDenied(results, label) {
  for (const [name, result] of Object.entries(results)) {
    assert(result.status === 403, `${label} ${name} 应为 403，实际 ${result.status}`);
  }
}

const viewer = await loginShowcaseAdmin("showcase_tenant_read");
const manager = await loginShowcaseAdmin("showcase_tenant_manager");
const rights = await loginShowcaseAdmin("showcase_tenant_rights");
const plan = await loginShowcaseAdmin("showcase_tenant_plan");
const exporter = await loginShowcaseAdmin("showcase_tenant_export");
const tenantAdmin = await loginShowcaseAdmin("showcase_ops");
assert(viewer.token && manager.token && rights.token && plan.token && exporter.token && tenantAdmin.token, "商家权限测试账号登录失败");

const suffix = Date.now();
const code = `permission_tenant_${suffix}`;
const phone = "13800138000";
const createPayload = {
  code,
  name: `商家权限验收-${suffix}`,
  region: "权限验收区",
  contactName: "权限验收联系人",
  contactPhone: phone,
  enabled: true,
  remark: "保留的商家权限分层验收数据",
  settings: {
    activityPublishReviewRequired: false,
    registrationReviewEnabled: true,
    paymentAccountEditable: false,
    mallEnabled: false,
    packagePlan: "core_partner",
    packageExpiresAt: "2035-12-31"
  }
};

const created = await api("/admin/tenants", { method: "POST", headers: auth(manager.token), body: JSON.stringify(createPayload) });
assert(created.id && created.code === code, "资料管理员创建商家失败");
assert(created.remark === createPayload.remark, "商家备注未持久化");
assert(created.settings?.packagePlan === "standard", "资料管理员通过创建接口越权设置套餐");
assert(created.settings?.registrationReviewEnabled === false && created.settings?.mallEnabled === true, "资料管理员通过创建接口越权设置权益");

const managerUpdated = await api(`/admin/tenants/${created.id}`, {
  method: "PATCH",
  headers: auth(manager.token),
  body: JSON.stringify({
    ...createPayload,
    name: `${createPayload.name}-资料已更新`,
    remark: "资料管理员已完成创建和更新",
    settings: { registrationReviewEnabled: true, mallEnabled: false, packagePlan: "trial", packageExpiresAt: "2027-01-01" }
  })
});
assert(managerUpdated.name.endsWith("-资料已更新") && managerUpdated.remark === "资料管理员已完成创建和更新", "资料管理员更新商家资料失败");
assert(managerUpdated.settings?.packagePlan === "standard" && managerUpdated.settings?.registrationReviewEnabled === false && managerUpdated.settings?.mallEnabled === true, "资料管理员通过更新接口越权修改权益或套餐");

const managerRows = await api("/admin/tenants", { headers: auth(manager.token) });
const managerRow = managerRows.find((item) => item.id === created.id);
assert(managerRow?.contactPhone === phone && managerRow.sensitiveMasked === false, "资料管理员未获得完整联系电话");
expectDenied({
  rights: await rawJson(`/admin/tenants/${created.id}/permissions`, { method: "POST", token: manager.token, body: { mallEnabled: false } }),
  subscription: await rawJson(`/admin/tenants/${created.id}/subscription-change`, { method: "POST", token: manager.token, body: { action: "upgrade", packagePlan: "city_partner" } }),
  export: await rawBinary("/admin/tenants/export", manager.token)
}, "资料管理员");

const viewerRows = await api("/admin/tenants", { headers: auth(viewer.token) });
const viewerRow = viewerRows.find((item) => item.id === created.id);
assert(viewerRow && viewerRow.contactPhone !== phone && String(viewerRow.contactPhone || "").includes("****") && viewerRow.sensitiveMasked === true, "只读账号联系电话未脱敏");
const mobileBootstrap = await api("/admin/mobile/bootstrap", { headers: auth(viewer.token) });
const mobileTenant = mobileBootstrap.tenants?.find((item) => item.id === created.id);
assert(mobileBootstrap.permissions?.canSelectTenant === true && mobileTenant?.sensitiveMasked === true, "移动管理端未返回可选商家或泄露敏感联系电话");
const viewerDashboard = await api("/admin/dashboard", { headers: auth(viewer.token) });
assert(viewerDashboard.scope === "platform", "只读平台代理账号未获得平台经营概览");
expectDenied({
  create: await rawJson("/admin/tenants", { method: "POST", token: viewer.token, body: { ...createPayload, code: `${code}_viewer` } }),
  update: await rawJson(`/admin/tenants/${created.id}`, { method: "PATCH", token: viewer.token, body: createPayload }),
  rights: await rawJson(`/admin/tenants/${created.id}/permissions`, { method: "POST", token: viewer.token, body: { mallEnabled: false } }),
  subscription: await rawJson(`/admin/tenants/${created.id}/subscription-change`, { method: "POST", token: viewer.token, body: { action: "upgrade", packagePlan: "city_partner" } }),
  export: await rawBinary("/admin/tenants/export", viewer.token)
}, "只读账号");

const rightsBefore = await api(`/admin/tenants/${created.id}/subscription-events`, { headers: auth(rights.token) });
const rightsUpdated = await api(`/admin/tenants/${created.id}/permissions`, {
  method: "POST",
  headers: auth(rights.token),
  body: JSON.stringify({ registrationReviewEnabled: true, mallEnabled: false })
});
assert(rightsUpdated.settings?.registrationReviewEnabled === true && rightsUpdated.settings?.mallEnabled === false, "权益管理员更新商家权益失败");
assert(rightsUpdated.settings?.packagePlan === "standard", "权益管理员修改权益时影响了套餐");
expectDenied({
  create: await rawJson("/admin/tenants", { method: "POST", token: rights.token, body: { ...createPayload, code: `${code}_rights` } }),
  update: await rawJson(`/admin/tenants/${created.id}`, { method: "PATCH", token: rights.token, body: createPayload }),
  subscription: await rawJson(`/admin/tenants/${created.id}/subscription-change`, { method: "POST", token: rights.token, body: { action: "upgrade", packagePlan: "city_partner" } }),
  export: await rawBinary("/admin/tenants/export", rights.token)
}, "权益管理员");

const planChange = await api(`/admin/tenants/${created.id}/subscription-change`, {
  method: "POST",
  headers: auth(plan.token),
  body: JSON.stringify({ action: "upgrade", packagePlan: "city_partner", packageExpiresAt: "2030-12-31", remark: "套餐管理员权限分层验收" })
});
assert(planChange.tenant?.settings?.packagePlan === "city_partner" && planChange.event?.action === "upgrade", "套餐管理员升级套餐失败");
const noOpRenewal = await rawJson(`/admin/tenants/${created.id}/subscription-change`, {
  method: "POST",
  token: plan.token,
  body: { action: "renew", packageExpiresAt: "2030-12-31", remark: "相同到期日应被拒绝" }
});
assert(noOpRenewal.status === 400, `相同到期日续费应为 400，实际 ${noOpRenewal.status}`);
const planEvents = await api(`/admin/tenants/${created.id}/subscription-events`, { headers: auth(plan.token) });
assert(planEvents.length === rightsBefore.length + 1 && planEvents[0]?.id === planChange.event.id, "套餐事件未正确记录");
expectDenied({
  create: await rawJson("/admin/tenants", { method: "POST", token: plan.token, body: { ...createPayload, code: `${code}_plan` } }),
  update: await rawJson(`/admin/tenants/${created.id}`, { method: "PATCH", token: plan.token, body: createPayload }),
  rights: await rawJson(`/admin/tenants/${created.id}/permissions`, { method: "POST", token: plan.token, body: { mallEnabled: true } }),
  export: await rawBinary("/admin/tenants/export", plan.token)
}, "套餐管理员");

const exportRows = await api("/admin/tenants", { headers: auth(exporter.token) });
const exportRow = exportRows.find((item) => item.id === created.id);
assert(exportRow?.sensitiveMasked === true && exportRow.contactPhone !== phone, "导出管理员列表响应未脱敏");
const exported = await rawBinary("/admin/tenants/export", exporter.token);
assert(exported.status === 200, `导出管理员导出失败：${exported.status}`);
assert(exported.contentType.includes("spreadsheetml"), `商家导出 Content-Type 错误：${exported.contentType}`);
assert(exported.bytes[0] === 0x50 && exported.bytes[1] === 0x4b, "商家导出文件不是有效 XLSX ZIP 文件");
fs.writeFileSync(path.join(outputDir, "tenants.xlsx"), exported.bytes);
expectDenied({
  create: await rawJson("/admin/tenants", { method: "POST", token: exporter.token, body: { ...createPayload, code: `${code}_export` } }),
  update: await rawJson(`/admin/tenants/${created.id}`, { method: "PATCH", token: exporter.token, body: createPayload }),
  rights: await rawJson(`/admin/tenants/${created.id}/permissions`, { method: "POST", token: exporter.token, body: { mallEnabled: true } }),
  subscription: await rawJson(`/admin/tenants/${created.id}/subscription-change`, { method: "POST", token: exporter.token, body: { action: "suspend" } })
}, "导出管理员");

const tenantScope = await rawJson("/admin/tenants", { token: tenantAdmin.token });
assert(tenantScope.status === 403, `租户账号访问平台商家列表应为 403，实际 ${tenantScope.status}`);

const platformAdmin = await loginPlatformAdmin();
const audits = {};
for (const [username, action] of [
  ["showcase_tenant_manager", "tenant.create"],
  ["showcase_tenant_rights", "tenant.permissions.update"],
  ["showcase_tenant_plan", "tenant.subscription.upgrade"],
  ["showcase_tenant_export", "export.tenants"]
]) {
  const page = await api(`/admin/operation-logs?adminUsername=${encodeURIComponent(username)}&action=${encodeURIComponent(action)}&pageSize=20`, { headers: auth(platformAdmin.token) });
  const row = page.items?.find((item) => item.adminUsername === username && item.action === action && (action === "export.tenants" || Number(item.targetId) === Number(created.id)));
  assert(row, `未找到 ${username} 的 ${action} 审计记录`);
  audits[action] = row.id;
}

const result = {
  runId,
  tenant: { id: created.id, code, name: managerUpdated.name, phone, finalPlan: planChange.tenant.settings.packagePlan },
  viewer: { maskedPhone: viewerRow.contactPhone, sensitiveMasked: viewerRow.sensitiveMasked, mobileTenantCount: mobileBootstrap.tenants.length, dashboardScope: viewerDashboard.scope },
  manager: { fullPhone: managerRow.contactPhone, sensitiveMasked: managerRow.sensitiveMasked },
  rights: { registrationReviewEnabled: rightsUpdated.settings.registrationReviewEnabled, mallEnabled: rightsUpdated.settings.mallEnabled },
  subscription: { eventId: planChange.event.id, eventCount: planEvents.length, plan: planChange.tenant.settings.packagePlan, expiresAt: planChange.tenant.settings.packageExpiresAt, noOpRenewalStatus: noOpRenewal.status },
  export: { status: exported.status, bytes: exported.bytes.length },
  tenantScopeStatus: tenantScope.status,
  audits,
  createdAt: new Date().toISOString()
};
fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
