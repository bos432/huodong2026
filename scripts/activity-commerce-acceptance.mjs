import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "apps/api/package.json"));
const ExcelJS = require("exceljs");
const apiBase = String(process.env.API_BASE_URL || process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const tenantCode = process.env.TENANT_CODE || "qiwai-showcase";
const platformUsername = process.env.PLATFORM_ADMIN_USERNAME || "admin";
const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD || "Admin123456";
const tenantUsername = process.env.SHOWCASE_ADMIN_USERNAME || "showcase_admin";
const tenantPassword = process.env.SHOWCASE_ADMIN_PASSWORD || "Showcase123456Aa";
const userPassword = process.env.SHOWCASE_PASSWORD || "Qiwai123456";
const runId = `${Date.now()}`;
const outputDir = path.resolve(process.env.ACCEPTANCE_OUTPUT_DIR || path.join(root, ".local-logs"), `activity-commerce-acceptance-${runId}`);
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
    try {
      return await operation();
    } catch (error) {
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
      ...(options.json !== false ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.tenant === false ? {} : { "x-tenant-code": tenantCode }),
      ...(options.headers || {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "";
  let payload = buffer;
  if (contentType.includes("json")) {
    try { payload = JSON.parse(buffer.toString("utf8")); } catch { payload = buffer.toString("utf8"); }
  }
  return { ok: response.ok && (!contentType.includes("json") || payload?.code === 0), status: response.status, data: payload?.data ?? payload, payload, buffer, headers: response.headers };
}

async function api(route, options = {}) {
  const response = await request(route, options);
  if (!response.ok) throw new Error(`${options.method || "GET"} ${route} failed (${response.status}): ${response.payload?.message || response.buffer.toString("utf8")}`);
  return response.data;
}

async function expectFailure(name, route, options, expectedText) {
  const response = await request(route, options);
  const message = String(response.payload?.message || response.buffer.toString("utf8"));
  assert(!response.ok && response.status >= 400 && response.status < 500, `${name} should return a 4xx response`);
  assert(message.includes(expectedText), `${name} should include ${expectedText}, got: ${message}`);
  result.checks.push({ name, status: "passed", responseStatus: response.status, message });
}

async function loginAdmin(username, password) {
  const data = await api("/admin/auth/login", { method: "POST", tenant: false, body: { username, password } });
  assert(data.token, `${username} login did not return token`);
  return data;
}

async function loginUser(phone, nickname) {
  const data = await api("/public/auth/password-login", { method: "POST", body: { phone, password: userPassword, nickname } });
  assert(data.userAccessToken, `${phone} login did not return userAccessToken`);
  return { ...data, phone };
}

function futureDate(days, hour) {
  const date = new Date(Date.now() + days * 86400000);
  date.setHours(hour, 0, 0, 0);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function activityPayload(title, fields, blacklistPhone) {
  return {
    title,
    description: "动态报名表单、资格限制、批量运营、评价举报和复盘专项验收活动。",
    notice: "验收数据永久保留",
    location: "慢π验收中心 A 厅",
    startTime: futureDate(12, 14),
    endTime: futureDate(12, 17),
    registrationDeadline: futureDate(11, 20),
    capacity: 20,
    price: 0,
    status: "open",
    featured: false,
    requireReview: true,
    allowCancel: true,
    fields,
    hosts: [{ name: "慢π活动运营", title: "主办方", sortOrder: 1 }],
    sections: [{ type: "rich_text", title: "验收说明", content: "保留活动报名商业闭环验收数据。", sortOrder: 1 }],
    eligibilityRules: {
      minAge: 18,
      maxAge: 65,
      allowedRegions: ["浙江", "杭州"],
      maxRegistrationsPerUser: 1,
      requirePrivacyConsent: true,
      allowCompanions: true,
      maxCompanions: 1,
      blacklistPhones: [blacklistPhone]
    }
  };
}

function answers(activity, phone, overrides = {}) {
  return activity.fields.map((field) => {
    let value = "验收会员";
    if (field.label.includes("手机")) value = phone;
    else if (field.label.includes("年龄")) value = "32";
    else if (field.label.includes("地区")) value = "浙江省杭州市";
    else if (field.label.includes("说明")) value = "表单 V2 保留快照";
    if (Object.prototype.hasOwnProperty.call(overrides, field.label)) value = overrides[field.label];
    return { fieldId: field.id, label: field.label, type: field.type, value };
  });
}

async function setTenantPermissions(platformToken, tenant, originalSettings, registrationReviewEnabled) {
  const body = {
    packagePlan: originalSettings.packagePlan || "standard",
    activityPublishReviewRequired: originalSettings.activityPublishReviewRequired ?? false,
    registrationReviewEnabled,
    paymentAccountEditable: originalSettings.paymentAccountEditable ?? true,
    mallEnabled: originalSettings.mallEnabled ?? true,
    entitlements: originalSettings.entitlements
  };
  return api(`/admin/tenants/${tenant.id}/permissions`, { method: "POST", token: platformToken, tenant: false, body });
}

async function workbookEvidence(route, token, filename, expectedText) {
  const response = await request(route, { token, tenant: false, json: false });
  assert(response.ok && response.buffer.length > 1000, `${route} did not return a valid workbook`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(response.buffer);
  const text = workbook.worksheets.flatMap((sheet) => sheet.getSheetValues()).flat(3).filter(Boolean).join(" ");
  assert(text.includes(expectedText), `${route} workbook does not contain ${expectedText}`);
  fs.writeFileSync(path.join(outputDir, filename), response.buffer);
  return { filename, bytes: response.buffer.length, sheets: workbook.worksheets.map((sheet) => sheet.name) };
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

    const phoneSeed = runId.slice(-8);
    const phones = {
      first: `137${phoneSeed}`.slice(0, 11),
      second: `138${phoneSeed}`.slice(0, 11),
      blocked: `135${phoneSeed}`.slice(0, 11)
    };
    const [firstUser, secondUser, blockedUser] = await Promise.all([
      loginUser(phones.first, `表单验收甲${runId.slice(-4)}`),
      loginUser(phones.second, `表单验收乙${runId.slice(-4)}`),
      loginUser(phones.blocked, `黑名单验收${runId.slice(-4)}`)
    ]);

    const initialFields = [
      { label: "姓名", type: "text", required: true, sortOrder: 1, options: [] },
      { label: "手机号", type: "phone", required: true, sortOrder: 2, options: [] },
      { label: "年龄", type: "number", required: true, sortOrder: 3, options: [] },
      { label: "所在地区", type: "region", required: true, sortOrder: 4, options: [] }
    ];
    const title = `【活动商业闭环验收保留】${runId}`;
    const created = await api("/admin/activities", { method: "POST", token: tenantAdmin.token, tenant: false, body: activityPayload(title, initialFields, phones.blocked) });
    assert(created.formSchemaVersion === 1, "new activity form schema version should be 1");

    await expectFailure("黑名单限制", `/public/activities/${created.id}/register`, { method: "POST", token: blockedUser.userAccessToken, body: { answers: answers(created, phones.blocked), privacyAccepted: true } }, "不可报名");
    await expectFailure("隐私授权必选", `/public/activities/${created.id}/register`, { method: "POST", token: firstUser.userAccessToken, body: { answers: answers(created, phones.first), privacyAccepted: false } }, "隐私授权");
    await expectFailure("年龄下限限制", `/public/activities/${created.id}/register`, { method: "POST", token: firstUser.userAccessToken, body: { answers: answers(created, phones.first, { "年龄": "16" }), privacyAccepted: true } }, "不能低于");
    await expectFailure("地区限制", `/public/activities/${created.id}/register`, { method: "POST", token: firstUser.userAccessToken, body: { answers: answers(created, phones.first, { "所在地区": "江苏省苏州市" }), privacyAccepted: true } }, "不在活动报名范围");
    await expectFailure("同行人数限制", `/public/activities/${created.id}/register`, { method: "POST", token: firstUser.userAccessToken, body: { answers: answers(created, phones.first), privacyAccepted: true, companions: [{ name: "同行甲" }, { name: "同行乙" }] } }, "最多 1 人");

    const firstRegistration = await api(`/public/activities/${created.id}/register`, {
      method: "POST",
      token: firstUser.userAccessToken,
      body: { answers: answers(created, phones.first), privacyAccepted: true, companions: [{ name: "同行甲", phone: "13600000001" }] }
    });
    assert(firstRegistration.registration?.status === "pending_review", "first registration should require review");

    const updatedPayload = activityPayload(title, [...initialFields, { label: "补充说明", type: "remark", required: false, sortOrder: 5, options: [] }], phones.blocked);
    const updated = await api(`/admin/activities/${created.id}`, { method: "PUT", token: tenantAdmin.token, tenant: false, body: updatedPayload });
    assert(updated.formSchemaVersion === 2 && updated.fields.length === 5, "activity form schema should increment to version 2");

    const secondRegistration = await api(`/public/activities/${created.id}/register`, {
      method: "POST",
      token: secondUser.userAccessToken,
      body: { answers: answers(updated, phones.second), privacyAccepted: true }
    });
    assert(secondRegistration.registration?.status === "pending_review", "second registration should require review");
    await expectFailure("重复报名限制", `/public/activities/${created.id}/register`, { method: "POST", token: secondUser.userAccessToken, body: { answers: answers(updated, phones.second), privacyAccepted: true } }, "已报名");

    const registrationIds = [firstRegistration.registration.id, secondRegistration.registration.id];
    const approved = await api("/admin/registrations/bulk-approve", { method: "POST", token: tenantAdmin.token, tenant: false, body: { ids: registrationIds, remark: "02.05-02.07 专项批量通过" } });
    assert(approved.succeeded === 2 && approved.failed === 0, "bulk approve should process two registrations");
    const notified = await api("/admin/registrations/bulk-notify", { method: "POST", token: tenantAdmin.token, tenant: false, body: { ids: registrationIds, title: "活动报名审核通过", content: "{{nickname}}，您的活动报名已通过，请按时到场。" } });
    assert(notified.succeeded === 2 && notified.failed === 0, "bulk notification should process two registrations");
    const tagged = await api("/admin/registrations/bulk-tag", { method: "POST", token: tenantAdmin.token, tenant: false, body: { ids: registrationIds, name: `活动验收用户-${runId.slice(-6)}`, color: "success" } });
    assert(tagged.succeeded === 2 && tagged.failed === 0, "bulk tag should process two registrations");

    const page = await api(`/admin/registrations?activityId=${created.id}&page=1&pageSize=20`, { token: tenantAdmin.token, tenant: false });
    const rows = page.items || page;
    const firstRow = rows.find((item) => item.id === registrationIds[0]);
    const secondRow = rows.find((item) => item.id === registrationIds[1]);
    assert(firstRow?.formSchemaVersion === 1 && firstRow.formSnapshot?.length === 4, "first registration should retain form version 1 snapshot");
    assert(secondRow?.formSchemaVersion === 2 && secondRow.formSnapshot?.length === 5, "second registration should retain form version 2 snapshot");
    assert(firstRow?.privacyConsentAt && firstRow.companions?.length === 1, "privacy consent and companion snapshot should be retained");

    const registrationExport = await workbookEvidence(`/admin/registrations/export?activityId=${created.id}`, tenantAdmin.token, "registrations.xlsx", title);
    for (const id of registrationIds) {
      const checkedIn = await api(`/admin/registrations/${id}/check-in`, { method: "POST", token: tenantAdmin.token, tenant: false, body: { remark: "评价资格专项签到" } });
      assert((checkedIn.registration?.status || checkedIn.status) === "checked_in", `registration ${id} should be checked in`);
    }

    const firstReview = await api(`/public/registrations/${registrationIds[0]}/review`, { method: "POST", token: firstUser.userAccessToken, body: { rating: 5, content: "流程完整，现场体验很好。" } });
    const secondReview = await api(`/public/registrations/${registrationIds[1]}/review`, { method: "POST", token: secondUser.userAccessToken, body: { rating: 4, content: "报名信息清晰，组织有序。" } });
    const firstReport = await api(`/public/reviews/${firstReview.id}/report`, { method: "POST", token: secondUser.userAccessToken, body: { reason: "专项验收举报，实际不成立" } });
    const replayReport = await api(`/public/reviews/${firstReview.id}/report`, { method: "POST", token: secondUser.userAccessToken, body: { reason: "重复举报" } });
    assert(firstReport.report.id === replayReport.report.id && replayReport.idempotent === true, "duplicate review report should be idempotent");
    await expectFailure("禁止举报自己的评价", `/public/reviews/${secondReview.id}/report`, { method: "POST", token: secondUser.userAccessToken, body: { reason: "自己的评价" } }, "不能举报自己的评价");

    const moderated = await api(`/admin/reviews/${firstReview.id}`, { method: "PATCH", token: tenantAdmin.token, tenant: false, body: { status: "visible", adminReply: "感谢参与，欢迎继续关注。", featured: true } });
    assert(moderated.featured === true && moderated.adminReply, "review should be featured and replied to");
    const handledReport = await api(`/admin/review-reports/${firstReport.report.id}`, { method: "PATCH", token: tenantAdmin.token, tenant: false, body: { status: "rejected", resolution: "未发现违规，举报不成立", hideReview: false } });
    assert(handledReport.status === "rejected", "review report should be rejected");
    const publicReviews = await api(`/public/activities/${created.id}/reviews`);
    assert(publicReviews.some((item) => item.id === firstReview.id && item.featured === true && item.adminReply), "public reviews should show featured review and organizer reply");

    const recap = await api(`/admin/activities/${created.id}/recap`, { token: tenantAdmin.token, tenant: false });
    assert(Number(recap.funnel?.registrationCount) === 2, "recap should include two registrations");
    assert(Number(recap.funnel?.checkInCount) === 2, "recap should include two check-ins");
    assert(Number(recap.funnel?.reviewCount) === 2, "recap should include two reviews");
    assert(Number(recap.notifications) >= 2, "recap should include notification delivery records");
    const recapExport = await workbookEvidence(`/admin/activities/${created.id}/recap/export`, tenantAdmin.token, "activity-recap.xlsx", title);

    result.checks.push(
      { name: "动态表单版本和报名快照", status: "passed", versions: [firstRow.formSchemaVersion, secondRow.formSchemaVersion] },
      { name: "批量审核通知标签和名单导出", status: "passed", approved, notified, tagged, registrationExport },
      { name: "评价回复精选举报和复盘", status: "passed", reviewIds: [firstReview.id, secondReview.id], reportId: firstReport.report.id, recapExport }
    );
    result.retained = {
      tenantId: tenant.id,
      activityId: created.id,
      title,
      userPhones: phones,
      registrationIds,
      reviewIds: [firstReview.id, secondReview.id],
      reviewReportId: firstReport.report.id,
      formSchemaVersions: [1, 2],
      exports: [registrationExport, recapExport]
    };
    result.status = "passed";
  } finally {
    if (settingsChanged) {
      await retry("restore tenant registration review setting", () => setTenantPermissions(platform.token, tenant, originalSettings, originalSettings.registrationReviewEnabled ?? false)).catch((error) => {
        result.status = "failed";
        result.checks.push({ name: "恢复租户报名审核配置", status: "failed", error: error.message });
      });
    }
    const restoredTenants = await retry("read restored tenant settings", () => api("/admin/tenants", { token: platform.token, tenant: false })).catch(() => []);
    const restored = restoredTenants.find((item) => item.id === tenant.id);
    result.restored = {
      packagePlan: restored?.settings?.packagePlan || null,
      registrationReviewEnabled: restored?.settings?.registrationReviewEnabled ?? null
    };
    if (restored && result.restored.registrationReviewEnabled !== (originalSettings.registrationReviewEnabled ?? false)) {
      result.status = "failed";
      result.checks.push({ name: "校验租户报名审核配置", status: "failed", expected: originalSettings.registrationReviewEnabled ?? false, actual: result.restored.registrationReviewEnabled });
    }
    result.finishedAt = new Date().toISOString();
    if (result.status === "running") result.status = "failed";
    fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
    console.log(`活动商业闭环验收结果：${path.join(outputDir, "result.json")}`);
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
