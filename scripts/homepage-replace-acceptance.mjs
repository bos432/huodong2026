import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiBase = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const username = process.env.HOMEPAGE_ACCEPTANCE_ADMIN || "showcase_admin";
const password = process.env.HOMEPAGE_ACCEPTANCE_PASSWORD || "Qiwai123456";
const output = path.resolve(process.env.HOMEPAGE_REPLACE_RESULT_FILE || path.join(root, ".local-logs", `homepage-replace-${Date.now()}`, "result.json"));
const pageKeys = ["login_page", "review_page", "registration_detail", "service_center", "partner_page", "brand_story", "activity_register"];
const result = { status: "running", startedAt: new Date().toISOString(), apiBase, checks: [], retained: {} };
let cleanupToken = "";
let cleanupPageKey = "";
let cleanupMarker = "";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(route, options = {}) {
  const response = await fetch(`${apiBase}${route}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}

async function api(route, options = {}) {
  const { response, payload } = await request(route, options);
  if (!response.ok || payload?.code !== 0) throw new Error(`${options.method || "GET"} ${route} failed: ${payload?.message || response.status}`);
  return payload.data;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function main() {
  const login = await api("/admin/auth/login", { method: "POST", body: { username, password } });
  const headers = auth(login.token);
  cleanupToken = login.token;
  let pageKey = "";
  for (const candidate of pageKeys) {
    const rows = await api(`/admin/homepage/sections?pageKey=${encodeURIComponent(candidate)}`, { headers });
    if (!rows.length) {
      pageKey = candidate;
      break;
    }
  }
  assert(pageKey, "No empty homepage page is available for non-destructive acceptance");
  cleanupPageKey = pageKey;
  result.retained.pageKey = pageKey;

  const marker = `事务替换验收-${Date.now()}`;
  cleanupMarker = marker;
  const rows = [
    { type: "hero", title: `${marker}-A`, subtitle: "第一模块", enabled: true, sortOrder: 70, config: { marker, order: "A" }, layout: { backgroundColor: "#ffffff" } },
    { type: "rich_text", title: `${marker}-B`, subtitle: "第二模块", enabled: true, sortOrder: 20, config: { marker, order: "B" }, layout: { backgroundColor: "#f8fafc" } }
  ];
  const created = await api(`/admin/homepage/sections/replace?pageKey=${encodeURIComponent(pageKey)}`, { method: "POST", headers, body: { rows } });
  assert(created.length === 2, "Transactional replace did not create two rows");
  assert(created[0].sortOrder === 10 && created[1].sortOrder === 20, "Transactional replace did not normalize ordering");
  result.checks.push("successful-transactional-replace");

  const failingRows = [
    { ...rows[0], title: "X".repeat(121) },
    rows[1]
  ];
  const failed = await request(`/admin/homepage/sections/replace?pageKey=${encodeURIComponent(pageKey)}`, { method: "POST", headers, body: { rows: failingRows } });
  assert(!failed.response.ok || failed.payload?.code !== 0, "Oversized replacement should fail");
  const afterFailure = await api(`/admin/homepage/sections?pageKey=${encodeURIComponent(pageKey)}`, { headers });
  assert(afterFailure.length === 2, "Failed replacement removed existing rows");
  assert(afterFailure.every((row) => String(row.title || "").startsWith(marker)), "Failed replacement changed existing rows");
  result.checks.push("database-failure-rollback-preserves-page");

  const empty = await api(`/admin/homepage/sections/replace?pageKey=${encodeURIComponent(pageKey)}`, { method: "POST", headers, body: { rows: [] } });
  assert(Array.isArray(empty) && empty.length === 0, "Intentional empty replacement should clear the page");
  result.checks.push("intentional-empty-page-supported");

  const cleaned = await api(`/admin/homepage/sections?pageKey=${encodeURIComponent(pageKey)}`, { headers });
  assert(cleaned.length === 0, "Acceptance page cleanup failed");
  result.checks.push("test-page-restored-empty");
  result.retained.marker = marker;
  result.status = "passed";
}

try {
  await main();
} catch (error) {
  result.status = "failed";
  result.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  if (cleanupToken && cleanupPageKey && cleanupMarker) {
    try {
      const rows = await api(`/admin/homepage/sections?pageKey=${encodeURIComponent(cleanupPageKey)}`, { headers: auth(cleanupToken) });
      for (const row of rows.filter((item) => item?.config?.marker === cleanupMarker)) {
        await api(`/admin/homepage/sections/${row.id}?pageKey=${encodeURIComponent(cleanupPageKey)}`, { method: "DELETE", headers: auth(cleanupToken) });
      }
    } catch (cleanupError) {
      result.cleanupError = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      result.status = "failed";
      process.exitCode = 1;
    }
  }
  result.finishedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`Homepage replace acceptance result: ${output}`);
}
