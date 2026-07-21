const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const TENANT_CODE = process.env.TENANT_CODE || "qiwai-showcase";
const stamp = Date.now();
const phone = process.env.COURSE_ORDER_PHONE || `1398${String(stamp).slice(-7)}`;
const password = process.env.COURSE_ORDER_PASSWORD || "Qiwai123456";

function assert(condition, message) { if (!condition) throw new Error(message); }

async function request(path, { method = "GET", token, body, tenantCode = TENANT_CODE, expectedStatus } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-tenant-code": tenantCode, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (expectedStatus !== undefined) {
    assert(response.status === expectedStatus, `${method} ${path}: expected ${expectedStatus}, got ${response.status}: ${text}`);
    return payload;
  }
  assert(response.ok && payload?.code === 0, `${method} ${path} failed (${response.status}): ${text}`);
  return payload.data;
}

const login = await request("/public/auth/password-login", { method: "POST", body: { phone, password } });
const token = login.userAccessToken;
assert(token, "new member token missing");

const freeKey = `course-free:${stamp}`;
const freeResponses = await Promise.all(Array.from({ length: 8 }, () => request("/public/courses/3/orders?tenantCode=qiwai-showcase", { method: "POST", token, body: { clientOrderKey: freeKey } })));
const freeOrderIds = Array.from(new Set(freeResponses.map((item) => item.order?.id).filter(Boolean)));
assert(freeOrderIds.length === 1, `free concurrent requests created ${freeOrderIds.length} orders`);
assert(freeResponses.every((item) => item.owned === true), "free concurrent request did not grant ownership");

await request("/public/courses/5/orders?tenantCode=qiwai-showcase", { method: "POST", token, body: { paymentMethod: "offline", clientOrderKey: freeKey }, expectedStatus: 409 });

const paidKey = `course-paid:${stamp}`;
const paidResponses = await Promise.all(Array.from({ length: 8 }, () => request("/public/courses/5/orders?tenantCode=qiwai-showcase", { method: "POST", token, body: { paymentMethod: "offline", clientOrderKey: paidKey } })));
const paidOrderIds = Array.from(new Set(paidResponses.map((item) => item.order?.id).filter(Boolean)));
assert(paidOrderIds.length === 1, `paid concurrent requests created ${paidOrderIds.length} orders`);
assert(paidResponses.every((item) => item.order?.id === paidOrderIds[0]), "paid concurrent requests did not return the same order");
assert(paidResponses.every((item) => item.order?.status === "pending_payment"), "paid idempotent order status is not pending_payment");

await request("/public/courses/5/orders?tenantCode=qiwai-hangzhou", { method: "POST", token, tenantCode: "qiwai-hangzhou", body: { paymentMethod: "offline", clientOrderKey: `cross-tenant:${stamp}` }, expectedStatus: 404 });

const platform = await request("/admin/auth/login", { method: "POST", body: { username: "admin", password: "Admin123456" }, tenantCode: TENANT_CODE });
const confirmed = await request(`/admin/course-orders/${paidOrderIds[0]}/confirm-offline-payment`, { method: "POST", token: platform.token, body: {} });
assert(confirmed.status === "paid", `confirmed course order status is ${confirmed.status}`);

const owned = await request("/public/courses/5/player?tenantCode=qiwai-showcase", { token });
assert(owned.owned === true, "confirmed paid order did not grant course access");

console.log(JSON.stringify({
  ok: true,
  phone,
  userId: login.user.id,
  freeOrderId: freeOrderIds[0],
  paidOrderId: paidOrderIds[0],
  paidOrderNo: confirmed.orderNo,
  freeConcurrentRequests: freeResponses.length,
  paidConcurrentRequests: paidResponses.length,
  crossCourseConflictStatus: 409,
  crossTenantStatus: 404,
  finalPaidStatus: confirmed.status
}, null, 2));
