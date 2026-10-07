import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const mysql = createRequire(path.resolve("apps/api/package.json"))("mysql2/promise");
const base = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const output = path.resolve(process.env.REFUND_JOB_RESULT_FILE || path.join(process.cwd(), ".local-logs", `refund-business-job-${Date.now()}`, "result.json"));
const result = { status: "running", startedAt: new Date().toISOString(), checks: [], retained: {} };
const password = process.env.SHOWCASE_PASSWORD || "Qiwai123456";
const apiMode = String(process.env.REFUND_JOB_API_MODE || "docker").trim().toLowerCase();
const seedFixtures = String(process.env.REFUND_JOB_SEED_FIXTURES || "false").trim().toLowerCase() === "true";
let apiStopped = false;
let db = null;

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
function stopApi() {
  if (apiMode === "local") return;
  if (apiMode !== "docker") throw new Error(`Unsupported REFUND_JOB_API_MODE: ${apiMode}. Use local or docker.`);
  execFileSync("docker", ["stop", "activity-api"], { stdio: "pipe" });
  apiStopped = true;
}
function startApi() {
  if (apiMode === "local") return;
  execFileSync("docker", ["start", "activity-api"], { stdio: "pipe" });
  apiStopped = false;
}

async function insertJob(db, { tenantId, type, key, refundId, maxAttempts = 1, runAt = new Date() }) {
  const [insert] = await db.execute(
    "INSERT INTO business_jobs (tenantId,type,idempotencyKey,status,payload,result,attemptCount,maxAttempts,nextAttemptAt,lockedUntil,lockedBy,lastError,requestId,completedAt,deadLetteredAt,createdAt,updatedAt) VALUES (?,?,?,?,?,NULL,0,?,?,NULL,NULL,NULL,?,NULL,NULL,NOW(),NOW())",
    [tenantId, type, key, "pending", JSON.stringify({ refundId, tenantId }), maxAttempts, runAt, `acceptance-${key}`]
  );
  return Number(insert.insertId);
}

function assertFixtureSeedingIsLocal() {
  const host = String(process.env.DB_HOST || "127.0.0.1").trim().toLowerCase();
  assert(seedFixtures === false || ["127.0.0.1", "localhost", "::1"].includes(host), "REFUND_JOB_SEED_FIXTURES is allowed only for a local database host");
}

async function findRefundSources(db, tenantId) {
  const [[courseOrderSource], [mallOrderSource]] = await Promise.all([
    db.query("SELECT co.userId,c.id AS courseId FROM course_orders co JOIN courses c ON c.id=co.courseId WHERE c.tenantId=? ORDER BY co.id ASC LIMIT 1", [tenantId]).then(([rows]) => rows),
    db.query("SELECT id,tenantId,merchantId,userId FROM mall_orders WHERE tenantId=? AND paymentMethod='wechat' ORDER BY id DESC LIMIT 1", [tenantId]).then(([rows]) => rows)
  ]);
  let courseSource = courseOrderSource;
  let mallSource = mallOrderSource;
  if (!courseSource) {
    const [[fallback]] = await db.query("SELECT c.id AS courseId,u.id AS userId FROM courses c JOIN users u ON u.id=24 WHERE c.tenantId=? ORDER BY c.id ASC LIMIT 1", [tenantId]);
    courseSource = fallback;
  }
  if (!mallSource) {
    const [[fallback]] = await db.query("SELECT m.id AS merchantId,u.id AS userId,? AS tenantId FROM mall_merchants m JOIN users u ON u.id=24 WHERE m.tenantId=? AND m.status='active' ORDER BY m.id ASC LIMIT 1", [tenantId, tenantId]);
    mallSource = fallback;
  }
  return { courseSource, mallSource };
}

