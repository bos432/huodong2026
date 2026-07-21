import fs from "node:fs";
import path from "node:path";
import { API_BASE, api, assert, auth, loginPlatformAdmin, loginShowcaseAdmin } from "./online-showcase-lib.mjs";

const runId = `tenant-region-permission-${Date.now()}`;
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

const readAdmin = await loginShowcaseAdmin("showcase_region_read");
const managerAdmin = await loginShowcaseAdmin("showcase_region_manager");
const approverAdmin = await loginShowcaseAdmin("showcase_region_approve");
const tenantAdmin = await loginShowcaseAdmin("showcase_ops");
assert(readAdmin.token && managerAdmin.token && approverAdmin.token && tenantAdmin.token, "区域保护测试账号登录失败");

const options = await api("/admin/tenant-regions/options", { headers: auth(readAdmin.token) });
const initialRows = await api("/admin/tenant-regions", { headers: auth(readAdmin.token) });
assert(Array.isArray(options) && options.length >= 2, "区域保护筛选选项不足");
assert(Array.isArray(initialRows) && initialRows.length > 0, "区域保护列表为空");
const tenantKeys = Object.keys(initialRows[0].tenant || {}).sort();
assert(JSON.stringify(tenantKeys) === JSON.stringify(["code", "enabled", "id", "name", "region"]), `区域响应商家字段超出安全投影：${tenantKeys.join(",")}`);

const deniedPayload = {
  tenantId: options[0].id,
  name: `只读越权-${Date.now()}`,
  latitude: -70,
  longitude: -160,
  radiusMeters: 1000,
  exclusive: false,
  enabled: true
};
const readCreate = await rawJson("/admin/tenant-regions", { method: "POST", token: readAdmin.token, body: deniedPayload });
const readApproval = await rawJson(`/admin/tenant-regions/${initialRows[0].id}/approval`, { method: "POST", token: readAdmin.token, body: { status: "rejected", remark: "只读越权测试" } });
assert(readCreate.status === 403 && readApproval.status === 403, `只读账号写权限未隔离：create=${readCreate.status}, approval=${readApproval.status}`);

const suffix = Date.now();
const targetTenant = options.find((item) => item.enabled && item.code !== "platform") || options[0];
const managerRegion = await api("/admin/tenant-regions", {
  method: "POST",
  headers: auth(managerAdmin.token),
  body: JSON.stringify({
    tenantId: targetTenant.id,
    province: "权限验收省",
    city: "权限验收市",
    district: "维护区",
    name: `区域维护权限验收-${suffix}`,
    latitude: -70,
    longitude: -160,
    radiusMeters: 1200,
    exclusive: false,
    priority: 11,
    validFrom: "2026-01-01",
    validUntil: "2030-12-31",
    enabled: true,
    remark: "保留的维护权限验收数据"
  })
});
assert(managerRegion.id && managerRegion.authorizationStatus === "approved", "维护账号创建区域失败");
const updatedRegion = await api(`/admin/tenant-regions/${managerRegion.id}`, {
  method: "PATCH",
  headers: auth(managerAdmin.token),
  body: JSON.stringify({
    tenantId: targetTenant.id,
    province: managerRegion.province || "权限验收省",
    city: managerRegion.city || "权限验收市",
    district: managerRegion.district || "维护区",
    name: `${managerRegion.name}-已更新`,
    latitude: managerRegion.latitude,
    longitude: managerRegion.longitude,
    radiusMeters: managerRegion.radiusMeters,
    boundaryPoints: managerRegion.boundaryPoints,
    exclusive: managerRegion.exclusive,
    priority: managerRegion.priority,
    validFrom: managerRegion.validFrom,
    validUntil: managerRegion.validUntil,
    enabled: managerRegion.enabled,
    remark: "维护账号已完成创建和更新"
  })
});
assert(updatedRegion.name.endsWith("-已更新"), "维护账号更新区域失败");

const bulkResult = await api("/admin/tenant-regions/bulk-import", {
  method: "POST",
  headers: auth(managerAdmin.token),
  body: JSON.stringify({
    items: [{
      tenantId: targetTenant.id,
      name: `区域批量导入权限验收-${suffix}`,
      latitude: -69.5,
      longitude: -159.5,
      radiusMeters: 1000,
      exclusive: false,
      priority: 10,
      enabled: true,
      remark: "保留的批量导入验收数据"
    }]
  })
});
assert(bulkResult.total === 1 && bulkResult.succeeded === 1 && bulkResult.failed === 0, "维护账号批量导入失败");

