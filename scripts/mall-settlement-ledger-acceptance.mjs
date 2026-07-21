import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.resolve("apps/api/package.json"));
const mysql = require("mysql2/promise");
const API_BASE = String(process.env.API_BASE_URL || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const TENANT_CODE = process.env.TENANT_CODE || "qiwai-showcase";
const today = new Date().toISOString().slice(0, 10);
const periodStart = String(process.env.MALL_SETTLEMENT_PERIOD_START || today).trim();
const periodEnd = String(process.env.MALL_SETTLEMENT_PERIOD_END || today).trim();

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function rawRequest(pathname, { method = "GET", token, body } = {}) {
  const separator = pathname.includes("?") ? "&" : "?";
  const response = await fetch(`${API_BASE}${pathname}${separator}tenantCode=${encodeURIComponent(TENANT_CODE)}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { ok: response.ok, status: response.status, data: payload?.data ?? payload };
}

async function request(pathname, options) {
  const result = await rawRequest(pathname, options);
  if (!result.ok) throw new Error(`${options?.method || "GET"} ${pathname} failed (${result.status}): ${JSON.stringify(result.data)}`);
  return result.data;
}

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 13306),
  user: process.env.DB_USERNAME || "activity",
  password: process.env.DB_PASSWORD || "activitypass",
  database: process.env.DB_DATABASE || "activity_registration",
  timezone: "+08:00"
});

try {
  const adminLogin = await request("/admin/auth/login", { method: "POST", body: { username: "admin", password: "Admin123456" } });
  const adminToken = adminLogin.token;
  assert(adminToken, "结算验收管理员登录失败");
  const [[target]] = await db.query(
    "SELECT t.id tenantId,m.id merchantId,m.name merchantName,MAX(r.id) latestRefundId FROM tenants t JOIN mall_merchants m ON m.tenantId=t.id JOIN mall_refunds r ON r.merchantId=m.id AND r.status='approved' WHERE t.code=? AND m.status='active' AND m.mallEnabled=1 GROUP BY t.id,m.id,m.name ORDER BY latestRefundId DESC LIMIT 1",
    [TENANT_CODE]
  );
  assert(target?.tenantId && target?.merchantId, "缺少可结算租户和店铺");

  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const generateKey = `settlement-generate-${stamp}`;
  const generateBody = {
    tenantId: target.tenantId,
    merchantId: target.merchantId,
    periodStart,
    periodEnd,
    businessKey: generateKey,
    remark: `09.10 逐笔结算验收 ${stamp}`
  };
  const [generatedA, generatedB] = await Promise.all([
    request("/admin/mall/settlements/generate", { method: "POST", token: adminToken, body: generateBody }),
    request("/admin/mall/settlements/generate", { method: "POST", token: adminToken, body: { ...generateBody, remark: `09.10 并发生成重放 ${stamp}` } })
  ]);
  assert(generatedA.id === generatedB.id, "同业务键并发生成创建了重复结算单");
  const generated = generatedA;

  let detail = await request(`/admin/mall/settlements/${generated.id}`, { token: adminToken });
  assert(detail.lines?.length && detail.consistency?.consistent === true, "生成的结算单缺少一致的逐笔账本");
  for (const required of ["orderAmount", "refundAmount", "netAmount", "platformCollectedAmount", "merchantDirectAmount", "serviceFeeAmount", "commissionAmount", "commissionClawbackAmount", "adjustmentAmount", "payableAmount"]) {
    assert(detail.settlement?.[required] !== undefined, `结算金额字段缺失：${required}`);
  }

  const adjustmentKey = `settlement-adjustment-${stamp}`;
  const adjustmentBody = { amountFen: 123, reason: `验收财务补差 ${stamp}`, businessKey: adjustmentKey };
  const [adjustedA, adjustedB] = await Promise.all([
    request(`/admin/mall/settlements/${generated.id}/adjustments`, { method: "POST", token: adminToken, body: adjustmentBody }),
    request(`/admin/mall/settlements/${generated.id}/adjustments`, { method: "POST", token: adminToken, body: { ...adjustmentBody, reason: `验收财务补差重放 ${stamp}` } })
  ]);
  assert(adjustedA.settlement.adjustmentAmount === adjustedB.settlement.adjustmentAmount && Number(adjustedA.settlement.adjustmentAmount) === 1.23, "并发财务调整未幂等");

  const approveKey = `settlement-approve-${stamp}`;
  const approveBody = { remark: `逐笔复核通过 ${stamp}`, businessKey: approveKey };
  const [approvedA, approvedB] = await Promise.all([
    request(`/admin/mall/settlements/${generated.id}/approve`, { method: "POST", token: adminToken, body: approveBody }),
    request(`/admin/mall/settlements/${generated.id}/approve`, { method: "POST", token: adminToken, body: { ...approveBody, remark: `逐笔复核重放 ${stamp}` } })
  ]);
  assert(approvedA.status === "approved" && approvedB.id === approvedA.id, "并发复核重放失败");

  const missingEvidence = await rawRequest(`/admin/mall/settlements/${generated.id}/mark-paid`, {
    method: "POST",
    token: adminToken,
    body: { businessKey: `settlement-missing-evidence-${stamp}`, remark: "不应成功" }
  });
  assert(!missingEvidence.ok && missingEvidence.status === 400, "缺少付款凭证的结算被接受");

  const paidKey = `settlement-paid-${stamp}`;
  const paidBody = { businessKey: paidKey, paidReference: `SETTLEMENT-${stamp}`, remark: `验收付款或扣回凭证 ${stamp}` };
  const [paidA, paidB] = await Promise.all([
    request(`/admin/mall/settlements/${generated.id}/mark-paid`, { method: "POST", token: adminToken, body: paidBody }),
    request(`/admin/mall/settlements/${generated.id}/mark-paid`, { method: "POST", token: adminToken, body: { ...paidBody, remark: `验收付款重放 ${stamp}` } })
  ]);
  assert(paidA.status === "paid" && paidB.id === paidA.id, "并发付款重放失败");

  detail = await request(`/admin/mall/settlements/${generated.id}`, { token: adminToken });
  assert(detail.consistency?.consistent === true, "付款后的结算账本不一致");
  for (const action of ["generated", "adjusted", "approved", "paid"]) {
    assert(detail.events?.some((event) => event.action === action), `结算状态事件缺失：${action}`);
  }
  const [[lineKeyCheck]] = await db.query("SELECT COUNT(*) lineCount,COUNT(DISTINCT operationKey) uniqueKeyCount FROM mall_settlement_lines WHERE settlementId=?", [generated.id]);
  assert(Number(lineKeyCheck.lineCount) === Number(lineKeyCheck.uniqueKeyCount) && Number(lineKeyCheck.lineCount) === detail.lines.length, "结算逐笔流水存在重复业务键");
  assert(detail.events.filter((event) => event.action === "adjusted").length === 1, "并发财务调整生成了重复事件");
  assert(detail.events.filter((event) => event.action === "approved").length === 1, "并发复核生成了重复事件");
  assert(detail.events.filter((event) => event.action === "paid").length === 1, "并发付款生成了重复事件");

  console.log(JSON.stringify({
    testedAt: new Date().toISOString(),
    tenantCode: TENANT_CODE,
    tenantId: target.tenantId,
    merchantId: target.merchantId,
    merchantName: target.merchantName,
    periodStart,
    periodEnd,
    retainedSettlementId: generated.id,
    retainedSettlementNo: generated.settlementNo,
    retainedBusinessKey: generateKey,
    retainedLineIds: detail.lines.map((line) => line.id),
    retainedEventIds: detail.events.map((event) => event.id),
    payableAmount: detail.settlement.payableAmount,
    lineCount: detail.lines.length,
    generationReplay: generatedA.id === generatedB.id,
    adjustmentReplay: adjustedA.settlement.adjustmentAmount === adjustedB.settlement.adjustmentAmount,
    approvalReplay: approvedA.id === approvedB.id,
    paymentReplay: paidA.id === paidB.id,
    passed: true
  }, null, 2));
} finally {
  await db.end();
}
