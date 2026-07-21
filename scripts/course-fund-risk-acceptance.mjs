import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(new URL("../apps/api/package.json", import.meta.url));
const mysql = require("mysql2/promise");
const apiBase = String(process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const tenantId = Number(process.env.TENANT_ID || 23);
const userId = Number(process.env.USER_ID || 31108);
const courseId = Number(process.env.COURSE_ID || 5);
const stamp = Date.now();
const runId = `course-fund-risk-${stamp}`;
const orderNo = `CFRISK${stamp}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  assert(response.ok && payload?.code === 0, `${method} ${path} failed (${response.status}): ${text}`);
  return payload.data;
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 13306),
  user: process.env.DB_USERNAME || "activity",
  password: process.env.DB_PASSWORD || "activitypass",
  database: process.env.DB_DATABASE || "activity_registration"
});

await connection.beginTransaction();
let orderId;
let refundId;
let mismatchTransactionId;
try {
  const [orderResult] = await connection.query("INSERT INTO course_orders (orderNo, userId, courseId, amount, amountFen, businessSnapshot, clientOrderKey, paymentMethod, status, transactionNo, paidAt, expiresAt, closedAt, closeReason, createdAt, updatedAt) VALUES (?, ?, ?, '299.00', 29900, JSON_OBJECT('acceptanceRunId', ?), ?, 'balance', 'paid', ?, NOW(), NULL, NULL, NULL, NOW(), NOW())", [orderNo, userId, courseId, runId, runId, `${runId}:payment`]);
  orderId = Number(orderResult.insertId);
  const [firstPayment] = await connection.query("INSERT INTO payment_transactions (orderId, tenantId, transactionNo, provider, paymentMethod, amount, amountFen, businessType, businessOrderNo, businessSnapshot, status, remark, reconciliationStatus, discrepancyType, reconciledBy, reconciliationRemark, reconciledAt, createdAt) VALUES (NULL, ?, ?, 'balance', 'balance', '299.00', 29900, 'course', ?, JSON_OBJECT('acceptanceRunId', ?, 'courseOrderId', ?), 'success', '课程资金告警受控验收', 'pending', 'amount_mismatch', NULL, NULL, NULL, NOW())", [tenantId, `${runId}:tx:1`, orderNo, runId, orderId]);
  mismatchTransactionId = Number(firstPayment.insertId);
  await connection.query("INSERT INTO payment_transactions (orderId, tenantId, transactionNo, provider, paymentMethod, amount, amountFen, businessType, businessOrderNo, businessSnapshot, status, remark, reconciliationStatus, discrepancyType, reconciledBy, reconciliationRemark, reconciledAt, createdAt) VALUES (NULL, ?, ?, 'balance', 'balance', '299.00', 29900, 'course', ?, JSON_OBJECT('acceptanceRunId', ?, 'courseOrderId', ?), 'success', '课程重复支付受控验收', 'matched', NULL, NULL, NULL, NULL, NOW())", [tenantId, `${runId}:tx:2`, orderNo, runId, orderId]);
  const [refundResult] = await connection.query("INSERT INTO course_refunds (refundNo, orderId, amountFen, reason, status, reviewRemark, reviewedByAdminId, reviewedAt, completedAt, providerRefundNo, failureReason, createdAt, updatedAt) VALUES (?, ?, 100, '课程退款失败告警受控验收', 'failed', '受控验收', NULL, NOW(), NULL, NULL, '受控渠道退款失败', NOW(), NOW())", [`CFRF${stamp}`, orderId]);
  refundId = Number(refundResult.insertId);
  await connection.commit();
} catch (error) {
  await connection.rollback();
  await connection.end();
  throw error;
}

const admin = await request("/admin/auth/login", { method: "POST", body: { username: "admin", password: "Admin123456" } });
await request("/admin/finance/risk-alerts/scan", { method: "POST", token: admin.token, body: {} });
const alerts = await request(`/admin/finance/risk-alerts?tenantId=${tenantId}`, { token: admin.token });
const expectedFingerprints = [
  `reconcile:course:${mismatchTransactionId}`,
  `refund:course:${refundId}`,
  `payment:duplicate:course:${orderNo}`
];
const generated = alerts.filter((row) => expectedFingerprints.includes(row.fingerprint));
assert(generated.length === 3, `expected three course fund alerts, got ${generated.map((row) => row.fingerprint)}`);
assert(generated.every((row) => row.status === "open" && row.tenant?.id === tenantId), "course fund alerts must be open and tenant scoped");
assert(new Set(generated.map((row) => row.businessType)).size === 2, "course payment and refund business types must both be present");

await connection.beginTransaction();
try {
  await connection.query("UPDATE payment_transactions SET reconciliationStatus = 'matched', discrepancyType = NULL, reconciliationRemark = '受控验收后恢复匹配', reconciledBy = 'acceptance', reconciledAt = NOW() WHERE id = ?", [mismatchTransactionId]);
  await connection.query("UPDATE payment_transactions SET status = 'statement_matched', remark = '受控重复支付验收后重分类' WHERE transactionNo = ?", [`${runId}:tx:2`]);
  await connection.query("UPDATE course_refunds SET status = 'rejected', reviewRemark = '受控失败验收结束，不进入真实退款', failureReason = NULL, updatedAt = NOW() WHERE id = ?", [refundId]);
  await connection.commit();
} catch (error) {
  await connection.rollback();
  await connection.end();
  throw error;
}

for (const alert of generated) {
  await request(`/admin/finance/risk-alerts/${alert.id}/handle`, { method: "POST", token: admin.token, body: { action: "resolved", remark: `${runId} 底层测试来源已恢复并完成复核` } });
}
const rescan = await request("/admin/finance/risk-alerts/scan", { method: "POST", token: admin.token, body: {} });
const finalAlerts = await request(`/admin/finance/risk-alerts?tenantId=${tenantId}`, { token: admin.token });
const resolved = finalAlerts.filter((row) => expectedFingerprints.includes(row.fingerprint));
assert(resolved.length === 3 && resolved.every((row) => row.status === "resolved"), "restored course fund alerts must remain resolved after rescan");

const [[sourceAudit]] = await connection.query("SELECT (SELECT COUNT(*) FROM payment_transactions WHERE businessOrderNo = ? AND status = 'success') successfulPayments, (SELECT COUNT(*) FROM payment_transactions WHERE id = ? AND reconciliationStatus = 'pending') pendingMismatch, (SELECT COUNT(*) FROM course_refunds WHERE id = ? AND status = 'failed') failedRefund", [orderNo, mismatchTransactionId, refundId]);
await connection.end();
assert(Number(sourceAudit.successfulPayments) === 1 && Number(sourceAudit.pendingMismatch) === 0 && Number(sourceAudit.failedRefund) === 0, `test risk sources were not restored: ${JSON.stringify(sourceAudit)}`);

const outputDir = join(".local-logs", runId);
mkdirSync(outputDir, { recursive: true });
const result = {
  ok: true,
  runId,
  tenantId,
  retained: { orderId, orderNo, refundId, mismatchTransactionId, alertIds: resolved.map((row) => row.id) },
  generated: generated.map((row) => ({ id: row.id, fingerprint: row.fingerprint, type: row.type, businessType: row.businessType, status: row.status })),
  sourceAudit: Object.fromEntries(Object.entries(sourceAudit).map(([key, value]) => [key, Number(value)])),
  rescan,
  finalStatuses: resolved.map((row) => ({ id: row.id, status: row.status, handledBy: row.handledBy }))
};
writeFileSync(join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...result, outputDir }, null, 2));
