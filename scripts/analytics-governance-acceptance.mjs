import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const PLATFORM_USERNAME = process.env.PLATFORM_ADMIN_USERNAME || "admin";
const PLATFORM_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || "Admin123456";
const TENANT_USERNAME = process.env.ANALYTICS_TENANT_USERNAME || "showcase_analytics_exporter";
const READONLY_USERNAME = process.env.ANALYTICS_READONLY_USERNAME || "showcase_analytics_readonly";
const TENANT_PASSWORD = process.env.ANALYTICS_TENANT_PASSWORD || "Qiwai123456";
const TENANT_ID = Number(process.env.ANALYTICS_TENANT_ID || 23);
const START_DATE = process.env.ANALYTICS_START_DATE || "2026-07-15";
const END_DATE = process.env.ANALYTICS_END_DATE || "2026-07-17";

function assert(condition, message) { if (!condition) throw new Error(message); }
function assertBoundedRate(value, label) { const rate = Number(value || 0); assert(Number.isFinite(rate) && rate >= 0 && rate <= 100, `${label} rate out of range: ${value}`); }

async function request(path, { method = "GET", token, body, raw = false, expectedStatus } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const statusMatches = expectedStatus === undefined ? response.ok : response.status === expectedStatus;
  assert(statusMatches, `${method} ${path} failed (${response.status}): ${text}`);
  if (raw) return { text, headers: response.headers };
  const payload = text ? JSON.parse(text) : null;
  if ((expectedStatus || response.status) >= 400) return payload;
  assert(payload?.code === 0, `${method} ${path} failed: ${text}`);
  return payload.data;
}

async function ensureAnalyticsAccount(platformToken, username, permissions) {
  const admins = await request(`/admin/admins?includeSmoke=true&pageSize=50&keyword=${encodeURIComponent(username)}`, { token: platformToken });
  const rows = Array.isArray(admins) ? admins : admins?.items || admins?.list || [];
  const account = rows.find((item) => item.username === username);
  const update = { role: "finance", tenantId: TENANT_ID, enabled: true, permissions };
  if (!account) await request("/admin/admins", { method: "POST", token: platformToken, body: { username, password: TENANT_PASSWORD, ...update } });
  else {
    await request(`/admin/admins/${account.id}`, { method: "PATCH", token: platformToken, body: update });
    await request(`/admin/admins/${account.id}/password`, { method: "POST", token: platformToken, body: { password: TENANT_PASSWORD } });
  }
}

async function ensureAnalyticsAccountQuota(platformToken) {
  const tenants = await request("/admin/tenants", { token: platformToken });
  const tenant = tenants.find((item) => Number(item.id) === TENANT_ID);
  assert(tenant, `tenant ${TENANT_ID} not found`);
  const current = Number(tenant.settings?.entitlements?.quotas?.adminUsers || 0);
  if (current >= 40) return;
  const entitlements = structuredClone(tenant.settings?.entitlements || tenant.packageTemplate?.entitlements || {});
  entitlements.quotas = { ...(entitlements.quotas || {}), adminUsers: 40 };
  await request(`/admin/tenants/${TENANT_ID}/permissions`, { method: "POST", token: platformToken, body: { entitlements } });
}

async function login(username, password) {
  const data = await request("/admin/auth/login", { method: "POST", body: { username, password } });
  assert(data.token, `${username} login token missing`);
  return data;
}

const platform = await login(PLATFORM_USERNAME, PLATFORM_PASSWORD);
await ensureAnalyticsAccountQuota(platform.token);
await ensureAnalyticsAccount(platform.token, TENANT_USERNAME, ["analytics.view", "analytics.export", "activity.view"]);
await ensureAnalyticsAccount(platform.token, READONLY_USERNAME, ["analytics.view"]);
const tenant = await login(TENANT_USERNAME, TENANT_PASSWORD);
const readonly = await login(READONLY_USERNAME, TENANT_PASSWORD);
const range = `startDate=${START_DATE}&endDate=${END_DATE}`;

