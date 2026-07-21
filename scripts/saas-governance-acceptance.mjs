import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const apiBase = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const output = path.resolve(process.env.SAAS_GOVERNANCE_RESULT_FILE || path.join(root, ".local-logs", `saas-governance-${Date.now()}`, "result.json"));
const tenantA = { code: required("TENANT_A_CODE"), username: required("TENANT_A_ADMIN"), password: required("TENANT_A_PASSWORD"), finance: required("TENANT_A_FINANCE_ADMIN"), financePassword: required("TENANT_A_FINANCE_PASSWORD") };
const tenantB = { code: required("TENANT_B_CODE"), username: required("TENANT_B_ADMIN"), password: required("TENANT_B_PASSWORD"), finance: required("TENANT_B_FINANCE_ADMIN"), financePassword: required("TENANT_B_FINANCE_PASSWORD") };
const result = { startedAt: new Date().toISOString(), apiBase, status: "running", checks: [], retained: {} };

function required(key) { if (!process.env[key]) throw new Error(`${key} is required`); return process.env[key]; }
function auth(token) { return { Authorization: `Bearer ${token}` }; }
function tenantHeader(code) { return { "x-tenant-code": code }; }
function assert(condition, message) { if (!condition) throw new Error(message); }

async function request(route, options = {}) {
  const response = await fetch(`${apiBase}${route}`, { method: options.method || "GET", headers: { ...(options.headers || {}) }, body: options.body });
  const text = await response.text();
  let payload = null; try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}

async function api(route, options = {}) {
  const { response, payload } = await request(route, options);
  if (!response.ok || payload?.code !== 0) throw new Error(`${options.method || "GET"} ${route} failed: ${payload?.message || response.status}`);
  return payload.data;
}

async function expectFailure(route, options, label) {
  const { response, payload } = await request(route, options);
  assert(!response.ok || payload?.code !== 0, `${label} should be rejected`);
  return { status: response.status, message: payload?.message || String(payload) };
}

async function login(account, password) {
  const data = await api("/admin/auth/login", { method: "POST", body: JSON.stringify({ username: account, password }), headers: { "Content-Type": "application/json" } });
  assert(data.token && data.admin?.tenantId, `${account} tenant login missing`);
  return data;
}

async function upload(token, code, label) {
  const form = new FormData();
  form.append("file", new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" }), `${label}.png`);
  const data = await api("/admin/uploads/images", { method: "POST", headers: { ...auth(token), ...tenantHeader(code) }, body: form });
  assert(data.url && data.url.includes(`images-t`), `${label} upload key missing tenant scope`);
  return data;
}

async function main() {
  const [a, b, aFinance, bFinance] = await Promise.all([
    login(tenantA.username, tenantA.password), login(tenantB.username, tenantB.password), login(tenantA.finance, tenantA.financePassword), login(tenantB.finance, tenantB.financePassword)
  ]);
  result.retained.tenantIds = { a: a.admin.tenantId, b: b.admin.tenantId };

  const financeDenied = await expectFailure("/admin/finance/dashboard", { headers: auth(a.token) }, "operator accessing finance dashboard");
  assert(financeDenied.status === 403, "operator finance access should return 403");
  result.checks.push({ name: "角色权限：运营拒绝财务看板", status: "passed", responseStatus: financeDenied.status });

  const [uploadA, uploadB] = await Promise.all([upload(a.token, tenantA.code, "saas-final-a"), upload(b.token, tenantB.code, "saas-final-b")]);
  assert(uploadA.url.includes(`images-t${a.admin.tenantId}-a${a.admin.id}`), "Tenant A image key is not scoped to actor tenant");
  assert(uploadB.url.includes(`images-t${b.admin.tenantId}-a${b.admin.id}`), "Tenant B image key is not scoped to actor tenant");
  result.retained.uploads = { a: uploadA.url, b: uploadB.url };
  result.checks.push({ name: "文件存储：对象键租户与操作者作用域", status: "passed" });

  const mysql = createRequire(path.join(root, "apps/api/package.json"))("mysql2/promise");
  const db = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 13306), user: process.env.DB_USERNAME || "activity", password: process.env.DB_PASSWORD || "activitypass", database: process.env.DB_DATABASE || "activity_registration", timezone: "+08:00" });
  const key = `saas-governance-${Date.now()}`;
  const [aInsert] = await db.execute("INSERT INTO business_jobs (tenantId,type,idempotencyKey,status,payload,result,attemptCount,maxAttempts,nextAttemptAt,lockedUntil,lockedBy,lastError,requestId,completedAt,deadLetteredAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [a.admin.tenantId, "saas.governance", key, "pending", JSON.stringify({ tenant: tenantA.code }), null, 0, 3, new Date(), null, null, null, `req-${key}-a`, null, null, new Date(), new Date()]);
  const [bInsert] = await db.execute("INSERT INTO business_jobs (tenantId,type,idempotencyKey,status,payload,result,attemptCount,maxAttempts,nextAttemptAt,lockedUntil,lockedBy,lastError,requestId,completedAt,deadLetteredAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [b.admin.tenantId, "saas.governance", key, "pending", JSON.stringify({ tenant: tenantB.code }), null, 0, 3, new Date(), null, null, null, `req-${key}-b`, null, null, new Date(), new Date()]);
  await db.end();
  const jobAId = Number(aInsert.insertId); const jobBId = Number(bInsert.insertId);
  result.retained.businessJobs = { a: jobAId, b: jobBId, idempotencyKey: key };

  const [jobsA, jobsB] = await Promise.all([api("/admin/business-jobs?type=saas.governance&pageSize=100", { headers: auth(a.token) }), api("/admin/business-jobs?type=saas.governance&pageSize=100", { headers: auth(b.token) })]);
  assert(jobsA.items.some((job) => job.id === jobAId) && !jobsA.items.some((job) => job.id === jobBId), "Tenant A business jobs leaked or missing");
  assert(jobsB.items.some((job) => job.id === jobBId) && !jobsB.items.some((job) => job.id === jobAId), "Tenant B business jobs leaked or missing");
  result.checks.push({ name: "异步任务：列表租户隔离", status: "passed" });

  const crossCancel = await expectFailure(`/admin/business-jobs/${jobAId}/cancel`, { method: "POST", headers: auth(b.token) }, "Tenant B cancelling Tenant A job");
  assert(crossCancel.status === 404, "cross-tenant job cancellation should return 404");
  await api(`/admin/business-jobs/${jobAId}/cancel`, { method: "POST", headers: auth(a.token) });
  await api(`/admin/business-jobs/${jobBId}/cancel`, { method: "POST", headers: auth(b.token) });
  result.checks.push({ name: "异步任务：跨租户操作拒绝与本租户取消", status: "passed" });
  result.status = "passed";
  result.finishedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`SaaS governance acceptance result: ${output}`);
}

main().catch((error) => { result.status = "failed"; result.error = error.stack || error.message; result.finishedAt = new Date().toISOString(); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`); console.error(error.stack || error.message); process.exitCode = 1; });
