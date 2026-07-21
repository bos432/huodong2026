import fs from "node:fs";
import path from "node:path";
import { API_BASE, TENANT_CODE, api, assert, auth, demoUsers, futureDate, loginPlatformAdmin, loginShowcaseAdmin, userAuth } from "./online-showcase-lib.mjs";

const stamp = Date.now();
const runId = `waitlist-permission-${stamp}`;
const outputDir = path.resolve(".local-logs", runId);
fs.mkdirSync(outputDir, { recursive: true });

async function request(pathname, { token, method = "GET", body, tenantCode = null } = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? auth(token) : {}),
      ...(tenantCode ? { "x-tenant-code": tenantCode } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, payload, data: payload?.data };
}

function expectDenied(result, label, statuses = [403]) {
  assert(statuses.includes(result.status), `${label} 应为 ${statuses.join("/")}，实际 ${result.status}`);
}

function activityPayload(title, tenantId, capacity = 1) {
  return {
    tenantId,
    title,
    description: "候补权限、隐私投影、并发补位和取消专项验收活动。",
    notice: "验收数据永久保留",
    location: "慢π候补验收厅",
    startTime: futureDate(20, 14),
    endTime: futureDate(20, 17),
    registrationDeadline: futureDate(19, 20),
    capacity,
    price: 0,
    status: "open",
    featured: false,
    requireReview: false,
    allowCancel: true,
    fields: [
      { label: "姓名", type: "text", required: true, sortOrder: 1, options: [] },
      { label: "手机号", type: "phone", required: true, sortOrder: 2, options: [] },
      { label: "身份证", type: "id_card", required: true, sortOrder: 3, options: [] },
      { label: "联系地址", type: "address", required: true, sortOrder: 4, options: [] },
      { label: "联系邮箱", type: "email", required: true, sortOrder: 5, options: [] }
    ],
    hosts: [{ name: "慢π活动运营", title: "主办方", sortOrder: 1 }],
    sections: [{ type: "rich_text", title: "候补验收说明", content: "保留候补权限与并发验收数据。", sortOrder: 1 }],
    eligibilityRules: { maxRegistrationsPerUser: 1, requirePrivacyConsent: true }
  };
}

function registrationAnswers(activity, user, suffix) {
  const values = {
    姓名: `候补用户${suffix}`,
    手机号: user.phone,
    身份证: `33010619900101${String(1200 + suffix.charCodeAt(0)).slice(-4)}`,
    联系地址: `浙江省杭州市候补验收路${suffix}号`,
    联系邮箱: `waitlist-${suffix.toLowerCase()}-${stamp}@example.com`
  };
  return activity.fields.map((field) => ({ fieldId: field.id, label: field.label, type: field.type, value: values[field.label] }));
}

async function loginUserForTenant(user, tenantCode) {
  const result = await request("/public/auth/password-login", {
    method: "POST",
    tenantCode,
    body: { phone: user.phone, password: process.env.SHOWCASE_PASSWORD || "Qiwai123456", nickname: user.nickname }
  });
  assert(result.status === 201 && result.data?.userAccessToken, `${tenantCode} 会员 ${user.phone} 登录失败`);
  return { ...user, token: result.data.userAccessToken };
}

async function register(activity, user, tenantCode, suffix) {
  return api(`/public/activities/${activity.id}/register`, {
    method: "POST",
    headers: { ...userAuth(user.token), "x-tenant-code": tenantCode },
    body: JSON.stringify({ answers: registrationAnswers(activity, user, suffix), privacyAccepted: true })
  });
}

function assertNoInternalFields(value, label) {
  const text = JSON.stringify(value);
  for (const key of ["passwordHash", "openid", "unionid", "settings", "checkInCode", "sessionVersion", "agent", "eligibilityRules"]) {
    assert(!text.includes(`\"${key}\"`), `${label} 泄露内部字段 ${key}`);
  }
}

function findAudit(items, action, targetId) {
  return items.find((item) => item.action === action && Number(item.targetId || 0) === Number(targetId));
}

const readAdmin = await loginShowcaseAdmin("showcase_staff_read");
const manageAdmin = await loginShowcaseAdmin("showcase_staff_manager");
const sensitiveAdmin = await loginShowcaseAdmin("showcase_staff_security");
const platformAdmin = await loginPlatformAdmin();

const options = await api("/admin/waitlists/options", { headers: auth(readAdmin.token) });
assert(options.activities?.length > 0, "候补只读账号未获得活动选项");
const tenantId = Number(options.activities[0]?.tenant?.id || 0);
assert(tenantId > 0, "未识别当前候补验收商家");