async function seedSourceOrders(db, { tenantId, courseSource, mallSource, stamp }) {
  assertFixtureSeedingIsLocal();
  if (!seedFixtures) return;
  if (!courseSource?.courseId || !mallSource?.merchantId || !mallSource?.userId) return;
  const [courseRows] = await db.query("SELECT id FROM course_orders WHERE clientOrderKey=? LIMIT 1", [`refund-job-source-${tenantId}`]);
  if (!courseRows.length) {
    await db.execute("INSERT INTO course_orders (orderNo,userId,courseId,amount,amountFen,businessSnapshot,clientOrderKey,paymentMethod,status,transactionNo,paidAt,expiresAt,closedAt,closeReason,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,'wechat','paid',?,NOW(),NULL,NULL,NULL,NOW(),NOW())", [`CRSRC${stamp}`, courseSource.userId, courseSource.courseId, "0.01", 1, JSON.stringify({ acceptance: "refund-business-job-source", tenantId, stamp }), `refund-job-source-${tenantId}`, `CRSRCTX${stamp}`]);
  }
  const [mallRows] = await db.query("SELECT id FROM mall_orders WHERE clientOrderKey=? LIMIT 1", [`refund-job-source-${tenantId}`]);
  if (!mallRows.length) {
    await db.execute("INSERT INTO mall_orders (orderNo,amount,amountFen,businessSnapshot,goodsAmount,discountAmount,pointsUsed,pointsDiscountAmount,freightAmount,paymentMethod,clientOrderKey,status,fulfillmentStatus,totalQuantity,shippedQuantity,addressSnapshot,paidAt,tenantId,merchantId,userId,createdAt,updatedAt) VALUES (?,?,1,?, ?,0,0,0,0,'wechat',?,'paid','unshipped',0,0,?,NOW(),?,?,?,NOW(),NOW())", [`MOLSRC${stamp}`, "0.01", JSON.stringify({ acceptance: "refund-business-job-source", tenantId, stamp }), "0.01", `refund-job-source-${tenantId}`, JSON.stringify({ acceptance: "refund-business-job-source", tenantId }), tenantId, mallSource.merchantId, mallSource.userId]);
  }
}

