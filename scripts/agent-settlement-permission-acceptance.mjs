import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { API_BASE, api, assert, auth, loginPlatformAdmin, loginShowcaseAdmin } from "./online-showcase-lib.mjs";

const require = createRequire(path.resolve("apps/api/package.json"));
const mysql = require("mysql2/promise");
const stamp = Date.now();
const runId = `agent-settlement-permission-${stamp}`;
const outputDir = path.resolve(".local-logs", runId);
fs.mkdirSync(outputDir, { recursive: true });

async function request(pathname, token, method = "GET", body) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { ...(token ? auth(token) : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, payload, data: payload?.data, contentType: response.headers.get("content-type") || "" };
}

function expectDenied(result, label, statuses = [403]) {
  assert(statuses.includes(result.status), `${label} 应为 ${statuses.join("/")}，实际 ${result.status}`);
}

function assertMinimalTenant(tenant, label) {
  const keys = Object.keys(tenant || {}).sort();
  assert(JSON.stringify(keys) === JSON.stringify(["code", "enabled", "id", "name"]), `${label} 字段异常：${keys.join(",")}`);
}

const readAdmin = await loginShowcaseAdmin("showcase_settle_read");
const manageAdmin = await loginShowcaseAdmin("showcase_settle_manager");
const payAdmin = await loginShowcaseAdmin("showcase_settle_pay");
const transferAdmin = await loginShowcaseAdmin("showcase_settle_transfer");
const sensitiveAdmin = await loginShowcaseAdmin("showcase_settle_sensitive");
const exportAdmin = await loginShowcaseAdmin("showcase_settle_export");
const platformAdmin = await loginPlatformAdmin();

const options = await api("/admin/agent-settlements/options", { headers: auth(readAdmin.token) });
assert(options.tenants?.length === 1, "结算只读账号应只获得当前商家 options");
assertMinimalTenant(options.tenants[0], "结算 options 商家");
assert(options.agents.every((item) => !Object.prototype.hasOwnProperty.call(item, "contactPhone") && !Object.prototype.hasOwnProperty.call(item, "settlementConfig")), "结算 options 泄露代理敏感资料");
const tenantId = Number(options.tenants[0].id);
const platformOptions = await api("/admin/payment-accounts/options", { headers: auth(platformAdmin.token) });
const otherTenant = platformOptions.tenants.find((tenant) => Number(tenant.id) !== tenantId);
assert(otherTenant, "未找到跨商家结算验收对象");

expectDenied(await request("/admin/agent-settlements/generate", readAdmin.token, "POST", { agentId: 1, periodStart: "2035-01-01", periodEnd: "2035-02-01" }), "只读账号生成结算");
expectDenied(await request("/admin/agent-settlements/1/mark-paid", sensitiveAdmin.token, "POST", { paidReference: "NO-RIGHT" }), "敏感账号登记打款");
expectDenied(await request("/admin/agent-settlement-transfers/scan", payAdmin.token, "POST", {}), "打款账号扫描回执");
expectDenied(await request("/admin/agent-settlements/export", readAdmin.token), "只读账号导出结算");
expectDenied(await request("/admin/agent-settlements?pageSize=101", readAdmin.token), "非法结算分页", [400]);
expectDenied(await request("/admin/agent-settlements?status=unknown", readAdmin.token), "非法结算状态", [400]);

const agent = await api("/admin/agents", {
  method: "POST",
  headers: { ...auth(platformAdmin.token), "Content-Type": "application/json" },
  body: JSON.stringify({ tenantId, name: `结算代理-${runId}`, region: "结算验收区", contactName: "结算联系人", contactPhone: "13812345678", enabled: true, settlementConfig: { commissionRate: 10 } })
});
const crossAgent = await api("/admin/agents", {
  method: "POST",
  headers: { ...auth(platformAdmin.token), "Content-Type": "application/json" },
  body: JSON.stringify({ tenantId: Number(otherTenant.id), name: `跨商家结算代理-${runId}`, region: "边界区", enabled: true })
});

const month = String((stamp % 9) + 1).padStart(2, "0");
const generateBody = { agentId: agent.id, periodStart: `2035-${month}-01 00:00`, periodEnd: `2035-${month}-20 00:00`, commissionRate: 10, remark: runId };
const generationRace = await Promise.all([
  request("/admin/agent-settlements/generate", manageAdmin.token, "POST", generateBody),
  request("/admin/agent-settlements/generate", manageAdmin.token, "POST", generateBody)
]);
const generationStatuses = generationRace.map((item) => item.status).sort();
assert(JSON.stringify(generationStatuses) === JSON.stringify([201, 400]), `重复周期并发生成应为 201/400，实际 ${generationStatuses.join("/")}`);
const generated = generationRace.find((item) => item.status === 201)?.data;
assert(generated?.id, "并发生成未返回结算单");

