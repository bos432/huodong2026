const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const TENANT_CODE = "qiwai-showcase";
const stamp = Date.now();

function assert(condition, message) { if (!condition) throw new Error(message); }

async function raw(path, { method = "GET", token, body, tenantCode = TENANT_CODE } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-tenant-code": tenantCode, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload, text };
}

async function request(path, options = {}) {
  const result = await raw(path, options);
  assert(result.response.ok && result.payload?.code === 0, `${options.method || "GET"} ${path} failed (${result.response.status}): ${result.text}`);
  return result.payload.data;
}

async function loginUser(phone) {
  return request("/public/auth/password-login", { method: "POST", body: { phone, password: "Qiwai123456" } });
}

const ops = await request("/admin/auth/login", { method: "POST", body: { username: "showcase_ops", password: "Qiwai123456" } });
const memberPhone = `1371${String(stamp).slice(-7)}`;
const member = await loginUser(memberPhone);
await request(`/public/me/profile?tenantCode=${TENANT_CODE}`, { token: member.userAccessToken });
const memberCourse = await request("/admin/courses", {
  method: "POST",
  token: ops.token,
  body: { title: `07.02 会员专享验收保留 ${stamp}`, description: "验证等级准入与降级后既有权限。", price: 0, originalPrice: 0, accessMode: "member", requiredMemberLevelId: 2, completionThreshold: 80, status: "published", tags: ["验收", "会员专享"], sortOrder: 920 }
});

const beforeUpgrade = await raw(`/public/courses/${memberCourse.id}/orders?tenantCode=${TENANT_CODE}`, { method: "POST", token: member.userAccessToken, body: { clientOrderKey: `member-before:${stamp}` } });
assert(beforeUpgrade.response.status === 403, `member course before upgrade returned ${beforeUpgrade.response.status}`);

await request(`/admin/members/${member.user.id}/points/adjust`, { method: "POST", token: ops.token, body: { points: 300, remark: `07.02 会员准入验收升级 ${stamp}` } });
const memberClaim = await request(`/public/courses/${memberCourse.id}/orders?tenantCode=${TENANT_CODE}`, { method: "POST", token: member.userAccessToken, body: { clientOrderKey: `member-after:${stamp}` } });
assert(memberClaim.owned === true && memberClaim.order?.status === "paid" && Number(memberClaim.order?.amount || 0) === 0, "eligible member did not receive zero-amount paid entitlement order");
const memberOrders = await request(`/admin/course-orders?courseId=${memberCourse.id}`, { token: ops.token });
const memberOrderRows = Array.isArray(memberOrders) ? memberOrders : memberOrders.items || memberOrders.list || [];
const memberOrderDetail = memberOrderRows.find((item) => item.id === memberClaim.order.id);
assert(memberOrderDetail?.businessSnapshot?.entitlementSource === "member", "member entitlement snapshot missing");

await request(`/admin/members/${member.user.id}/points/adjust`, { method: "POST", token: ops.token, body: { points: -300, remark: `07.02 会员准入验收降级 ${stamp}` } });
const afterDowngrade = await request(`/public/courses/${memberCourse.id}/player?tenantCode=${TENANT_CODE}`, { token: member.userAccessToken });
assert(afterDowngrade.owned === true, "existing member course access was removed after downgrade");

const redeemPhone = `1372${String(stamp + 1).slice(-7)}`;
const redeemUser = await loginUser(redeemPhone);
await request(`/public/me/profile?tenantCode=${TENANT_CODE}`, { token: redeemUser.userAccessToken });
const redeemCourse = await request("/admin/courses", {
  method: "POST",
  token: ops.token,
  body: { title: `07.02 兑换专享验收保留 ${stamp}`, description: "验证兑换码、并发和租户隔离。", price: 199, originalPrice: 299, accessMode: "redeem", completionThreshold: 100, status: "published", tags: ["验收", "兑换专享"], sortOrder: 921 }
});
const ordinaryOrder = await raw(`/public/courses/${redeemCourse.id}/orders?tenantCode=${TENANT_CODE}`, { method: "POST", token: redeemUser.userAccessToken, body: { paymentMethod: "offline", clientOrderKey: `redeem-order:${stamp}` } });
assert(ordinaryOrder.response.status === 400, `redeem-only course ordinary order returned ${ordinaryOrder.response.status}`);

const redemptionCode = `COURSE${String(stamp).slice(-10)}`;
const code = await request("/admin/redemption-codes", { method: "POST", token: ops.token, body: { code: redemptionCode, name: `07.02 课程兑换验收 ${stamp}`, targetType: "course_access", targetId: redeemCourse.id, usageLimit: 2, perUserLimit: 1, enabled: true } });
const attempts = await Promise.all(Array.from({ length: 8 }, () => raw(`/public/redemption-codes/redeem?tenantCode=${TENANT_CODE}`, { method: "POST", token: redeemUser.userAccessToken, body: { code: redemptionCode } })));
const successes = attempts.filter((item) => item.response.ok && item.payload?.code === 0);
const limited = attempts.filter((item) => item.response.status === 400);
assert(successes.length === 1 && limited.length === 7, `concurrent course redemption results were ${successes.length} success / ${limited.length} limited`);
assert(successes[0].payload.data.benefit.courseId === redeemCourse.id, "course redemption returned wrong course");

const crossTenant = await raw(`/public/redemption-codes/redeem?tenantCode=qiwai-hangzhou`, { method: "POST", token: redeemUser.userAccessToken, tenantCode: "qiwai-hangzhou", body: { code: redemptionCode } });
assert(crossTenant.response.status === 404, `cross-tenant course redemption returned ${crossTenant.response.status}`);
const redeemedPlayer = await request(`/public/courses/${redeemCourse.id}/player?tenantCode=${TENANT_CODE}`, { token: redeemUser.userAccessToken });
assert(redeemedPlayer.owned === true, "redeemed course access was not granted");

console.log(JSON.stringify({
  ok: true,
  memberUserId: member.user.id,
  memberPhone,
  memberCourseId: memberCourse.id,
  memberOrderId: memberClaim.order.id,
  beforeUpgradeStatus: beforeUpgrade.response.status,
  accessAfterDowngrade: afterDowngrade.owned,
  redeemUserId: redeemUser.user.id,
  redeemPhone,
  redeemCourseId: redeemCourse.id,
  redemptionCodeId: code.id,
  redemptionCode,
  concurrentSuccesses: successes.length,
  concurrentLimited: limited.length,
  crossTenantStatus: crossTenant.response.status
}, null, 2));
