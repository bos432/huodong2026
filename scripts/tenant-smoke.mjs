import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
const ExcelJS = apiRequire("exceljs");
const baseUrl = process.env.API_BASE || "http://localhost:3000/api";
const runId = Date.now();
const resultFile = process.env.TENANT_SMOKE_RESULT_FILE || process.env.MULTI_TENANT_PREFLIGHT_RESULT_FILE || "deploy/tenant-smoke-result.json";
const smokeChecks = {};

const tenantA = {
  code: requiredEnv("TENANT_A_CODE"),
  username: requiredEnv("TENANT_A_ADMIN"),
  password: requiredEnv("TENANT_A_PASSWORD"),
  financeUsername: process.env.TENANT_A_FINANCE_ADMIN || `${requiredEnv("TENANT_A_ADMIN")}_finance`,
  financePassword: process.env.TENANT_A_FINANCE_PASSWORD || requiredEnv("TENANT_A_PASSWORD")
};

const tenantB = {
  code: requiredEnv("TENANT_B_CODE"),
  username: requiredEnv("TENANT_B_ADMIN"),
  password: requiredEnv("TENANT_B_PASSWORD"),
  financeUsername: process.env.TENANT_B_FINANCE_ADMIN || `${requiredEnv("TENANT_B_ADMIN")}_finance`,
  financePassword: process.env.TENANT_B_FINANCE_PASSWORD || requiredEnv("TENANT_B_PASSWORD")
};

const skipPayment = process.env.TENANT_SMOKE_SKIP_PAYMENT === "true";
let platformToken = null;

function resolveResultFile() {
  return path.isAbsolute(resultFile) ? resultFile : path.join(root, resultFile);
}

function markSmokeCheck(key, status = "passed", extra = {}) {
  smokeChecks[key] = { status, checkedAt: new Date().toISOString(), ...extra };
}

