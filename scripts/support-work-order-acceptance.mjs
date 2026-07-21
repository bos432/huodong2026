const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const PLATFORM_USERNAME = process.env.PLATFORM_ADMIN_USERNAME || "admin";
const PLATFORM_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || "Admin123456";
const SUPPORT_USERNAME = process.env.SUPPORT_USERNAME || "showcase_support";
const SUPPORT_PASSWORD = process.env.SUPPORT_PASSWORD || "Qiwai123456";
const READONLY_USERNAME = process.env.SUPPORT_READONLY_USERNAME || "showcase_support_readonly";
const TENANT_ID = Number(process.env.SUPPORT_TENANT_ID || 23);
const USER_ID = Number(process.env.SUPPORT_USER_ID || 192);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, { method = "GET", token, body, expectedStatus } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  const statusMatches = expectedStatus === undefined ? response.status >= 200 && response.status < 300 : response.status === expectedStatus;
  assert(statusMatches, `${method} ${path}: expected ${expectedStatus ?? "2xx"}, got ${response.status}: ${text}`);
  if ((expectedStatus ?? response.status) < 400) assert(payload?.code === 0, `${method} ${path}: ${text}`);
  return payload?.data ?? payload;
}

async function login(username, password) {
  const data = await request("/admin/auth/login", { method: "POST", body: { username, password } });
  assert(data.token, `${username} login did not return token`);
  return data;
}

async function ensureSupportAccount(platformToken, username, permissions) {
  const admins = await request(`/admin/admins?includeSmoke=true&pageSize=20&keyword=${encodeURIComponent(username)}`, { token: platformToken });
  const rows = Array.isArray(admins) ? admins : admins?.items || admins?.list || [];
  let account = rows.find((item) => item.username === username);
  const update = { role: "operator", tenantId: TENANT_ID, enabled: true, permissions };
  if (!account) {
    account = await request("/admin/admins", { method: "POST", token: platformToken, body: { username, password: SUPPORT_PASSWORD, ...update } });
  } else {
    await request(`/admin/admins/${account.id}`, { method: "PATCH", token: platformToken, body: update });
    await request(`/admin/admins/${account.id}/password`, { method: "POST", token: platformToken, body: { password: SUPPORT_PASSWORD } });
  }
  return account;
}

async function ensureSupportAccountQuota(platformToken) {
  const tenants = await request("/admin/tenants", { token: platformToken });
  const tenant = tenants.find((item) => Number(item.id) === TENANT_ID);
  assert(tenant, `tenant ${TENANT_ID} not found`);
  const current = Number(tenant.settings?.entitlements?.quotas?.adminUsers || 0);
  if (current >= 30) return;
  const entitlements = structuredClone(tenant.settings?.entitlements || tenant.packageTemplate?.entitlements || {});
  entitlements.quotas = { ...(entitlements.quotas || {}), adminUsers: 30 };
  await request(`/admin/tenants/${TENANT_ID}/permissions`, { method: "POST", token: platformToken, body: { entitlements } });
}

const platform = await login(PLATFORM_USERNAME, PLATFORM_PASSWORD);
await ensureSupportAccountQuota(platform.token);
await ensureSupportAccount(platform.token, SUPPORT_USERNAME, ["support.view", "support.manage", "support.sensitive"]);
await ensureSupportAccount(platform.token, READONLY_USERNAME, ["support.view"]);
const support = await login(SUPPORT_USERNAME, SUPPORT_PASSWORD);
assert(support.admin?.tenant?.id === TENANT_ID || support.admin?.tenantId === TENANT_ID, "support account tenant mismatch");
assert(support.admin?.permissions.includes("support.view"), "support.view missing");
assert(support.admin?.permissions.includes("support.manage"), "support.manage missing");
assert(support.admin?.permissions.includes("support.sensitive"), "support.sensitive missing");
assert(!support.admin?.permissions.includes("member.view"), "support account unexpectedly received member.view");

const readonly = await login(READONLY_USERNAME, SUPPORT_PASSWORD);
assert(readonly.admin?.permissions.includes("support.view"), "readonly support.view missing");
assert(!readonly.admin?.permissions.includes("support.manage"), "readonly account unexpectedly received support.manage");
assert(!readonly.admin?.permissions.includes("support.sensitive"), "readonly account unexpectedly received support.sensitive");
await request("/admin/support/search?keyword=13990063869", { token: readonly.token });
await request("/admin/support/work-orders", { token: readonly.token });
await request(`/admin/support/users/${USER_ID}/reveal-phone`, { method: "POST", token: readonly.token, body: { reason: "readonly must be denied" }, expectedStatus: 403 });
await request("/admin/support/assignees", { token: readonly.token, expectedStatus: 403 });
await request("/admin/support/work-orders", { method: "POST", token: readonly.token, body: { title: "readonly denied", description: "readonly denied" }, expectedStatus: 403 });