assert(tenant.admin?.permissions.includes("analytics.export"), "analytics exporter permission missing");
assert(readonly.admin?.permissions.includes("analytics.view"), "analytics readonly view permission missing");
assert(!readonly.admin?.permissions.includes("analytics.export"), "analytics readonly unexpectedly received export permission");
assert(!readonly.admin?.permissions.includes("analytics.manage"), "analytics readonly unexpectedly received manage permission");
await request(`/admin/analytics/overview?${range}`, { token: readonly.token });
await request(`/admin/analytics/growth?${range}`, { token: readonly.token });
await request(`/admin/analytics/business-details?${range}&module=activity`, { token: readonly.token });
await request(`/admin/analytics/overview?startDate=2026-02-30&endDate=${END_DATE}`, { token: readonly.token, expectedStatus: 400 });
await request(`/admin/analytics/overview?startDate=${END_DATE}&endDate=${START_DATE}`, { token: readonly.token, expectedStatus: 400 });
await request("/admin/analytics/recompute", { method: "POST", token: readonly.token, body: { startDate: START_DATE, endDate: END_DATE }, expectedStatus: 403 });
await request(`/admin/analytics/metrics-export?${range}`, { token: readonly.token, expectedStatus: 403 });
await request(`/admin/analytics/growth-export?${range}`, { token: readonly.token, expectedStatus: 403 });
await request(`/admin/analytics/business-export?${range}&module=activity`, { token: readonly.token, expectedStatus: 403 });

const recompute = await request("/admin/analytics/recompute", { method: "POST", token: platform.token, body: { startDate: START_DATE, endDate: END_DATE } });
const tenantRecompute = await request("/admin/analytics/recompute", { method: "POST", token: platform.token, body: { tenantId: TENANT_ID, startDate: START_DATE, endDate: END_DATE } });
assert(recompute.status === "completed", `analytics run status is ${recompute.status}`);
assert(tenantRecompute.status === "completed", `tenant analytics run status is ${tenantRecompute.status}`);
assert(Number(recompute.mismatchCount || 0) === 0, `analytics run has ${recompute.mismatchCount} mismatches`);
assert(Number(tenantRecompute.mismatchCount || 0) === 0, `tenant analytics run has ${tenantRecompute.mismatchCount} mismatches`);
assert(recompute.validationSummary?.consistent === true, "analytics run is not consistent");
assert(recompute.validationSummary?.calculationVersion === "activity-metrics-v1", `unexpected calculation version ${recompute.validationSummary?.calculationVersion}`);

const [platformMetrics, platformOverview, unboundedOverview, businessOverview, tenantBusinessOverview, platformUsers, tenantOverview, tenantUsers] = await Promise.all([
  request(`/admin/analytics/metrics?${range}`, { token: platform.token }),
  request(`/admin/analytics/overview?${range}`, { token: platform.token }),
  request("/admin/analytics/overview", { token: platform.token }),
  request(`/admin/analytics/business-overview?${range}`, { token: platform.token }),
  request(`/admin/analytics/business-overview?${range}`, { token: tenant.token }),
  request(`/admin/analytics/users?${range}`, { token: platform.token }),
  request(`/admin/analytics/overview?${range}`, { token: tenant.token }),
  request(`/admin/analytics/users?${range}`, { token: tenant.token })
]);
assert(platformMetrics.length > 0, "recompute produced no metric rows");
assert(platformMetrics.every((row) => row.sourceRunId && row.calculationVersion === "activity-metrics-v1"), "metric row is missing run/version snapshot");
assert(platformMetrics.some((row) => row.metricDate === END_DATE && row.dimensionType === "platform" && row.dimensionKey === "all"), "inclusive end date is missing from root metrics");
assert(platformOverview.scope === "platform", `unexpected platform scope ${platformOverview.scope}`);
assert(platformOverview.metricSource === "daily_metrics", `covered range unexpectedly used ${platformOverview.metricSource}`);
assert(unboundedOverview.metricSource === "live_tables", `unbounded overview unexpectedly used ${unboundedOverview.metricSource}`);
assert(tenantOverview.scope === "tenant", `unexpected tenant scope ${tenantOverview.scope}`);
assert(tenantOverview.metricSource === "daily_metrics", `covered tenant range unexpectedly used ${tenantOverview.metricSource}`);
for (const row of [...(businessOverview.modules || []), ...(businessOverview.merchants || [])]) {
  const expectedNet = Number(row.grossAmountFen || 0) - Number(row.refundAmountFen || 0);
  assert(Number(row.amountFen || 0) === expectedNet, `${row.key || row.code || row.id} business net amount mismatch`);
}
for (const [key, value] of Object.entries(platformOverview.rates || {})) assertBoundedRate(value, `platform overview ${key}`);
for (const [key, value] of Object.entries(tenantOverview.rates || {})) assertBoundedRate(value, `tenant overview ${key}`);
assert(platformUsers.newUserCount !== tenantUsers.newUserCount || platformUsers.repeatUserCount !== tenantUsers.repeatUserCount, "platform and tenant user metrics are unexpectedly identical");
assert(tenantUsers.memberLevels.reduce((sum, row) => sum + Number(row.count || 0), 0) <= 1000, "tenant member-level distribution appears to contain platform profiles");

