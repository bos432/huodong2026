import fs from "node:fs";
import path from "node:path";

const base = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const password = process.env.SHOWCASE_PASSWORD || "Qiwai123456";
const output = path.resolve(process.env.MINIPROGRAM_RELEASE_RESULT_FILE || path.join(process.cwd(), ".local-logs", `miniprogram-release-${Date.now()}`, "result.json"));
const result = { status: "running", startedAt: new Date().toISOString(), apiBase: base, checks: [], retained: {} };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(route, options = {}) {
  const response = await fetch(`${base}${route}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(username) {
  const value = await request("/admin/auth/login", { method: "POST", body: { username, password } });
  assert(value.response.ok && value.payload?.code === 0, `${username} login failed: ${JSON.stringify(value.payload)}`);
  return value.payload.data;
}

async function api(route, options = {}) {
  const value = await request(route, options);
  assert(value.response.ok && value.payload?.code === 0, `${options.method || "GET"} ${route} failed: ${JSON.stringify(value.payload)}`);
  return value.payload.data;
}

function settingPayload(setting) {
  return {
    appId: setting?.appId || "wx-showcase-acceptance",
    version: setting?.version || "0.1.0",
    description: setting?.description || "小程序发布权限验收保留配置",
    projectPath: setting?.projectPath || "apps/mobile/dist/build/mp-weixin",
    auditItem: setting?.auditItem || {}
  };
}

function assertSafeLogs(rows) {
  const serialized = JSON.stringify(rows || []);
  assert(!serialized.includes('"stack"'), "release logs exposed stack traces");
  assert(!serialized.includes("ENC:v1:"), "release logs exposed encrypted storage values");
  for (const key of ["accessToken", "privateKey", "appSecret", "authorization", "password"]) {
    const pattern = new RegExp(`"${key}"\\s*:\\s*"(?!\\*{8})`, "i");
    assert(!pattern.test(serialized), `release logs exposed ${key}`);
  }
}

async function main() {
  const [readonly, manager, tenantReadonly] = await Promise.all([
    login("showcase_miniprogram_read"),
    login("showcase_miniprogram_manager"),
    login("showcase_operation_settings_read")
  ]);
  assert(!readonly.admin.tenantId && !manager.admin.tenantId, "mini program release accounts must remain platform scoped");
  assert(Boolean(tenantReadonly.admin.tenantId), "tenant boundary account must remain tenant scoped");

  const [setting, logs] = await Promise.all([
    api("/admin/miniprogram-release/setting", { headers: auth(readonly.token) }),
    api("/admin/miniprogram-release/logs", { headers: auth(readonly.token) })
  ]);
  assert(Array.isArray(logs), "readonly release logs response is not an array");
  assertSafeLogs(logs);
  result.checks.push("readonly-setting-and-sanitized-logs");

  const readonlySave = await request("/admin/miniprogram-release/setting", { method: "POST", headers: auth(readonly.token), body: settingPayload(setting) });
  assert(readonlySave.response.status === 403, `readonly save should return 403, got ${readonlySave.response.status}`);
  const tenantRead = await request("/admin/miniprogram-release/setting", { headers: auth(tenantReadonly.token) });
  assert(tenantRead.response.status === 403, `tenant release read should return 403, got ${tenantRead.response.status}`);
  result.checks.push("readonly-write-and-tenant-scope-denied");

  const saved = await api("/admin/miniprogram-release/setting", { method: "POST", headers: auth(manager.token), body: settingPayload(setting) });
  assert(saved?.appId === settingPayload(setting).appId, "manager save did not retain the expected AppID");
  assert(saved?.hasAppSecret === Boolean(setting?.hasAppSecret), "manager save unexpectedly changed AppSecret state");
  assert(saved?.hasPrivateKey === Boolean(setting?.hasPrivateKey), "manager save unexpectedly changed private key state");
  const updatedLogs = await api("/admin/miniprogram-release/logs", { headers: auth(manager.token) });
  assertSafeLogs(updatedLogs);
  assert(updatedLogs.some((item) => item.action === "setting" && item.adminUsername === "showcase_miniprogram_manager"), "manager save log was not retained");
  result.checks.push("manager-save-and-audit-log");

  result.retained = {
    settingId: saved?.id || null,
    appId: saved?.appId || null,
    accounts: ["showcase_miniprogram_read", "showcase_miniprogram_manager", "showcase_operation_settings_read"]
  };
  result.status = "passed";
}

try {
  await main();
} catch (error) {
  result.status = "failed";
  result.error = error instanceof Error ? error.stack || error.message : String(error);
  process.exitCode = 1;
} finally {
  result.finishedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`Mini program release acceptance result: ${output}`);
}
