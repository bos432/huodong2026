import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(new URL("../apps/api/package.json", import.meta.url));
const mysql = require("mysql2/promise");
const apiBase = String(process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const stamp = Date.now();
const runId = `fund-risk-backlog-${stamp}`;

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
const [duplicateRows] = await connection.query("SELECT id, transactionNo, status, remark FROM mall_payment_transactions WHERE orderId = 948 ORDER BY id");
assert(duplicateRows.length === 2 && duplicateRows.every((row) => String(row.remark || "").startsWith("03.06 duplicate")), "mall duplicate-payment backlog is not the controlled acceptance fixture");
const [refundRows] = await connection.query("SELECT id, refundNo, status, providerRefundFailureReason FROM mall_refunds WHERE refundNo = 'RISK_MALL_RF_1784223000000'");
assert(refundRows.length === 1 && refundRows[0].providerRefundFailureReason === "03.06 controlled provider failure", "mall failed-refund backlog is not the controlled acceptance fixture");

await connection.beginTransaction();
try {
  await connection.query("UPDATE mall_payment_transactions SET status = 'statement_matched', remark = '03.06 重复支付受控验收后重分类，不计成功支付' WHERE transactionNo = 'RISK_MALL_PAY_B_1784223000000' AND status = 'success'");
  await connection.query("UPDATE mall_refunds SET status = 'rejected', providerRefundStatus = NULL, providerRefundFailureReason = NULL, reviewRemark = '03.06 受控失败验收结束，不执行真实退款', updatedAt = NOW() WHERE refundNo = 'RISK_MALL_RF_1784223000000' AND status = 'failed'");
  await connection.commit();
} catch (error) {
  await connection.rollback();
  await connection.end();
  throw error;
}

const admin = await request("/admin/auth/login", { method: "POST", body: { username: "admin", password: "Admin123456" } });
const openBefore = await request("/admin/finance/risk-alerts?status=open", { token: admin.token });
const callbackAlerts = openBefore.filter((row) => row.type === "callback_failed");
assert(callbackAlerts.length === 25, `expected 25 controlled callback alerts, got ${callbackAlerts.length}`);
assert(callbackAlerts.every((row) => ["支付回调签名验证失败", "回调金额与订单金额不一致", "03.06 controlled mall callback failure"].includes(row.message)), "open callback backlog contains an unrecognized incident");
const mutableFixtures = openBefore.filter((row) => ["payment:duplicate:mall:948", "refund:mall:46"].includes(row.fingerprint));
assert(mutableFixtures.length === 2, `expected two controlled mutable alerts, got ${mutableFixtures.length}`);

for (const alert of callbackAlerts) {
  const remark = alert.businessType === "mall_payment" ? `${runId}：历史商城回调失败受控验收，订单未变更，日志保留` : `${runId}：历史签名/金额篡改防护验收，回调已拒绝且订单未变更`;
  await request(`/admin/finance/risk-alerts/${alert.id}/handle`, { method: "POST", token: admin.token, body: { action: "resolved", remark } });
}
for (const alert of mutableFixtures) {
  await request(`/admin/finance/risk-alerts/${alert.id}/handle`, { method: "POST", token: admin.token, body: { action: "resolved", remark: `${runId}：底层受控测试来源已恢复为非风险状态并复核` } });
}

const rescan = await request("/admin/finance/risk-alerts/scan", { method: "POST", token: admin.token, body: {} });
const openAfter = await request("/admin/finance/risk-alerts?status=open", { token: admin.token });
const acknowledgedAfter = await request("/admin/finance/risk-alerts?status=acknowledged", { token: admin.token });
assert(openAfter.length === 0 && acknowledgedAfter.length === 0 && rescan.openCount === 0, `fund risk backlog remains: open=${openAfter.length}, acknowledged=${acknowledgedAfter.length}, scan=${rescan.openCount}`);
const [[sourceAudit]] = await connection.query("SELECT (SELECT COUNT(*) FROM mall_payment_transactions WHERE orderId = 948 AND status = 'success') successfulMallPayments, (SELECT COUNT(*) FROM mall_refunds WHERE refundNo = 'RISK_MALL_RF_1784223000000' AND status = 'failed') failedMallRefunds");
await connection.end();
assert(Number(sourceAudit.successfulMallPayments) === 1 && Number(sourceAudit.failedMallRefunds) === 0, `controlled source repair failed: ${JSON.stringify(sourceAudit)}`);

const outputDir = join(".local-logs", runId);
mkdirSync(outputDir, { recursive: true });
const result = {
  ok: true,
  runId,
  resolvedCallbackAlertIds: callbackAlerts.map((row) => row.id),
  resolvedMutableAlertIds: mutableFixtures.map((row) => row.id),
  sourceAudit: { successfulMallPayments: Number(sourceAudit.successfulMallPayments), failedMallRefunds: Number(sourceAudit.failedMallRefunds) },
  final: { open: openAfter.length, acknowledged: acknowledgedAfter.length, scanOpenCount: rescan.openCount, detectedCount: rescan.detectedCount }
};
writeFileSync(join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...result, outputDir }, null, 2));
