import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const mysql = createRequire(path.resolve("apps/api/package.json"))("mysql2/promise");
const base = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const output = path.resolve(process.env.REFUND_JOB_RESULT_FILE || path.join(process.cwd(), ".local-logs", `refund-business-job-${Date.now()}`, "result.json"));
const result = { status: "running", startedAt: new Date().toISOString(), checks: [], retained: {} };
const password = process.env.SHOWCASE_PASSWORD || "Qiwai123456";
let apiStopped = false;

function assert(condition, message) { if (!condition) throw new Error(message); }
function auth(token) { return { Authorization: `Bearer ${token}`, "content-type": "application/json" }; }
async function request(route, options = {}) {
  const response = await fetch(`${base}${route}`, options);
  const text = await response.text();
  let payload; try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}
async function api(route, options = {}) {
  const value = await request(route, options);
  if (!value.response.ok || value.payload?.code !== 0) throw new Error(`${options.method || "GET"} ${route} failed: ${JSON.stringify(value.payload)}`);
  return value.payload.data;
}
async function login(username, loginPassword = password) {
  return api("/admin/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password: loginPassword }) });
}
async function waitReady(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const value = await request("/health/ready");
      if (value.response.ok && value.payload?.data?.ready === true) return value.payload.data;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("API did not become ready after restart");
}
function stopApi() { execFileSync("docker", ["stop", "activity-api"], { stdio: "pipe" }); apiStopped = true; }
function startApi() { execFileSync("docker", ["start", "activity-api"], { stdio: "pipe" }); apiStopped = false; }

async function insertJob(db, { tenantId, type, key, refundId, maxAttempts = 1, runAt = new Date() }) {
  const [insert] = await db.execute(
    "INSERT INTO business_jobs (tenantId,type,idempotencyKey,status,payload,result,attemptCount,maxAttempts,nextAttemptAt,lockedUntil,lockedBy,lastError,requestId,completedAt,deadLetteredAt,createdAt,updatedAt) VALUES (?,?,?,?,?,NULL,0,?,?,NULL,NULL,NULL,?,NULL,NULL,NOW(),NOW())",
    [tenantId, type, key, "pending", JSON.stringify({ refundId, tenantId }), maxAttempts, runAt, `acceptance-${key}`]
  );
  return Number(insert.insertId);
}

async function main() {
  const [platform, manager] = await Promise.all([login(process.env.PLATFORM_ADMIN_USERNAME || "admin", process.env.PLATFORM_ADMIN_PASSWORD || "Admin123456"), login("showcase_business_job_manager")]);
  assert(platform.admin?.role === "super_admin" && !platform.admin?.tenantId, "platform super admin is required");
  const tenantId = Number(manager.admin?.tenantId || 0);
  assert(tenantId > 0, "tenant business job manager is required");
  const db = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 13306), user: process.env.DB_USERNAME || "activity", password: process.env.DB_PASSWORD || "activitypass", database: process.env.DB_DATABASE || "activity_registration", timezone: "+08:00" });
  const stamp = Date.now();

  const [[courseSource], [mallSource], [foreignTenant]] = await Promise.all([
    db.query("SELECT co.userId,c.id AS courseId FROM course_orders co JOIN courses c ON c.id=co.courseId WHERE c.tenantId=? ORDER BY co.id ASC LIMIT 1", [tenantId]).then(([rows]) => rows),
    db.query("SELECT id,tenantId,merchantId,userId FROM mall_orders WHERE tenantId=? AND paymentMethod='wechat' ORDER BY id DESC LIMIT 1", [tenantId]).then(([rows]) => rows),
    db.query("SELECT id FROM tenants WHERE id<>? ORDER BY id ASC LIMIT 1", [tenantId]).then(([rows]) => rows)
  ]);
  assert(courseSource?.courseId && mallSource?.id && foreignTenant?.id, "refund job acceptance fixtures are unavailable");

  stopApi();
  const [courseOrderInsert] = await db.execute("INSERT INTO course_orders (orderNo,userId,courseId,amount,amountFen,businessSnapshot,clientOrderKey,paymentMethod,status,transactionNo,paidAt,expiresAt,closedAt,closeReason,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,'wechat','paid',?,NOW(),NULL,NULL,NULL,NOW(),NOW())", [`CRJOB${stamp}`, courseSource.userId, courseSource.courseId, "0.01", 1, JSON.stringify({ acceptance: "refund-business-job", stamp }), `refund-job-${stamp}`, `CRJOBTX${stamp}`]);
  const courseOrderId = Number(courseOrderInsert.insertId);
  const [courseRefundInsert] = await db.execute("INSERT INTO course_refunds (refundNo,orderId,amountFen,reason,status,reviewRemark,reviewedAt,providerRefundStatus,providerRefundRetryCount,providerRefundNextQueryAt,createdAt,updatedAt) VALUES (?,?,1,?,'processing',?,NOW(),'processing',0,NOW(),NOW(),NOW())", [`CRFJOB${stamp}`, courseOrderId, "退款补偿任务停机积压验收", "受控失败，保留记录"]);
  const courseRefundId = Number(courseRefundInsert.insertId);
  const [mallRefundInsert] = await db.execute("INSERT INTO mall_refunds (refundNo,tenantId,merchantId,userId,orderId,type,amount,amountFen,businessSnapshot,status,reason,images,businessKey,responsibility,platformInterventionRequested,reviewRemark,reviewedBy,reviewedAt,providerRefundStatus,providerRefundRetryCount,providerRefundNextQueryAt,createdAt,updatedAt) VALUES (?,?,?,?,?,'refund_only','0.01',1,?,'processing',?,NULL,?,'platform',0,?,'refund-job-acceptance',NOW(),'processing',0,NOW(),NOW(),NOW())", [`MRFJOB${stamp}`, tenantId, mallSource.merchantId, mallSource.userId, mallSource.id, JSON.stringify({ acceptance: "refund-business-job", stamp }), "退款补偿任务停机积压验收", `refund-job-${stamp}`, "受控失败，保留记录"]);
  const mallRefundId = Number(mallRefundInsert.insertId);
  const courseKey = `course-refund:${courseRefundId}`;
  const mallKey = `mall-refund:${mallRefundId}`;
  const courseJobId = await insertJob(db, { tenantId, type: "course-refund.provider-query", key: courseKey, refundId: courseRefundId });
  const mallJobId = await insertJob(db, { tenantId, type: "mall-refund.provider-query", key: mallKey, refundId: mallRefundId });
  const foreignJobId = await insertJob(db, { tenantId: Number(foreignTenant.id), type: "course-refund.provider-query", key: `foreign-course-refund-${stamp}`, refundId: courseRefundId, runAt: new Date(Date.now() + 86_400_000) });
  const [backlog] = await db.query("SELECT id,status,attemptCount FROM business_jobs WHERE id IN (?,?) ORDER BY id", [courseJobId, mallJobId]);
  assert(backlog.length === 2 && backlog.every((row) => row.status === "pending" && Number(row.attemptCount) === 0), "jobs must remain pending while API worker is stopped");
  result.checks.push("worker-stop-retains-backlog");
  result.retained = { tenantId, courseOrderId, courseRefundId, mallRefundId, courseJobId, mallJobId, foreignJobId, courseKey, mallKey };

  startApi();
  await waitReady();
  await api("/admin/business-jobs/run-due", { method: "POST", headers: auth(platform.token) });
  const [deadRows] = await db.query("SELECT id,status,attemptCount,lastWorkerId,lastError FROM business_jobs WHERE id IN (?,?) ORDER BY id", [courseJobId, mallJobId]);
  assert(deadRows.length === 2 && deadRows.every((row) => row.status === "dead_letter" && Number(row.attemptCount) === 1 && row.lastWorkerId), `refund jobs did not dead-letter as expected: ${JSON.stringify(deadRows)}`);
  result.checks.push("registered-handlers-fail-to-dead-letter-with-worker-audit");

  const tenantList = await api("/admin/business-jobs?pageSize=100", { headers: auth(manager.token) });
  const visibleIds = new Set(tenantList.items.map((item) => Number(item.id)));
  assert(visibleIds.has(courseJobId) && visibleIds.has(mallJobId) && !visibleIds.has(foreignJobId), "tenant business job list boundary failed");
  const cross = await request(`/admin/business-jobs/${foreignJobId}/cancel`, { method: "POST", headers: auth(manager.token) });
  assert(cross.response.status === 404, "cross-tenant business job mutation must return 404");
  result.checks.push("tenant-list-and-mutation-boundary");

  let duplicateRejected = false;
  try { await insertJob(db, { tenantId, type: "course-refund.provider-query", key: courseKey, refundId: courseRefundId }); } catch (error) { duplicateRejected = error?.code === "ER_DUP_ENTRY"; }
  assert(duplicateRejected, "business job tenant/type/idempotency key must reject duplicates");
  result.checks.push("database-idempotency-unique-constraint");

  await db.execute("UPDATE course_refunds SET status='rejected',providerRefundStatus='failed',providerRefundNextQueryAt=NULL,failureReason=? WHERE id=?", ["受控渠道不可用，终态拒绝后重放", courseRefundId]);
  await db.execute("UPDATE mall_refunds SET status='rejected',providerRefundStatus='failed',providerRefundNextQueryAt=NULL,providerRefundFailureReason=? WHERE id=?", ["受控渠道不可用，终态拒绝后重放", mallRefundId]);
  await Promise.all([courseJobId, mallJobId].map((id) => api(`/admin/business-jobs/${id}/replay`, { method: "POST", headers: auth(platform.token) })));
  await api("/admin/business-jobs/run-due", { method: "POST", headers: auth(platform.token) });
  const [completedRows] = await db.query("SELECT id,status,attemptCount,result,lastWorkerId FROM business_jobs WHERE id IN (?,?) ORDER BY id", [courseJobId, mallJobId]);
  assert(completedRows.length === 2 && completedRows.every((row) => row.status === "completed" && Number(row.attemptCount) === 1 && row.result), `dead-letter replay did not complete: ${JSON.stringify(completedRows)}`);
  await db.execute("UPDATE course_orders SET status='closed',closedAt=NOW(),closeReason='退款补偿任务受控失败验收' WHERE id=?", [courseOrderId]);
  result.checks.push("dead-letter-replay-completes-terminal-refunds-once");

  await db.end();
  result.status = "passed";
  result.finishedAt = new Date().toISOString();
}

main().catch((error) => {
  result.status = "failed";
  result.error = error.stack || error.message;
  result.finishedAt = new Date().toISOString();
  process.exitCode = 1;
}).finally(async () => {
  if (apiStopped) { try { startApi(); } catch {} }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Refund business job acceptance result: ${output}`);
});
