import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiBase = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const output = path.resolve(process.env.TENANT_REGION_RESULT_FILE || path.join(root, ".local-logs", `tenant-region-${Date.now()}`, "result.json"));
const platformUsername = process.env.PLATFORM_ADMIN_USERNAME || "admin";
const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD || "Admin123456";
const tenantA = { code: required("TENANT_A_CODE") };
const tenantB = { code: required("TENANT_B_CODE") };
const result = { startedAt: new Date().toISOString(), status: "running", checks: [], retained: {} };

function required(key) { if (!process.env[key]) throw new Error(`${key} is required`); return process.env[key]; }
function assert(condition, message) { if (!condition) throw new Error(message); }
function auth(token) { return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }; }
async function request(route, options = {}) {
  const response = await fetch(`${apiBase}${route}`, { method: options.method || "GET", headers: options.headers || {}, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const text = await response.text(); let payload = null; try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}
async function api(route, options = {}) { const { response, payload } = await request(route, options); if (!response.ok || payload?.code !== 0) throw new Error(`${options.method || "GET"} ${route} failed: ${payload?.message || response.status}`); return payload.data; }
async function failure(route, options, label) { const { response, payload } = await request(route, options); assert(!response.ok || payload?.code !== 0, `${label} should fail`); return { status: response.status, message: payload?.message || String(payload) }; }
async function main() {
  const platform = await api("/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: { username: platformUsername, password: platformPassword } });
  assert(platform.admin?.role === "super_admin", "platform admin login required");
  const tenants = await api("/admin/tenants?pageSize=100", { headers: auth(platform.token) });
  const rows = Array.isArray(tenants) ? tenants : tenants.items;
  const a = rows.find((row) => row.code === tenantA.code); const b = rows.find((row) => row.code === tenantB.code);
  assert(a?.id && b?.id, "acceptance tenants not found");
  const suffix = Date.now();
  const base = { province: "验收省", city: "验收城市", district: "隔离区", latitude: 5, longitude: 100, radiusMeters: 1000, exclusive: true, priority: 90, enabled: true, validFrom: "2026-01-01", validUntil: "2030-12-31" };
  const regionA = await api("/admin/tenant-regions", { method: "POST", headers: auth(platform.token), body: { ...base, tenantId: a.id, name: `区域A-${suffix}`, longitude: 100 } });
  const regionBFar = await api("/admin/tenant-regions", { method: "POST", headers: auth(platform.token), body: { ...base, tenantId: b.id, name: `区域B远端-${suffix}`, latitude: 5.1, longitude: 100.1 } });
  const regionBOverlap = await api("/admin/tenant-regions", { method: "POST", headers: auth(platform.token), body: { ...base, tenantId: b.id, name: `区域B冲突-${suffix}`, latitude: 5.005, longitude: 100.005 } });
  assert(regionA.authorizationStatus === "approved", "non-overlapping A region should be approved");
  assert(regionBFar.authorizationStatus === "approved", "non-overlapping B region should be approved");
  assert(regionBOverlap.authorizationStatus === "pending", "overlapping B region should wait for approval");
  result.retained.regions = { a: regionA.id, bFar: regionBFar.id, bOverlap: regionBOverlap.id };
  result.checks.push({ name: "区域保护：非冲突自动批准、冲突进入待审批", status: "passed" });

  const approvalFailure = await failure(`/admin/tenant-regions/${regionBOverlap.id}/approval`, { method: "POST", headers: auth(platform.token), body: { status: "approved", remark: "冲突审批应被拦截" } }, "approving overlapping region");
  assert(approvalFailure.status === 400, "overlapping region approval should return 400");
  const rejected = await api(`/admin/tenant-regions/${regionBOverlap.id}/approval`, { method: "POST", headers: auth(platform.token), body: { status: "rejected", remark: "与区域A重叠" } });
  assert(rejected.authorizationStatus === "rejected", "region rejection status missing");
  result.checks.push({ name: "区域审批：批准时二次冲突检查、驳回保留原因", status: "passed" });

  const matched = await api("/public/tenants/resolve?lat=5&lng=100&source=tenant-region-acceptance");
  assert(matched.matched && matched.tenant?.code === tenantA.code && matched.region?.authorizationStatus === "approved", "location should match A tenant region");
  const fallback = await api("/public/tenants/resolve?lat=45&lng=-120&source=tenant-region-acceptance-fallback");
  assert(fallback.fallback && Array.isArray(fallback.tenants), "unmatched location should return manual tenant fallback");
  result.checks.push({ name: "定位匹配：命中区域与未命中手动兜底", status: "passed" });
  await new Promise((resolve) => setTimeout(resolve, 500));
  const [matchedLogs, fallbackLogs] = await Promise.all([
    api("/admin/tenant-region-hit-logs?source=tenant-region-acceptance&pageSize=100", { headers: auth(platform.token) }),
    api("/admin/tenant-region-hit-logs?source=tenant-region-acceptance-fallback&pageSize=100", { headers: auth(platform.token) })
  ]);
  assert(matchedLogs.items.some((item) => item.tenant?.code === tenantA.code && item.matched), "matched location hit log missing");
  assert(fallbackLogs.items.some((item) => !item.matched), "fallback location hit log missing");
  result.checks.push({ name: "定位审计：命中与未命中日志可查询", status: "passed" });
  result.status = "passed"; result.finishedAt = new Date().toISOString(); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`); console.log(`Tenant region acceptance result: ${output}`);
}
main().catch((error) => { result.status = "failed"; result.error = error.stack || error.message; result.finishedAt = new Date().toISOString(); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`); console.error(error.stack || error.message); process.exitCode = 1; });
