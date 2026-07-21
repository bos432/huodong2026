const apiBase = String(process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const tenantCode = String(process.env.TENANT_CODE || "qiwai-showcase").trim();
let userToken = String(process.env.USER_TOKEN || "").trim();
let adminToken = String(process.env.ADMIN_TOKEN || "").trim();
let orderId = Number(process.env.COURSE_ORDER_ID || 0);
let courseId = Number(process.env.COURSE_ID || 0);

async function request(path, token, options = {}) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${apiBase}${path}${separator}tenantCode=${encodeURIComponent(tenantCode)}`, {
    ...options,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}`, "x-tenant-code": tenantCode, ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.code !== 0) throw new Error(`${options.method || "GET"} ${path} failed (${response.status}): ${body?.message || "invalid response"}`);
  return body.data;
}

async function requestOutcome(path, token) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${apiBase}${path}${separator}tenantCode=${encodeURIComponent(tenantCode)}`, { headers: { authorization: `Bearer ${token}`, "x-tenant-code": tenantCode } });
  const body = await response.json().catch(() => null);
  return { ok: response.ok && body?.code === 0, status: response.status, message: body?.message || "", data: body?.data };
}

if (!userToken || !adminToken || !Number.isInteger(orderId) || orderId <= 0 || !Number.isInteger(courseId) || courseId <= 0) {
  const stamp = Date.now();
  const phone = `1358${String(stamp).slice(-7)}`;
  const userLogin = await request("/public/auth/password-login", "", { method: "POST", body: JSON.stringify({ phone, password: "Qiwai123456" }) });
  const adminLogin = await request("/admin/auth/login", "", { method: "POST", body: JSON.stringify({ username: "showcase_finance", password: "Qiwai123456" }) });
  userToken = userLogin.userAccessToken;
  adminToken = adminLogin.token;
  courseId = 5;
  const created = await request(`/public/courses/${courseId}/orders`, userToken, { method: "POST", body: JSON.stringify({ paymentMethod: "offline", clientOrderKey: `course-refund:${stamp}` }) });
  orderId = Number(created.order?.id || 0);
  if (!orderId) throw new Error("self-contained acceptance did not create a paid course order");
  await request(`/admin/course-orders/${orderId}/confirm-offline-payment`, adminToken, { method: "POST", body: JSON.stringify({}) });
}

const beforeOrders = await request("/public/me/course-orders", userToken);
const before = beforeOrders.find((item) => Number(item.id) === orderId);
if (!before || !before.owned || Number(before.refundableAmountFen || 0) <= 0) throw new Error("course order is not eligible for a full refund acceptance run");

const refundPath = `/public/course-orders/${orderId}/refunds`;
const refundResults = await Promise.all([
  request(refundPath, userToken, { method: "POST", body: JSON.stringify({ amountFen: before.refundableAmountFen, reason: "跨端课程全额退款并发验收" }), headers: { "x-device-id": "course-refund-a" } }),
  request(refundPath, userToken, { method: "POST", body: JSON.stringify({ amountFen: before.refundableAmountFen, reason: "跨端课程全额退款并发验收" }), headers: { "x-device-id": "course-refund-b" } })
]);
const refundIds = refundResults.map((item) => Number(item.id || 0));
if (!refundIds[0] || refundIds[0] !== refundIds[1]) throw new Error(`concurrent requests returned different course refunds: ${refundIds.join(", ")}`);
if (!refundResults.some((item) => item.idempotent === false) || !refundResults.some((item) => item.idempotent === true)) throw new Error("expected one created and one idempotent refund response");

const refundId = refundIds[0];
const reviewResults = await Promise.all([
  request(`/admin/course-refunds/${refundId}/review`, adminToken, { method: "POST", body: JSON.stringify({ action: "approve", reviewRemark: "课程退款联动验收通过" }) }),
  request(`/admin/course-refunds/${refundId}/review`, adminToken, { method: "POST", body: JSON.stringify({ action: "approve", reviewRemark: "课程退款联动验收通过" }) })
]);
if (reviewResults.some((item) => !["approved", "processing", "completed"].includes(item.status))) throw new Error(`unexpected reviewed statuses: ${reviewResults.map((item) => item.status).join(", ")}`);
const reviewed = reviewResults[0];

const completedResults = reviewed.status === "completed" ? [reviewed, reviewed] : await Promise.all([
  request(`/admin/course-refunds/${refundId}/confirm`, adminToken, { method: "POST", body: JSON.stringify({ success: true, providerRefundNo: `COURSE-ACCEPT-${refundId}` }) }),
  request(`/admin/course-refunds/${refundId}/confirm`, adminToken, { method: "POST", body: JSON.stringify({ success: true, providerRefundNo: `COURSE-ACCEPT-${refundId}` }) })
]);
if (completedResults.some((item) => item.status !== "completed")) throw new Error("course refund did not complete idempotently");

const [afterOrders, playerOutcome, certificates] = await Promise.all([
  request("/public/me/course-orders", userToken),
  requestOutcome(`/public/courses/${courseId}/player`, userToken),
  request("/public/me/certificates", userToken)
]);
const after = afterOrders.find((item) => Number(item.id) === orderId);
if (!after || after.status !== "refunded" || after.owned !== false || after.latestRefund?.status !== "completed") throw new Error(`unexpected order state after refund: ${JSON.stringify(after)}`);
if (playerOutcome.ok && playerOutcome.data?.owned !== false) throw new Error("course player still reports paid ownership after a full refund");
if (!playerOutcome.ok && ![400, 403, 404].includes(playerOutcome.status)) throw new Error(`unexpected player response after refund: ${playerOutcome.status} ${playerOutcome.message}`);
const activeCourseCertificates = certificates.filter((item) => Number(item.courseId) === courseId && item.status === "active");
if (activeCourseCertificates.length) throw new Error(`active course certificates remain after full refund: ${activeCourseCertificates.map((item) => item.id).join(", ")}`);

console.log(JSON.stringify({
  orderId,
  courseId,
  refundId,
  refundNo: refundResults[0].refundNo,
  amountFen: refundResults[0].amountFen,
  requestIdempotency: refundResults.map((item) => item.idempotent),
  reviewStatuses: reviewResults.map((item) => item.status),
  completionStatuses: completedResults.map((item) => item.status),
  orderStatus: after.status,
  ownedAfterRefund: after.owned,
  playerOwnedAfterRefund: playerOutcome.ok ? playerOutcome.data?.owned : false,
  playerResponseStatus: playerOutcome.status,
  activeCourseCertificateCount: activeCourseCertificates.length
}, null, 2));
