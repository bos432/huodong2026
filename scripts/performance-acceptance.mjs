import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";

const require = createRequire(new URL("../apps/api/package.json", import.meta.url));
const bcrypt = require("bcryptjs");
const ExcelJS = require("exceljs");
const mysql = require("mysql2/promise");

const API_BASE = (process.env.API_BASE || "http://127.0.0.1:18080/api").replace(/\/$/, "");
const TENANT_CODE = process.env.PERF_TENANT_CODE || "qiwai-showcase";
const ADMIN_USERNAME = process.env.PERF_ADMIN_USERNAME || "showcase_admin";
const ADMIN_PASSWORD = process.env.PERF_ADMIN_PASSWORD || "Showcase123456Aa";
const USER_PASSWORD = process.env.PERF_USER_PASSWORD || "Qiwai123456";
const ACTIVITY_TITLE = process.env.PERF_ACTIVITY_TITLE || "[PERF] 10k registration acceptance";
const LARGE_LIST_SIZE = numberEnv("PERF_LARGE_LIST_SIZE", 10_000);
const SPIKE_USERS = numberEnv("PERF_SPIKE_USERS", 100);
const DB_BATCH_SIZE = numberEnv("PERF_DB_BATCH_SIZE", 500);
const runId = Date.now();

const thresholds = {
  overviewP95Ms: numberEnv("PERF_OVERVIEW_P95_MS", 2_000),
  listP95Ms: numberEnv("PERF_LIST_P95_MS", 2_000),
  registrationP95Ms: numberEnv("PERF_REGISTRATION_P95_MS", 30_000),
  registrationTotalMs: numberEnv("PERF_REGISTRATION_TOTAL_MS", 45_000),
  exportMs: numberEnv("PERF_EXPORT_MS", 30_000)
};

