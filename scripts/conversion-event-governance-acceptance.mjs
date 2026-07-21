import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const requireFromApi = createRequire(resolve("apps/api/package.json"));
const mysql = requireFromApi("mysql2/promise");
const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const runId = Date.now();
const source = `conversion-event-${runId}`;

function assert(condition, message) { if (!condition) throw new Error(message); }

function shanghaiDateText(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 13306),
  user: process.env.DB_USERNAME || "activity",
  password: process.env.DB_PASSWORD || "activitypass",
  database: process.env.DB_DATABASE || "activity_registration"
});

try {
  const [activities] = await connection.query(`
    SELECT activity.id, tenant.code tenantCode
    FROM activities activity
    INNER JOIN tenants tenant ON tenant.id = activity.tenantId
    WHERE activity.status = 'open' AND tenant.enabled = 1
    ORDER BY activity.id DESC
    LIMIT 1
  `);
  const activity = activities[0];
  assert(activity?.id && activity?.tenantCode, "no open tenant activity available for conversion-event acceptance");

  const dateText = shanghaiDateText();
  let visitorIp = null;
  let idempotencyKey = null;
  for (let attempt = 1; attempt <= 250; attempt++) {
    const octet = ((runId + attempt) % 250) + 1;
    visitorIp = `203.0.113.${octet}`;
    idempotencyKey = `view:${activity.id}:${visitorIp}:${dateText}:none`;
    const [[existing]] = await connection.query("SELECT COUNT(*) count FROM conversion_events WHERE idempotencyKey = ?", [idempotencyKey]);
    if (Number(existing.count || 0) === 0) break;
    visitorIp = null;
  }
  assert(visitorIp && idempotencyKey, "unable to allocate an unused acceptance visitor key");

  const url = `${API_BASE}/public/activities/${activity.id}?tenantCode=${encodeURIComponent(activity.tenantCode)}&source=${encodeURIComponent(source)}`;
  const responses = await Promise.all(Array.from({ length: 20 }, async () => {
    const response = await fetch(url, { headers: { "x-forwarded-for": visitorIp, "user-agent": "conversion-event-governance-acceptance" } });
    const text = await response.text();
    return { status: response.status, ok: response.ok, body: text.slice(0, 200) };
  }));
  assert(responses.every((item) => item.ok), `concurrent activity views failed: ${JSON.stringify(responses.filter((item) => !item.ok))}`);

  const [[eventRow]] = await connection.query("SELECT COUNT(*) count FROM conversion_events WHERE idempotencyKey = ?", [idempotencyKey]);
  const [[viewLogRow]] = await connection.query("SELECT COUNT(*) count FROM activity_view_logs WHERE activityId = ? AND source = ?", [activity.id, source]);
  const [typeRows] = await connection.query("SELECT type, COUNT(*) count FROM conversion_events GROUP BY type ORDER BY type");
  const [[uniqueness]] = await connection.query("SELECT COUNT(*) total, COUNT(idempotencyKey) keyed, COUNT(DISTINCT idempotencyKey) distinctKeyed FROM conversion_events");
  const [[revoked]] = await connection.query("SELECT COUNT(*) count FROM conversion_events event INNER JOIN check_ins checkIn ON event.idempotencyKey = CONCAT('check_in:', checkIn.id) WHERE checkIn.revokedAt IS NOT NULL");
  const [[uniqueIndex]] = await connection.query("SELECT COUNT(*) count FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'conversion_events' AND index_name = 'UQ_conversion_events_idempotency_key' AND non_unique = 0");
  const [[migration]] = await connection.query("SELECT COUNT(*) count FROM migrations WHERE timestamp = 1783900000000");

  assert(Number(eventRow.count || 0) === 1, `expected one conversion event, got ${eventRow.count}`);
  assert(Number(viewLogRow.count || 0) === 1, `expected one activity view log, got ${viewLogRow.count}`);
  assert(Number(uniqueness.keyed || 0) === Number(uniqueness.distinctKeyed || 0), "conversion-event idempotency keys are not unique");
  assert(Number(revoked.count || 0) === 0, "revoked check-ins still have active conversion events");
  assert(Number(uniqueIndex.count || 0) === 1, "conversion-event unique index is missing");
  assert(Number(migration.count || 0) === 1, "conversion-event migration is missing");

  const result = {
    ok: true,
    runId,
    activityId: Number(activity.id),
    tenantCode: activity.tenantCode,
    visitorIp,
    idempotencyKey,
    concurrentRequests: responses.length,
    statusCounts: responses.reduce((counts, item) => ({ ...counts, [item.status]: Number(counts[item.status] || 0) + 1 }), {}),
    eventCount: Number(eventRow.count || 0),
    viewLogCount: Number(viewLogRow.count || 0),
    typeCounts: Object.fromEntries(typeRows.map((row) => [row.type, Number(row.count || 0)])),
    uniqueness: { total: Number(uniqueness.total || 0), keyed: Number(uniqueness.keyed || 0), distinctKeyed: Number(uniqueness.distinctKeyed || 0) },
    revokedCheckInEventCount: Number(revoked.count || 0),
    uniqueIndexCount: Number(uniqueIndex.count || 0),
    migrationCount: Number(migration.count || 0),
    createdAt: new Date().toISOString()
  };
  const evidenceDir = resolve(".local-logs", `conversion-event-governance-${runId}`);
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(resolve(evidenceDir, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, evidenceDir }, null, 2));
} finally {
  await connection.end();
}