const currentPayload = activityPayload(`候补权限验收-${runId}`, tenantId, 1);
let currentActivity = await api("/admin/activities", { method: "POST", headers: auth(platformAdmin.token), body: JSON.stringify(currentPayload) });
assert(currentActivity.status === "open" && Number(currentActivity.capacity) === 1, "候补验收活动创建失败");

const currentUsers = await Promise.all(demoUsers.slice(0, 4).map((user) => loginUserForTenant(user, TENANT_CODE)));
const firstRegistration = await register(currentActivity, currentUsers[0], TENANT_CODE, "A");
assert(firstRegistration.registration?.status === "approved", "首位会员未形成正式报名");
const waitAResult = await register(currentActivity, currentUsers[1], TENANT_CODE, "B");
const waitBResult = await register(currentActivity, currentUsers[2], TENANT_CODE, "C");
const waitCResult = await register(currentActivity, currentUsers[3], TENANT_CODE, "D");
const waitA = waitAResult.waitlist;
const waitB = waitBResult.waitlist;
const waitC = waitCResult.waitlist;
assert(waitAResult.waitlisted && waitBResult.waitlisted && waitCResult.waitlisted, "满员后未按预期进入候补");

const readPage = await api(`/admin/waitlists?activityId=${currentActivity.id}&status=waiting&page=1&pageSize=20`, { headers: auth(readAdmin.token) });
assert(readPage.total === 3 && readPage.items.length === 3, "候补只读分页数量不正确");
assert(readPage.items.every((item) => item.sensitiveMasked === true && String(item.user?.phone || "").includes("****")), "候补只读手机号未脱敏");
assert(!JSON.stringify(readPage.items).includes(currentUsers[1].phone), "候补只读响应泄露明文手机号");
assert(!JSON.stringify(readPage.items).includes("33010619900101"), "候补只读响应泄露身份证");
assertNoInternalFields(readPage.items, "候补只读响应");

const sensitivePage = await api(`/admin/waitlists?activityId=${currentActivity.id}&status=waiting&page=1&pageSize=20`, { headers: auth(sensitiveAdmin.token) });
const sensitiveRow = sensitivePage.items.find((item) => item.id === waitA.id);
assert(sensitiveRow?.sensitiveMasked === false && sensitiveRow.user.phone === currentUsers[1].phone, "候补敏感账号未获得完整手机号");
assert(JSON.stringify(sensitiveRow.answers).includes(`候补用户B`) && JSON.stringify(sensitiveRow.answers).includes("33010619900101"), "候补敏感账号未获得完整报名信息");
assertNoInternalFields(sensitiveRow, "候补敏感响应");

expectDenied(await request(`/admin/waitlists/${waitA.id}/promote`, { token: readAdmin.token, method: "POST", body: {} }), "候补只读账号补位");
expectDenied(await request(`/admin/waitlists/${waitA.id}/cancel`, { token: readAdmin.token, method: "POST", body: { remark: "无权取消" } }), "候补只读账号取消");
expectDenied(await request(`/admin/waitlists/${waitA.id}/promote`, { token: sensitiveAdmin.token, method: "POST", body: {} }), "候补敏感账号补位");
expectDenied(await request(`/admin/waitlists/${waitA.id}/cancel`, { token: sensitiveAdmin.token, method: "POST", body: { remark: "无权取消" } }), "候补敏感账号取消");
expectDenied(await request("/admin/waitlists?status=invalid", { token: readAdmin.token }), "非法候补状态", [400]);
expectDenied(await request("/admin/waitlists?pageSize=101", { token: readAdmin.token }), "非法候补分页", [400]);
expectDenied(await request(`/admin/waitlists/${waitB.id}/cancel`, { token: manageAdmin.token, method: "POST", body: { remark: "" } }), "空取消原因", [400]);

currentActivity = await api(`/admin/activities/${currentActivity.id}`, { method: "PUT", headers: auth(platformAdmin.token), body: JSON.stringify({ ...currentPayload, capacity: 2 }) });
assert(Number(currentActivity.capacity) === 2, "候补补位前扩容失败");