function numberEnv(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number`);
  return Math.trunc(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function percentile(values, percentileValue) {
  const sorted = [...values].sort((left, right) => left - right);
  if (!sorted.length) return 0;
  const index = Math.min(Math.ceil((percentileValue / 100) * sorted.length) - 1, sorted.length - 1);
  return Math.round(sorted[Math.max(index, 0)] * 100) / 100;
}

function summarize(latencies, totalMs) {
  return {
    requests: latencies.length,
    p50Ms: percentile(latencies, 50),
    p95Ms: percentile(latencies, 95),
    maxMs: percentile(latencies, 100),
    totalMs: Math.round(totalMs * 100) / 100,
    requestsPerSecond: totalMs > 0 ? Math.round((latencies.length * 100_000) / totalMs) / 100 : 0
  };
}

function futureDate(days, hour) {
  const value = new Date(Date.now() + days * 86400000);
  value.setHours(hour, 0, 0, 0);
  return value.toISOString().slice(0, 19).replace("T", " ");
}

async function jsonApi(pathname, options = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok || body?.code !== 0) throw new Error(`${options.method || "GET"} ${pathname}: ${body?.message || text || response.status}`);
  return body.data;
}

async function timedJson(pathname, options = {}) {
  const startedAt = performance.now();
  const data = await jsonApi(pathname, options);
  return { data, durationMs: performance.now() - startedAt };
}

async function runWorkload({ requests, concurrency, action, validate }) {
  const latencies = [];
  const failures = [];
  const startedAt = performance.now();
  for (let offset = 0; offset < requests; offset += concurrency) {
    const size = Math.min(concurrency, requests - offset);
    const batch = await Promise.all(Array.from({ length: size }, async (_, index) => {
      try {
        const result = await action(offset + index);
        validate(result.data);
        return { ok: true, durationMs: result.durationMs };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) };
      }
    }));
    for (const item of batch) {
      if (item.ok) latencies.push(item.durationMs);
      else failures.push(item.message);
    }
  }
  return { ...summarize(latencies, performance.now() - startedAt), failures };
}

async function insertRows(connection, table, columns, rows, duplicateClause) {
  for (let offset = 0; offset < rows.length; offset += DB_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + DB_BATCH_SIZE);
    await connection.query(`INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(",")}) VALUES ? ${duplicateClause}`, [batch]);
  }
}

async function ensureActivity(connection, adminHeaders, tenantId) {
  const [existing] = await connection.execute("SELECT id FROM activities WHERE tenantId = ? AND title = ? ORDER BY id DESC LIMIT 1", [tenantId, ACTIVITY_TITLE]);
  if (existing.length) {
    const activityId = Number(existing[0].id);
    await connection.execute(
      "UPDATE activities SET status='open', capacity=?, price=0, requireReview=0, registrationDeadline=?, startTime=?, endTime=? WHERE id=?",
      [Math.max(LARGE_LIST_SIZE + SPIKE_USERS + 10_000, 50_000), futureDate(29, 22), futureDate(30, 9), futureDate(30, 18), activityId]
    );
    return activityId;
  }
  const activity = await jsonApi("/admin/activities", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      title: ACTIVITY_TITLE,
      description: "Retained fixture for repeatable 10k list and concurrent registration performance acceptance.",
      notice: "Performance acceptance data. Keep for regression testing.",
      location: "Performance acceptance venue",
      startTime: futureDate(30, 9),
      endTime: futureDate(30, 18),
      registrationDeadline: futureDate(29, 22),
      capacity: Math.max(LARGE_LIST_SIZE + SPIKE_USERS + 10_000, 50_000),
      price: 0,
      status: "open",
      featured: false,
      requireReview: false,
      allowCancel: true,
      fields: [{ label: "Name", type: "text", required: false, sortOrder: 1, options: [] }],
      hosts: [],
      sections: []
    })
  });
  assert(activity?.id, "performance activity creation did not return an id");
  return Number(activity.id);
}

async function seedLargeList(connection, activityId, tenantId, passwordHash) {
  const users = Array.from({ length: LARGE_LIST_SIZE }, (_, index) => {
    const serial = String(index + 1).padStart(6, "0");
    return [`18876${serial}`, `Performance member ${serial}`, passwordHash, new Date(), new Date()];
  });
  await insertRows(connection, "users", ["phone", "nickname", "passwordHash", "createdAt", "updatedAt"], users, "ON DUPLICATE KEY UPDATE nickname=VALUES(nickname), passwordHash=VALUES(passwordHash)");

  const [seededUsers] = await connection.query(`SELECT id, phone FROM users WHERE phone LIKE '18876%' ORDER BY phone ASC LIMIT ${LARGE_LIST_SIZE}`);
  assert(seededUsers.length === LARGE_LIST_SIZE, `expected ${LARGE_LIST_SIZE} fixture users, got ${seededUsers.length}`);
  const registrations = seededUsers.map((user) => {
    const serial = String(user.phone).slice(-6);
    const answers = JSON.stringify([
      { fieldId: 0, label: "Name", type: "text", value: `Performance member ${serial}` },
      { fieldId: 0, label: "Phone", type: "phone", value: user.phone }
    ]);
    return ["approved", `PERF-LARGE-${serial}`, answers, 1, null, null, new Date(), new Date(), new Date(), activityId, tenantId, Number(user.id), null];
  });
  await insertRows(
    connection,
    "registrations",
    ["status", "checkInCode", "answers", "formSchemaVersion", "formSnapshot", "companions", "privacyConsentAt", "createdAt", "updatedAt", "activityId", "tenantId", "userId", "channelId"],
    registrations,
    "ON DUPLICATE KEY UPDATE updatedAt=updatedAt"
  );
  const [rows] = await connection.execute("SELECT COUNT(*) AS total FROM registrations WHERE activityId = ?", [activityId]);
  assert(Number(rows[0].total) >= LARGE_LIST_SIZE, `expected at least ${LARGE_LIST_SIZE} registrations, got ${rows[0].total}`);
  return Number(rows[0].total);
}

async function prepareSpikeUsers(connection, passwordHash) {
  const prefix = `186${String(runId).slice(-5)}`;
  const users = Array.from({ length: SPIKE_USERS }, (_, index) => {
    const suffix = String(index).padStart(3, "0");
    return [`${prefix}${suffix}`, `Spike member ${suffix}`, passwordHash, new Date(), new Date()];
  });
  await insertRows(connection, "users", ["phone", "nickname", "passwordHash", "createdAt", "updatedAt"], users, "ON DUPLICATE KEY UPDATE nickname=VALUES(nickname), passwordHash=VALUES(passwordHash)");
  return users.map((row) => ({ phone: row[0], nickname: row[1] }));
}

async function loginSpikeUsers(users) {
  const sessions = [];
  for (let offset = 0; offset < users.length; offset += 20) {
    const batch = await Promise.all(users.slice(offset, offset + 20).map(async (user) => {
      const login = await jsonApi("/public/auth/password-login", {
        method: "POST",
        headers: { "x-tenant-code": TENANT_CODE },
        body: JSON.stringify({ phone: user.phone, password: USER_PASSWORD, nickname: user.nickname })
      });
      assert(login?.userAccessToken, `password login returned no token for ${user.phone}`);
      return { ...user, token: login.userAccessToken };
    }));
    sessions.push(...batch);
  }
  return sessions;
}

const resultDirectory = path.resolve(`.local-logs/performance-acceptance-${runId}`);
const resultFile = path.join(resultDirectory, "result.json");
let connection;

try {
  const adminLogin = await jsonApi("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
  });
  assert(adminLogin?.token, "admin login returned no token");
  const adminHeaders = { Authorization: `Bearer ${adminLogin.token}` };

  connection = await mysql.createConnection({
    host: process.env.PERF_DB_HOST || "127.0.0.1",
    port: numberEnv("PERF_DB_PORT", 13306),
    user: process.env.PERF_DB_USER || "activity",
    password: process.env.PERF_DB_PASSWORD || "activitypass",
    database: process.env.PERF_DB_DATABASE || "activity_registration",
    charset: "utf8mb4"
  });
  const [tenants] = await connection.execute("SELECT id FROM tenants WHERE code = ? AND enabled = 1 LIMIT 1", [TENANT_CODE]);
  assert(tenants.length === 1, `enabled tenant ${TENANT_CODE} was not found`);
  const tenantId = Number(tenants[0].id);
  const passwordHash = await bcrypt.hash(USER_PASSWORD, 8);
  const activityId = await ensureActivity(connection, adminHeaders, tenantId);
  const fixtureRows = await seedLargeList(connection, activityId, tenantId, passwordHash);

  await jsonApi(`/admin/check-ins/overview?activityId=${activityId}`, { headers: adminHeaders });
  await jsonApi(`/admin/registrations?activityId=${activityId}&page=1&pageSize=100`, { headers: adminHeaders });

  const overview = await runWorkload({
    requests: 30,
    concurrency: 10,
    action: () => timedJson(`/admin/check-ins/overview?activityId=${activityId}`, { headers: adminHeaders }),
    validate: (data) => assert(Number(data?.stats?.approvedTotal) >= LARGE_LIST_SIZE, "check-in overview returned an incomplete total")
  });
  const list = await runWorkload({
    requests: 30,
    concurrency: 10,
    action: () => timedJson(`/admin/registrations?activityId=${activityId}&page=1&pageSize=100`, { headers: adminHeaders }),
    validate: (data) => {
      assert(Number(data?.total) >= LARGE_LIST_SIZE, "registration list returned an incomplete total");
      assert(Array.isArray(data?.items) && data.items.length === 100, "registration list did not return a full 100-row page");
    }
  });

  const spikeUsers = await prepareSpikeUsers(connection, passwordHash);
  const sessions = await loginSpikeUsers(spikeUsers);
  const [beforeRows] = await connection.execute("SELECT COUNT(*) AS total FROM registrations WHERE activityId = ?", [activityId]);
  const registrationStartedAt = performance.now();
  const registrationResults = await Promise.all(sessions.map(async (session) => {
    const startedAt = performance.now();
    try {
      const data = await jsonApi(`/public/activities/${activityId}/register?tenantCode=${TENANT_CODE}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}`, "x-tenant-code": TENANT_CODE },
        body: JSON.stringify({ answers: [], source: `performance-spike-${runId}` })
      });
      assert(["approved", "checked_in"].includes(data?.registration?.status), `unexpected registration status for ${session.phone}`);
      return { ok: true, durationMs: performance.now() - startedAt, registrationId: data.registration.id };
    } catch (error) {
      return { ok: false, durationMs: performance.now() - startedAt, message: error instanceof Error ? error.message : String(error) };
    }
  }));
  const registrationTotalMs = performance.now() - registrationStartedAt;
  const registrationFailures = registrationResults.filter((item) => !item.ok);
  const registrationLatencies = registrationResults.filter((item) => item.ok).map((item) => item.durationMs);
  const registration = { ...summarize(registrationLatencies, registrationTotalMs), failures: registrationFailures.map((item) => item.message) };
  const [afterRows] = await connection.execute("SELECT COUNT(*) AS total FROM registrations WHERE activityId = ?", [activityId]);
  const beforeCount = Number(beforeRows[0].total);
  const afterCount = Number(afterRows[0].total);

  const exportStartedAt = performance.now();
  const exportResponse = await fetch(`${API_BASE}/admin/registrations/export?activityId=${activityId}`, { headers: adminHeaders });
  const exportBuffer = Buffer.from(await exportResponse.arrayBuffer());
  const exportDurationMs = performance.now() - exportStartedAt;
  assert(exportResponse.ok, `registration export failed with ${exportResponse.status}: ${exportBuffer.toString("utf8", 0, 500)}`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(exportBuffer);
  const exportedRows = Math.max((workbook.worksheets[0]?.actualRowCount || 0) - 1, 0);

  const failures = [];
  if (overview.failures.length) failures.push(`overview errors: ${overview.failures.slice(0, 3).join(" | ")}`);
  if (list.failures.length) failures.push(`list errors: ${list.failures.slice(0, 3).join(" | ")}`);
  if (registration.failures.length) failures.push(`registration errors: ${registration.failures.slice(0, 3).join(" | ")}`);
  if (overview.p95Ms > thresholds.overviewP95Ms) failures.push(`overview p95 ${overview.p95Ms}ms exceeds ${thresholds.overviewP95Ms}ms`);
  if (list.p95Ms > thresholds.listP95Ms) failures.push(`list p95 ${list.p95Ms}ms exceeds ${thresholds.listP95Ms}ms`);
  if (registration.p95Ms > thresholds.registrationP95Ms) failures.push(`registration p95 ${registration.p95Ms}ms exceeds ${thresholds.registrationP95Ms}ms`);
  if (registration.totalMs > thresholds.registrationTotalMs) failures.push(`registration total ${registration.totalMs}ms exceeds ${thresholds.registrationTotalMs}ms`);
  if (exportDurationMs > thresholds.exportMs) failures.push(`export ${Math.round(exportDurationMs)}ms exceeds ${thresholds.exportMs}ms`);
  if (afterCount - beforeCount !== SPIKE_USERS) failures.push(`registration count increased by ${afterCount - beforeCount}, expected ${SPIKE_USERS}`);
  if (exportedRows < LARGE_LIST_SIZE + SPIKE_USERS) failures.push(`export contains ${exportedRows} rows, expected at least ${LARGE_LIST_SIZE + SPIKE_USERS}`);

  const evidence = {
    passed: failures.length === 0,
    checkedAt: new Date().toISOString(),
    apiBase: API_BASE,
    tenantCode: TENANT_CODE,
    fixture: { tenantId, activityId, activityTitle: ACTIVITY_TITLE, initialRows: fixtureRows, retainedRows: afterCount, spikeUsers: SPIKE_USERS },
    thresholds,
    metrics: {
      checkInOverview: overview,
      registrationList: list,
      registrationSpike: registration,
      registrationExport: { durationMs: Math.round(exportDurationMs * 100) / 100, bytes: exportBuffer.length, rows: exportedRows }
    },
    retained: { spikePhones: spikeUsers.map((item) => item.phone), registrationIds: registrationResults.filter((item) => item.ok).map((item) => item.registrationId) },
    failures
  };
  fs.mkdirSync(resultDirectory, { recursive: true });
  fs.writeFileSync(resultFile, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...evidence, retained: { spikePhoneRange: `${spikeUsers[0].phone}-${spikeUsers.at(-1).phone}`, registrationCount: evidence.retained.registrationIds.length }, resultFile }, null, 2));
  assert(evidence.passed, `performance acceptance failed: ${failures.join("; ")}`);
} finally {
  if (connection) await connection.end();
}
