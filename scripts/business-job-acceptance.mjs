import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const mysql = createRequire(path.resolve("apps/api/package.json"))("mysql2/promise");
const base = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const output = path.resolve(process.env.BUSINESS_JOB_RESULT_FILE || path.join(process.cwd(), ".local-logs", `business-job-${Date.now()}`, "result.json"));
const password = process.env.SHOWCASE_PASSWORD || "Qiwai123456";
const result = { status: "running", checks: [], retained: {} };

const request = async (route, options = {}) => {
  const response = await fetch(`${base}${route}`, options);
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
};
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function login(username) {
  const value = await request("/admin/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) });
  if (!value.response.ok || value.payload?.code !== 0) throw new Error(`${username} login failed: ${JSON.stringify(value.payload)}`);
  return value.payload.data;
}

function insertJob(db, input) {
  const now = new Date();
  return db.execute(
    "INSERT INTO business_jobs (tenantId,type,idempotencyKey,status,payload,result,attemptCount,maxAttempts,nextAttemptAt,lockedUntil,lockedBy,lastError,requestId,completedAt,deadLetteredAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [input.tenantId, input.type, input.key, input.status, JSON.stringify(input.payload || {}), input.result ? JSON.stringify(input.result) : null, input.attemptCount || 0, input.maxAttempts || 3, input.nextAttemptAt || new Date(now.getTime() + 86_400_000), null, null, input.lastError || null, `request-${input.key}`, null, input.status === "dead_letter" ? now : null, now, now]
  );
}

async function main() {
  const [readonly, manager] = await Promise.all([login("showcase_business_job_readonly"), login("showcase_business_job_manager")]);
  assert(readonly.admin.tenantId && readonly.admin.tenantId === manager.admin.tenantId, "business job acceptance accounts must share a tenant");
  const tenantId = Number(manager.admin.tenantId);
  const db = await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 13306), user: process.env.DB_USERNAME || "activity", password: process.env.DB_PASSWORD || "activitypass", database: process.env.DB_DATABASE || "activity_registration", timezone: "+08:00" });
  const [foreignRows] = await db.query("SELECT id FROM tenants WHERE id <> ? ORDER BY id ASC LIMIT 1", [tenantId]);
  assert(foreignRows[0]?.id, "business job acceptance needs a second tenant for boundary verification");
  const stamp = Date.now();
  const type = "acceptance.permission";
  const pendingKey = `business-job-pending-${stamp}`;
  const deadKey = `business-job-dead-${stamp}`;
  const foreignKey = `business-job-foreign-${stamp}`;
  const browserPendingKey = `business-job-browser-pending-${stamp}`;
  const browserDeadKey = `business-job-browser-dead-${stamp}`;
  const [pendingInsert] = await insertJob(db, { tenantId, type, key: pendingKey, status: "pending", payload: { apiKey: "must-hide", scene: "concurrent-cancel" } });
  const [deadInsert] = await insertJob(db, { tenantId, type, key: deadKey, status: "dead_letter", payload: { accessToken: "must-hide", scene: "concurrent-replay" }, result: { password: "must-hide" }, attemptCount: 3, lastError: "provider rejected token=raw-token" });
  const [foreignInsert] = await insertJob(db, { tenantId: Number(foreignRows[0].id), type, key: foreignKey, status: "pending", payload: { tenant: "foreign" } });
  const [browserPendingInsert] = await insertJob(db, { tenantId, type, key: browserPendingKey, status: "pending", payload: { scene: "browser-cancel" } });
  const [browserDeadInsert] = await insertJob(db, { tenantId, type, key: browserDeadKey, status: "dead_letter", payload: { scene: "browser-replay" }, attemptCount: 3, lastError: "browser retained dead letter" });
  const ids = {
    pending: Number(pendingInsert.insertId),
    dead: Number(deadInsert.insertId),
    foreign: Number(foreignInsert.insertId),
    browserPending: Number(browserPendingInsert.insertId),
    browserDead: Number(browserDeadInsert.insertId)
  };
  result.retained = { tenantId, type, ...ids };

  const readonlyHeaders = auth(readonly.token);
  const managerHeaders = auth(manager.token);
  const list = await request(`/admin/business-jobs?type=${encodeURIComponent(type)}&pageSize=100`, { headers: readonlyHeaders });
  assert(list.response.ok && list.payload?.data?.items?.length >= 4, "readonly business job list failed");
  const pendingRow = list.payload.data.items.find((item) => item.id === ids.pending);
  const deadRow = list.payload.data.items.find((item) => item.id === ids.dead);
  assert(pendingRow?.payload?.apiKey === "********", "business job payload was not redacted");
  assert(deadRow?.payload?.accessToken === "********" && deadRow?.result?.password === "********", "business job payload or result leaked credentials");
  assert(deadRow?.lastError === "provider rejected token=********", "business job error leaked credentials");
  result.checks.push("readonly-list-and-redaction");

  for (const [route, label] of [[`/admin/business-jobs/${ids.pending}/cancel`, "cancel"], [`/admin/business-jobs/${ids.dead}/replay`, "replay"], ["/admin/business-jobs/run-due", "run-due"]]) {
    const denied = await request(route, { method: "POST", headers: readonlyHeaders });
    assert(denied.response.status === 403, `readonly ${label} must return 403`);
  }
  result.checks.push("readonly-write-denied");

  const cancelResponses = await Promise.all([1, 2].map(() => request(`/admin/business-jobs/${ids.pending}/cancel`, { method: "POST", headers: managerHeaders })));
  assert(cancelResponses.every((item) => item.response.ok && item.payload?.data?.status === "cancelled"), "concurrent cancellation failed");
  assert(cancelResponses.filter((item) => item.payload.data.operationApplied === true).length === 1, "concurrent cancellation must apply exactly once");
  result.checks.push("concurrent-cancel-idempotent");

  const replayResponses = await Promise.all([1, 2].map(() => request(`/admin/business-jobs/${ids.dead}/replay`, { method: "POST", headers: managerHeaders })));
  assert(replayResponses.every((item) => item.response.ok && item.payload?.data?.status === "pending"), "concurrent replay failed");
  assert(replayResponses.filter((item) => item.payload.data.operationApplied === true).length === 1, "concurrent replay must apply exactly once");
  assert(replayResponses.every((item) => item.payload.data.payload?.accessToken === "********"), "replay response leaked credentials");
  result.checks.push("concurrent-replay-idempotent");

  const cross = await request(`/admin/business-jobs/${ids.foreign}/cancel`, { method: "POST", headers: managerHeaders });
  assert(cross.response.status === 404, "cross-tenant business job cancellation must return 404");
  const tenantRunDue = await request("/admin/business-jobs/run-due", { method: "POST", headers: managerHeaders });
  assert(tenantRunDue.response.status === 403, "tenant business job manager must not run the platform scanner");
  const invalidStatus = await request("/admin/business-jobs?status=unknown", { headers: managerHeaders });
  assert(invalidStatus.response.status === 400, "invalid business job status must return 400");
  result.checks.push("tenant-boundary-and-query-validation");

  const [auditRows] = await db.query("SELECT action, COUNT(*) AS total FROM admin_operation_logs WHERE adminUsername = ? AND targetType = 'business_job' AND targetId IN (?, ?) GROUP BY action", ["showcase_business_job_manager", String(ids.pending), String(ids.dead)]);
  const auditCounts = Object.fromEntries(auditRows.map((row) => [row.action, Number(row.total)]));
  assert(auditCounts["business_job.cancel"] === 1 && auditCounts["business_job.replay"] === 1, `business job operation audit mismatch: ${JSON.stringify(auditCounts)}`);
  result.checks.push("operation-audit-once");

  await db.end();
  result.status = "passed";
  result.finishedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Business job acceptance result: ${output}`);
}

main().catch((error) => {
  result.status = "failed";
  result.error = error.stack || error.message;
  result.finishedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.error(result.error);
  process.exitCode = 1;
});
