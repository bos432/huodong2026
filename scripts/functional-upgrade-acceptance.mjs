const API_BASE = process.env.API_BASE || "http://127.0.0.1:18080/api";
const ADMIN_USERNAME = process.env.FUNCTIONAL_ACCEPTANCE_ADMIN || "admin";
const ADMIN_PASSWORD = process.env.FUNCTIONAL_ACCEPTANCE_PASSWORD || "Admin123456";
const runId = Date.now();

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const body = await response.json();
  if (!response.ok || body?.code !== 0) throw new Error(`${options.method || "GET"} ${path}: ${body?.message || response.status}`);
  return body.data;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function futureDate(days, hour) {
  const date = new Date(Date.now() + days * 86400000);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function createUser(index) {
  const suffix = `${String(runId).slice(-7)}${index}`.slice(-8);
  const phone = `136${suffix}`;
  const code = await api("/public/auth/h5-code", { method: "POST", body: JSON.stringify({ phone }) });
  const login = await api("/public/auth/h5-login", {
    method: "POST",
    body: JSON.stringify({
      phone,
      nickname: `批量审核用户${index}`,
      verificationToken: code.verificationToken,
      verificationCode: code.devCode || "123456"
    })
  });
  return { phone, headers: auth(login.userAccessToken) };
}

async function register(activity, user, index) {
  const answers = activity.fields.map((field) => ({
    fieldId: field.id,
    label: field.label,
    type: field.type,
    value: field.type === "phone" ? user.phone : `批量审核用户${index}`
  }));
  const result = await api(`/public/activities/${activity.id}/register`, { method: "POST", headers: user.headers, body: JSON.stringify({ answers }) });
  assert(result.registration.status === "pending_review", `registration ${result.registration.id} should be pending_review`);
  return result.registration.id;
}

const adminLogin = await api("/admin/auth/login", { method: "POST", body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }) });
const adminHeaders = auth(adminLogin.token);
const activity = await api("/admin/activities", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({
    title: `【批量审核验收保留】${runId}`,
    description: "验证批量报名审核功能",
    notice: "功能升级验收数据，请保留",
    location: "批量审核验收会场",
    startTime: futureDate(10, 14),
    endTime: futureDate(10, 16),
    registrationDeadline: futureDate(9, 20),
    capacity: 20,
    price: 0,
    status: "open",
    featured: false,
    requireReview: true,
    allowCancel: true,
    fields: [
      { label: "姓名", type: "text", required: true, sortOrder: 1, options: [] },
      { label: "手机号", type: "phone", required: true, sortOrder: 2, options: [] }
    ],
    hosts: [],
    sections: []
  })
});

const registrationIds = [];
for (let index = 1; index <= 4; index += 1) {
  registrationIds.push(await register(activity, await createUser(index), index));
}

const approvedIds = registrationIds.slice(0, 2);
const rejectedIds = registrationIds.slice(2);
const approved = await api("/admin/registrations/bulk-approve", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({ ids: approvedIds, remark: "功能升级批量审核通过" })
});
const rejected = await api("/admin/registrations/bulk-reject", {
  method: "POST",
  headers: adminHeaders,
  body: JSON.stringify({ ids: rejectedIds, remark: "功能升级批量审核拒绝" })
});

assert(approved.succeeded === 2 && approved.failed === 0, "bulk approve should process two registrations");
assert(rejected.succeeded === 2 && rejected.failed === 0, "bulk reject should process two registrations");

const page = await api(`/admin/registrations?activityId=${activity.id}&page=1&pageSize=20`, { headers: adminHeaders });
const statusById = new Map(page.items.map((row) => [row.id, row.status]));
for (const id of approvedIds) assert(statusById.get(id) === "approved", `registration ${id} should be approved`);
for (const id of rejectedIds) assert(statusById.get(id) === "rejected", `registration ${id} should be rejected`);

const logs = await api("/admin/operation-logs", { headers: adminHeaders });
const logItems = Array.isArray(logs) ? logs : (Array.isArray(logs?.items) ? logs.items : []);
assert(logItems.some((row) => row.action === "registration.bulk_approve"), "bulk approve audit log missing");
assert(logItems.some((row) => row.action === "registration.bulk_reject"), "bulk reject audit log missing");

console.log(JSON.stringify({
  passed: true,
  activityId: activity.id,
  registrationIds,
  approvedIds,
  rejectedIds,
  approved,
  rejected
}, null, 2));
