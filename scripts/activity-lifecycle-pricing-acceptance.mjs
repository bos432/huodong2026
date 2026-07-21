import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiBase = String(process.env.API_BASE_URL || process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const tenantCode = process.env.TENANT_CODE || "qiwai-showcase";
const platformUsername = process.env.PLATFORM_ADMIN_USERNAME || "admin";
const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD || "Admin123456";
const tenantUsername = process.env.SHOWCASE_ADMIN_USERNAME || "showcase_admin";
const tenantPassword = process.env.SHOWCASE_ADMIN_PASSWORD || "Showcase123456Aa";
const userPassword = process.env.SHOWCASE_PASSWORD || "Qiwai123456";
const runId = `${Date.now()}`;
const outputDir = path.resolve(process.env.ACCEPTANCE_OUTPUT_DIR || path.join(root, ".local-logs"), `activity-lifecycle-pricing-${runId}`);
fs.mkdirSync(outputDir, { recursive: true });

const result = { runId, startedAt: new Date().toISOString(), tenantCode, status: "running", checks: [], retained: {} };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(name, operation, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await operation(); } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 500);
    }
  }
  throw new Error(`${name} failed after ${attempts} attempts: ${lastError?.message || lastError}`);
}

async function request(route, options = {}) {
  const response = await fetch(`${apiBase}${route}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.tenant === false ? {} : { "x-tenant-code": tenantCode })
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { ok: response.ok && payload?.code === 0, status: response.status, data: payload?.data, payload, text };
}

async function api(route, options = {}) {
  const response = await request(route, options);
  if (!response.ok) throw new Error(`${options.method || "GET"} ${route} failed (${response.status}): ${response.payload?.message || response.text}`);
  return response.data;
}

async function expectFailure(name, route, options, expectedText) {
  const response = await request(route, options);
  const message = String(response.payload?.message || response.text);
  assert(!response.ok && response.status >= 400 && response.status < 500, `${name} should return 4xx`);
  assert(message.includes(expectedText), `${name} should include ${expectedText}, got ${message}`);
  result.checks.push({ name, status: "passed", responseStatus: response.status, message });
}

async function loginAdmin(username, password) {
  const value = await api("/admin/auth/login", { method: "POST", tenant: false, body: { username, password } });
  assert(value.token, `${username} login token missing`);
  return value;
}

async function loginUser(phone, nickname) {
  const value = await api("/public/auth/password-login", { method: "POST", body: { phone, password: userPassword, nickname } });
  assert(value.userAccessToken, `${phone} user token missing`);
  return { ...value, phone };
}

function dateText(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function inDays(days, hour = 10) {
  const date = new Date(Date.now() + days * 86400000);
  date.setHours(hour, 0, 0, 0);
  return dateText(date);
}

function fields() {
  return [
    { label: "姓名", type: "text", required: true, sortOrder: 1, options: [] },
    { label: "手机号", type: "phone", required: true, sortOrder: 2, options: [] }
  ];
}

function activityPayload(title, categoryId, overrides = {}) {
  return {
    title,
    coverUrl: "https://dummyimage.com/1200x675/8b2823/ffffff.png&text=activity",
    shareTitle: `${title}｜慢π活动`,
    shareDescription: "活动生命周期与票种定价专项验收",
    shareImageUrl: "https://dummyimage.com/1200x675/16877d/ffffff.png&text=share",
    description: "验证活动向导、版本、审核、发布、渠道和票种商业规则。",
    notice: "验收数据永久保留",
    location: "杭州市西湖区慢π活动中心",
    locationLatitude: 30.259244,
    locationLongitude: 120.130203,
    locationMapUrl: "https://uri.amap.com/marker?position=120.130203,30.259244",
    startTime: inDays(16, 14),
    endTime: inDays(16, 17),
    registrationDeadline: inDays(15, 20),
    capacity: 30,
    price: 0,
    status: "draft",
    featured: false,
    requireReview: false,
    allowCancel: true,
    categoryId,
    fields: fields(),
    hosts: [{ name: "慢π主理人", title: "活动主办方", bio: "负责活动内容与现场组织", sortOrder: 1 }],
    sections: [
      { type: "highlights", title: "活动亮点", content: "版本、审核、渠道和定价完整验收。", sortOrder: 1 },
      { type: "agenda", title: "活动流程", content: "签到、主题分享、交流和复盘。", sortOrder: 2 }
    ],
    ...overrides
  };
}

function answers(activity, phone) {
  return activity.fields.map((field) => ({ fieldId: field.id, label: field.label, type: field.type, value: field.type === "phone" ? phone : "生命周期验收会员" }));
}

async function setTenantPermissions(platformToken, tenant, original, reviewRequired) {
  return api(`/admin/tenants/${tenant.id}/permissions`, {
    method: "POST",
    token: platformToken,
    tenant: false,
    body: {
      packagePlan: original.packagePlan || "standard",
      activityPublishReviewRequired: reviewRequired,
      registrationReviewEnabled: original.registrationReviewEnabled ?? false,
      paymentAccountEditable: original.paymentAccountEditable ?? true,
      mallEnabled: original.mallEnabled ?? true,
      entitlements: original.entitlements
    }
  });
}

async function submitAndApprove(activityId, tenantToken, platformToken, remark) {
  const submitted = await api(`/admin/activities/${activityId}/submit-approval`, { method: "POST", token: tenantToken, tenant: false, body: {} });
  assert(submitted.status === "pending_approval", `activity ${activityId} should be pending approval`);
  const approved = await api(`/admin/activities/${activityId}/approve`, { method: "POST", token: platformToken, tenant: false, body: { remark } });
  assert(approved.status === "open", `activity ${activityId} should be open after approval`);
  return approved;
}

async function main() {
  const platform = await loginAdmin(platformUsername, platformPassword);
  const tenantAdmin = await loginAdmin(tenantUsername, tenantPassword);
  const tenants = await api("/admin/tenants", { token: platform.token, tenant: false });
  const tenant = tenants.find((item) => item.code === tenantCode);
  if (!tenant) throw new Error(`tenant not found: ${tenantCode}`);
  const originalSettings = structuredClone(tenant.settings || {});
  let settingsChanged = false;

  try {
    await setTenantPermissions(platform.token, tenant, originalSettings, true);
    settingsChanged = true;

    const category = await api("/admin/categories", {
      method: "POST",
      token: tenantAdmin.token,
      tenant: false,
      body: { name: `生命周期验收分类${runId.slice(-6)}`, scene: "activity", sortOrder: 1, publicVisible: true, enabled: true }
    });
    const originalTitle = `【活动生命周期验收保留】${runId}`;
    const created = await api("/admin/activities", { method: "POST", token: tenantAdmin.token, tenant: false, body: activityPayload(originalTitle, category.id) });
    assert(created.status === "draft" && created.formSchemaVersion === 1, "lifecycle activity should start as draft");
    const publishCheck = await api(`/admin/activities/${created.id}/publish-check`, { token: tenantAdmin.token, tenant: false });
    assert(publishCheck.passed === true && publishCheck.blockingCount === 0, "activity publish check should pass");
    await expectFailure("草稿禁止平台直接通过", `/admin/activities/${created.id}/approve`, { method: "POST", token: platform.token, tenant: false, body: { remark: "非法越级" } }, "只有待平台审核活动");

    const editedPayload = activityPayload(`${originalTitle}-编辑版`, category.id, { description: "编辑后的活动说明，用于验证版本快照。" });
    const edited = await api(`/admin/activities/${created.id}`, { method: "PUT", token: tenantAdmin.token, tenant: false, body: editedPayload });
    const versionsBeforeRestore = await api(`/admin/activities/${created.id}/versions`, { token: tenantAdmin.token, tenant: false });
    assert(versionsBeforeRestore.length >= 2 && versionsBeforeRestore[0].versionNo > versionsBeforeRestore[1].versionNo, "activity should have ordered versions");
    const oldestVersion = versionsBeforeRestore[versionsBeforeRestore.length - 1];
    const restored = await api(`/admin/activities/${created.id}/versions/${oldestVersion.id}/restore`, { method: "POST", token: tenantAdmin.token, tenant: false, body: {} });
    assert(restored.status === "draft" && restored.title === originalTitle, "restoring the first version should restore the original title as draft");
    const copied = await api(`/admin/activities/${created.id}/copy`, { method: "POST", token: tenantAdmin.token, tenant: false, body: {} });
    assert(copied.status === "draft" && copied.title.includes("副本"), "copied activity should be a new draft");

    const firstSubmit = await api(`/admin/activities/${created.id}/submit-approval`, { method: "POST", token: tenantAdmin.token, tenant: false, body: {} });
    assert(firstSubmit.status === "pending_approval", "activity should enter pending approval");
    const withdrawn = await api(`/admin/activities/${created.id}/withdraw-approval`, { method: "POST", token: tenantAdmin.token, tenant: false, body: {} });
    assert(withdrawn.status === "draft", "withdrawn activity should return to draft");
    await api(`/admin/activities/${created.id}/submit-approval`, { method: "POST", token: tenantAdmin.token, tenant: false, body: {} });
    const rejected = await api(`/admin/activities/${created.id}/reject`, { method: "POST", token: platform.token, tenant: false, body: { remark: "补充活动说明后重新提交" } });
    assert(rejected.status === "rejected", "platform rejection should set rejected status");
    await api(`/admin/activities/${created.id}/submit-approval`, { method: "POST", token: tenantAdmin.token, tenant: false, body: {} });
    let lifecycleActivity = await api(`/admin/activities/${created.id}/approve`, { method: "POST", token: platform.token, tenant: false, body: { remark: "专项验收通过" } });
    assert(lifecycleActivity.status === "open", "approved activity should be open");

    const channelCode = `LIFE${runId.slice(-8)}`;
    const channel = await api(`/admin/activities/${created.id}/channels`, { method: "POST", token: tenantAdmin.token, tenant: false, body: { name: "生命周期验收渠道", code: channelCode, source: "acceptance", remark: "保留渠道", enabled: true } });
    await expectFailure("渠道码唯一约束", `/admin/activities/${created.id}/channels`, { method: "POST", token: tenantAdmin.token, tenant: false, body: { name: "重复渠道", code: channelCode } }, "渠道码已存在");

    const phoneSeed = runId.slice(-8);
    const users = await Promise.all([
      loginUser(`131${phoneSeed}`.slice(0, 11), `生命周期会员${runId.slice(-4)}`),
      loginUser(`132${phoneSeed}`.slice(0, 11), `取消活动会员${runId.slice(-4)}`),
      loginUser(`133${phoneSeed}`.slice(0, 11), `票种会员甲${runId.slice(-4)}`),
      loginUser(`134${phoneSeed}`.slice(0, 11), `票种会员乙${runId.slice(-4)}`)
    ]);
    await api(`/public/activities/${created.id}?channelCode=${channel.code}&source=acceptance`, { token: users[0].userAccessToken });
    const poster = await api(`/public/activities/${created.id}/share-poster`, { method: "POST", token: users[0].userAccessToken, body: {} });
    assert(poster.code && poster.title && poster.shareUrl, "share poster should contain invite code and share content");
    await api(`/public/activities/${created.id}/track-share`, { method: "POST", token: users[0].userAccessToken, body: { code: poster.code, source: "acceptance", scene: "timeline" } });
    const channelRegistration = await api(`/public/activities/${created.id}/register`, { method: "POST", token: users[0].userAccessToken, body: { answers: answers(lifecycleActivity, users[0].phone), channelCode: channel.code, source: "acceptance", inviteCode: poster.code } });
    assert(channelRegistration.registration?.status === "approved", "free lifecycle activity registration should be approved");
    const channelReport = await api(`/admin/activities/${created.id}/channel-report`, { token: tenantAdmin.token, tenant: false });
    const channelRow = channelReport.channels.find((item) => item.code === channel.code);
    assert(channelRow && Number(channelRow.viewCount || 0) >= 1 && Number(channelRow.registrationCount || 0) >= 1, "channel report should include view and registration attribution");

    const closed = await api(`/admin/activities/${created.id}/close`, { method: "POST", token: tenantAdmin.token, tenant: false, body: {} });
    assert(closed.status === "closed", "activity should close");
    const reopened = await api(`/admin/activities/${created.id}/reopen`, { method: "POST", token: tenantAdmin.token, tenant: false, body: {} });
    assert(reopened.status === "open", "activity should reopen");
    await expectFailure("定时发布时间不能在过去", `/admin/activities/${created.id}/schedule-publish`, { method: "POST", token: tenantAdmin.token, tenant: false, body: { publishAt: new Date(Date.now() - 1000).toISOString() } }, "必须晚于当前时间");
    const publishAt = new Date(Date.now() + 1500);
    const scheduled = await api(`/admin/activities/${created.id}/schedule-publish`, { method: "POST", token: tenantAdmin.token, tenant: false, body: { publishAt: publishAt.toISOString() } });
    assert(scheduled.status === "closed" && scheduled.scheduledPublishAt, "scheduled activity should be closed until publish time");
    await sleep(1900);
    const lifecycleRun = await api("/admin/activities/lifecycle/run", { method: "POST", token: platform.token, tenant: false, body: {} });
    assert(Number(lifecycleRun.publishedCount) >= 1, "lifecycle worker should publish the scheduled activity");
    const autoPublished = await api(`/admin/activities/${created.id}`, { token: tenantAdmin.token, tenant: false });
    assert(autoPublished.status === "open" && !autoPublished.scheduledPublishAt, "scheduled activity should be open after lifecycle run");
    const ended = await api(`/admin/activities/${created.id}/end`, { method: "POST", token: tenantAdmin.token, tenant: false, body: {} });
    assert(ended.status === "ended", "manual end should set ended status");

    const cancelActivity = await submitAndApprove(copied.id, tenantAdmin.token, platform.token, "副本取消流程验收通过");
    const cancelRegistration = await api(`/public/activities/${copied.id}/register`, { method: "POST", token: users[1].userAccessToken, body: { answers: answers(cancelActivity, users[1].phone) } });
    const cancelled = await api(`/admin/activities/${copied.id}/cancel`, { method: "POST", token: tenantAdmin.token, tenant: false, body: { reason: "专项验收取消活动" } });
    assert(cancelled.status === "cancelled" && cancelled.cancellationSummary?.cancelledRegistrations === 1, "activity cancellation should cancel the unfulfilled registration");
    const cancelledRegistration = await api(`/admin/registrations?activityId=${copied.id}&page=1&pageSize=20`, { token: tenantAdmin.token, tenant: false });
    assert((cancelledRegistration.items || cancelledRegistration).find((item) => item.id === cancelRegistration.registration.id)?.status === "cancelled", "linked registration should be cancelled");

    const ticketTitle = `【票种定价验收保留】${runId}`;
    const ticketDraft = await api("/admin/activities", { method: "POST", token: tenantAdmin.token, tenant: false, body: activityPayload(ticketTitle, category.id, { price: 100 }) });
    const ticketActivity = await submitAndApprove(ticketDraft.id, tenantAdmin.token, platform.token, "票种专项审核通过");
    await expectFailure("重复阶梯阈值限制", "/admin/ticket-types", { method: "POST", token: tenantAdmin.token, tenant: false, body: { activityId: ticketActivity.id, name: "非法阶梯票", price: 100, tierPrices: [{ minSold: 1, price: 90 }, { minSold: 1, price: 80 }] } }, "起始销量不能重复");
    const ticketType = await api("/admin/ticket-types", {
      method: "POST",
      token: tenantAdmin.token,
      tenant: false,
      body: {
        activityId: ticketActivity.id,
        name: "限量早鸟会员阶梯票",
        price: 100,
        capacity: 1,
        perUserLimit: 1,
        saleStartsAt: inDays(-1, 0),
        saleEndsAt: inDays(14, 23),
        earlyBirdPrice: 70,
        earlyBirdEndsAt: inDays(7, 23),
        memberPrice: 60,
        tierPrices: [{ minSold: 1, price: 80 }],
        enabled: true
      }
    });
    const quote = await api(`/public/activities/${ticketActivity.id}/quote`, { method: "POST", token: users[2].userAccessToken, body: { ticketTypeId: ticketType.id } });
    assert(quote.originalAmount === "70.00" && quote.ticketPricingRule === "early_bird", "first ticket quote should use early-bird price");
    const registrationOptions = (user) => ({ method: "POST", token: user.userAccessToken, body: { answers: answers(ticketActivity, user.phone), ticketTypeId: ticketType.id, paymentMethod: "offline" } });
    const competing = await Promise.all([
      request(`/public/activities/${ticketActivity.id}/register`, registrationOptions(users[2])),
      request(`/public/activities/${ticketActivity.id}/register`, registrationOptions(users[3]))
    ]);
    const successes = competing.filter((item) => item.ok);
    const rejectedTickets = competing.filter((item) => !item.ok);
    assert(successes.length === 1 && rejectedTickets.length === 1, "one-capacity ticket should accept exactly one concurrent registration");
    assert(String(rejectedTickets[0].payload?.message || "").includes("售罄"), "losing ticket request should report sold out");
    const acceptedTicketRegistration = successes[0].data.registration;
    assert(successes[0].data.order?.amount === "70.00" && successes[0].data.order?.status === "pending_payment", "accepted early-bird order should freeze 70.00 and await offline payment");

    const approvalLogs = await api(`/admin/activities/${created.id}/approval-logs`, { token: tenantAdmin.token, tenant: false });
    const actions = new Set(approvalLogs.map((item) => item.action));
    for (const action of ["create", "update", "submit", "withdraw", "reject", "approve", "close", "reopen", "schedule", "auto_publish", "end"]) assert(actions.has(action), `approval log should contain ${action}`);

    result.checks.push(
      { name: "分步向导底层、版本、复制和发布检查", status: "passed", activityId: created.id, versionCount: (await api(`/admin/activities/${created.id}/versions`, { token: tenantAdmin.token, tenant: false })).length, copiedActivityId: copied.id },
      { name: "活动审核发布完整状态机", status: "passed", actions: [...actions] },
      { name: "分类详情地图主办方分享与渠道归因", status: "passed", categoryId: category.id, channelId: channel.id, inviteCode: poster.code, channelReport: channelRow },
      { name: "票种早鸟会员阶梯配置与并发库存", status: "passed", activityId: ticketActivity.id, ticketTypeId: ticketType.id, quote: { originalAmount: quote.originalAmount, rule: quote.ticketPricingRule }, acceptedRegistrationId: acceptedTicketRegistration.id, rejectedStatus: rejectedTickets[0].status }
    );
    result.retained = {
      tenantId: tenant.id,
      categoryId: category.id,
      lifecycleActivityId: created.id,
      lifecycleActivityTitle: originalTitle,
      copiedCancelledActivityId: copied.id,
      channelId: channel.id,
      channelCode: channel.code,
      channelRegistrationId: channelRegistration.registration.id,
      inviteCode: poster.code,
      ticketActivityId: ticketActivity.id,
      ticketActivityTitle: ticketTitle,
      ticketTypeId: ticketType.id,
      acceptedTicketRegistrationId: acceptedTicketRegistration.id,
      userPhones: users.map((user) => user.phone)
    };
    result.status = "passed";
  } finally {
    if (settingsChanged) {
      await retry("restore tenant activity review setting", () => setTenantPermissions(platform.token, tenant, originalSettings, originalSettings.activityPublishReviewRequired ?? false)).catch((error) => {
        result.status = "failed";
        result.checks.push({ name: "恢复租户活动审核配置", status: "failed", error: error.message });
      });
    }
    const restoredTenants = await retry("read restored tenant settings", () => api("/admin/tenants", { token: platform.token, tenant: false })).catch(() => []);
    const restoredTenant = restoredTenants.find((item) => item.id === tenant.id);
    result.restored = {
      packagePlan: restoredTenant?.settings?.packagePlan || null,
      activityPublishReviewRequired: restoredTenant?.settings?.activityPublishReviewRequired ?? null
    };
    if (restoredTenant && result.restored.activityPublishReviewRequired !== (originalSettings.activityPublishReviewRequired ?? false)) {
      result.status = "failed";
      result.checks.push({ name: "校验租户活动审核配置", status: "failed", expected: originalSettings.activityPublishReviewRequired ?? false, actual: result.restored.activityPublishReviewRequired });
    }
    result.finishedAt = new Date().toISOString();
    if (result.status === "running") result.status = "failed";
    fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
    console.log(`活动生命周期与票种验收结果：${path.join(outputDir, "result.json")}`);
  }
}

main().catch((error) => {
  result.status = "failed";
  result.error = error.stack || error.message;
  result.finishedAt = result.finishedAt || new Date().toISOString();
  const file = path.join(outputDir, "result.json");
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(result, null, 2));
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
