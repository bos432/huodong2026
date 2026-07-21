import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const apiBase = String(process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const tenantCode = String(process.env.TENANT_CODE || "qiwai-showcase").trim();
const otherTenantCode = String(process.env.OTHER_TENANT_CODE || "qiwai-hangzhou").trim();
const stamp = Date.now();
const password = "Qiwai123456";
const phone = `1378${String(stamp).slice(-7)}`;
const otherPhone = `1368${String(stamp + 1).slice(-7)}`;
const courseId = Number(process.env.COURSE_ID || 5);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, { method = "GET", token, body, tenant = tenantCode, expectedStatus } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-tenant-code": tenant,
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
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

function walletAmounts(wallet) {
  return { cashFen: Math.round(Number(wallet.availableBalance || 0) * 100), giftFen: Math.round(Number(wallet.giftBalance || 0) * 100) };
}

async function completeRefund(orderId, amountFen, userToken, adminToken, sequence) {
  const refund = await request(`/public/course-orders/${orderId}/refunds`, {
    method: "POST",
    token: userToken,
    body: { amountFen, reason: `课程余额来源恢复验收-${sequence}` }
  });
  const reviewed = await request(`/admin/course-refunds/${refund.id}/review`, {
    method: "POST",
    token: adminToken,
    body: { action: "approve", reviewRemark: `余额退款第 ${sequence} 笔复核通过` }
  });
  assert(["processing", "completed"].includes(reviewed.status), `refund ${refund.id} review status is ${reviewed.status}`);
  const completed = reviewed.status === "completed" ? reviewed : await request(`/admin/course-refunds/${refund.id}/confirm`, {
    method: "POST",
    token: adminToken,
    body: { success: true, providerRefundNo: `COURSE-BAL-${refund.id}` }
  });
  const duplicate = await request(`/admin/course-refunds/${refund.id}/confirm`, {
    method: "POST",
    token: adminToken,
    body: { success: true, providerRefundNo: `COURSE-BAL-${refund.id}` }
  });
  assert(completed.status === "completed" && duplicate.status === "completed", `refund ${refund.id} did not complete idempotently`);
  return { id: refund.id, refundNo: refund.refundNo, amountFen, status: duplicate.status };
}

const [userLogin, otherLogin, adminLogin] = await Promise.all([
  request("/public/auth/password-login", { method: "POST", body: { phone, password } }),
  request("/public/auth/password-login", { method: "POST", body: { phone: otherPhone, password } }),
  request("/admin/auth/login", { method: "POST", body: { username: "admin", password: "Admin123456" } })
]);
const userToken = userLogin.userAccessToken;
const otherToken = otherLogin.userAccessToken;
const adminToken = adminLogin.token;
assert(userToken && otherToken && adminToken, "acceptance login token missing");
const course = await request(`/public/courses/${courseId}`, { token: userToken });
const tenantId = Number(course.tenant?.id || 0);
assert(tenantId > 0, "course tenant id missing");

await request(`/admin/users/${userLogin.user.id}/wallet/adjust`, {
  method: "POST", token: adminToken,
  body: { tenantId, amount: 100, type: "recharge", idempotencyKey: `course-balance-cash:${stamp}`, remark: "课程余额支付现金验收充值" }
});
await request(`/admin/users/${userLogin.user.id}/wallet/adjust`, {
  method: "POST", token: adminToken,
  body: { tenantId, amount: 250, type: "gift_grant", idempotencyKey: `course-balance-gift:${stamp}`, remark: "课程余额支付赠送金验收发放" }
});
const walletBefore = await request("/public/me/wallet", { token: userToken });
assert(JSON.stringify(walletAmounts(walletBefore)) === JSON.stringify({ cashFen: 10000, giftFen: 25000 }), `unexpected wallet before payment: ${JSON.stringify(walletAmounts(walletBefore))}`);

const created = await request(`/public/courses/${courseId}/orders`, {
  method: "POST", token: userToken,
  body: { paymentMethod: "balance", clientOrderKey: `course-balance:${stamp}` }
});
const orderId = Number(created.order?.id || 0);
assert(orderId && Math.round(Number(created.order.amount) * 100) === 29900, `expected a 299.00 course order, got ${JSON.stringify(created.order)}`);

const paidResponses = await Promise.all(Array.from({ length: 6 }, () => request(`/public/course-orders/${orderId}/pay/balance`, { method: "POST", token: userToken })));
assert(paidResponses.every((item) => item.order?.status === "paid"), "concurrent balance payment did not return paid status");
assert(paidResponses.filter((item) => item.idempotent === false).length === 1, "balance payment should deduct exactly once");
const walletAfterPayment = await request("/public/me/wallet", { token: userToken });
assert(JSON.stringify(walletAmounts(walletAfterPayment)) === JSON.stringify({ cashFen: 5100, giftFen: 0 }), `unexpected wallet after payment: ${JSON.stringify(walletAmounts(walletAfterPayment))}`);

await request(`/public/course-orders/${orderId}/pay/balance`, { method: "POST", token: otherToken, expectedStatus: 404 });
await request(`/public/course-orders/${orderId}/pay/balance`, { method: "POST", token: userToken, tenant: otherTenantCode, expectedStatus: 404 });

const detail = await request(`/admin/unified-orders/course/${orderId}`, { token: adminToken });
assert(detail.payments?.length === 1 && detail.payments[0].provider === "balance", "unified course order is missing its balance payment transaction");

const firstRefund = await completeRefund(orderId, 10000, userToken, adminToken, 1);
const walletAfterFirstRefund = await request("/public/me/wallet", { token: userToken });
assert(JSON.stringify(walletAmounts(walletAfterFirstRefund)) === JSON.stringify({ cashFen: 5100, giftFen: 10000 }), `unexpected wallet after first refund: ${JSON.stringify(walletAmounts(walletAfterFirstRefund))}`);

const secondRefund = await completeRefund(orderId, 19900, userToken, adminToken, 2);
const walletAfterSecondRefund = await request("/public/me/wallet", { token: userToken });
assert(JSON.stringify(walletAmounts(walletAfterSecondRefund)) === JSON.stringify({ cashFen: 10000, giftFen: 25000 }), `unexpected wallet after second refund: ${JSON.stringify(walletAmounts(walletAfterSecondRefund))}`);

const [walletTransactions, coursePayments, courseRefunds, consistency] = await Promise.all([
  request(`/admin/finance/wallet-transactions?userId=${userLogin.user.id}&tenantId=${tenantId}`, { token: adminToken }),
  request(`/admin/unified-funds?sourceType=course_payment&keyword=${encodeURIComponent(created.order.orderNo)}`, { token: adminToken }),
  request(`/admin/unified-funds?sourceType=course_refund&keyword=${encodeURIComponent(created.order.orderNo)}`, { token: adminToken }),
  request("/admin/unified-funds/consistency", { token: adminToken })
]);
const paymentWalletRows = walletTransactions.filter((item) => item.idempotencyKey === `course_balance_pay:${orderId}`);
const refundWalletRows = walletTransactions.filter((item) => [firstRefund.id, secondRefund.id].includes(Number(String(item.idempotencyKey || "").split(":").pop())) && String(item.idempotencyKey).startsWith("course_refund:"));
assert(paymentWalletRows.length === 1, `expected one wallet payment row, got ${paymentWalletRows.length}`);
assert(refundWalletRows.length === 2, `expected two wallet refund rows, got ${refundWalletRows.length}`);
assert(coursePayments.total === 1, `expected one unified course payment, got ${coursePayments.total}`);
assert(courseRefunds.total === 2, `expected two unified course refunds, got ${courseRefunds.total}`);
assert(consistency.healthy === true, `unified fund consistency failed: ${JSON.stringify(consistency.issues?.slice(0, 5))}`);

const result = {
  ok: true,
  tenantCode,
  tenantId,
  account: { phone, password, userId: userLogin.user.id },
  crossUserAccount: { phone: otherPhone, password, userId: otherLogin.user.id },
  adminAccount: { username: "admin", password: "Admin123456" },
  courseId,
  orderId,
  orderNo: created.order.orderNo,
  concurrentPaymentRequests: paidResponses.length,
  unifiedPaymentCount: detail.payments.length,
  refunds: [firstRefund, secondRefund],
  walletBefore: walletAmounts(walletBefore),
  walletAfterPayment: walletAmounts(walletAfterPayment),
  walletAfterFirstRefund: walletAmounts(walletAfterFirstRefund),
  walletAfterSecondRefund: walletAmounts(walletAfterSecondRefund),
  walletTransactionCounts: { payment: paymentWalletRows.length, refunds: refundWalletRows.length },
  unifiedFundCounts: { payments: coursePayments.total, refunds: courseRefunds.total },
  consistency: { healthy: consistency.healthy, checked: consistency.checked }
};
const outputDir = join(".local-logs", `course-balance-payment-${stamp}`);
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...result, outputDir }, null, 2));
