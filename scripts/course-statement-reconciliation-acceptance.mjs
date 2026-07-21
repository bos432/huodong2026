import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const mysql = createRequire(path.resolve("apps/api/package.json"))("mysql2/promise");
const base = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const output = path.resolve(process.env.COURSE_STATEMENT_RESULT_FILE || path.join(process.cwd(), ".local-logs", `course-statement-${Date.now()}`, "result.json"));
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
async function login(username, password = "Qiwai123456") {
  const value = await request("/admin/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) });
  if (!value.response.ok || value.payload?.code !== 0) throw new Error(`${username} login failed: ${JSON.stringify(value.payload)}`);
  return value.payload.data;
}

async function main() {
  const finance = await login("showcase_finance");
  const tenantId = Number(finance.admin?.tenantId || 0);
  assert(tenantId > 0, "tenant finance account is required");
  db = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 13306), user: process.env.DB_USERNAME || "activity", password: process.env.DB_PASSWORD || "activitypass", database: process.env.DB_DATABASE || "activity_registration", timezone: "+08:00" });
  const stamp = Date.now();
  const [[source], [foreignSource]] = await Promise.all([
    db.query("SELECT co.userId,c.id AS courseId FROM course_orders co JOIN courses c ON c.id=co.courseId WHERE c.tenantId=? ORDER BY co.id ASC LIMIT 1", [tenantId]).then(([rows]) => rows),
    db.query("SELECT t.id AS tenantId,u.id AS userId FROM tenants t JOIN users u ON 1=1 WHERE t.id<>? ORDER BY t.id,u.id LIMIT 1", [tenantId]).then(([rows]) => rows)
  ]);
  assert(source?.courseId && foreignSource?.tenantId && foreignSource?.userId, "course statement fixtures are unavailable");
  const [foreignCourseInsert] = await db.execute("INSERT INTO courses (title,description,price,originalPrice,status,tenantId,createdAt,updatedAt) VALUES (?,?,'0.01','0.01','published',?,NOW(),NOW())", [`课程账单跨租户验收-${stamp}`, "仅用于证明租户 #23 不能匹配其他商家的课程订单", foreignSource.tenantId]);
  const foreignOrderNo = `COSTMTFOREIGN${stamp}`;
  const [foreignOrderInsert] = await db.execute("INSERT INTO course_orders (orderNo,userId,courseId,amount,amountFen,businessSnapshot,clientOrderKey,paymentMethod,status,transactionNo,paidAt,expiresAt,closedAt,closeReason,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,'wechat','paid',?,NOW(),NULL,NULL,NULL,NOW(),NOW())", [foreignOrderNo, foreignSource.userId, Number(foreignCourseInsert.insertId), "0.01", 1, JSON.stringify({ acceptance: "course-statement-foreign", stamp }), `course-statement-foreign-${stamp}`, `COSTMTFOREIGNTX${stamp}`]);

  const orders = [];
  for (const [suffix, amountFen] of [["MATCH", 123], ["DIFF", 234]]) {
    const orderNo = `COSTMT${suffix}${stamp}`;
    const [insert] = await db.execute("INSERT INTO course_orders (orderNo,userId,courseId,amount,amountFen,businessSnapshot,clientOrderKey,paymentMethod,status,transactionNo,paidAt,expiresAt,closedAt,closeReason,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,'wechat','paid',?,NOW(),NULL,NULL,NULL,NOW(),NOW())", [orderNo, source.userId, source.courseId, (amountFen / 100).toFixed(2), amountFen, JSON.stringify({ acceptance: "course-statement", stamp, suffix }), `course-statement-${suffix}-${stamp}`, `COSTMTLOCAL${suffix}${stamp}`]);
    orders.push({ id: Number(insert.insertId), orderNo, amountFen });
  }
  const matchedTransactionNo = `WXCOURSEMATCH${stamp}`;
  const mismatchTransactionNo = `WXCOURSEDIFF${stamp}`;
  const foreignTransactionNo = `WXCOURSEFOREIGN${stamp}`;
  const body = {
    provider: "wechat",
    batchNo: `COURSE-STMT-${stamp}`,
    items: [
      { transactionNo: matchedTransactionNo, orderNo: orders[0].orderNo, amount: 1.23, providerStatus: "SUCCESS", raw: { apiKey: "must-not-return", source: "course-match" } },
      { transactionNo: mismatchTransactionNo, orderNo: orders[1].orderNo, amount: 2.33, providerStatus: "SUCCESS", raw: { accessToken: "must-not-return", source: "course-mismatch" } },
      { transactionNo: foreignTransactionNo, orderNo: foreignOrderNo, amount: 0.01, providerStatus: "SUCCESS", raw: { secret: "must-not-return", source: "foreign-tenant" } }
    ]
  };
  const imported = await api("/admin/finance/statements/import", finance.token, { method: "POST", body });
  assert(imported.importedCount === 3 && imported.matchedCount === 1 && imported.pendingCount === 2, `course statement import summary mismatch: ${JSON.stringify(imported)}`);
  result.checks.push("course-match-amount-difference-and-foreign-order-detection");

  const replay = await api("/admin/finance/statements/import", finance.token, { method: "POST", body });
  assert(replay.importedCount === 0 && replay.updatedCount === 3, `course statement replay must update existing rows: ${JSON.stringify(replay)}`);
  result.checks.push("statement-import-idempotent-replay");

  const statements = await api("/admin/finance/statements", finance.token);
  const retainedStatements = statements.filter((row) => [matchedTransactionNo, mismatchTransactionNo, foreignTransactionNo].includes(row.transactionNo));
  assert(retainedStatements.length === 3, "tenant finance statement list is incomplete");
  const matched = retainedStatements.find((row) => row.transactionNo === matchedTransactionNo);
  const mismatch = retainedStatements.find((row) => row.transactionNo === mismatchTransactionNo);
  const foreign = retainedStatements.find((row) => row.transactionNo === foreignTransactionNo);
  assert(matched.businessType === "course" && matched.courseOrder?.id === orders[0].id && matched.reconciliationStatus === "matched", "matched course statement projection failed");
  assert(mismatch.businessType === "course" && mismatch.courseOrder?.id === orders[1].id && mismatch.discrepancyType === "amount_mismatch", "course amount mismatch projection failed");
  assert(foreign.businessType === "activity" && !foreign.courseOrder && foreign.discrepancyType === "unknown_order", "foreign course order must not cross tenant boundary");
  const serializedStatements = JSON.stringify(retainedStatements);
  assert(!/must-not-return|apiKey|accessToken|"secret"/.test(serializedStatements), "statement API leaked provider raw payload");
  result.checks.push("tenant-bound-course-link-and-provider-payload-whitelist");

  await db.execute("UPDATE course_orders SET status='closed',closedAt=NOW(),closeReason='跨租户渠道账单隔离受控验收' WHERE id=?", [foreignOrderInsert.insertId]);

  const reconciliation = await api("/admin/finance/reconciliation", finance.token);
  const mismatchFlow = reconciliation.find((row) => row.transactionNo === mismatchTransactionNo);
  assert(mismatchFlow?.businessType === "course" && mismatchFlow.businessOrderNo === orders[1].orderNo && mismatchFlow.reconciliationStatus === "pending", "course mismatch was not exposed in finance reconciliation");
  const resolved = await api(`/admin/finance/transactions/${mismatchFlow.id}/resolve`, finance.token, { method: "POST", body: { remark: "课程渠道账单金额差异已人工核对，关闭测试订单" } });
  assert(resolved.reconciliationStatus === "resolved", "course payment difference resolution failed");
  const [[statementAfterResolve]] = await db.query("SELECT reconciliationStatus,remark FROM payment_statement_records WHERE transactionNo=?", [mismatchTransactionNo]);
  assert(statementAfterResolve?.reconciliationStatus === "resolved", "course statement did not follow transaction resolution");
  await db.execute("UPDATE course_orders SET status='closed',closedAt=NOW(),closeReason='课程渠道账单差异受控验收' WHERE id=?", [orders[1].id]);
  result.checks.push("course-difference-manual-resolution-and-statement-sync");

  const [recordRows] = await db.query("SELECT id,transactionNo,businessType,courseOrderId,reconciliationStatus,discrepancyType FROM payment_statement_records WHERE transactionNo IN (?,?,?) ORDER BY id", [matchedTransactionNo, mismatchTransactionNo, foreignTransactionNo]);
  const [paymentRows] = await db.query("SELECT id,transactionNo,businessType,businessOrderNo,status,reconciliationStatus,discrepancyType FROM payment_transactions WHERE transactionNo IN (?,?) ORDER BY id", [matchedTransactionNo, mismatchTransactionNo]);
  result.retained = { tenantId, orders, statementIds: Object.fromEntries(recordRows.map((row) => [row.transactionNo, Number(row.id)])), paymentTransactionIds: Object.fromEntries(paymentRows.map((row) => [row.transactionNo, Number(row.id)])), foreignTenantId: Number(foreignSource.tenantId), foreignCourseId: Number(foreignCourseInsert.insertId), foreignOrderId: Number(foreignOrderInsert.insertId), foreignOrderNo, batchNo: body.batchNo };
  result.database = { statements: recordRows, payments: paymentRows };
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
  console.log(`Course statement acceptance result: ${output}`);
});