await request(`/admin/agent-settlements/${generated.id}/submit`, manageAdmin.token, "POST", {});
const reviewRace = await Promise.all([
  request(`/admin/agent-settlements/${generated.id}/approve`, manageAdmin.token, "POST", { remark: "并发审核通过" }),
  request(`/admin/agent-settlements/${generated.id}/reject`, manageAdmin.token, "POST", { remark: "并发审核拒绝" })
]);
const reviewStatuses = reviewRace.map((item) => item.status).sort();
assert(JSON.stringify(reviewStatuses) === JSON.stringify([201, 400]), `并发审核应为 201/400，实际 ${reviewStatuses.join("/")}`);

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 13306),
  user: process.env.DB_USERNAME || "activity",
  password: process.env.DB_PASSWORD || "activitypass",
  database: process.env.DB_DATABASE || "activity_registration",
  timezone: "+08:00"
});

const payload = JSON.stringify({ transactionIds: [], refundIds: [], internalSecret: `secret-${runId}` });
const [sensitiveInsert] = await db.execute(
  "INSERT INTO agent_settlements (settlementNo, agentId, tenantId, periodStart, periodEnd, transactionCount, refundCount, grossAmount, refundAmount, netAmount, commissionRate, commissionAmount, payableAmount, status, generatedBy, reviewedBy, reviewRemark, reviewedAt, paidBy, paidReference, paidProofUrl, paidRemark, paidAt, payload, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 0, 0, '0.00', '0.00', '0.00', '10.0000', '0.00', '0.00', 'paid', 'seed', 'reviewer', 'sensitive-review', NOW(), 'payer', ?, ?, 'sensitive-paid-remark', NOW(), ?, NOW(), NOW())",
  [`AS-SENSITIVE-${stamp}`, agent.id, tenantId, "2036-01-01 00:00:00", "2036-02-01 00:00:00", `BANK-${stamp}`, `/api/admin/private-settlement-proofs/proof-${stamp}.pdf/download`, payload]
);
const sensitiveSettlementId = Number(sensitiveInsert.insertId);
const [transferInsert] = await db.execute(
  "INSERT INTO agent_settlement_transfers (settlementId, tenantId, agentId, accountId, provider, mode, transferNo, providerTransferNo, amount, status, failureReason, requestedBy, requestedAt, syncedAt, completedAt, retryCount, nextQueryAt, remark, payload, createdAt, updatedAt) VALUES (?, ?, ?, NULL, 'wechat', 'sandbox', ?, ?, '0.00', 'failed', ?, 'transfer-user', NOW(), NOW(), NULL, 1, NULL, 'sensitive-transfer-remark', ?, NOW(), NOW())",
  [sensitiveSettlementId, tenantId, agent.id, `AST-${stamp}`, `WX-${stamp}`, `failure-${runId}`, JSON.stringify({ apiKey: `transfer-secret-${runId}` })]
);
const transferId = Number(transferInsert.insertId);

const [payInsert] = await db.execute(
  "INSERT INTO agent_settlements (settlementNo, agentId, tenantId, periodStart, periodEnd, transactionCount, refundCount, grossAmount, refundAmount, netAmount, commissionRate, commissionAmount, payableAmount, status, generatedBy, reviewedBy, reviewRemark, reviewedAt, payload, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 0, 0, '0.00', '0.00', '0.00', '10.0000', '0.00', '0.00', 'approved', 'seed', 'reviewer', 'ready-to-pay', NOW(), ?, NOW(), NOW())",
  [`AS-PAY-${stamp}`, agent.id, tenantId, "2036-03-01 00:00:00", "2036-04-01 00:00:00", JSON.stringify({ transactionIds: [], refundIds: [] })]
);
const paySettlementId = Number(payInsert.insertId);
const payRace = await Promise.all([
  request(`/admin/agent-settlements/${paySettlementId}/mark-paid`, payAdmin.token, "POST", { paidReference: `PAY-A-${stamp}`, remark: "并发打款 A" }),
  request(`/admin/agent-settlements/${paySettlementId}/mark-paid`, payAdmin.token, "POST", { paidReference: `PAY-B-${stamp}`, remark: "并发打款 B" })
]);
const payStatuses = payRace.map((item) => item.status).sort();
assert(JSON.stringify(payStatuses) === JSON.stringify([201, 400]), `并发打款应为 201/400，实际 ${payStatuses.join("/")}`);

