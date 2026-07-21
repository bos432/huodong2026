import fs from "node:fs";
import path from "node:path";
import { API_BASE, TENANT_CODE, api, assert, auth, demoUsers, loginPlatformAdmin, loginShowcaseAdmin, loginUser, userAuth } from "./online-showcase-lib.mjs";

const stamp = Date.now();
const runId = `review-permission-${stamp}`;
const outputDir = path.resolve(".local-logs", runId);
fs.mkdirSync(outputDir, { recursive: true });

async function request(pathname, token, method = "GET", body, headers = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { ...(token ? auth(token) : {}), ...headers, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
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

function assertMaskedPhone(value, label) {
  const phone = String(value || "");
  assert(phone.includes("****") && !/^1\d{10}$/.test(phone), `${label} 未脱敏：${phone}`);
}

function assertMinimal(value, label) {
  const text = JSON.stringify(value);
  for (const key of ["passwordHash", "openid", "unionid", "settings", "answers", "formSnapshot", "checkInCode", "eligibilityRules", "sessionVersion"]) {
    assert(!text.includes(`\"${key}\"`), `${label} 泄露内部字段 ${key}`);
  }
}

const readAdmin = await loginShowcaseAdmin("showcase_staff_read");
const manageAdmin = await loginShowcaseAdmin("showcase_staff_manager");
const sensitiveAdmin = await loginShowcaseAdmin("showcase_staff_security");
const platformAdmin = await loginPlatformAdmin();

const options = await api("/admin/reviews/options", { headers: auth(readAdmin.token) });
assert(options.activities?.length > 0, "评价只读账号未获得活动选项");
const tenantId = Number(options.activities[0]?.tenant?.id || 0);
assert(tenantId > 0, "未识别评价验收商家");

const sensitiveReviews = await api("/admin/reviews?status=visible&page=1&pageSize=100", { headers: auth(sensitiveAdmin.token) });
const targetReview = sensitiveReviews.items?.find((item) => Number(item.activity?.tenant?.id || 0) === tenantId && item.user?.phone);
assert(targetReview, "没有可用于评价权限验收的显示中评价");
assert(/^1\d{10}$/.test(String(targetReview.user.phone)), "敏感账号未获得完整评价会员手机号");
assertMinimal(targetReview, "敏感评价响应");

const readReviews = await api(`/admin/reviews?activityId=${targetReview.activity.id}&page=1&pageSize=20`, { headers: auth(readAdmin.token) });
const readTarget = readReviews.items.find((item) => item.id === targetReview.id);
assert(readTarget?.sensitiveMasked === true, "评价只读账号敏感标记错误");
assertMaskedPhone(readTarget.user.phone, "评价只读会员手机号");
assert(Object.keys(readTarget.registration || {}).every((key) => ["id", "status"].includes(key)), "评价报名对象字段过多");
assertMinimal(readTarget, "评价只读响应");

const managerReviews = await api(`/admin/reviews?activityId=${targetReview.activity.id}&page=1&pageSize=20`, { headers: auth(manageAdmin.token) });
const managerTarget = managerReviews.items.find((item) => item.id === targetReview.id);
assertMaskedPhone(managerTarget.user.phone, "评价维护会员手机号");

expectDenied(await request(`/admin/reviews/${targetReview.id}`, readAdmin.token, "PATCH", { status: "visible", adminReply: "无权回复" }), "评价只读账号处置");
expectDenied(await request(`/admin/reviews/${targetReview.id}`, sensitiveAdmin.token, "PATCH", { status: "visible", adminReply: "无权回复" }), "评价敏感账号处置");
expectDenied(await request("/admin/reviews?status=invalid", readAdmin.token), "非法评价状态", [400]);
expectDenied(await request("/admin/reviews?pageSize=101", readAdmin.token), "非法评价分页", [400]);
expectDenied(await request("/admin/review-reports?status=invalid", readAdmin.token), "非法举报状态", [400]);
expectDenied(await request("/admin/review-reports?pageSize=101", readAdmin.token), "非法举报分页", [400]);
expectDenied(await request(`/admin/reviews/${targetReview.id}`, manageAdmin.token, "PATCH", { status: "visible", adminReply: "x".repeat(256), featured: true }), "超长管理员回复", [400]);

const reply = `评价权限验收回复-${runId}`;
const moderated = await api(`/admin/reviews/${targetReview.id}`, { method: "PATCH", headers: auth(manageAdmin.token), body: JSON.stringify({ status: "visible", adminReply: reply, featured: true }) });
assert(moderated.adminReply === reply && moderated.featured === true && moderated.status === "visible", "评价回复或精选更新未生效");
assert(moderated.sensitiveMasked === true, "评价维护响应不应返回敏感手机号");
assertMaskedPhone(moderated.user.phone, "评价维护响应手机号");
assertMinimal(moderated, "评价维护响应");

let createdReport = null;
let reporter = null;
for (const demoUser of demoUsers) {
  const user = await loginUser(demoUser.phone, demoUser.nickname);
  if (Number(user.user.id) === Number(targetReview.user.id)) continue;
  const result = await request(`/public/reviews/${targetReview.id}/report`, user.userAccessToken, "POST", { reason: `评价举报权限验收-${runId}` }, { ...userAuth(user.userAccessToken), "x-tenant-code": TENANT_CODE });
  if (result.status === 201 && result.data?.report && result.data.idempotent === false) {
    createdReport = result.data.report;
    reporter = { ...user, phone: demoUser.phone };
    break;
  }
}
assert(createdReport && reporter, "未能通过公开接口创建新的评价举报");

const readReports = await api("/admin/review-reports?status=pending&page=1&pageSize=100", { headers: auth(readAdmin.token) });
const readReport = readReports.items.find((item) => item.id === createdReport.id);
assert(readReport?.sensitiveMasked === true && readReport.handledBy === null, "举报只读响应敏感标记错误");
assertMaskedPhone(readReport.user.phone, "举报只读会员手机号");
assertMinimal(readReport, "举报只读响应");

const sensitiveReports = await api("/admin/review-reports?status=pending&page=1&pageSize=100", { headers: auth(sensitiveAdmin.token) });
const sensitiveReport = sensitiveReports.items.find((item) => item.id === createdReport.id);
assert(sensitiveReport?.user?.phone === reporter.phone && sensitiveReport.sensitiveMasked === false, "举报敏感账号未获得完整手机号");

expectDenied(await request(`/admin/review-reports/${createdReport.id}`, readAdmin.token, "PATCH", { status: "resolved", resolution: "无权处理", hideReview: true }), "举报只读账号处置");
expectDenied(await request(`/admin/review-reports/${createdReport.id}`, sensitiveAdmin.token, "PATCH", { status: "resolved", resolution: "无权处理", hideReview: true }), "举报敏感账号处置");
expectDenied(await request(`/admin/review-reports/${createdReport.id}`, manageAdmin.token, "PATCH", { status: "resolved", resolution: "", hideReview: true }), "空举报处理说明", [400]);

const resolution = `举报成立并隐藏-${runId}`;
const reportRace = await Promise.all([
  request(`/admin/review-reports/${createdReport.id}`, manageAdmin.token, "PATCH", { status: "resolved", resolution, hideReview: true }),
  request(`/admin/review-reports/${createdReport.id}`, manageAdmin.token, "PATCH", { status: "resolved", resolution, hideReview: true })
]);
const reportSuccesses = reportRace.filter((item) => item.status === 200 && item.payload?.code === 0);
const reportFailures = reportRace.filter((item) => item.status === 400);
assert(reportSuccesses.length === 1 && reportFailures.length === 1, `并发举报处置应仅一次成功，实际 ${reportRace.map((item) => item.status).join("/")}`);
const handled = reportSuccesses[0].data;
assert(handled.status === "resolved" && handled.resolution === resolution && handled.handledBy === null && handled.sensitiveMasked === true, "维护账号举报处置响应错误");
assertMaskedPhone(handled.user.phone, "举报处置响应手机号");
assertMinimal(handled, "举报处置响应");
expectDenied(await request(`/admin/review-reports/${createdReport.id}`, manageAdmin.token, "PATCH", { status: "rejected", resolution: "重复处理" }), "重复举报处置", [400]);

const finalReview = await api(`/admin/reviews?activityId=${targetReview.activity.id}&status=hidden&page=1&pageSize=100`, { headers: auth(readAdmin.token) });
const finalTarget = finalReview.items.find((item) => item.id === targetReview.id);
assert(finalTarget?.status === "hidden" && finalTarget.featured === false && finalTarget.adminReply === reply, "举报成立后评价状态不正确");

const resolvedSensitive = await api("/admin/review-reports?status=resolved&page=1&pageSize=100", { headers: auth(sensitiveAdmin.token) });
const resolvedReport = resolvedSensitive.items.find((item) => item.id === createdReport.id);
assert(resolvedReport?.handledBy === "showcase_staff_manager", "敏感账号未获得举报处理人");

let crossTenantChecked = false;
const allReviews = await api("/admin/reviews?page=1&pageSize=100", { headers: auth(platformAdmin.token) });
const otherTenantReview = allReviews.items.find((item) => item.activity?.tenant?.id && Number(item.activity.tenant.id) !== tenantId);
if (otherTenantReview) {
  expectDenied(await request(`/admin/reviews/${otherTenantReview.id}`, manageAdmin.token, "PATCH", { status: "hidden", adminReply: "跨商家" }), "跨商家评价处置", [404]);
  crossTenantChecked = true;
}

const auditPage = await api("/admin/operation-logs?page=1&pageSize=100", { headers: auth(platformAdmin.token) });
const moderateAudit = auditPage.items.find((item) => item.action === "review.moderate" && Number(item.targetId) === Number(targetReview.id));
const reportAudit = auditPage.items.find((item) => item.action === "review_report.handle" && Number(item.targetId) === Number(createdReport.id));
assert(moderateAudit && reportAudit, "评价处置审计不完整");

const result = {
  runId,
  tenantId,
  counts: { options: options.activities.length, reviews: sensitiveReviews.total, pendingReportsBefore: readReports.total },
  retained: { reviewId: targetReview.id, activityId: targetReview.activity.id, registrationId: targetReview.registration.id, reportId: createdReport.id, reporterUserId: reporter.user.id },
  reportRaceStatuses: reportRace.map((item) => item.status),
  auditIds: { moderate: moderateAudit.id, report: reportAudit.id },
  crossTenantChecked,
  createdAt: new Date().toISOString()
};

fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