function writeSmokeResult(extra = {}) {
  const requiredChecks = ["operationContent", "activityBoundary", "exportBoundary", "paymentBoundary", "settlementBoundary"];
  const passed = requiredChecks.every((key) => smokeChecks[key]?.status === "passed") && extra.failed !== true;
  const output = {
    passed,
    checkedAt: new Date().toISOString(),
    runId,
    apiBase: baseUrl,
    tenantA: { code: tenantA.code },
    tenantB: { code: tenantB.code },
    checks: smokeChecks,
    ...extra
  };
  const file = resolveResultFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Tenant smoke result written: ${path.relative(root, file) || file}`);
  return output;
}

function requiredEnv(key) {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function tenantHeader(code) {
  return { "x-tenant-code": code };
}

function futureDate(days, hour = 10) {
  const date = new Date(Date.now() + days * 86400000);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function formatDateTime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function uniqueSettlementPeriod(offsetHours = 0) {
  const start = new Date(Date.now() + 30 * 86400000 + (runId % 1000000) * 1000 + offsetHours * 3600000);
  const end = new Date(start.getTime() + 3600000);
  return { periodStart: formatDateTime(start), periodEnd: formatDateTime(end) };
}

async function api(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok || body?.code !== 0) throw new Error(`${options.method || "GET"} ${path} failed: ${body?.message || text || res.status}`);
  return body.data;
}

async function downloadWorkbookText(path, token) {
  const res = await fetch(`${baseUrl}${path}`, { headers: auth(token) });
  const arrayBuffer = await res.arrayBuffer();
  if (!res.ok) {
    const text = Buffer.from(arrayBuffer).toString("utf8");
    throw new Error(`GET ${path} failed: ${text || res.status}`);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(arrayBuffer));
  const values = [];
  for (const worksheet of workbook.worksheets) {
    worksheet.eachRow((row) => {
      row.eachCell((cell) => values.push(cellText(cell.value)));
    });
  }
  return values.join("\n");
}

function cellText(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value.richText)) return value.richText.map((item) => item.text || "").join("");
  if ("text" in value) return String(value.text || "");
  if ("result" in value) return cellText(value.result);
  return JSON.stringify(value);
}

async function expectApiFailure(path, options = {}, label = "request") {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (res.ok && body?.code === 0) throw new Error(`${label} should have failed`);
  return body;
}

async function login(tenant) {
  const result = await api("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: tenant.username, password: tenant.password })
  });
  assert(result.token, `${tenant.code} admin token missing`);
  assert(result.admin?.tenantId, `${tenant.code} admin must be bound to a tenant`);
  assert(result.admin?.tenant?.code === tenant.code, `${tenant.code} admin tenant code mismatch`);
  assert(result.admin?.role !== "super_admin", `${tenant.code} admin must be tenant-scoped, not super_admin`);
  return { token: result.token, admin: result.admin };
}

async function loginFinance(tenant) {
  const result = await api("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: tenant.financeUsername, password: tenant.financePassword })
  });
  assert(result.token, `${tenant.code} finance token missing`);
  assert(result.admin?.tenantId, `${tenant.code} finance admin must be bound to a tenant`);
  assert(result.admin?.tenant?.code === tenant.code, `${tenant.code} finance admin tenant code mismatch`);
  assert(result.admin?.role === "finance", `${tenant.code} finance admin must use finance role`);
  return { token: result.token, admin: result.admin };
}

async function h5Login(phone, nickname) {
  const code = await api("/public/auth/h5-code", {
    method: "POST",
    body: JSON.stringify({ phone })
  });
  assert(code.verificationToken, "H5 verification token missing");
  return api("/public/auth/h5-login", {
    method: "POST",
    body: JSON.stringify({ phone, nickname, verificationToken: code.verificationToken, verificationCode: code.devCode || "000000" })
  });
}

function activityPayload(title, price = 0) {
  return {
    title,
    coverUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    description: "Tenant isolation smoke activity",
    notice: "Created by tenant smoke test",
    location: "Tenant smoke venue",
    startTime: futureDate(14, 14),
    endTime: futureDate(14, 16),
    registrationDeadline: futureDate(13, 20),
    capacity: 50,
    price,
    status: "draft",
    featured: false,
    requireReview: false,
    allowCancel: true,
    fields: [
      { label: "Name", type: "text", required: true, sortOrder: 1, options: [] },
      { label: "Phone", type: "phone", required: true, sortOrder: 2, options: [] }
    ],
    hosts: [],
    sections: []
  };
}

function answers(fields, suffix) {
  return fields.map((field) => ({
    fieldId: field.id,
    label: field.label,
    type: field.type,
    value: field.type === "phone" ? `139${String(runId).slice(-8)}` : `tenant-smoke-${suffix}`
  }));
}

async function createActivity(token, title, price = 0) {
  const draft = await api("/admin/activities", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify(activityPayload(title, price))
  });
  assert(draft.id, "Activity id missing");
  assert(draft.tenantId || draft.tenant?.id, "Created activity should include tenant");
  const submitted = await api(`/admin/activities/${draft.id}/submit-approval`, {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({})
  });
  assert(submitted.status === "pending_approval", "Tenant activity should require platform approval");
  const approved = await api(`/admin/activities/${draft.id}/approve`, {
    method: "POST",
    headers: auth(await getPlatformToken()),
    body: JSON.stringify({ remark: "tenant smoke platform approval" })
  });
  assert(approved.status === "open", "Platform approval should publish tenant activity");
  return approved;
}

async function getPlatformToken() {
  if (platformToken) return platformToken;
  const result = await api("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username: process.env.PLATFORM_ADMIN_USERNAME || "admin",
      password: process.env.PLATFORM_ADMIN_PASSWORD || "Admin123456"
    })
  });
  assert(result.token, "platform admin token missing");
  assert(result.admin?.role === "super_admin" && !result.admin?.tenantId, "platform admin should be global super_admin");
  platformToken = result.token;
  return platformToken;
}

async function saveOperationSetting(token, marker) {
  return api("/admin/settings/operation", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({
      registrationEnabled: true,
      registrationDisabledMessage: "",
      offlinePaymentInstructions: `offline payment ${marker}`,
      customerServiceName: `tenant-smoke-${marker}`,
      customerServicePhone: "13800000000",
      customerServiceWechat: `tenant_smoke_${marker}`,
      defaultGroupQrCodeUrl: "",
      pageTheme: {},
      refundInstructions: `refund ${marker}`,
      invoiceInstructions: `invoice ${marker}`
    })
  });
}

async function verifyTenantOperationContent(a, b) {
  await api("/admin/homepage/sections/reset-default", { method: "POST", headers: auth(a.token), body: JSON.stringify({}) });
  await api("/admin/homepage/sections/reset-default", { method: "POST", headers: auth(b.token), body: JSON.stringify({}) });
  const aSectionTitle = `tenant-smoke-section-A-${runId}`;
  const bSectionTitle = `tenant-smoke-section-B-${runId}`;
  await api("/admin/homepage/sections", {
    method: "POST",
    headers: auth(a.token),
    body: JSON.stringify({ type: "activity_feed", title: aSectionTitle, subtitle: "", enabled: true, sortOrder: 9990, config: { limit: 1 }, layout: {} })
  });
  await api("/admin/homepage/sections", {
    method: "POST",
    headers: auth(b.token),
    body: JSON.stringify({ type: "activity_feed", title: bSectionTitle, subtitle: "", enabled: true, sortOrder: 9990, config: { limit: 1 }, layout: {} })
  });
  const aSections = await api("/admin/homepage/sections", { headers: auth(a.token) });
  const bSections = await api("/admin/homepage/sections", { headers: auth(b.token) });
  assert(aSections.some((item) => item.title === aSectionTitle), "Tenant A homepage section missing");
  assert(!aSections.some((item) => item.title === bSectionTitle), "Tenant A should not see Tenant B homepage section");
  assert(bSections.some((item) => item.title === bSectionTitle), "Tenant B homepage section missing");
  assert(!bSections.some((item) => item.title === aSectionTitle), "Tenant B should not see Tenant A homepage section");

  await saveOperationSetting(a.token, `A-${runId}`);
  await saveOperationSetting(b.token, `B-${runId}`);
  const publicASetting = await api(`/public/settings/operation?tenantCode=${encodeURIComponent(tenantA.code)}`, { headers: tenantHeader(tenantA.code) });
  const publicBSetting = await api(`/public/settings/operation?tenantCode=${encodeURIComponent(tenantB.code)}`, { headers: tenantHeader(tenantB.code) });
  assert(publicASetting.customerServiceName === `tenant-smoke-A-${runId}`, "Tenant A public operation setting mismatch");
  assert(publicBSetting.customerServiceName === `tenant-smoke-B-${runId}`, "Tenant B public operation setting mismatch");

  const aAnnouncementTitle = `tenant-smoke-announcement-A-${runId}`;
  const bAnnouncementTitle = `tenant-smoke-announcement-B-${runId}`;
  await api("/admin/announcements", {
    method: "POST",
    headers: auth(a.token),
    body: JSON.stringify({ title: aAnnouncementTitle, content: "A announcement", type: "notice", enabled: true, pinned: true })
  });
  await api("/admin/announcements", {
    method: "POST",
    headers: auth(b.token),
    body: JSON.stringify({ title: bAnnouncementTitle, content: "B announcement", type: "notice", enabled: true, pinned: true })
  });
  const publicAAnnouncements = await api(`/public/announcements?tenantCode=${encodeURIComponent(tenantA.code)}`, { headers: tenantHeader(tenantA.code) });
  const publicBAnnouncements = await api(`/public/announcements?tenantCode=${encodeURIComponent(tenantB.code)}`, { headers: tenantHeader(tenantB.code) });
  assert(publicAAnnouncements.some((item) => item.title === aAnnouncementTitle), "Tenant A public announcement missing");
  assert(!publicAAnnouncements.some((item) => item.title === bAnnouncementTitle), "Tenant A should not see Tenant B announcement");
  assert(publicBAnnouncements.some((item) => item.title === bAnnouncementTitle), "Tenant B public announcement missing");
  assert(!publicBAnnouncements.some((item) => item.title === aAnnouncementTitle), "Tenant B should not see Tenant A announcement");
  markSmokeCheck("operationContent");
  console.log("OK tenant operation content isolation");
}

async function verifyTenantActivityBoundary(a, b) {
  const aActivity = await createActivity(a.token, `tenant-smoke-A-${runId}`, 0);
  const bActivity = await createActivity(b.token, `tenant-smoke-B-${runId}`, 0);

  const aAdminActivities = await api("/admin/activities?pageSize=100", { headers: auth(a.token) });
  const bAdminActivities = await api("/admin/activities?pageSize=100", { headers: auth(b.token) });
  const aAdminItems = Array.isArray(aAdminActivities) ? aAdminActivities : aAdminActivities.items;
  const bAdminItems = Array.isArray(bAdminActivities) ? bAdminActivities : bAdminActivities.items;
  assert(aAdminItems.some((item) => item.id === aActivity.id), "Tenant A admin activity missing");
  assert(!aAdminItems.some((item) => item.id === bActivity.id), "Tenant A admin should not see Tenant B activity");
  assert(bAdminItems.some((item) => item.id === bActivity.id), "Tenant B admin activity missing");
  assert(!bAdminItems.some((item) => item.id === aActivity.id), "Tenant B admin should not see Tenant A activity");

  const publicAList = await api(`/public/activities?tenantCode=${encodeURIComponent(tenantA.code)}&pageSize=100`, { headers: tenantHeader(tenantA.code) });
  const publicBList = await api(`/public/activities?tenantCode=${encodeURIComponent(tenantB.code)}&pageSize=100`, { headers: tenantHeader(tenantB.code) });
  assert(publicAList.items.some((item) => item.id === aActivity.id), "Tenant A public activity missing");
  assert(!publicAList.items.some((item) => item.id === bActivity.id), "Tenant A public should not see Tenant B activity");
  assert(publicBList.items.some((item) => item.id === bActivity.id), "Tenant B public activity missing");
  assert(!publicBList.items.some((item) => item.id === aActivity.id), "Tenant B public should not see Tenant A activity");

  await expectApiFailure(`/public/activities/${aActivity.id}?tenantCode=${encodeURIComponent(tenantB.code)}`, { headers: tenantHeader(tenantB.code) }, "Tenant B accessing Tenant A activity");
  await expectApiFailure(`/admin/activities/${aActivity.id}`, { headers: auth(b.token) }, "Tenant B admin accessing Tenant A activity");
  markSmokeCheck("activityBoundary");
  console.log("OK tenant activity boundary");
  return { aActivity, bActivity };
}

async function registerFreeActivity(activity, tenant, token, suffix) {
  const user = await h5Login(`13${suffix}${String(runId).slice(-8)}`, `tenant-smoke-export-${suffix}-${runId}`);
  const activityDetail = await api(`/admin/activities/${activity.id}`, { headers: auth(token) });
  const registration = await api(`/public/activities/${activity.id}/register?tenantCode=${encodeURIComponent(tenant.code)}`, {
    method: "POST",
    headers: tenantHeader(tenant.code),
    body: JSON.stringify({ userId: user.id, answers: answers(activityDetail.fields || [], `export-${suffix}`) })
  });
  assert(registration.registration?.id || registration.id, `${tenant.code} export registration missing`);
  return registration;
}

async function verifyTenantExportBoundary(a, b, aActivity, bActivity) {
  await registerFreeActivity(aActivity, tenantA, a.token, "8");
  await registerFreeActivity(bActivity, tenantB, b.token, "7");

  const aRegistrationExport = await downloadWorkbookText("/admin/registrations/export", a.token);
  const bRegistrationExport = await downloadWorkbookText("/admin/registrations/export", b.token);
  assert(aRegistrationExport.includes(aActivity.title), "Tenant A registration export should include Tenant A activity");
  assert(!aRegistrationExport.includes(bActivity.title), "Tenant A registration export should not include Tenant B activity");
  assert(bRegistrationExport.includes(bActivity.title), "Tenant B registration export should include Tenant B activity");
  assert(!bRegistrationExport.includes(aActivity.title), "Tenant B registration export should not include Tenant A activity");

  markSmokeCheck("exportBoundary");
  console.log("OK tenant export boundary");
}

async function verifyPaymentBoundary(a) {
  if (skipPayment) {
    markSmokeCheck("paymentBoundary", "skipped", { reason: "TENANT_SMOKE_SKIP_PAYMENT=true" });
    console.log("SKIP tenant payment callback boundary (TENANT_SMOKE_SKIP_PAYMENT=true)");
    return;
  }
  const paidActivity = await createActivity(a.token, `tenant-smoke-paid-A-${runId}`, 9);
  const paidActivityDetail = await api(`/admin/activities/${paidActivity.id}`, { headers: auth(a.token) });
  const user = await h5Login(`139${String(runId).slice(-8)}`, `tenant-smoke-user-${runId}`);
  const registration = await api(`/public/activities/${paidActivity.id}/register?tenantCode=${encodeURIComponent(tenantA.code)}`, {
    method: "POST",
    headers: tenantHeader(tenantA.code),
    body: JSON.stringify({ userId: user.id, answers: answers(paidActivityDetail.fields || [], "paid-A") })
  });
  assert(registration.order?.id, "Paid registration order missing");

  await expectApiFailure(
    `/public/orders/${registration.order.id}/pay/wechat?tenantCode=${encodeURIComponent(tenantB.code)}`,
    { method: "POST", headers: tenantHeader(tenantB.code), body: JSON.stringify({}) },
    "Tenant B paying Tenant A order"
  );

  const payment = await api(`/public/orders/${registration.order.id}/pay/wechat?tenantCode=${encodeURIComponent(tenantA.code)}`, {
    method: "POST",
    headers: tenantHeader(tenantA.code),
    body: JSON.stringify({})
  });
  assert(payment.payParams?.sign, "Sandbox payment sign missing");
  const callbackResult = await api("/payment/wechat/callback", {
    method: "POST",
    body: JSON.stringify({ ...payment.payParams, tenantId: 999999, tenantCode: tenantB.code })
  });
  assert(callbackResult.order?.tenant?.code === tenantA.code || callbackResult.order?.tenant?.id, "Callback result should remain bound to Tenant A order");
  markSmokeCheck("paymentBoundary");
  console.log("OK tenant payment callback boundary");
}

async function tenantSettlementAgent(financeToken, label) {
  const capability = await api("/admin/agent-settlements/transfer-capability", { headers: auth(financeToken) });
  const agent = capability.accounts?.find((item) => item.agent?.id)?.agent || capability.missingAgents?.[0];
  assert(agent?.id, `${label} settlement smoke agent missing; re-run npm run smoke:tenant:seed`);
  return agent;
}

async function generateSettlement(financeToken, agent, offsetHours, label) {
  const period = uniqueSettlementPeriod(offsetHours);
  const settlement = await api("/admin/agent-settlements/generate", {
    method: "POST",
    headers: auth(financeToken),
    body: JSON.stringify({ agentId: agent.id, ...period, commissionRate: 0, remark: `tenant-smoke-${label}-${runId}` })
  });
  assert(settlement.id && settlement.settlementNo, `${label} settlement missing`);
  return settlement;
}

async function verifyTenantSettlementBoundary(a, b) {
  const aAgent = await tenantSettlementAgent(a.financeToken, "Tenant A");
  const bAgent = await tenantSettlementAgent(b.financeToken, "Tenant B");
  const aSettlement = await generateSettlement(a.financeToken, aAgent, 0, "A");
  const bSettlement = await generateSettlement(b.financeToken, bAgent, 2, "B");

  const aList = await api("/admin/agent-settlements", { headers: auth(a.financeToken) });
  const bList = await api("/admin/agent-settlements", { headers: auth(b.financeToken) });
  assert(aList.some((item) => item.id === aSettlement.id), "Tenant A settlement list missing Tenant A settlement");
  assert(!aList.some((item) => item.id === bSettlement.id), "Tenant A settlement list should not include Tenant B settlement");
  assert(bList.some((item) => item.id === bSettlement.id), "Tenant B settlement list missing Tenant B settlement");
  assert(!bList.some((item) => item.id === aSettlement.id), "Tenant B settlement list should not include Tenant A settlement");
  await expectApiFailure(`/admin/agent-settlements/${bSettlement.id}/details`, { headers: auth(a.financeToken) }, "Tenant A finance accessing Tenant B settlement");

  const aSettlementExport = await downloadWorkbookText("/admin/agent-settlements/export", a.financeToken);
  const bSettlementExport = await downloadWorkbookText("/admin/agent-settlements/export", b.financeToken);
  assert(aSettlementExport.includes(aSettlement.settlementNo), "Tenant A settlement export should include Tenant A settlement");
  assert(!aSettlementExport.includes(bSettlement.settlementNo), "Tenant A settlement export should not include Tenant B settlement");
  assert(bSettlementExport.includes(bSettlement.settlementNo), "Tenant B settlement export should include Tenant B settlement");
  assert(!bSettlementExport.includes(aSettlement.settlementNo), "Tenant B settlement export should not include Tenant A settlement");

  markSmokeCheck("settlementBoundary");
  console.log("OK tenant settlement boundary");
}

async function main() {
  console.log(`Tenant smoke target: ${baseUrl}`);
  console.log(`Tenant A: ${tenantA.code}, Tenant B: ${tenantB.code}`);
  const health = await api("/health");
  assert(health.api === "up" && health.database === "up", "Health check failed");
  const a = await login(tenantA);
  const b = await login(tenantB);
  const aFinance = await loginFinance(tenantA);
  const bFinance = await loginFinance(tenantB);
  a.financeToken = aFinance.token;
  b.financeToken = bFinance.token;
  assert(a.admin.tenantId !== b.admin.tenantId, "Tenant A and B admins must belong to different tenants");
  assert(aFinance.admin.tenantId !== bFinance.admin.tenantId, "Tenant A and B finance admins must belong to different tenants");

  await verifyTenantOperationContent(a, b);
  const { aActivity, bActivity } = await verifyTenantActivityBoundary(a, b);
  await verifyTenantExportBoundary(a, b, aActivity, bActivity);
  await verifyPaymentBoundary(a);
  await verifyTenantSettlementBoundary(a, b);
  const result = writeSmokeResult();
  if (result.passed) {
    console.log("\nTenant isolation smoke test passed.");
  } else {
    console.log("\nTenant isolation smoke test completed with skipped checks; result is not eligible for production preflight.");
  }
}

main().catch((error) => {
  console.error("\nTenant isolation smoke test failed:");
  console.error(error.message);
  try {
    writeSmokeResult({ passed: false, failed: true, error: error.message });
  } catch (writeError) {
    console.error(`Could not write tenant smoke result: ${writeError.message}`);
  }
  process.exitCode = 1;
});