const managerApproval = await rawJson(`/admin/tenant-regions/${managerRegion.id}/approval`, { method: "POST", token: managerAdmin.token, body: { status: "rejected", remark: "维护账号不应审批" } });
assert(managerApproval.status === 403, `维护账号不应具备审批权限，实际 ${managerApproval.status}`);

const reference = initialRows.find((row) => row.authorizationStatus === "approved" && row.enabled && row.exclusive);
assert(reference, "未找到可用于冲突审批验收的已批准排他区域");
const conflictTenant = options.find((item) => item.enabled && item.id !== reference.tenant.id && item.code !== "platform");
assert(conflictTenant, "未找到另一个可用于冲突审批验收的商家");
const pendingRegion = await api("/admin/tenant-regions", {
  method: "POST",
  headers: auth(managerAdmin.token),
  body: JSON.stringify({
    tenantId: conflictTenant.id,
    province: reference.province || "冲突验收省",
    city: reference.city || "冲突验收市",
    district: reference.district || "审批区",
    name: `区域冲突审批权限验收-${suffix}`,
    latitude: reference.latitude,
    longitude: reference.longitude,
    radiusMeters: reference.radiusMeters,
    boundaryPoints: reference.boundaryPoints,
    exclusive: true,
    priority: reference.priority,
    validFrom: "2026-01-01",
    validUntil: "2030-12-31",
    enabled: true,
    remark: "保留的冲突审批验收数据"
  })
});
assert(pendingRegion.authorizationStatus === "pending", `重叠区域应进入待审批，实际 ${pendingRegion.authorizationStatus}`);

const approverCreate = await rawJson("/admin/tenant-regions", { method: "POST", token: approverAdmin.token, body: deniedPayload });
const approverDelete = await rawJson(`/admin/tenant-regions/${managerRegion.id}`, { method: "DELETE", token: approverAdmin.token });
assert(approverCreate.status === 403 && approverDelete.status === 403, `审批账号不应维护区域：create=${approverCreate.status}, delete=${approverDelete.status}`);
const rejectedRegion = await api(`/admin/tenant-regions/${pendingRegion.id}/approval`, {
  method: "POST",
  headers: auth(approverAdmin.token),
  body: JSON.stringify({ status: "rejected", remark: "权限分离验收：与既有排他区域重叠" })
});
assert(rejectedRegion.authorizationStatus === "rejected", "审批账号驳回冲突区域失败");
const repeatedApproval = await rawJson(`/admin/tenant-regions/${pendingRegion.id}/approval`, { method: "POST", token: approverAdmin.token, body: { status: "rejected", remark: "重复审批应被拒绝" } });
assert(repeatedApproval.status === 400, `重复审批应为 400，实际 ${repeatedApproval.status}`);

const tenantRead = await rawJson("/admin/tenant-regions", { token: tenantAdmin.token });
assert(tenantRead.status === 403, `租户账号访问平台区域保护应为 403，实际 ${tenantRead.status}`);

const platformAdmin = await loginPlatformAdmin();
const audit = await api(`/admin/operation-logs?adminUsername=showcase_region_approve&pageSize=20`, { headers: auth(platformAdmin.token) });
const approvalAudit = audit.items?.find((item) => item.action === "tenant_region.rejected" && Number(item.targetId) === Number(pendingRegion.id));
assert(approvalAudit, "未找到区域冲突审批审计记录");

const result = {
  runId,
  read: { options: options.length, regions: initialRows.length, tenantKeys, createStatus: readCreate.status, approvalStatus: readApproval.status },
  manage: { createdId: managerRegion.id, updatedName: updatedRegion.name, bulkCreatedId: bulkResult.items?.[0]?.region?.id, approvalStatus: managerApproval.status },
  approve: { pendingId: pendingRegion.id, finalStatus: rejectedRegion.authorizationStatus, createStatus: approverCreate.status, deleteStatus: approverDelete.status, repeatedStatus: repeatedApproval.status, auditId: approvalAudit.id },
  tenantScopeStatus: tenantRead.status,
  createdAt: new Date().toISOString()
};
fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