const [tenantGrowth, spoofedGrowth, platformGrowth] = await Promise.all([
  request(`/admin/analytics/growth?${range}`, { token: tenant.token }),
  request(`/admin/analytics/growth?${range}&tenantId=42`, { token: tenant.token }),
  request(`/admin/analytics/growth?${range}`, { token: platform.token })
]);
assert(JSON.stringify(tenantGrowth) === JSON.stringify(spoofedGrowth), "tenantId query parameter changed tenant-scoped growth data");
assert(tenantGrowth.scope === "tenant" && platformGrowth.scope === "platform", "growth scope labels are incorrect");
assert(tenantGrowth.cohort.users <= platformGrowth.cohort.users, "tenant cohort exceeds platform cohort");
for (const [key, value] of Object.entries(tenantGrowth.rates || {})) assertBoundedRate(value, `tenant growth ${key}`);
for (const row of tenantGrowth.sources || []) { assertBoundedRate(row.signupRate, `source ${row.source} signup`); assertBoundedRate(row.paymentRate, `source ${row.source} payment`); }
for (const row of tenantGrowth.channels || []) { assertBoundedRate(row.signupRate, `channel ${row.code} signup`); assertBoundedRate(row.paymentRate, `channel ${row.code} payment`); }

const moduleCounts = {};
const businessDetails = {};
for (const module of ["activity", "course", "mall", "charity"]) {
  const result = await request(`/admin/analytics/business-details?${range}&module=${module}&page=1&pageSize=2`, { token: platform.token });
  assert(Array.isArray(result.items), `${module} detail items are not an array`);
  assert(result.page === 1 && result.pageSize === 2, `${module} pagination metadata is invalid`);
  assert(result.items.length <= 2 && result.total >= result.items.length, `${module} pagination bounds are invalid`);
  for (const row of result.items) assert(Number(row.amountFen || 0) === Number(row.grossAmountFen || 0) - Number(row.refundAmountFen || 0), `${module} row ${row.id} net amount mismatch`);
  let secondPage = { items: [], page: 2, pageSize: 2, total: result.total };
  if (result.total > 2) {
    secondPage = await request(`/admin/analytics/business-details?${range}&module=${module}&page=2&pageSize=2`, { token: platform.token });
    assert(secondPage.page === 2 && secondPage.items.every((row) => !result.items.some((first) => first.id === row.id)), `${module} second page overlaps first page`);
  }
  moduleCounts[module] = result.total;
  const allRows = [];
  for (let page = 1; allRows.length < result.total; page++) {
    const batch = await request(`/admin/analytics/business-details?${range}&module=${module}&page=${page}&pageSize=100`, { token: platform.token });
    allRows.push(...batch.items);
    if (!batch.items.length) break;
  }
  assert(allRows.length === result.total, `${module} paged detail collection is incomplete`);
  const amounts = allRows.reduce((sum, row) => ({ grossAmountFen: sum.grossAmountFen + Number(row.grossAmountFen || 0), refundAmountFen: sum.refundAmountFen + Number(row.refundAmountFen || 0), amountFen: sum.amountFen + Number(row.amountFen || 0) }), { grossAmountFen: 0, refundAmountFen: 0, amountFen: 0 });
  const overviewModule = (businessOverview.modules || []).find((row) => row.key === module);
  if (module !== "charity") {
    assert(amounts.grossAmountFen === Number(overviewModule?.grossAmountFen || 0), `${module} overview/detail gross amount mismatch`);
    assert(amounts.refundAmountFen === Number(overviewModule?.refundAmountFen || 0), `${module} overview/detail refund amount mismatch`);
    assert(amounts.amountFen === Number(overviewModule?.amountFen || 0), `${module} overview/detail net amount mismatch`);
  }
  const csv = await request(`/admin/analytics/business-export?${range}&module=${module}`, { token: platform.token, raw: true });
  assert(csv.text.startsWith("\uFEFF\"") || csv.text.startsWith("\""), `${module} CSV header missing`);
  assert(csv.text.length > 30, `${module} CSV is empty`);
  assert(csv.text.includes("毛额分") && csv.text.includes("退款分") && csv.text.includes("净额分"), `${module} CSV money columns are incomplete`);
  assert(csv.text.split("\r\n").length - 1 === result.total, `${module} CSV row count does not match detail total`);
  businessDetails[module] = { total: result.total, pageSize: result.pageSize, firstPageIds: result.items.map((row) => row.id), secondPageIds: secondPage.items.map((row) => row.id), amounts };
}