const [crossInsert] = await db.execute(
  "INSERT INTO agent_settlements (settlementNo, agentId, tenantId, periodStart, periodEnd, transactionCount, refundCount, grossAmount, refundAmount, netAmount, commissionRate, commissionAmount, payableAmount, status, generatedBy, payload, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 0, 0, '0.00', '0.00', '0.00', '0.0000', '0.00', '0.00', 'draft', 'seed', ?, NOW(), NOW())",
  [`AS-CROSS-${stamp}`, crossAgent.id, Number(otherTenant.id), "2037-01-01 00:00:00", "2037-02-01 00:00:00", JSON.stringify({ transactionIds: [], refundIds: [] })]
);
const crossSettlementId = Number(crossInsert.insertId);

const readList = await api(`/admin/agent-settlements?keyword=${encodeURIComponent(`AS-SENSITIVE-${stamp}`)}&page=1&pageSize=20`, { headers: auth(readAdmin.token) });
const readRow = readList.items.find((item) => item.id === sensitiveSettlementId);
assert(readRow && readRow.paidReference !== `BANK-${stamp}` && readRow.paidProofUrl === null, "只读结算未隐藏打款敏感字段");
assertMinimalTenant(readRow.tenant, "只读结算商家");
const readDetails = await api(`/admin/agent-settlements/${sensitiveSettlementId}/details`, { headers: auth(readAdmin.token) });
const readJson = JSON.stringify(readDetails);
assert(!readJson.includes(`secret-${runId}`) && !readJson.includes(`transfer-secret-${runId}`), "只读结算详情泄露内部 payload");
assert(!readJson.includes(`failure-${runId}`) && !readJson.includes(`WX-${stamp}`), "只读结算详情泄露回执敏感字段");
assert(readDetails.transfers.find((item) => item.id === transferId)?.failureReason === "转账失败，需敏感权限查看原因", "只读回执失败原因未受控投影");

const sensitiveList = await api(`/admin/agent-settlements?keyword=${encodeURIComponent(`AS-SENSITIVE-${stamp}`)}&page=1&pageSize=20`, { headers: auth(sensitiveAdmin.token) });
const sensitiveRow = sensitiveList.items.find((item) => item.id === sensitiveSettlementId);
assert(sensitiveRow?.paidReference === `BANK-${stamp}` && sensitiveRow?.paidProofUrl?.includes(`proof-${stamp}`), "敏感账号未返回完整打款字段");
const sensitiveDetails = await api(`/admin/agent-settlements/${sensitiveSettlementId}/details`, { headers: auth(sensitiveAdmin.token) });
const sensitiveTransfer = sensitiveDetails.transfers.find((item) => item.id === transferId);
assert(sensitiveTransfer?.providerTransferNo === `WX-${stamp}` && sensitiveTransfer?.failureReason === `failure-${runId}`, "敏感账号未返回完整回执字段");
assert(!JSON.stringify(sensitiveDetails).includes(`transfer-secret-${runId}`), "敏感详情不应返回内部 payload 密钥");

expectDenied(await request(`/admin/agent-settlements/${crossSettlementId}/details`, readAdmin.token), "跨商家读取结算详情", [404]);

const exportResult = await request(`/admin/agent-settlements/export?agentId=${agent.id}`, exportAdmin.token);
assert(exportResult.status === 200 && exportResult.contentType.includes("spreadsheetml"), `结算导出失败：${exportResult.status}/${exportResult.contentType}`);

const [auditRows] = await db.execute("SELECT id, action FROM admin_operation_logs WHERE action IN ('agent_settlement.sensitive.view', 'agent_settlement.sensitive.detail') ORDER BY id DESC LIMIT 20");
await db.end();
assert(auditRows.length >= 2, "结算敏感查看审计未写入");

const result = {
  runId,
  tenantId,
  retained: {
    agentId: agent.id,
    generatedSettlementId: generated.id,
    sensitiveSettlementId,
    transferId,
    paySettlementId,
    crossTenantAgentId: crossAgent.id,
    crossTenantSettlementId: crossSettlementId
  },
  privacy: {
    readPaidReference: readRow.paidReference,
    readPaidProofUrl: readRow.paidProofUrl,
    sensitivePaidReference: sensitiveRow.paidReference,
    sensitiveProviderTransferNo: sensitiveTransfer.providerTransferNo,
    payloadLeaked: readJson.includes(`secret-${runId}`) || JSON.stringify(sensitiveDetails).includes(`transfer-secret-${runId}`)
  },
  races: { generationStatuses, reviewStatuses, payStatuses },
  export: { status: exportResult.status, contentType: exportResult.contentType },
  audits: auditRows.map((row) => Number(row.id)),
  createdAt: new Date().toISOString()
};
fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