async function main() {
  const [platform, manager] = await Promise.all([login(process.env.PLATFORM_ADMIN_USERNAME || "admin", process.env.PLATFORM_ADMIN_PASSWORD || "Admin123456"), login("showcase_business_job_manager")]);
  assert(platform.admin?.role === "super_admin" && !platform.admin?.tenantId, "platform super admin is required");
  const tenantId = Number(manager.admin?.tenantId || 0);
  assert(tenantId > 0, "tenant business job manager is required");
  assertFixtureSeedingIsLocal();
  db = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 13306), user: process.env.DB_USERNAME || "activity", password: process.env.DB_PASSWORD || "activitypass", database: process.env.DB_DATABASE || "activity_registration", timezone: "+08:00" });
  const stamp = Date.now();

  let { courseSource, mallSource } = await findRefundSources(db, tenantId);
  await seedSourceOrders(db, { tenantId, courseSource, mallSource, stamp });
  const [[foreignTenant]] = await db.query("SELECT id FROM tenants WHERE id<>? ORDER BY id ASC LIMIT 1", [tenantId]);
  assert(courseSource?.courseId && mallSource?.merchantId && mallSource?.userId && foreignTenant?.id, "refund job acceptance fixtures are unavailable; run with REFUND_JOB_SEED_FIXTURES=true on local DB to create marked source fixtures");

  stopApi();
  const [courseOrderInsert] = await db.execute("INSERT INTO course_orders (orderNo,userId,courseId,amount,amountFen,businessSnapshot,clientOrderKey,paymentMethod,status,transactionNo,paidAt,expiresAt,closedAt,closeReason,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,'wechat','paid',?,NOW(),NULL,NULL,NULL,NOW(),NOW())", [`CRJOB${stamp}`, courseSource.userId, courseSource.courseId, "0.01", 1, JSON.stringify({ acceptance: "refund-business-job", stamp }), `refund-job-${stamp}`, `CRJOBTX${stamp}`]);
  const courseOrderId = Number(courseOrderInsert.insertId);
  const [courseRefundInsert] = await db.execute("INSERT INTO course_refunds (refundNo,orderId,amountFen,reason,status,reviewRemark,reviewedAt,providerRefundStatus,providerRefundRetryCount,providerRefundNextQueryAt,createdAt,updatedAt) VALUES (?,?,1,?,'processing',?,NOW(),'processing',0,NOW(),NOW(),NOW())", [`CRFJOB${stamp}`, courseOrderId, "退款补偿任务停机积压验收", "受控失败，保留记录"]);
  const courseRefundId = Number(courseRefundInsert.insertId);
  const [mallOrderInsert] = await db.execute("INSERT INTO mall_orders (orderNo,amount,amountFen,businessSnapshot,goodsAmount,discountAmount,pointsUsed,pointsDiscountAmount,freightAmount,paymentMethod,clientOrderKey,status,fulfillmentStatus,totalQuantity,shippedQuantity,addressSnapshot,paidAt,tenantId,merchantId,userId,createdAt,updatedAt) VALUES (?,?,1,?, ?,0,0,0,0,'wechat',?,'paid','unshipped',0,0,?,NOW(),?,?,?,NOW(),NOW())", [`MOLJOB${stamp}`, "0.01", JSON.stringify({ acceptance: "refund-business-job", stamp }), "0.01", `refund-job-order-${stamp}`, JSON.stringify({ acceptance: "refund-business-job", stamp }), tenantId, mallSource.merchantId, mallSource.userId]);
  const mallOrderId = Number(mallOrderInsert.insertId);
  const [mallRefundInsert] = await db.execute("INSERT INTO mall_refunds (refundNo,tenantId,merchantId,userId,orderId,type,amount,amountFen,businessSnapshot,status,reason,images,businessKey,responsibility,platformInterventionRequested,reviewRemark,reviewedBy,reviewedAt,providerRefundStatus,providerRefundRetryCount,providerRefundNextQueryAt,createdAt,updatedAt) VALUES (?,?,?,?,?,'refund_only','0.01',1,?,'processing',?,NULL,?,'platform',0,?,'refund-job-acceptance',NOW(),'processing',0,NOW(),NOW(),NOW())", [`MRFJOB${stamp}`, tenantId, mallSource.merchantId, mallSource.userId, mallOrderId, JSON.stringify({ acceptance: "refund-business-job", stamp }), "退款补偿任务停机积压验收", `refund-job-${stamp}`, "受控失败，保留记录"]);
  const mallRefundId = Number(mallRefundInsert.insertId);
  const courseKey = `course-refund:${courseRefundId}`;
  const mallKey = `mall-refund:${mallRefundId}`;
  // In local mode the embedded API may be alive, so hold the fixtures in the
  // future until the pending-backlog assertion has completed. Docker mode
  // keeps the original stop/start behavior for the isolated deployment test.
  const heldUntil = apiMode === "local" ? new Date(Date.now() + 60_000) : new Date();
  const courseJobId = await insertJob(db, { tenantId, type: "course-refund.provider-query", key: courseKey, refundId: courseRefundId, runAt: heldUntil });
  const mallJobId = await insertJob(db, { tenantId, type: "mall-refund.provider-query", key: mallKey, refundId: mallRefundId, runAt: heldUntil });
  const foreignJobId = await insertJob(db, { tenantId: Number(foreignTenant.id), type: "course-refund.provider-query", key: `foreign-course-refund-${stamp}`, refundId: courseRefundId, runAt: new Date(Date.now() + 86_400_000) });
  const [backlog] = await db.query("SELECT id,status,attemptCount FROM business_jobs WHERE id IN (?,?) ORDER BY id", [courseJobId, mallJobId]);
  assert(backlog.length === 2 && backlog.every((row) => row.status === "pending" && Number(row.attemptCount) === 0), "jobs must remain pending while API worker is stopped");
  result.checks.push(apiMode === "local" ? "embedded-api-retains-held-backlog" : "worker-stop-retains-backlog");
  result.retained = { tenantId, courseOrderId, courseRefundId, mallOrderId, mallRefundId, courseJobId, mallJobId, foreignJobId, courseKey, mallKey, seededSourceFixtures: seedFixtures };

  startApi();
  await waitReady();
  if (apiMode === "local") {
    await db.execute("UPDATE business_jobs SET nextAttemptAt=NOW() WHERE id IN (?,?)", [courseJobId, mallJobId]);
  }
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
  db = null;
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
  if (apiStopped) { try { startApi(); } catch {} }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Refund business job acceptance result: ${output}`);
});