const tenantActivityDetails = await request(`/admin/analytics/business-details?${range}&module=activity&page=1&pageSize=100`, { token: tenant.token });
assert(tenantActivityDetails.total <= moduleCounts.activity, "tenant activity total exceeds platform total");
assert(tenantBusinessOverview.scope === "tenant", "tenant business overview scope is incorrect");

const growthCsv = await request(`/admin/analytics/growth-export?${range}`, { token: tenant.token, raw: true });
const metricCsv = await request(`/admin/analytics/metrics-export?${range}`, { token: platform.token, raw: true });
assert(growthCsv.text.length > 100, "tenant growth CSV is empty");
assert(metricCsv.text.length > 100, "metric CSV is empty");

const result = {
  ok: true,
  runId: recompute.runId,
  tenantRunId: tenantRecompute.runId,
  sourceEventCount: recompute.validationSummary?.sourceEventCount,
  metricCount: recompute.metricCount,
  mismatchCount: recompute.mismatchCount,
  platformUserMetrics: platformUsers,
  tenantUserMetrics: tenantUsers,
  platformCohort: platformGrowth.cohort,
  tenantCohort: tenantGrowth.cohort,
  cohortDefinition: { range: { startDate: START_DATE, endDate: END_DATE }, firstParticipation: "用户完整历史中的首次有效活动报名落在统计区间", retentionEligibility: "截至区间结束时已满 7/30 个自然日", fullyRefundedOrdersCountAsPaid: false, sourceRowHardLimit: 100000 },
  readonlyAccount: READONLY_USERNAME,
  exporterAccount: TENANT_USERNAME,
  moduleCounts,
  businessOverview: { platform: businessOverview, tenant: tenantBusinessOverview },
  businessDetails,
  tenantActivityBoundary: { total: tenantActivityDetails.total, firstPageIds: tenantActivityDetails.items.map((row) => row.id) },
  growthCsvBytes: Buffer.byteLength(growthCsv.text),
  metricCsvBytes: Buffer.byteLength(metricCsv.text)
};
const evidenceDir = resolve(".local-logs", `analytics-governance-${Date.now()}`);
mkdirSync(evidenceDir, { recursive: true });
writeFileSync(resolve(evidenceDir, "result.json"), JSON.stringify({ ...result, createdAt: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ ...result, evidenceDir }, null, 2));
