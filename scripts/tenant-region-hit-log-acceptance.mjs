import fs from "node:fs";
import path from "node:path";
import { API_BASE, api, assert, auth, env, loginPlatformAdmin, loginShowcaseAdmin, tryApi } from "./online-showcase-lib.mjs";

const password = env("SHOWCASE_PASSWORD");
const runId = `tenant-region-hit-log-${Date.now()}`;
const source = `region_log_acceptance_${Date.now()}`;
const outputDir = path.resolve(".local-logs", runId);
fs.mkdirSync(outputDir, { recursive: true });

async function raw(pathname, token) {
  const response = await fetch(`${API_BASE}${pathname}`, { headers: auth(token) });
  return { status: response.status, contentType: response.headers.get("content-type") || "", bytes: Buffer.from(await response.arrayBuffer()) };
}

await api(`/public/tenants/resolve?lat=29.844&lng=106.056&source=${encodeURIComponent(source)}`);

const readAdmin = await loginShowcaseAdmin("showcase_region_log_read");
const sensitiveAdmin = await loginShowcaseAdmin("showcase_region_log_sensitive");
const exportAdmin = await loginShowcaseAdmin("showcase_region_log_export");
const tenantAdmin = await loginShowcaseAdmin("showcase_ops");
assert(readAdmin.token && sensitiveAdmin.token && exportAdmin.token && tenantAdmin.token && password, "测试账号登录失败");

const options = await api("/admin/tenant-region-hit-logs/options", { headers: auth(readAdmin.token) });
const summary = await api(`/admin/tenant-region-hit-logs/summary?source=${encodeURIComponent(source)}`, { headers: auth(readAdmin.token) });
const readList = await api(`/admin/tenant-region-hit-logs?source=${encodeURIComponent(source)}`, { headers: auth(readAdmin.token) });
const readRow = readList.items?.[0];
assert(Array.isArray(options) && options.length > 0, "只读账号未获得商家筛选选项");
assert(summary.total >= 1 && readList.total >= 1 && readRow, "只读账号未查询到本次定位日志");
assert(readRow.latitude === null && readRow.longitude === null, "只读响应泄露精确坐标");
assert(readRow.userAgent === null && readRow.sensitiveMasked === true, "只读响应泄露完整终端信息");
assert(!readRow.clientIp || readRow.clientIp.includes("*") || readRow.clientIp === "已脱敏", "只读响应泄露完整 IP");

const readExport = await raw(`/admin/tenant-region-hit-logs/export?source=${encodeURIComponent(source)}`, readAdmin.token);
assert(readExport.status === 403, `只读账号导出应为 403，实际 ${readExport.status}`);

const sensitiveList = await api(`/admin/tenant-region-hit-logs?source=${encodeURIComponent(source)}`, { headers: auth(sensitiveAdmin.token) });
const sensitiveRow = sensitiveList.items?.[0];
assert(typeof sensitiveRow?.latitude === "number" && typeof sensitiveRow?.longitude === "number", "敏感账号未获得精确坐标");
assert(typeof sensitiveRow?.userAgent === "string" && sensitiveRow.userAgent.length > 0, "敏感账号未获得完整终端信息");
assert(sensitiveRow.sensitiveMasked === false, "敏感账号仍被标记为脱敏响应");
const sensitiveExport = await raw(`/admin/tenant-region-hit-logs/export?source=${encodeURIComponent(source)}`, sensitiveAdmin.token);
assert(sensitiveExport.status === 403, `敏感账号导出应为 403，实际 ${sensitiveExport.status}`);

const exportList = await api(`/admin/tenant-region-hit-logs?source=${encodeURIComponent(source)}`, { headers: auth(exportAdmin.token) });
assert(typeof exportList.items?.[0]?.latitude === "number", "导出权限未继承敏感查看权限");
const exported = await raw(`/admin/tenant-region-hit-logs/export?source=${encodeURIComponent(source)}`, exportAdmin.token);
assert(exported.status === 200, `导出账号导出失败：${exported.status}`);
assert(exported.contentType.includes("spreadsheetml"), `导出 Content-Type 错误：${exported.contentType}`);
assert(exported.bytes[0] === 0x50 && exported.bytes[1] === 0x4b, "导出文件不是有效 XLSX ZIP 文件");
fs.writeFileSync(path.join(outputDir, "tenant-region-hit-logs.xlsx"), exported.bytes);

const tenantRead = await tryApi(`/admin/tenant-region-hit-logs?source=${encodeURIComponent(source)}`, { headers: auth(tenantAdmin.token) });
assert(!tenantRead.ok && String(tenantRead.error?.message || "").includes("无权限"), "租户账号未被平台日志接口拒绝");

const platformAdmin = await loginPlatformAdmin();
const audit = await api(`/admin/operation-logs?action=${encodeURIComponent("export.tenant_region_hit_logs")}&adminUsername=showcase_region_log_export&pageSize=20`, { headers: auth(platformAdmin.token) });
const auditRow = audit.items?.find((item) => item.action === "export.tenant_region_hit_logs" && item.adminUsername === "showcase_region_log_export");
assert(auditRow, "未找到定位日志导出审计记录");

const result = {
  runId,
  source,
  read: { options: options.length, total: readList.total, rowId: readRow.id, masked: readRow.sensitiveMasked, exportStatus: readExport.status },
  sensitive: { total: sensitiveList.total, rowId: sensitiveRow.id, masked: sensitiveRow.sensitiveMasked, exportStatus: sensitiveExport.status },
  export: { total: exportList.total, status: exported.status, bytes: exported.bytes.length, auditId: auditRow.id },
  tenantScopeRejected: true,
  createdAt: new Date().toISOString()
};
fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
