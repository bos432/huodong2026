import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const mysql = createRequire(path.resolve("apps/api/package.json"))("mysql2/promise");
const base = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const output = path.resolve(process.env.MALL_STATEMENT_RESULT_FILE || path.join(process.cwd(), ".local-logs", `mall-statement-${Date.now()}`, "result.json"));
const result = { status: "running", startedAt: new Date().toISOString(), checks: [], retained: {} };
let db;

function assert(condition, message) { if (!condition) throw new Error(message); }
async function request(route, options = {}) {
  const response = await fetch(`${base}${route}`, options);
  const text = await response.text();
  let payload; try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}
async function api(route, token, options = {}) {
  const value = await request(route, { method: options.method || "GET", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  if (!value.response.ok || value.payload?.code !== 0) throw new Error(`${options.method || "GET"} ${route} failed: ${JSON.stringify(value.payload)}`);
  return value.payload.data;
}
async function login(username) {
  return api("/admin/auth/login", "", { method: "POST", body: { username, password: "Qiwai123456" } });
}

async function createPaidOrder({ stamp, suffix, merchantId, amountFen, userId, tenantId = 23, orderNo: requestedOrderNo }) {
  const orderNo = requestedOrderNo || `MOSTMT${suffix}${stamp}`;
  const transactionNo = `MOPAY${suffix}${stamp}`;
  const amount = (amountFen / 100).toFixed(2);
  const [insert] = await db.execute(
    "INSERT INTO mall_orders (orderNo,tenantId,userId,amount,goodsAmount,discountAmount,freightAmount,paymentMethod,clientOrderKey,status,transactionNo,addressSnapshot,paidAt,merchantId,amountFen,businessSnapshot,totalQuantity,createdAt,updatedAt) VALUES (?,?,?,?,?,'0.00','0.00','wechat',?,'paid',?,?,NOW(),?,?,?,1,NOW(),NOW())",
    [orderNo, tenantId, userId, amount, amount, `mall-statement-${suffix}-${stamp}`, transactionNo, JSON.stringify({ acceptance: "mall-statement", suffix }), merchantId, amountFen, JSON.stringify({ acceptance: "mall-statement", suffix, merchantId, amountFen })]
  );
  const orderId = Number(insert.insertId);
  const [paymentInsert] = await db.execute(
    "INSERT INTO mall_payment_transactions (orderId,tenantId,transactionNo,provider,paymentMethod,amount,status,remark,reconciliationStatus,discrepancyType,merchantId,amountFen,businessType,businessOrderNo,businessSnapshot,createdAt) VALUES (?,?,?,'wechat','wechat',?,'success','多商户渠道账单验收','matched',NULL,?,?,'mall',?,?,NOW())",
    [orderId, tenantId, transactionNo, amount, merchantId, amountFen, orderNo, JSON.stringify({ acceptance: "mall-statement", suffix, merchantId, amountFen })]
  );
  return { id: orderId, orderNo, transactionNo, paymentTransactionId: Number(paymentInsert.insertId), merchantId, amountFen };
}

async function importStatement(token, merchantId, statementDate, transactionNo, orderNo, amount, suffix) {
  return api("/admin/mall/payment-statements/import", token, { method: "POST", body: {
    tenantId: 23,
    merchantId,
    statementDate,
    batchNo: `MALL-STMT-${suffix}`,
    items: [{ transactionNo, orderNo, amount, providerStatus: "SUCCESS", rawPayload: { apiKey: "must-not-return", suffix } }]
  } });
}

async function main() {
  const [owner, otherStoreFinance] = await Promise.all([login("showcase_store_owner"), login("showcase_store_finance")]);
  assert(owner.admin?.tenantId === 23 && otherStoreFinance.admin?.tenantId === 23, "mall statement tenant accounts are unavailable");
  db = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 13306), user: process.env.DB_USERNAME || "activity", password: process.env.DB_PASSWORD || "activitypass", database: process.env.DB_DATABASE || "activity_registration", timezone: "+08:00" });
  const stamp = Date.now();
  const statementDate = new Date().toISOString().slice(0, 10);
  const [[user]] = await db.query("SELECT userId AS id FROM mall_orders WHERE tenantId=23 ORDER BY id LIMIT 1");
  assert(user?.id, "tenant #23 member fixture is unavailable");

  const merchants = { platformA: 38, platformB: 39, directA: 44, directB: 52 };
  const [merchantRows] = await db.query("SELECT id,paymentMode,status,mallEnabled FROM mall_merchants WHERE id IN (38,39,44,52) ORDER BY id");
  assert(merchantRows.length === 4 && merchantRows.every((row) => row.status === "active" && Number(row.mallEnabled) === 1), "required active merchant fixtures are unavailable");
  assert(merchantRows.find((row) => row.id === 38)?.paymentMode === "platform_collect" && merchantRows.find((row) => row.id === 44)?.paymentMode === "merchant_direct" && merchantRows.find((row) => row.id === 52)?.paymentMode === "merchant_direct", "merchant collection modes are not ready");

  const sharedTransactionNo = `WXACCTSCOPE${stamp}`;
  const [platformOrder, directAOrder, directBOrder, conflictOrder] = await Promise.all([
    createPaidOrder({ stamp, suffix: "PA", merchantId: merchants.platformA, amountFen: 101, userId: user.id }),
    createPaidOrder({ stamp, suffix: "DA", merchantId: merchants.directA, amountFen: 202, userId: user.id }),
    createPaidOrder({ stamp, suffix: "DB", merchantId: merchants.directB, amountFen: 303, userId: user.id }),
    createPaidOrder({ stamp, suffix: "PB", merchantId: merchants.platformB, amountFen: 404, userId: user.id })
  ]);

  const initialImports = await Promise.all([
    importStatement(owner.token, merchants.platformA, statementDate, sharedTransactionNo, platformOrder.orderNo, 1.01, `${stamp}-PA`),
    importStatement(owner.token, merchants.directA, statementDate, sharedTransactionNo, directAOrder.orderNo, 2.02, `${stamp}-DA`),
    importStatement(owner.token, merchants.directB, statementDate, sharedTransactionNo, directBOrder.orderNo, 3.03, `${stamp}-DB`)
  ]);
  assert(initialImports.every((item) => item.importedCount === 1 && item.updatedCount === 0 && item.matchedCount === 1), `initial account-scope imports failed: ${JSON.stringify(initialImports)}`);
  const replayImports = await Promise.all([
    importStatement(owner.token, merchants.platformA, statementDate, sharedTransactionNo, platformOrder.orderNo, 1.01, `${stamp}-PA-REPLAY`),
    importStatement(owner.token, merchants.directA, statementDate, sharedTransactionNo, directAOrder.orderNo, 2.02, `${stamp}-DA-REPLAY`),
    importStatement(owner.token, merchants.directB, statementDate, sharedTransactionNo, directBOrder.orderNo, 3.03, `${stamp}-DB-REPLAY`)
  ]);
  assert(replayImports.every((item) => item.importedCount === 0 && item.updatedCount === 1 && item.processedCount === 1), `account-scope replay summary failed: ${JSON.stringify(replayImports)}`);
  const [scopeRows] = await db.query("SELECT id,accountScope,merchantId,orderId,reconciliationStatus,amountFen FROM mall_payment_statement_records WHERE provider='wechat' AND transactionNo=? ORDER BY accountScope", [sharedTransactionNo]);
  assert(scopeRows.length === 3 && new Set(scopeRows.map((row) => row.accountScope)).size === 3, `same transaction number crossed collection accounts: ${JSON.stringify(scopeRows)}`);
  result.checks.push("platform-and-two-merchant-direct-account-scope-isolation", "idempotent-replay-with-import-update-counts");

  const conflict = await request("/admin/mall/payment-statements/import", { method: "POST", headers: { Authorization: `Bearer ${owner.token}`, "content-type": "application/json" }, body: JSON.stringify({ tenantId: 23, merchantId: merchants.platformB, statementDate, items: [{ transactionNo: sharedTransactionNo, orderNo: conflictOrder.orderNo, amount: 4.04 }] }) });
  assert(conflict.response.status === 400 && /已归属店铺|不能重新绑定/.test(String(conflict.payload?.message)), `same-account merchant rebinding was not rejected: ${JSON.stringify(conflict.payload)}`);
  const [scopeRowsAfterConflict] = await db.query("SELECT merchantId,orderId FROM mall_payment_statement_records WHERE provider='wechat' AND accountScope='tenant:23:platform' AND transactionNo=?", [sharedTransactionNo]);
  assert(scopeRowsAfterConflict.length === 1 && Number(scopeRowsAfterConflict[0].merchantId) === merchants.platformA && Number(scopeRowsAfterConflict[0].orderId) === platformOrder.id, "rejected rebinding changed the original platform statement");
  result.checks.push("same-collection-account-binding-drift-rejected");

  const mismatchTransactionNo = `WXMISMATCH${stamp}`;
  const mismatchImport = await importStatement(owner.token, merchants.directA, statementDate, mismatchTransactionNo, directAOrder.orderNo, 2.01, `${stamp}-MISMATCH`);
  const mismatch = mismatchImport.items[0];
  assert(mismatch.reconciliationStatus === "pending" && mismatch.discrepancyType === "amount_mismatch", "amount mismatch was not detected");
  await api(`/admin/mall/payment-statements/${mismatch.id}/claim`, owner.token, { method: "POST" });
  const resolved = await api(`/admin/mall/payment-statements/${mismatch.id}/resolve`, owner.token, { method: "POST", body: { action: "resolved", remark: "多商户金额差异已核对并留存渠道凭证" } });
  assert(resolved.reconciliationStatus === "resolved" && resolved.resolvedBy === "showcase_store_owner", "amount mismatch resolution failed");
  const [[resolvedPayment]] = await db.query("SELECT reconciliationStatus,discrepancyType,remark FROM mall_payment_transactions WHERE id=?", [directAOrder.paymentTransactionId]);
  assert(resolvedPayment?.reconciliationStatus === "resolved" && resolvedPayment?.discrepancyType === "amount_mismatch", "statement resolution did not synchronize the mall payment ledger");

  const unknownTransactionNo = `WXUNKNOWN${stamp}`;
  const unknownImport = await importStatement(owner.token, merchants.directB, statementDate, unknownTransactionNo, `MISSING${stamp}`, 8.88, `${stamp}-UNKNOWN`);
  const unknown = unknownImport.items[0];
  assert(unknown.discrepancyType === "unknown_order", "unknown order was not detected");
  await api(`/admin/mall/payment-statements/${unknown.id}/claim`, owner.token, { method: "POST" });
  const ignored = await api(`/admin/mall/payment-statements/${unknown.id}/resolve`, owner.token, { method: "POST", body: { action: "ignored", remark: "确认不属于当前业务订单，按渠道异常流水归档" } });
  assert(ignored.reconciliationStatus === "ignored", "unknown statement ignore failed");
  result.checks.push("amount-mismatch-claim-resolve-and-payment-ledger-sync", "unknown-order-claim-and-ignore");

  const lateTransactionNo = `WXLATE${stamp}`;
  const lateOrderNo = `MOSTMTLATE${stamp}`;
  const lateImport = await importStatement(owner.token, merchants.directB, statementDate, lateTransactionNo, lateOrderNo, 5.05, `${stamp}-LATE`);
  assert(lateImport.items[0].discrepancyType === "unknown_order", "late order statement should begin as unknown");
  const lateOrder = await createPaidOrder({ stamp, suffix: "LATE", merchantId: merchants.directB, amountFen: 505, userId: user.id, orderNo: lateOrderNo });
  const rechecked = await api(`/admin/mall/payment-statements/${lateImport.items[0].id}/resolve`, owner.token, { method: "POST", body: { action: "recheck", remark: "延迟订单落库后重新勾兑" } });
  assert(rechecked.reconciliationStatus === "matched" && rechecked.order?.id === lateOrder.id, "late order recheck did not match");
  const [[latePayment]] = await db.query("SELECT reconciliationStatus,discrepancyType FROM mall_payment_transactions WHERE id=?", [lateOrder.paymentTransactionId]);
  assert(latePayment?.reconciliationStatus === "matched" && latePayment?.discrepancyType === null, "recheck result did not synchronize payment ledger");
  result.checks.push("late-order-recheck-and-payment-ledger-sync");

  const deniedList = await request(`/admin/mall/payment-statements?tenantId=23&merchantId=${merchants.directA}`, { headers: { Authorization: `Bearer ${otherStoreFinance.token}` } });
  const deniedClaim = await request(`/admin/mall/payment-statements/${mismatch.id}/claim`, { method: "POST", headers: { Authorization: `Bearer ${otherStoreFinance.token}`, "content-type": "application/json" } });
  assert(deniedList.response.status === 403 && [403, 404].includes(deniedClaim.response.status), `other-store finance accessed direct merchant statements: list=${deniedList.response.status}, claim=${deniedClaim.response.status}`);
  const directAList = await api(`/admin/mall/payment-statements?tenantId=23&merchantId=${merchants.directA}&keyword=${encodeURIComponent(sharedTransactionNo)}`, owner.token);
  assert(directAList.length === 1 && directAList[0].merchant?.id === merchants.directA, "authorized merchant statement filter failed");
  assert(!/must-not-return|apiKey|rawPayload/.test(JSON.stringify([...initialImports, ...replayImports, directAList])), "mall statement API leaked provider raw payload");
  result.checks.push("other-store-list-and-action-denied", "provider-payload-whitelist");

  const [retainedStatements] = await db.query("SELECT id,accountScope,transactionNo,orderNo,merchantId,orderId,amountFen,reconciliationStatus,discrepancyType,claimedBy,resolvedBy,resolutionRemark FROM mall_payment_statement_records WHERE transactionNo IN (?,?,?,?) ORDER BY id", [sharedTransactionNo, mismatchTransactionNo, unknownTransactionNo, lateTransactionNo]);
  result.retained = { tenantId: 23, merchants, sharedTransactionNo, orders: [platformOrder, directAOrder, directBOrder, conflictOrder, lateOrder], statementIds: retainedStatements.map((row) => Number(row.id)) };
  result.database = { statements: retainedStatements, accountScopes: scopeRows };
  await db.end(); db = null;
  result.status = "passed";
  result.finishedAt = new Date().toISOString();
}

main().catch((error) => {
  result.status = "failed";
  result.error = error.stack || error.message;
  result.finishedAt = new Date().toISOString();
  process.exitCode = 1;
}).finally(async () => {
  if (db) { try { await db.end(); } catch {} }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Mall statement acceptance result: ${output}`);
});