const search = await request("/admin/support/search?keyword=13990063869", { token: support.token });
const targetUser = search.users.find((item) => Number(item.id) === USER_ID);
assert(targetUser, `tenant user ${USER_ID} not found`);
assert(targetUser.phone === "139****3869", `phone was not masked: ${targetUser.phone}`);
assert(search.registrations.every((item) => !item.user?.phone || item.user.phone === "139****3869"), "registration result leaked a full phone number");
assert(search.orders.every((item) => !item.user?.phone || item.user.phone === "139****3869"), "order result leaked a full phone number");

await request(`/admin/support/users/${USER_ID}/reveal-phone`, { method: "POST", token: support.token, body: { reason: "" }, expectedStatus: 400 });
const revealReason = `05.06 客服验收 ${new Date().toISOString()}`;
const reveal = await request(`/admin/support/users/${USER_ID}/reveal-phone`, { method: "POST", token: support.token, body: { reason: revealReason } });
assert(reveal.phone === "13990063869", "authorized phone reveal returned unexpected value");

const assignees = await request("/admin/support/assignees", { token: support.token });
assert(assignees.length > 0, "no support assignees returned");
assert(assignees.every((item) => item.tenant?.id === TENANT_ID), "cross-tenant assignee leaked");
const selfAssignee = assignees.find((item) => item.username === SUPPORT_USERNAME);
assert(selfAssignee, "support account is not assignable");

await request("/admin/support/work-orders/1", { token: support.token, expectedStatus: 404 });

const created = await request("/admin/support/work-orders", {
  method: "POST",
  token: support.token,
  body: {
    userId: USER_ID,
    assigneeId: selfAssignee.id,
    title: `验收保留-客服完整状态机-${Date.now()}`,
    description: "会员反馈活动报名状态需要客服核对，保留用于 05.06 交付验收。",
    category: "registration",
    priority: "urgent",
    businessType: "registration"
  }
});
assert(created.status === "assigned", `unexpected initial status ${created.status}`);
assert(/^WO\d{8}[A-F0-9]{8}$/.test(created.orderNo), `unexpected order number ${created.orderNo}`);
const dueDelta = new Date(created.dueAt).getTime() - new Date(created.createdAt).getTime();
assert(dueDelta > 119 * 60 * 1000 && dueDelta < 121 * 60 * 1000, `urgent SLA is not 2 hours: ${dueDelta}`);

let order = created;
for (const action of [
  { status: "processing", content: "首次回复：已定位报名记录，正在核对状态。" },
  { status: "waiting_user", content: "请用户补充报名页面截图。" },
  { status: "processing", content: "已收到截图，继续处理。" },
  { status: "resolved", content: "报名记录正常，已向用户说明。", resolution: "报名记录正常，已向用户说明。" },
  { status: "closed" },
  { status: "processing", content: "用户补充问题，重新打开工单。" }
]) {
  order = await request(`/admin/support/work-orders/${created.id}`, { method: "PATCH", token: support.token, body: action });
}
assert(order.status === "processing", "reopened order did not return to processing");
assert(order.firstResponseAt, "first response timestamp missing");
assert(!order.closedAt && !order.resolvedAt, "reopened order retained closed/resolved timestamps");
assert(order.logs.length === 7, `expected 7 immutable logs, got ${order.logs.length}`);
assert(order.user.phone === "139****3869", "work-order detail leaked full phone");
assert(!JSON.stringify(order).includes("passwordHash"), "work-order payload leaked passwordHash");

const audit = await request(`/admin/operation-logs?action=support.sensitive_reveal&adminUsername=${encodeURIComponent(SUPPORT_USERNAME)}&page=1&pageSize=20`, { token: platform.token });
const auditRows = Array.isArray(audit) ? audit : audit?.items || audit?.list || [];
const revealLog = auditRows.find((item) => JSON.stringify(item.detail || {}).includes(revealReason) || item.targetId === String(USER_ID) || Number(item.targetId) === USER_ID);
assert(revealLog, "sensitive reveal audit log missing");
const auditText = JSON.stringify(revealLog);
assert(auditText.includes(revealReason), "sensitive reveal reason missing from audit log");
assert(!auditText.includes("13990063869"), "audit log leaked full phone number");

console.log(JSON.stringify({
  ok: true,
  account: SUPPORT_USERNAME,
  tenantId: TENANT_ID,
  userId: USER_ID,
  workOrderId: order.id,
  orderNo: order.orderNo,
  status: order.status,
  logCount: order.logs.length,
  dueAt: order.dueAt,
  firstResponseAt: order.firstResponseAt,
  auditAction: "support.sensitive_reveal"
}, null, 2));