const promoteRace = await Promise.all([
  request(`/admin/waitlists/${waitA.id}/promote`, { token: manageAdmin.token, method: "POST", body: {} }),
  request(`/admin/waitlists/${waitA.id}/promote`, { token: manageAdmin.token, method: "POST", body: {} })
]);
const promoteSuccesses = promoteRace.filter((item) => item.status === 201 && item.payload?.code === 0);
const promoteFailures = promoteRace.filter((item) => item.status === 400);
assert(promoteSuccesses.length === 1 && promoteFailures.length === 1, `并发补位应仅一次成功，实际 ${promoteRace.map((item) => item.status).join("/")}`);
assert(promoteSuccesses[0].data?.sensitiveMasked === true && String(promoteSuccesses[0].data?.user?.phone || "").includes("****"), "维护账号补位响应未脱敏");
assertNoInternalFields(promoteSuccesses[0].data, "候补补位响应");

const cancelRace = await Promise.all([
  request(`/admin/waitlists/${waitB.id}/cancel`, { token: manageAdmin.token, method: "POST", body: { remark: `并发取消-${runId}` } }),
  request(`/admin/waitlists/${waitB.id}/cancel`, { token: manageAdmin.token, method: "POST", body: { remark: `并发取消-${runId}` } })
]);
const cancelSuccesses = cancelRace.filter((item) => item.status === 201 && item.payload?.code === 0);
const cancelFailures = cancelRace.filter((item) => item.status === 400);
assert(cancelSuccesses.length === 1 && cancelFailures.length === 1, `并发取消应仅一次成功，实际 ${cancelRace.map((item) => item.status).join("/")}`);
assert(cancelSuccesses[0].data?.status === "cancelled" && cancelSuccesses[0].data?.sensitiveMasked === true, "维护账号取消响应错误");

let otherTenantChecked = false;
let otherWaitlistId = null;
const tenants = await api("/admin/tenants", { headers: auth(platformAdmin.token) });
const otherTenant = tenants.find((tenant) => tenant.enabled && tenant.code !== TENANT_CODE && Number(tenant.id) !== tenantId);
if (otherTenant) {
  const otherPayload = activityPayload(`跨商家候补边界-${runId}`, otherTenant.id, 1);
  const otherActivity = await api("/admin/activities", { method: "POST", headers: auth(platformAdmin.token), body: JSON.stringify(otherPayload) });
  const otherUsers = await Promise.all(demoUsers.slice(0, 2).map((user) => loginUserForTenant(user, otherTenant.code)));
  await register(otherActivity, otherUsers[0], otherTenant.code, "X");
  const otherWait = await register(otherActivity, otherUsers[1], otherTenant.code, "Y");
  otherWaitlistId = otherWait.waitlist?.id || null;
  assert(otherWaitlistId, "其他商家未生成候补记录");
  expectDenied(await request(`/admin/waitlists/${otherWaitlistId}/promote`, { token: manageAdmin.token, method: "POST", body: {} }), "跨商家候补补位", [404]);
  expectDenied(await request(`/admin/waitlists/${otherWaitlistId}/cancel`, { token: manageAdmin.token, method: "POST", body: { remark: "越权取消" } }), "跨商家候补取消", [404]);
  otherTenantChecked = true;
}

const finalPage = await api(`/admin/waitlists?activityId=${currentActivity.id}&page=1&pageSize=20`, { headers: auth(readAdmin.token) });
const finalStatuses = Object.fromEntries(finalPage.items.map((item) => [item.id, item.status]));
assert(finalStatuses[waitA.id] === "promoted" && finalStatuses[waitB.id] === "cancelled" && finalStatuses[waitC.id] === "waiting", "候补最终状态不正确");

const auditPage = await api("/admin/operation-logs?page=1&pageSize=100", { headers: auth(platformAdmin.token) });
const promoteAudit = findAudit(auditPage.items || [], "waitlist.promote", waitA.id);
const cancelAudit = findAudit(auditPage.items || [], "waitlist.cancel", waitB.id);
assert(promoteAudit && cancelAudit, "候补补位或取消审计缺失");

const result = {
  runId,
  tenantId,
  options: options.activities.length,
  retained: {
    activityId: currentActivity.id,
    approvedRegistrationId: firstRegistration.registration.id,
    promotedWaitlistId: waitA.id,
    promotedRegistrationId: promoteSuccesses[0].data.promotedRegistration?.id || null,
    cancelledWaitlistId: waitB.id,
    waitingWaitlistId: waitC.id,
    otherWaitlistId
  },
  concurrency: {
    promoteStatuses: promoteRace.map((item) => item.status),
    cancelStatuses: cancelRace.map((item) => item.status)
  },
  auditIds: { promote: promoteAudit.id, cancel: cancelAudit.id },
  otherTenantChecked,
  createdAt: new Date().toISOString()
};

fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
