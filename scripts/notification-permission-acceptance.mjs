import fs from "node:fs";
import path from "node:path";
import { API_BASE, api, assert, auth, loginAdmin, loginPlatformAdmin, loginShowcaseAdmin, pickList } from "./online-showcase-lib.mjs";

const stamp = Date.now();
const runId = `notification-permission-${stamp}`;
const outputDir = path.resolve(".local-logs", runId);
fs.mkdirSync(outputDir, { recursive: true });

async function request(pathname, token, method = "GET", body, extraHeaders = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { ...(token ? auth(token) : {}), ...extraHeaders, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
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

function assertNoPrivateIdentity(value, label) {
  const text = JSON.stringify(value);
  for (const key of ["passwordHash", "openid", "unionid", "wechatAppId", "sessionVersion", "lastLoginChannel"]) {
    assert(!text.includes(`\"${key}\"`), `${label} 泄露内部字段 ${key}`);
  }
}

function uniquePhone(index) {
  return `1398${String(stamp + index).slice(-7)}`;
}

async function createTenantMember(phone, nickname, adminToken) {
  const profile = await api("/admin/members", {
    method: "POST",
    headers: auth(adminToken),
    body: JSON.stringify({ phone, password: process.env.SHOWCASE_PASSWORD || "Qiwai123456", nickname, remark: runId })
  });
  assert(profile.user?.id, `${nickname} 创建失败`);
  return profile.user;
}

const viewOnly = await loginShowcaseAdmin("showcase_business_job_readonly");
const readAdmin = await loginShowcaseAdmin("showcase_staff_read");
const manageAdmin = await loginShowcaseAdmin("showcase_staff_manager");
const sensitiveAdmin = await loginShowcaseAdmin("showcase_staff_security");
const showcaseAdmin = await loginShowcaseAdmin("showcase_admin");
const platformAdmin = await loginPlatformAdmin();
const crossAdmin = await loginAdmin("qiwai_hz_admin", process.env.QIWAI_DEMO_PASSWORD || "Qiwai123456");

assert(viewOnly.admin?.permissions?.includes("notification.view"), "通知只读专用账号缺少 notification.view");
assert(!viewOnly.admin?.permissions?.some((item) => item.startsWith("activity.") || item.startsWith("tag.")), "通知只读专用账号不应借用活动或标签权限");

const options = await api("/admin/notifications/options", { headers: auth(viewOnly.token) });
assert(options.activities?.length > 0, "通知只读专用账号未获得活动选项");
assert(options.tags?.length > 0, "通知只读专用账号未获得标签选项");
assertNoPrivateIdentity(options, "通知 options");
expectDenied(await request("/admin/activities", viewOnly.token), "通知只读专用账号读取活动模块");
expectDenied(await request("/admin/tags", viewOnly.token), "通知只读专用账号读取标签模块");
expectDenied(await request("/admin/notifications?pageSize=101", readAdmin.token), "通知非法分页", [400]);
expectDenied(await request("/admin/notification-preferences?page=0", readAdmin.token), "通知偏好非法分页", [400]);

const activity = options.activities[0];
const targetUser = await createTenantMember(uniquePhone(1), `通知验收会员-${runId}`, showcaseAdmin.token);
const frequencyUser = await createTenantMember(uniquePhone(2), `通知频控会员-${runId}`, showcaseAdmin.token);
const retryUser = await createTenantMember(uniquePhone(3), `通知重试会员-${runId}`, showcaseAdmin.token);

const templateBody = {
  name: `通知权限模板-${runId}`,
  channel: "site",
  title: "活动提醒：{{activityTitle}}",
  content: "{{userName}}，手机号 {{userPhone}}，签到码 {{checkInCode}}。",
  enabled: true
};
expectDenied(await request("/admin/notification-templates", readAdmin.token, "POST", templateBody), "通知只读账号创建模板");
expectDenied(await request("/admin/notification-templates", sensitiveAdmin.token, "POST", templateBody), "通知敏感账号创建模板");
expectDenied(await request("/admin/notification-preferences/1", readAdmin.token, "PATCH", { channel: "site", subscribed: false }), "通知只读账号修改偏好");
expectDenied(await request("/admin/notifications/send", sensitiveAdmin.token, "POST", { userId: targetUser.id, title: "无权发送", content: "无权发送" }), "通知敏感账号发送");
expectDenied(await request("/admin/notifications/send", manageAdmin.token, "POST", { title: "缺少目标", content: "缺少目标" }), "单发缺少会员", [400]);

const template = await api("/admin/notification-templates", {
  method: "POST",
  headers: auth(manageAdmin.token),
  body: JSON.stringify(templateBody)
});

const registrationRows = pickList(await api("/admin/registrations?page=1&pageSize=100", { headers: auth(showcaseAdmin.token) }));
const registration = registrationRows.find((item) => item.user?.id && item.activity?.id && item.checkInCode);
assert(registration, "没有可用于签到码脱敏验收的报名记录");
const previewBody = { templateId: template.id, activityId: registration.activity.id, userId: registration.user.id, registrationId: registration.id };
const readPreview = await api("/admin/notifications/preview", { method: "POST", headers: auth(readAdmin.token), body: JSON.stringify(previewBody) });
assert(readPreview.sensitiveMasked === true, "只读预览敏感标记错误");
assertMaskedPhone(readPreview.variables.userPhone, "只读预览手机号");
assert(String(readPreview.variables.checkInCode || "").includes("****"), "只读预览签到码未脱敏");
assert(!readPreview.content.includes(registration.user.phone), "只读预览正文泄露完整手机号");

const sensitivePreview = await api("/admin/notifications/preview", { method: "POST", headers: auth(sensitiveAdmin.token), body: JSON.stringify(previewBody) });
assert(sensitivePreview.sensitiveMasked === false, "敏感预览标记错误");
assert(sensitivePreview.variables.userPhone === registration.user.phone, "敏感预览未显示完整手机号");
assert(sensitivePreview.variables.checkInCode === registration.checkInCode, "敏感预览未显示完整签到码");

const sent = await api("/admin/notifications/send", {
  method: "POST",
  headers: auth(manageAdmin.token),
  body: JSON.stringify({ userId: targetUser.id, channel: "site", title: `通知 ${targetUser.phone}`, content: `正文手机号 ${targetUser.phone}`, remark: runId })
});
assert(sent.status === "sent", "站内通知未发送成功");
assert(sent.providerMessageId === null && sent.errorMessage === null && sent.sensitiveMasked === true, "维护账号即时响应泄露服务商敏感字段");
assert(!sent.title.includes(targetUser.phone) && !sent.content.includes(targetUser.phone), "维护账号即时响应泄露正文手机号");

const readList = await api("/admin/notifications?page=1&pageSize=100", { headers: auth(readAdmin.token) });
const readRow = readList.items.find((item) => item.id === sent.id);
assert(readRow?.sensitiveMasked === true && readRow.providerMessageId === null && readRow.errorMessage === null, "只读通知记录敏感字段未隐藏");
assertMaskedPhone(readRow.user.phone, "只读通知记录手机号");
assertNoPrivateIdentity(readRow, "只读通知记录");

const sensitiveList = await api("/admin/notifications?page=1&pageSize=100", { headers: auth(sensitiveAdmin.token) });
const sensitiveRow = sensitiveList.items.find((item) => item.id === sent.id);
assert(sensitiveRow?.user?.phone === targetUser.phone && sensitiveRow.providerMessageId, "敏感通知账号未获得完整手机号和服务商消息号");

const preference = await api(`/admin/notification-preferences/${targetUser.id}`, {
  method: "PATCH",
  headers: auth(manageAdmin.token),
  body: JSON.stringify({ channel: "site", subscribed: false, reason: `专项退订-${runId}` })
});
assert(preference.subscribed === false, "通知偏好退订未保存");
const suppressed = await api("/admin/notifications/send", {
  method: "POST",
  headers: auth(manageAdmin.token),
  body: JSON.stringify({ userId: targetUser.id, channel: "site", title: `退订抑制-${runId}`, content: "该通知应被偏好抑制" })
});
assert(suppressed.status === "suppressed" && suppressed.provider === "preference", "退订后通知未被抑制");

await api(`/admin/notification-preferences/${frequencyUser.id}`, {
  method: "PATCH",
  headers: auth(manageAdmin.token),
  body: JSON.stringify({ channel: "site", subscribed: true, reason: "" })
});
const frequencyRows = [];
for (let index = 1; index <= 6; index += 1) {
  frequencyRows.push(await api("/admin/notifications/send", {
    method: "POST",
    headers: auth(manageAdmin.token),
    body: JSON.stringify({ userId: frequencyUser.id, channel: "site", title: `频控验收 ${index}-${runId}`, content: `频控验收第 ${index} 条` })
  }));
}
assert(frequencyRows.slice(0, 5).every((item) => item.status === "sent"), "频控阈值内通知未全部发送");
assert(frequencyRows[5].status === "suppressed" && frequencyRows[5].provider === "rate-limit", "第六条并发治理通知未被频控抑制");

const failed = await api("/admin/notifications/send", {
  method: "POST",
  headers: auth(manageAdmin.token),
  body: JSON.stringify({ userId: retryUser.id, channel: "site", title: `[fail] 并发重试-${runId}`, content: "该通知用于并发失败重试验收" })
});
assert(failed.status === "failed", "强制失败通知未进入 failed 状态");
const retryRace = await Promise.all([
  request(`/admin/notifications/${failed.id}/retry`, manageAdmin.token, "POST"),
  request(`/admin/notifications/${failed.id}/retry`, manageAdmin.token, "POST")
]);
assert(retryRace.filter((item) => item.status === 201).length === 1, `并发重试应仅受理一次：${retryRace.map((item) => item.status).join("/")}`);
assert(retryRace.filter((item) => item.status === 400).length === 1, `并发重试应拒绝一次重复请求：${retryRace.map((item) => item.status).join("/")}`);

const failedReadList = await api("/admin/notifications?status=failed&page=1&pageSize=100", { headers: auth(readAdmin.token) });
const failedRead = failedReadList.items.find((item) => item.id === failed.id);
assert(failedRead && failedRead.errorMessage === null && failedRead.providerMessageId === null, "只读失败通知泄露错误详情");
const failedSensitiveList = await api("/admin/notifications?status=failed&page=1&pageSize=100", { headers: auth(sensitiveAdmin.token) });
const failedSensitive = failedSensitiveList.items.find((item) => item.id === failed.id);
assert(failedSensitive?.errorMessage?.includes("forced failure"), "敏感账号未获得失败错误详情");

const crossUser = await createTenantMember(uniquePhone(4), `跨商家通知会员-${runId}`, crossAdmin.token);
const crossOptions = await api("/admin/notifications/options", { headers: auth(crossAdmin.token) });
assert(crossOptions.activities?.length > 0, "杭州商家缺少通知活动选项");
const crossTemplate = await api("/admin/notification-templates", {
  method: "POST",
  headers: auth(crossAdmin.token),
  body: JSON.stringify({ name: `杭州通知模板-${runId}`, channel: "site", title: "杭州通知", content: "杭州通知正文", enabled: true })
});
const crossSchedule = await api("/admin/notification-schedules", {
  method: "POST",
  headers: auth(crossAdmin.token),
  body: JSON.stringify({ activityId: crossOptions.activities[0].id, templateId: crossTemplate.id, name: `杭州提醒规则-${runId}`, channel: "site", beforeHours: 24, enabled: true })
});
const crossFailed = await api("/admin/notifications/send", {
  method: "POST",
  headers: auth(crossAdmin.token),
  body: JSON.stringify({ userId: crossUser.id, activityId: crossOptions.activities[0].id, channel: "site", title: `[fail] 杭州通知-${runId}`, content: "跨商家边界通知" })
});
await api(`/admin/notification-preferences/${crossUser.id}`, {
  method: "PATCH",
  headers: auth(crossAdmin.token),
  body: JSON.stringify({ channel: "site", subscribed: false, reason: runId })
});
expectDenied(await request(`/admin/notification-templates/${crossTemplate.id}`, manageAdmin.token, "PATCH", templateBody), "跨商家更新模板", [404]);
expectDenied(await request(`/admin/notification-schedules/${crossSchedule.id}`, manageAdmin.token, "PATCH", { activityId: activity.id, templateId: template.id, name: "越权规则", channel: "site", beforeHours: 1, enabled: true }), "跨商家更新规则", [404]);
expectDenied(await request(`/admin/notifications/${crossFailed.id}/retry`, manageAdmin.token, "POST"), "跨商家重试通知", [404]);
expectDenied(await request(`/admin/notification-preferences/${crossUser.id}`, manageAdmin.token, "PATCH", { channel: "site", subscribed: true }), "跨商家修改通知偏好", [404]);

const auditPage = await api("/admin/operation-logs?page=1&pageSize=100", { headers: auth(platformAdmin.token) });
const audits = {
  template: auditPage.items.find((item) => item.action === "notification_template.create" && Number(item.targetId) === Number(template.id)),
  preference: auditPage.items.find((item) => item.action === "notification_preference.update" && Number(item.targetId) === Number(preference.id)),
  send: auditPage.items.find((item) => item.action === "notification.send" && Number(item.targetId) === Number(sent.id)),
  retry: auditPage.items.find((item) => item.action === "notification.retry" && Number(item.targetId) === Number(failed.id)),
  schedule: auditPage.items.find((item) => item.action === "notification_schedule.create" && Number(item.targetId) === Number(crossSchedule.id))
};
assert(audits.template && audits.preference && audits.send && audits.retry && audits.schedule, "通知中心操作审计不完整");

const result = {
  runId,
  accounts: ["showcase_business_job_readonly", "showcase_staff_read", "showcase_staff_manager", "showcase_staff_security", "qiwai_hz_admin"],
  retained: {
    tenantId: activity.tenant?.id || null,
    activityId: activity.id,
    userId: targetUser.id,
    frequencyUserId: frequencyUser.id,
    retryUserId: retryUser.id,
    templateId: template.id,
    notificationId: sent.id,
    preferenceId: preference.id,
    suppressedNotificationId: suppressed.id,
    failedNotificationId: failed.id,
    crossUserId: crossUser.id,
    crossTemplateId: crossTemplate.id,
    crossScheduleId: crossSchedule.id,
    crossNotificationId: crossFailed.id
  },
  checks: {
    optionActivities: options.activities.length,
    optionTags: options.tags.length,
    frequencyStatuses: frequencyRows.map((item) => item.status),
    retryRaceStatuses: retryRace.map((item) => item.status),
    readMasked: readRow.sensitiveMasked,
    sensitiveProviderMessageId: sensitiveRow.providerMessageId
  },
  auditIds: Object.fromEntries(Object.entries(audits).map(([key, value]) => [key, value.id])),
  createdAt: new Date().toISOString()
};

fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
