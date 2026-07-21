import fs from "node:fs";
import path from "node:path";

const base = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const password = process.env.SHOWCASE_PASSWORD || "Qiwai123456";
const output = path.resolve(process.env.OPERATION_SETTINGS_RESULT_FILE || path.join(process.cwd(), ".local-logs", `operation-settings-${Date.now()}`, "result.json"));
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

function operationPayload(setting, platform) {
  const payload = {
    registrationEnabled: Boolean(setting.registrationEnabled),
    registrationDisabledMessage: setting.registrationDisabledMessage || "报名通道暂时关闭，请稍后再试或联系主办方。",
    offlinePaymentInstructions: setting.offlinePaymentInstructions || "请联系运营人员确认线下付款方式。",
    paymentMethods: setting.paymentMethods || { free: true, wechat: false, alipay: false, balance: true, offline: true },
    customerServiceName: setting.customerServiceName || "",
    customerServicePhone: setting.customerServicePhone || "",
    customerServiceWechat: setting.customerServiceWechat || "",
    defaultGroupQrCodeUrl: setting.defaultGroupQrCodeUrl || "",
    pageTheme: setting.pageTheme || {},
    refundInstructions: setting.refundInstructions || "请联系运营人员申请退款。",
    invoiceInstructions: setting.invoiceInstructions || "",
    userAgreementUrl: setting.userAgreementUrl || "",
    privacyPolicyUrl: setting.privacyPolicyUrl || "",
    merchantAgreementUrl: setting.merchantAgreementUrl || "",
    smsProviderEnabled: Boolean(setting.smsProviderEnabled),
    smsProvider: setting.smsProvider || "",
    smsAccessKeyId: setting.smsAccessKeyId || "",
    smsAccessKeySecret: setting.smsAccessKeySecret || "",
    smsSignName: setting.smsSignName || "",
    smsTemplateId: setting.smsTemplateId || "",
    smsSdkAppId: setting.smsSdkAppId || ""
  };
  if (platform) {
    payload.defaultTenantCode = setting.defaultTenantCode || "";
    payload.launchConfig = setting.launchConfig || {};
  }
  return payload;
}

function assertSecretsMasked(setting, label) {
  assert(!setting.smsAccessKeySecretConfigured || setting.smsAccessKeySecret === "********", `${label} SMS secret is not masked`);
  const serialized = JSON.stringify(setting.launchConfig || {});
  assert(!serialized.includes("ENC:v1:"), `${label} launch configuration exposed encrypted storage values`);
}

async function expectDenied(token, route, body = {}) {
  const value = await request(route, { method: "POST", headers: auth(token), body });
  assert(value.response.status === 403, `${route} should return 403, got ${value.response.status}`);
}

async function main() {
  const [tenantReadonly, tenantManager, platformReadonly, platformManager] = await Promise.all([
    login("showcase_operation_settings_read"),
    login("showcase_operation_settings_only"),
    login("showcase_system_settings_read"),
    login("showcase_system_settings_manager")
  ]);
  assert(tenantReadonly.admin.tenantId && tenantReadonly.admin.tenantId === tenantManager.admin.tenantId, "tenant configuration accounts must share one tenant");
  assert(!platformReadonly.admin.tenantId && !platformManager.admin.tenantId, "platform configuration accounts must remain platform scoped");

  const tenantRead = await api("/admin/settings/operation", { headers: auth(tenantReadonly.token) });
  const platformRead = await api("/admin/settings/operation", { headers: auth(platformReadonly.token) });
  assertSecretsMasked(tenantRead, "tenant readonly");
  assertSecretsMasked(platformRead, "platform readonly");
  assert(Number(tenantRead.id) === Number(tenantReadonly.admin.tenantId), "tenant configuration resolved the wrong scope");
  assert(Number(platformRead.id) === 1, "platform configuration did not resolve the platform scope");
  assert(Number(tenantRead.id) !== Number(platformRead.id), "platform and tenant configuration scopes collided");
  result.checks.push("readonly-read-and-scope-isolation");

  for (const [session, setting, platform] of [[tenantReadonly, tenantRead, false], [platformReadonly, platformRead, true]]) {
    await expectDenied(session.token, "/admin/settings/operation", operationPayload(setting, platform));
    await expectDenied(session.token, "/admin/settings/sms/test", { phone: "13990000001" });
    await expectDenied(session.token, "/admin/settings/connectivity-check");
  }
  const tenantConfigDenied = await request("/admin/system/config-check", { headers: auth(tenantReadonly.token) });
  assert(tenantConfigDenied.response.status === 403, "tenant readonly account must not access platform config inspection");
  result.checks.push("readonly-write-and-cross-scope-denied");

  const platformInspection = await api("/admin/system/config-check", { headers: auth(platformReadonly.token) });
  assert(platformInspection?.summary && Array.isArray(platformInspection.checks), "platform readonly config inspection failed");
  const savedPlatform = await api("/admin/settings/operation", { method: "POST", headers: auth(platformManager.token), body: operationPayload(platformRead, true) });
  assertSecretsMasked(savedPlatform, "platform manager save response");
  const platformConnectivity = await api("/admin/settings/connectivity-check", { method: "POST", headers: auth(platformManager.token), body: {} });
  assert(platformConnectivity?.summary && Array.isArray(platformConnectivity.checks), "platform manager connectivity check failed");
  result.checks.push("delegated-platform-read-save-inspection-connectivity");

  const savedTenant = await api("/admin/settings/operation", { method: "POST", headers: auth(tenantManager.token), body: operationPayload(tenantRead, false) });
  assert(Number(savedTenant.id) === Number(tenantReadonly.admin.tenantId), "tenant manager saved the wrong configuration scope");
  const tenantConnectivity = await api("/admin/settings/connectivity-check", { method: "POST", headers: auth(tenantManager.token), body: {} });
  assert(tenantConnectivity?.summary && Array.isArray(tenantConnectivity.checks), "tenant manager connectivity check failed");
  result.checks.push("tenant-manager-save-and-connectivity");

  result.retained = {
    tenantId: Number(tenantReadonly.admin.tenantId),
    platformSettingId: Number(platformRead.id),
    tenantSettingId: Number(tenantRead.id),
    accounts: ["showcase_operation_settings_read", "showcase_operation_settings_only", "showcase_system_settings_read", "showcase_system_settings_manager"]
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
  console.log(`Operation settings acceptance result: ${output}`);
}
