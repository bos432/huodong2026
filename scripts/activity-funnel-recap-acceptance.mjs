import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const PLATFORM_USERNAME = process.env.PLATFORM_ADMIN_USERNAME || "admin";
const PLATFORM_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || "Admin123456";
const PASSWORD = process.env.SHOWCASE_PASSWORD || "Qiwai123456";
const TENANT_ID = Number(process.env.FUNNEL_RECAP_TENANT_ID || 23);
const ACTIVITY_ID = Number(process.env.FUNNEL_RECAP_ACTIVITY_ID || 149);
const READONLY_USERNAME = process.env.FUNNEL_RECAP_READONLY_USERNAME || "showcase_funnel_recap_readonly";
const MANAGER_USERNAME = process.env.FUNNEL_RECAP_MANAGER_USERNAME || "showcase_funnel_recap_manager";
const EXPORTER_USERNAME = process.env.FUNNEL_RECAP_EXPORTER_USERNAME || "showcase_funnel_recap_exporter";
const CITY = process.env.FUNNEL_RECAP_CITY || "Hangzhou";

function assert(condition, message) { if (!condition) throw new Error(message); }

async function request(path, { method = "GET", token, body, expectedStatus, raw = false, headers = {} } = {}) {
  const response = await fetch(`${API_BASE}${path}`, { method, headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const bytes = Buffer.from(await response.arrayBuffer());
  const text = bytes.toString("utf8");
  const expected = expectedStatus === undefined ? response.ok : response.status === expectedStatus;
  assert(expected, `${method} ${path} failed (${response.status}): ${text}`);
  if (raw) return { status: response.status, bytes, contentType: response.headers.get("content-type") || "" };
  const payload = text ? JSON.parse(text) : null;
  if ((expectedStatus || response.status) >= 400) return payload;
  assert(payload?.code === 0, `${method} ${path} returned invalid envelope: ${text}`);
  return payload.data;
}

async function login(username, password) {
  const result = await request("/admin/auth/login", { method: "POST", body: { username, password } });
  assert(result.token, `${username} login token missing`);
  return result;
}

async function ensureAccount(platformToken, username, permissions) {
  const result = await request(`/admin/admins?includeSmoke=true&page=1&pageSize=100&keyword=${encodeURIComponent(username)}`, { token: platformToken });
  const rows = Array.isArray(result) ? result : result.items || result.list || [];
  const account = rows.find((item) => item.username === username);
  const payload = { role: "finance", tenantId: TENANT_ID, enabled: true, permissions, dataScope: { type: "all" } };
  if (account) {
    await request(`/admin/admins/${account.id}`, { method: "PATCH", token: platformToken, body: payload });
    await request(`/admin/admins/${account.id}/password`, { method: "POST", token: platformToken, body: { password: PASSWORD } });
  } else {
    await request("/admin/admins", { method: "POST", token: platformToken, body: { username, password: PASSWORD, ...payload } });
  }
}

async function ensureAccountQuota(platformToken) {
  const tenants = await request("/admin/tenants", { token: platformToken });
  const tenant = tenants.find((item) => Number(item.id) === TENANT_ID);
  assert(tenant, `tenant ${TENANT_ID} not found`);
  const current = Number(tenant.settings?.entitlements?.quotas?.adminUsers || 0);
  if (current >= 100) return;
  const entitlements = structuredClone(tenant.settings?.entitlements || tenant.packageTemplate?.entitlements || {});
  entitlements.quotas = { ...(entitlements.quotas || {}), adminUsers: 100 };
  await request(`/admin/tenants/${TENANT_ID}/permissions`, { method: "POST", token: platformToken, body: { entitlements } });
}

function activityPayload(activity) {
  return {
    tenantId: activity.tenant?.id || undefined,
    title: activity.title,
    coverUrl: activity.coverUrl || undefined,
    shareTitle: activity.shareTitle || undefined,
    shareDescription: activity.shareDescription || undefined,
    shareImageUrl: activity.shareImageUrl || undefined,
    description: activity.description,
    notice: activity.notice || undefined,
    location: activity.location,
    locationProvince: "Zhejiang",
    locationCity: CITY,
    locationDistrict: "Xihu",
    locationLatitude: activity.locationLatitude === null ? undefined : Number(activity.locationLatitude),
    locationLongitude: activity.locationLongitude === null ? undefined : Number(activity.locationLongitude),
    locationMapUrl: activity.locationMapUrl || undefined,
    groupQrCodeUrl: activity.groupQrCodeUrl || undefined,
    startTime: activity.startTime,
    endTime: activity.endTime,
    registrationDeadline: activity.registrationDeadline,
    capacity: Number(activity.capacity),
    price: Number(activity.price),
    status: activity.status,
    featured: Boolean(activity.featured),
    requireReview: Boolean(activity.requireReview),
    allowCancel: Boolean(activity.allowCancel),
    categoryId: activity.category?.id || undefined,
    agentId: activity.agent?.id || undefined,
    minMemberLevelId: activity.minMemberLevel?.id || undefined,
    priorityMemberLevelId: activity.priorityMemberLevel?.id || undefined,
    priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt || undefined,
    eligibilityRules: activity.eligibilityRules || undefined,
    fields: (activity.fields || []).map((field) => ({ label: field.label, type: field.type, required: Boolean(field.required), options: field.options || [], sortOrder: Number(field.sortOrder) })),
    hosts: (activity.hosts || []).map((host) => ({ name: host.name, title: host.title || undefined, avatarUrl: host.avatarUrl || undefined, bio: host.bio || undefined, sortOrder: Number(host.sortOrder) })),
    sections: (activity.sections || []).map((section) => ({ type: section.type, title: section.title, content: section.content, imageUrl: section.imageUrl || undefined, sortOrder: Number(section.sortOrder) }))
  };
}

function assertReconciliation(report) {
  for (const dimension of ["ticketTypes", "channels", "cities"]) {
    for (const [key, value] of Object.entries(report.reconciliation?.[dimension] || {})) assert(value === true, `${dimension}.${key} does not reconcile`);
  }
  assert(report.reconciliation?.attribution?.consistent === true, `attribution mismatch count is ${report.reconciliation?.attribution?.mismatchCount}`);
}

const platform = await login(PLATFORM_USERNAME, PLATFORM_PASSWORD);
await ensureAccountQuota(platform.token);
await ensureAccount(platform.token, READONLY_USERNAME, ["analytics.view"]);
await ensureAccount(platform.token, MANAGER_USERNAME, ["analytics.view", "analytics.manage"]);
await ensureAccount(platform.token, EXPORTER_USERNAME, ["analytics.view", "analytics.export"]);

const activity = await request(`/admin/activities/${ACTIVITY_ID}`, { token: platform.token });
assert(activity?.tenant?.id === TENANT_ID, `activity ${ACTIVITY_ID} is not owned by tenant ${TENANT_ID}`);
assert(activity.status === "open", `activity ${ACTIVITY_ID} must be open for view attribution acceptance`);
await request(`/admin/activities/${ACTIVITY_ID}`, { method: "PATCH", token: platform.token, body: activityPayload(activity) });

const firstIp = `198.51.100.${(Date.now() % 200) + 20}`;
await request(`/public/activities/${ACTIVITY_ID}?tenantCode=${encodeURIComponent(activity.tenant.code)}&source=funnel-recap-acceptance`, { headers: { "x-tenant-code": activity.tenant.code, "x-forwarded-for": firstIp } });

const readonly = await login(READONLY_USERNAME, PASSWORD);
const manager = await login(MANAGER_USERNAME, PASSWORD);
const exporter = await login(EXPORTER_USERNAME, PASSWORD);
const options = await request("/admin/analytics/activity-options", { token: readonly.token });
assert(options.some((item) => Number(item.id) === ACTIVITY_ID), "analytics-only activity options do not contain the target activity");
const funnel = await request(`/admin/activities/${ACTIVITY_ID}/funnel`, { token: readonly.token });
assertReconciliation(funnel);
assert(funnel.dimensions.ticketTypes.length > 0, "ticket dimension is empty");
assert(funnel.dimensions.channels.length > 0, "channel dimension is empty");
assert(funnel.dimensions.cities.some((row) => row.city === CITY && Number(row.viewCount || 0) > 0), "explicit city attribution was not recorded");
await request(`/admin/activities/${ACTIVITY_ID}/recap/versions`, { method: "POST", token: readonly.token, body: { summary: "blocked" }, expectedStatus: 403 });
await request(`/admin/activities/${ACTIVITY_ID}/recap/export`, { token: readonly.token, expectedStatus: 403, raw: true });
await request(`/admin/activities/${ACTIVITY_ID}/recap/versions`, { method: "POST", token: exporter.token, body: { summary: "blocked" }, expectedStatus: 403 });
await request(`/admin/activities/${ACTIVITY_ID}/recap/export`, { token: manager.token, expectedStatus: 403, raw: true });

const runId = `funnel-recap-${Date.now()}`;
const created = await Promise.all([1, 2].map((index) => request(`/admin/activities/${ACTIVITY_ID}/recap/versions`, { method: "POST", token: manager.token, body: { summary: `${runId} summary ${index}`, problems: [`${runId} problem ${index}`], actionItems: [`${runId} action ${index}`], images: [`https://example.com/${runId}-${index}.jpg`] } })));
assert(new Set(created.map((row) => row.versionNo)).size === 2, "concurrent recap creation did not allocate unique versions");
const targetVersion = created.sort((a, b) => b.versionNo - a.versionNo)[0];
const historicalBefore = await request(`/admin/activities/${ACTIVITY_ID}/recap?version=${targetVersion.versionNo}`, { token: readonly.token });
assert(historicalBefore.isHistorical === true, "version query did not return a historical snapshot");
assert(historicalBefore.version.summary.includes(runId), "historical recap content is missing");

const secondIp = `203.0.113.${(Date.now() % 200) + 20}`;
await request(`/public/activities/${ACTIVITY_ID}?tenantCode=${encodeURIComponent(activity.tenant.code)}&source=funnel-recap-after-snapshot`, { headers: { "x-tenant-code": activity.tenant.code, "x-forwarded-for": secondIp } });
const liveAfter = await request(`/admin/activities/${ACTIVITY_ID}/recap`, { token: readonly.token });
const historicalAfter = await request(`/admin/activities/${ACTIVITY_ID}/recap?version=${targetVersion.versionNo}`, { token: readonly.token });
assert(Number(liveAfter.funnel.viewCount) > Number(historicalBefore.funnel.viewCount), "live recap did not change after a new view event");
assert(Number(historicalAfter.funnel.viewCount) === Number(historicalBefore.funnel.viewCount), "historical recap metrics changed after new events");
assert(JSON.stringify(historicalAfter.version) === JSON.stringify(historicalBefore.version), "historical recap content changed after new events");

const versions = await request(`/admin/activities/${ACTIVITY_ID}/recap/versions`, { token: readonly.token });
assert(created.every((row) => versions.some((item) => item.id === row.id)), "created recap versions are missing from history");
const exported = await request(`/admin/activities/${ACTIVITY_ID}/recap/export?version=${targetVersion.versionNo}`, { token: exporter.token, raw: true });
assert(exported.contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), `unexpected recap export type ${exported.contentType}`);
assert(exported.bytes.length > 5000, `recap export is too small: ${exported.bytes.length}`);

const result = {
  ok: true,
  runId,
  activity: { id: ACTIVITY_ID, title: activity.title, tenantId: TENANT_ID, city: CITY },
  accounts: { readonly: READONLY_USERNAME, manager: MANAGER_USERNAME, exporter: EXPORTER_USERNAME, password: PASSWORD },
  funnel: funnel.funnel,
  dimensionCounts: { ticketTypes: funnel.dimensions.ticketTypes.length, channels: funnel.dimensions.channels.length, cities: funnel.dimensions.cities.length },
  reconciliation: funnel.reconciliation,
  createdVersions: created.map((row) => ({ id: row.id, versionNo: row.versionNo })),
  historicalViewCount: historicalAfter.funnel.viewCount,
  liveViewCount: liveAfter.funnel.viewCount,
  exportBytes: exported.bytes.length
};
const evidenceDir = resolve(".local-logs", `activity-funnel-recap-${Date.now()}`);
mkdirSync(evidenceDir, { recursive: true });
writeFileSync(resolve(evidenceDir, "result.json"), JSON.stringify({ ...result, createdAt: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ ...result, evidenceDir }, null, 2));
