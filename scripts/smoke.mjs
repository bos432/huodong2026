const baseUrl = process.env.API_BASE || "http://localhost:3000/api";

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
  if (!res.ok || body?.code !== 0) {
    throw new Error(`${options.method || "GET"} ${path} failed: ${body?.message || text || res.status}`);
  }
  return body.data;
}

async function download(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${options.method || "GET"} ${path} failed: ${text || res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function expectApiFailure(path, options = {}, expectedMessage) {
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
  const message = body?.message || text || String(res.status);
  if (res.ok && body?.code === 0) throw new Error(`${options.method || "GET"} ${path} should have failed`);
  if (expectedMessage && !message.includes(expectedMessage)) {
    throw new Error(`${options.method || "GET"} ${path} failed with unexpected message: ${message}`);
  }
  const expectedRequestId = options.headers?.["X-Request-Id"] || options.headers?.["x-request-id"];
  if (expectedRequestId) {
    assert(res.headers.get("x-request-id") === expectedRequestId, `${options.method || "GET"} ${path} should echo X-Request-Id header`);
    assert(body?.requestId === expectedRequestId, `${options.method || "GET"} ${path} should include requestId in error body`);
  }
  return body;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function futureDate(days, hour = 10) {
  const date = new Date(Date.now() + days * 86400000);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function h5Login(phone, nickname) {
  const code = await api("/public/auth/h5-code", {
    method: "POST",
    body: JSON.stringify({ phone })
  });
  assert(code.verificationToken, "H5 verification token missing");
  const login = await api("/public/auth/h5-login", {
    method: "POST",
    body: JSON.stringify({ phone, nickname, verificationToken: code.verificationToken, verificationCode: code.devCode || "000000" })
  });
  assert(login.userAccessToken, "H5 user access token missing");
  return { ...(login.user || login), userAccessToken: login.userAccessToken, headers: { Authorization: `Bearer ${login.userAccessToken}` } };
}

async function assertH5LoginRequiresVerification(phone) {
  await expectApiFailure(
    "/public/auth/h5-login",
    {
      method: "POST",
      body: JSON.stringify({ phone, nickname: "bad-login", verificationToken: "", verificationCode: "000000" })
    },
    "验证码"
  );
}

async function createSmokeActivity(auth, runId, categoryId) {
  const activity = await api("/admin/activities", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      title: `烟测商业能力活动 ${runId}`,
      coverUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
      description: "用于自动烟测票种、优惠码、支付、会员和运营配置链路。",
      notice: "烟测活动，完成后可由后台下架。",
      location: "烟测活动空间",
      startTime: futureDate(20, 14),
      endTime: futureDate(20, 17),
      registrationDeadline: futureDate(19, 20),
      capacity: 200,
      price: 99,
      status: "open",
      featured: false,
      requireReview: false,
      allowCancel: true,
      categoryId,
      fields: [
        { label: "姓名", type: "text", required: true, sortOrder: 1, options: [] },
        { label: "手机号", type: "phone", required: true, sortOrder: 2, options: [] },
        { label: "备注", type: "remark", required: false, sortOrder: 3, options: [] }
      ],
      hosts: [{ name: "烟测主理人", title: "运营测试", avatarUrl: "", bio: "用于自动化验证。", sortOrder: 1 }],
      sections: [{ type: "highlights", title: "烟测亮点", content: "验证商业化业务闭环。", imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80", sortOrder: 1 }]
    })
  });
  assert(activity.sections?.some((section) => section.imageUrl), "Activity section image should be saved");
  return activity;
}

async function main() {
  console.log(`Smoke target: ${baseUrl}`);
  const runId = Date.now();

  const health = await api("/health");
  assert(health.api === "up", "API health is not up");
  assert(health.database === "up", "Database health is not up");
  assert(typeof health.uptimeSeconds === "number", "API health should include uptime");
  assert(health.release?.version, "API health should include release version");
  assert(health.release?.commit, "API health should include release commit");
  const readiness = await api("/health/ready");
  assert(readiness.ready === true, "API readiness is not ready");
  assert(readiness.release?.version === health.release.version, "API readiness should include release version");
  const requestId = `smoke-${runId}`;
  const metricsRes = await fetch(`${baseUrl}/health/metrics`, { headers: { "X-Request-Id": requestId } });
  const metrics = await metricsRes.text();
  assert(
    metricsRes.ok &&
      metrics.includes("activity_api_up 1") &&
      metrics.includes("activity_database_up 1") &&
      metrics.includes("activity_config_error") &&
      metrics.includes("activity_process_uptime_seconds") &&
      metrics.includes("activity_build_info"),
    "Health metrics missing expected gauges"
  );
  assert(metricsRes.headers.get("x-content-type-options") === "nosniff", "Security header X-Content-Type-Options missing");
  assert(metricsRes.headers.get("x-frame-options") === "DENY", "Security header X-Frame-Options missing");
  assert(metricsRes.headers.get("x-request-id") === requestId, "X-Request-Id should be echoed");
  await expectApiFailure(
    "/public/activities/999999999",
    { headers: { "X-Request-Id": `smoke-error-${runId}` } },
    "活动不存在"
  );
  console.log("OK health");

  const login = await api("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "admin", password: "Admin123456" })
  });
  assert(login.token, "Admin token missing");
  const auth = { Authorization: `Bearer ${login.token}` };
  console.log("OK admin login");

  const adminLoginLogs = await api("/admin/auth/login-logs", { headers: auth });
  assert(adminLoginLogs.items?.some((item) => item.username === "admin" && item.status === "success"), "Admin login success should be audited");
  assert(typeof adminLoginLogs.summary?.success === "number", "Admin login audit summary missing");
  console.log("OK admin login audit logs");

  const configCheck = await api("/admin/system/config-check", { headers: auth });
  assert(configCheck.summary && Array.isArray(configCheck.checks), "Config check result missing");
  assert(configCheck.release?.version && configCheck.release?.commit, "Config check should include release metadata");
  assert(configCheck.checks.some((item) => item.key === "JWT_SECRET"), "Config check should include JWT_SECRET");
  assert(configCheck.checks.some((item) => item.key === "ADMIN_LOGIN_MAX_FAILURES"), "Config check should include admin login rate limits");
  assert(configCheck.checks.some((item) => item.key === "PAYMENT_SANDBOX_ENABLED"), "Config check should include payment sandbox switch");
  console.log(`OK config check (${configCheck.status})`);

  const imageBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
  const uploadForm = new FormData();
  uploadForm.append("file", new Blob([imageBytes], { type: "image/png" }), `smoke-${runId}.png`);
  const uploadRes = await fetch(`${baseUrl}/admin/uploads/images`, { method: "POST", headers: auth, body: uploadForm });
  const uploadBody = await uploadRes.json();
  assert(uploadRes.ok && uploadBody.code === 0 && uploadBody.data.url, "Image upload should return url");
  const uploadedImageRes = await fetch(uploadBody.data.url.startsWith("http") ? uploadBody.data.url : `${baseUrl.replace(/\/api$/, "")}${uploadBody.data.url}`);
  assert(uploadedImageRes.ok, "Uploaded image should be publicly readable");
  console.log("OK image upload");

  const proofForm = new FormData();
  proofForm.append("file", new Blob([Buffer.from("%PDF-1.4\n% smoke settlement proof\n", "utf8")], { type: "application/pdf" }), `smoke-proof-${runId}.pdf`);
  const proofRes = await fetch(`${baseUrl}/admin/uploads/settlement-proofs`, { method: "POST", headers: auth, body: proofForm });
  const proofBody = await proofRes.json();
  assert(proofRes.ok && proofBody.code === 0 && proofBody.data.url, "Settlement proof upload should return url");
  assert(proofBody.data.path?.includes("/uploads/settlement-proofs/"), "Settlement proof upload should return proof path");
  console.log("OK settlement proof upload");

  const smokeAdminName = `smoke_admin_${String(runId).slice(-6)}`;
  const smokeAdmin = await api("/admin/admins", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ username: smokeAdminName, password: `SmokeAdmin${String(runId).slice(-6)}`, role: "super_admin" })
  });
  assert(smokeAdmin.id && smokeAdmin.username === smokeAdminName, "Smoke admin should be created");
  await api(`/admin/admins/${smokeAdmin.id}/password`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ password: `ResetAdmin${String(runId).slice(-6)}` })
  });
  await api(`/admin/admins/${smokeAdmin.id}/status`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ enabled: false })
  });
  await expectApiFailure(
    "/admin/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username: smokeAdminName, password: `ResetAdmin${String(runId).slice(-6)}` })
    },
    "用户名或密码错误"
  );
  const failedLoginLogs = await api("/admin/auth/login-logs", { headers: auth });
  assert(failedLoginLogs.items?.some((item) => item.username === smokeAdminName && item.status === "failed"), "Admin login failure should be audited");
  await api(`/admin/admins/${smokeAdmin.id}/status`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ enabled: true })
  });
  const smokeAdminLogin = await api("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: smokeAdminName, password: `ResetAdmin${String(runId).slice(-6)}` })
  });
  assert(smokeAdminLogin.token, "Re-enabled smoke admin should log in");
  const smokeAdminAuth = { Authorization: `Bearer ${smokeAdminLogin.token}` };
  const changedSmokeAdminPassword = `ChangedAdmin${String(runId).slice(-6)}`;
  await expectApiFailure(
    "/admin/auth/change-password",
    {
      method: "POST",
      headers: smokeAdminAuth,
      body: JSON.stringify({ oldPassword: "WrongAdminPassword1", newPassword: changedSmokeAdminPassword })
    },
    "当前密码不正确"
  );
  const changedAdmin = await api("/admin/auth/change-password", {
    method: "POST",
    headers: smokeAdminAuth,
    body: JSON.stringify({ oldPassword: `ResetAdmin${String(runId).slice(-6)}`, newPassword: changedSmokeAdminPassword })
  });
  assert(changedAdmin.username === smokeAdminName, "Changed password should return current admin");
  await expectApiFailure(
    "/admin/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username: smokeAdminName, password: `ResetAdmin${String(runId).slice(-6)}` })
    },
    "用户名或密码错误"
  );
  const changedAdminLogin = await api("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: smokeAdminName, password: changedSmokeAdminPassword })
  });
  assert(changedAdminLogin.token, "Changed smoke admin password should log in");
  const passwordChangeLogs = await api("/admin/operation-logs", { headers: auth });
  assert(passwordChangeLogs.some((item) => item.action === "admin.password.change" && item.targetId === String(smokeAdmin.id)), "Self password change should be audited");
  await api(`/admin/admins/${smokeAdmin.id}/status`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ enabled: false })
  });
  console.log("OK admin account security");

  async function createRoleAdmin(role) {
    const username = `smoke_${role}_${String(runId).slice(-6)}`;
    const password = `RoleAdmin${String(runId).slice(-6)}Aa`;
    const admin = await api("/admin/admins", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ username, password, role })
    });
    const login = await api("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    assert(login.admin?.role === role, `${role} login should return normalized role`);
    return { admin, headers: { Authorization: `Bearer ${login.token}` } };
  }

  const roleAdmins = [
    await createRoleAdmin("operator"),
    await createRoleAdmin("finance"),
    await createRoleAdmin("checkin_staff"),
    await createRoleAdmin("super_admin")
  ];
  const [operatorAuth, financeAuth, checkInAuth, roleSuperAuth] = roleAdmins.map((item) => item.headers);
  await expectApiFailure("/admin/finance/dashboard", { headers: operatorAuth }, "当前账号无权限");
  await expectApiFailure(
    "/admin/settings/operation",
    {
      method: "POST",
      headers: financeAuth,
      body: JSON.stringify({ offlinePaymentInstructions: "x", refundInstructions: "x" })
    },
    "当前账号无权限"
  );
  await expectApiFailure(
    "/admin/registrations/1/approve",
    {
      method: "POST",
      headers: checkInAuth,
      body: JSON.stringify({})
    },
    "当前账号无权限"
  );
  const financeRegistrations = await api("/admin/registrations", { headers: financeAuth });
  assert(Array.isArray(financeRegistrations.items || financeRegistrations), "Finance should read registrations in readonly mode");
  const checkInActivities = await api("/admin/activities", { headers: checkInAuth });
  assert(Array.isArray(checkInActivities.items || checkInActivities), "Check-in staff should read activities");
  const checkInRegistrations = await api("/admin/registrations", { headers: checkInAuth });
  assert(Array.isArray(checkInRegistrations.items || checkInRegistrations), "Check-in staff should read registrations in readonly mode");
  await expectApiFailure(
    "/admin/activities",
    {
      method: "POST",
      headers: checkInAuth,
      body: JSON.stringify({})
    },
    "当前账号无权限"
  );
  await expectApiFailure(
    "/admin/registrations/1/approve",
    {
      method: "POST",
      headers: financeAuth,
      body: JSON.stringify({})
    },
    "当前账号无权限"
  );
  await expectApiFailure("/admin/registrations/export", { headers: financeAuth }, "当前账号无权限");
  const roleConfigCheck = await api("/admin/system/config-check", { headers: roleSuperAuth });
  assert(roleConfigCheck.summary, "Super admin should access system config check");
  for (const item of roleAdmins) {
    await api(`/admin/admins/${item.admin.id}/status`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ enabled: false })
    });
  }
  console.log("OK admin role permissions");

  const announcements = await api("/public/announcements");
  assert(Array.isArray(announcements), "Announcements should be an array");
  console.log(`OK announcements (${announcements.length})`);

  const tenantForContent = await api("/admin/tenants", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      code: `smoke-content-${String(runId).slice(-8)}`,
      name: `Smoke Content Tenant ${String(runId).slice(-8)}`,
      region: "Smoke",
      contactName: "Smoke Operator",
      contactPhone: "13800000000",
      enabled: true,
      settings: { activityPublishReviewRequired: true, registrationReviewEnabled: true, paymentAccountEditable: true }
    })
  });
  const tenantContentAdminName = `smoke_content_admin_${String(runId).slice(-6)}`;
  const tenantContentPassword = `SmokeContent${String(runId).slice(-6)}`;
  await api("/admin/admins", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ username: tenantContentAdminName, password: tenantContentPassword, role: "super_admin", tenantId: tenantForContent.id })
  });
  const tenantContentLogin = await api("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: tenantContentAdminName, password: tenantContentPassword })
  });
  assert(tenantContentLogin.token && tenantContentLogin.admin?.tenant?.code === tenantForContent.code, "Tenant content admin should log in with tenant scope");
  const tenantContentAuth = { Authorization: `Bearer ${tenantContentLogin.token}` };

  const smokeAnnouncement = await api("/admin/announcements", {
    method: "POST",
    headers: tenantContentAuth,
    body: JSON.stringify({ title: `smoke-announcement-${runId}`, content: "smoke announcement content", type: "notice", enabled: true, pinned: false })
  });
  assert(smokeAnnouncement.id, "Admin announcement create should return id");
  const updatedAnnouncement = await api(`/admin/announcements/${smokeAnnouncement.id}`, {
    method: "PATCH",
    headers: tenantContentAuth,
    body: JSON.stringify({ title: `smoke-announcement-updated-${runId}`, content: "smoke announcement updated", type: "guide", enabled: false, pinned: true })
  });
  assert(updatedAnnouncement.title.includes("updated") && updatedAnnouncement.enabled === false && updatedAnnouncement.pinned === true, "Admin announcement update should persist title/status/pinned");
  const deletedAnnouncement = await api(`/admin/announcements/${smokeAnnouncement.id}`, { method: "DELETE", headers: tenantContentAuth });
  assert(deletedAnnouncement.deleted === true, "Admin announcement delete should return deleted=true");
  console.log("OK announcement admin CRUD");

  const platformAnnouncement = await api("/admin/announcements", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ tenantId: tenantForContent.id, title: `platform-announcement-${runId}`, content: "platform managed announcement", type: "notice", enabled: true, pinned: false })
  });
  assert(platformAnnouncement.id && platformAnnouncement.tenant?.id === tenantForContent.id, "Platform admin announcement create should persist selected tenant");
  const updatedPlatformAnnouncement = await api(`/admin/announcements/${platformAnnouncement.id}`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({ tenantId: tenantForContent.id, title: `platform-announcement-updated-${runId}`, content: "platform managed announcement updated", type: "guide", enabled: false, pinned: true })
  });
  assert(updatedPlatformAnnouncement.title.includes("updated") && updatedPlatformAnnouncement.tenant?.id === tenantForContent.id, "Platform admin announcement update should persist selected tenant");
  const deletedPlatformAnnouncement = await api(`/admin/announcements/${platformAnnouncement.id}`, { method: "DELETE", headers: auth });
  assert(deletedPlatformAnnouncement.deleted === true, "Platform admin announcement delete should return deleted=true");
  console.log("OK platform admin announcement CRUD");

  const categories = await api("/public/categories");
  assert(Array.isArray(categories), "Categories should be an array");
  console.log(`OK categories (${categories.length})`);

  const smokeCategory = await api("/admin/categories", {
    method: "POST",
    headers: tenantContentAuth,
    body: JSON.stringify({ name: `smoke-category-${runId}`, sortOrder: 999, enabled: true })
  });
  assert(smokeCategory.id, "Admin category create should return id");
  const updatedCategory = await api(`/admin/categories/${smokeCategory.id}`, {
    method: "PATCH",
    headers: tenantContentAuth,
    body: JSON.stringify({ name: `smoke-category-updated-${runId}`, sortOrder: 1000, enabled: true })
  });
  assert(updatedCategory.name.includes("updated") && Number(updatedCategory.sortOrder) === 1000, "Admin category update should persist name and sort");
  const disabledCategory = await api(`/admin/categories/${smokeCategory.id}/disable`, { method: "POST", headers: tenantContentAuth, body: JSON.stringify({}) });
  assert(disabledCategory.enabled === false, "Admin category disable should set enabled=false");
  console.log("OK category admin create/update/disable");

  const homepageSection = await api("/admin/homepage/sections?pageKey=home", {
    method: "POST",
    headers: tenantContentAuth,
    body: JSON.stringify({
      type: "rich_text",
      title: `smoke-homepage-section-${runId}`,
      subtitle: "smoke homepage subtitle",
      enabled: true,
      sortOrder: 999,
      config: { content: "smoke homepage content", link: "/pages/activity/list" },
      layout: { spacingBottom: 12, borderRadius: 8 }
    })
  });
  assert(homepageSection.id, "Homepage section create should return id");
  const updatedHomepageSection = await api(`/admin/homepage/sections/${homepageSection.id}?pageKey=home`, {
    method: "PATCH",
    headers: tenantContentAuth,
    body: JSON.stringify({
      type: "rich_text",
      title: `smoke-homepage-section-updated-${runId}`,
      subtitle: "smoke homepage subtitle updated",
      enabled: false,
      sortOrder: 1000,
      config: { content: "smoke homepage updated content", link: "/pages/announcement/list" },
      layout: { spacingBottom: 16, borderRadius: 6 }
    })
  });
  assert(updatedHomepageSection.title.includes("updated") && updatedHomepageSection.enabled === false, "Homepage section update should persist title/status");
  const reorderedHomepageSections = await api("/admin/homepage/sections/reorder?pageKey=home", {
    method: "PUT",
    headers: tenantContentAuth,
    body: JSON.stringify({ items: [{ id: homepageSection.id, sortOrder: 10 }] })
  });
  assert(reorderedHomepageSections.some((item) => item.id === homepageSection.id && Number(item.sortOrder) === 10), "Homepage section reorder should persist sort order");
  const deletedHomepageSection = await api(`/admin/homepage/sections/${homepageSection.id}?pageKey=home`, { method: "DELETE", headers: tenantContentAuth });
  assert(deletedHomepageSection.deleted === true, "Homepage section delete should return deleted=true");
  console.log("OK homepage section admin create/update/reorder/delete");

  const activities = await api("/public/activities");
  assert(Array.isArray(activities), "Activities should be an array");
  assert(activities.length > 0, "At least one open activity is required for smoke test");
  console.log(`OK activities (${activities.length})`);
  const commerceActivity = await createSmokeActivity(auth, runId, categories[0]?.id);

  const enhanced = await api(`/public/activities/${activities[0].id}/enhanced`);
  assert(enhanced.id === activities[0].id, "Enhanced activity id mismatch");
  assert(Array.isArray(enhanced.sections), "Enhanced activity sections missing");
  assert(Array.isArray(enhanced.hosts), "Enhanced activity hosts missing");
  console.log(`OK enhanced activity (${enhanced.sections.length} sections, ${enhanced.hosts.length} hosts)`);

  await assertH5LoginRequiresVerification(`139${String(runId).slice(-8)}`);
  console.log("OK H5 verification guard");

  const user = await h5Login(`139${String(runId).slice(-8)}`, "smoke-user");
  const h5CodeLogs = await api("/admin/auth/h5-code-logs", {
    headers: auth,
    method: "GET"
  });
  assert(h5CodeLogs.items?.some((item) => item.phone === `139${String(runId).slice(-8)}` && item.status === "sent"), "H5 code audit log missing");
  assert(typeof h5CodeLogs.summary?.sent === "number", "H5 code audit summary missing");
  console.log("OK H5 code audit logs");

  const poster = await api(`/public/activities/${activities[0].id}/share-poster`, {
    method: "POST",
    headers: user.headers,
    body: JSON.stringify({})
  });
  assert(poster.code, "Invite code missing");
  await api(`/public/activities/${activities[0].id}/track-share`, {
    method: "POST",
    body: JSON.stringify({ code: poster.code, userId: user.id, source: "smoke", scene: "api_smoke" })
  });
  console.log("OK share poster and tracking");

  const dashboard = await api("/admin/dashboard", { headers: auth });
  assert(dashboard.totals, "Dashboard totals missing");
  console.log("OK admin dashboard");

  const finance = await api("/admin/finance/dashboard", { headers: auth });
  assert(finance.totals, "Finance dashboard totals missing");
  assert(Array.isArray(finance.recentTransactions), "Finance transactions missing");
  console.log("OK finance dashboard");

  const operationSetting = await api("/admin/settings/operation", { headers: auth });
  assert(operationSetting.offlinePaymentInstructions, "Operation setting should include offline payment instructions");
  const updatedSetting = await api("/admin/settings/operation", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      registrationEnabled: true,
      registrationDisabledMessage: `烟测暂停报名提示 ${runId}`,
      offlinePaymentInstructions: `烟测线下付款说明 ${runId}`,
      customerServiceName: "烟测客服",
      customerServicePhone: "13800000000",
      customerServiceWechat: `smoke_service_${String(runId).slice(-4)}`,
      defaultGroupQrCodeUrl: `https://example.com/smoke-group-${runId}.png`,
      pageTheme: {
        primaryColor: "#0f766e",
        textColor: "#111827",
        mutedColor: "#667085",
        backgroundColor: "#f4f6f8",
        backgroundOverlayColor: "#f4f6f8",
        backgroundOverlayOpacity: 0,
        cardBackgroundColor: "#ffffff",
        cardOpacity: 96,
        cardRadius: 8
      },
      refundInstructions: "烟测退款说明",
      invoiceInstructions: "烟测发票说明"
    })
  });
  assert(updatedSetting.offlinePaymentInstructions.includes(String(runId)), "Operation setting should be updateable");
  assert(updatedSetting.registrationEnabled === true, "Operation setting should keep registration enabled");
  assert(updatedSetting.registrationDisabledMessage.includes(String(runId)), "Operation setting should store registration disabled message");
  assert(updatedSetting.pageTheme?.primaryColor === "#0f766e", "Operation setting should store page theme");
  const publicSetting = await api("/public/settings/operation");
  assert(publicSetting.customerServiceName === "烟测客服", "Public operation setting should include customer service name");
  assert(publicSetting.customerServiceWechat === `smoke_service_${String(runId).slice(-4)}`, "Public operation setting should include customer service wechat");
  assert(publicSetting.refundInstructions === "烟测退款说明", "Public operation setting should include refund instructions");
  assert(publicSetting.invoiceInstructions === "烟测发票说明", "Public operation setting should include invoice instructions");
  assert(publicSetting.pageTheme?.primaryColor === "#0f766e", "Public operation setting should include page theme");
  assert(!Object.prototype.hasOwnProperty.call(publicSetting, "defaultGroupQrCodeUrl"), "Public operation setting should not expose default group QR code");
  const pausedSetting = await api("/admin/settings/operation", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      ...updatedSetting,
      registrationEnabled: false,
      registrationDisabledMessage: `烟测暂停报名提示 ${runId}`
    })
  });
  assert(pausedSetting.registrationEnabled === false, "Operation setting should pause registrations");
  const pausedDetail = await api(`/public/activities/${commerceActivity.id}`);
  await expectApiFailure(
    `/public/activities/${commerceActivity.id}/register`,
    {
      method: "POST",
      headers: user.headers,
      body: JSON.stringify({
        answers: pausedDetail.fields.map((field) => ({ fieldId: field.id, label: field.label, type: field.type, value: field.type === "multiple_choice" ? [] : `暂停${field.label}` }))
      })
    },
    `烟测暂停报名提示 ${runId}`
  );
  await api("/admin/settings/operation", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      ...updatedSetting,
      registrationEnabled: true
    })
  });
  const settingLogs = await api("/admin/operation-logs", { headers: auth });
  assert(settingLogs.some((item) => item.action === "settings.operation.update"), "Operation setting update should be audited");
  console.log("OK operation settings");

  const funnel = await api(`/admin/activities/${activities[0].id}/funnel`, { headers: auth });
  assert(funnel.funnel, "Activity funnel missing");
  assert(Array.isArray(funnel.topInvites), "Top invites missing");
  console.log("OK activity funnel");

  const ticket = await api("/admin/ticket-types", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      activityId: commerceActivity.id,
      name: `烟测票种 ${runId}`,
      price: 88,
      capacity: 20,
      enabled: true
    })
  });
  assert(ticket.id, "Ticket type id missing");
  const coupon = await api("/admin/coupons", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      code: `SMOKE${String(runId).slice(-6)}`,
      name: "烟测优惠码",
      discountType: "fixed",
      discountValue: 18,
      minAmount: 50,
      usageLimit: 5,
      activityId: commerceActivity.id,
      enabled: true
    })
  });
  assert(coupon.id, "Coupon id missing");
  const quote = await api(`/public/activities/${commerceActivity.id}/quote`, {
    method: "POST",
    headers: user.headers,
    body: JSON.stringify({ ticketTypeId: ticket.id, couponCode: coupon.code })
  });
  assert(quote.originalAmount === "88.00", "Quote original amount mismatch");
  assert(quote.discountAmount === "18.00", "Quote discount amount mismatch");
  assert(quote.payableAmount === "70.00", "Quote payable amount mismatch");
  const detail = await api(`/public/activities/${commerceActivity.id}`);
  assert(detail.ticketTypes.some((item) => item.id === ticket.id), "Ticket type missing from public detail");
  const registration = await api(`/public/activities/${commerceActivity.id}/register`, {
    method: "POST",
    headers: user.headers,
    body: JSON.stringify({
      ticketTypeId: ticket.id,
      couponCode: coupon.code,
      answers: detail.fields.map((field) => ({ fieldId: field.id, label: field.label, type: field.type, value: field.type === "multiple_choice" ? [] : `烟测${field.label}` }))
    })
  });
  assert(registration.order.amount === "70.00", "Discounted order amount mismatch");
  assert(registration.registration.status === "pending_payment", "Discounted paid registration should wait for payment");
  const registrationDetail = await api(`/public/me/registrations/${registration.registration.id}`, { headers: user.headers });
  assert(registrationDetail.operationSetting.offlinePaymentInstructions.includes(String(runId)), "Registration detail should include operation settings");
  const mockPay = await api(`/public/orders/${registration.order.id}/pay/mock`, {
    method: "POST",
    headers: user.headers,
    body: JSON.stringify({ transactionNo: `SMOKETX${runId}` })
  });
  assert(mockPay.order.status === "paid", "Mock payment did not mark order paid");
  const mockPayAgain = await api(`/payment/mock/callback`, {
    method: "POST",
    body: JSON.stringify({ orderNo: registration.order.orderNo, transactionNo: `SMOKETX${runId}`, amount: 70, provider: "mock" })
  });
  assert(mockPayAgain.idempotent, "Duplicate payment callback should be idempotent");
  await expectApiFailure(
    `/payment/mock/callback`,
    {
      method: "POST",
      body: JSON.stringify({ orderNo: registration.order.orderNo, transactionNo: `SMOKEBADTX${runId}`, amount: 1, provider: "mock" })
    },
    "对账差异"
  );
  const reconciliationScan = await api("/admin/finance/reconciliation/scan", { method: "POST", headers: auth });
  assert(reconciliationScan.scannedCount > 0, "Payment reconciliation scan should inspect transactions");
  const financeAfterMismatch = await api("/admin/finance/dashboard", { headers: auth });
  const mismatch = financeAfterMismatch.reconciliationItems.find((item) => item.transactionNo === `SMOKEBADTX${runId}`);
  assert(mismatch && mismatch.reconciliationStatus === "pending", "Mismatched callback should create pending reconciliation item");
  const resolvedMismatch = await api(`/admin/finance/transactions/${mismatch.id}/resolve`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ remark: "烟测已核对异常回调" })
  });
  assert(resolvedMismatch.reconciliationStatus === "resolved", "Reconciliation item should be resolvable");
  const statementImport = await api("/admin/finance/statements/import", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      provider: "wechat",
      batchNo: `SMOKESTMTBATCH${runId}`,
      items: [
        {
          transactionNo: `SMOKESTMT${runId}`,
          orderNo: registration.order.orderNo,
          amount: 70,
          tradeType: "NATIVE",
          providerStatus: "SUCCESS",
          tradedAt: new Date().toISOString(),
          raw: { source: "smoke" }
        }
      ]
    })
  });
  assert(statementImport.matchedCount === 1 && statementImport.pendingCount === 0, "Payment statement import should match the paid smoke order");
  const financeAfterStatement = await api("/admin/finance/dashboard", { headers: auth });
  const statementRecord = financeAfterStatement.statementRecords.find((item) => item.transactionNo === `SMOKESTMT${runId}`);
  assert(statementRecord && statementRecord.reconciliationStatus === "matched", "Payment statement should appear in finance dashboard");

  const wechatUser = await h5Login(`135${String(runId).slice(-8)}`, "wechat-smoke-user");
  const wechatRegistration = await api(`/public/activities/${commerceActivity.id}/register`, {
    method: "POST",
    headers: wechatUser.headers,
    body: JSON.stringify({
      ticketTypeId: ticket.id,
      answers: detail.fields.map((field) => ({ fieldId: field.id, label: field.label, type: field.type, value: field.type === "multiple_choice" ? [] : `微信${field.label}` }))
    })
  });
  const wechatPay = await api(`/public/orders/${wechatRegistration.order.id}/pay/wechat`, {
    method: "POST",
    headers: wechatUser.headers,
    body: JSON.stringify({ transactionNo: `WECHATTX${runId}` })
  });
  assert(wechatPay.provider === "wechat" && wechatPay.sign, "Wechat sandbox pay params should include signature");
  await expectApiFailure(
    "/payment/wechat/callback",
    {
      method: "POST",
      body: JSON.stringify({ ...wechatPay.payParams, amount: Number(wechatPay.amount), sign: "bad-signature" })
    },
    "签名"
  );
  const wechatPaid = await api("/payment/wechat/callback", {
    method: "POST",
    body: JSON.stringify({ ...wechatPay.payParams, amount: Number(wechatPay.amount) })
  });
  assert(wechatPaid.order.status === "paid", "Wechat signed callback should mark order paid");
  assert(wechatPaid.order.paymentMethod === "wechat", "Wechat callback should store payment method");
  const wechatPaidAgain = await api("/payment/wechat/callback", {
    method: "POST",
    body: JSON.stringify({ ...wechatPay.payParams, amount: Number(wechatPay.amount) })
  });
  assert(wechatPaidAgain.idempotent, "Duplicate wechat callback should be idempotent");
  const callbackFinance = await api("/admin/finance/dashboard", { headers: auth });
  const badWechatCallback = callbackFinance.callbackLogs.find((item) => item.transactionNo === `WECHATTX${runId}` && item.signatureValid === false);
  const okWechatCallback = callbackFinance.callbackLogs.find((item) => item.transactionNo === `WECHATTX${runId}` && item.resultStatus === "success");
  const idempotentWechatCallback = callbackFinance.callbackLogs.find((item) => item.transactionNo === `WECHATTX${runId}` && item.resultStatus === "idempotent");
  assert(badWechatCallback && okWechatCallback && idempotentWechatCallback, "Wechat callbacks should be auditable");

  const alipayUser = await h5Login(`134${String(runId).slice(-8)}`, "alipay-smoke-user");
  const alipayRegistration = await api(`/public/activities/${commerceActivity.id}/register`, {
    method: "POST",
    headers: alipayUser.headers,
    body: JSON.stringify({
      ticketTypeId: ticket.id,
      answers: detail.fields.map((field) => ({ fieldId: field.id, label: field.label, type: field.type, value: field.type === "multiple_choice" ? [] : `支付宝${field.label}` }))
    })
  });
  await expectApiFailure(
    `/public/orders/${alipayRegistration.order.id}/pay/alipay`,
    {
      method: "POST",
      headers: alipayUser.headers,
      body: JSON.stringify({ transactionNo: `ALIPAYTX${runId}` })
    },
    "支付宝本次上线未开放"
  );

  const balanceUser = await h5Login(`133${String(runId).slice(-8)}`, "balance-smoke-user");
  const balanceRegistration = await api(`/public/activities/${commerceActivity.id}/register`, {
    method: "POST",
    headers: balanceUser.headers,
    body: JSON.stringify({
      ticketTypeId: ticket.id,
      answers: detail.fields.map((field) => ({ fieldId: field.id, label: field.label, type: field.type, value: field.type === "multiple_choice" ? [] : `余额${field.label}` }))
    })
  });
  await expectApiFailure(
    `/public/orders/${balanceRegistration.order.id}/pay/balance`,
    { method: "POST", headers: balanceUser.headers },
    "余额不足"
  );
  const walletTopUp = await api(`/admin/users/${balanceUser.id}/wallet/adjust`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ amount: 120, type: "recharge", remark: "smoke balance top-up" })
  });
  assert(Number(walletTopUp.wallet.availableBalance) >= 120, "Wallet recharge should increase available balance");
  const balancePaid = await api(`/public/orders/${balanceRegistration.order.id}/pay/balance`, {
    method: "POST",
    headers: balanceUser.headers
  });
  assert(balancePaid.order.status === "paid", "Balance payment should mark order paid");
  assert(balancePaid.order.paymentMethod === "balance", "Balance payment should store payment method");
  assert(balancePaid.walletTransaction?.type === "balance_pay", "Balance payment should create wallet transaction");
  const balanceWallet = await api("/public/me/wallet", { headers: balanceUser.headers });
  assert(Number(balanceWallet.availableBalance).toFixed(2) === (120 - Number(balanceRegistration.order.amount)).toFixed(2), "Balance wallet should deduct paid amount");
  const balanceTransactions = await api(`/admin/finance/wallet-transactions?userId=${balanceUser.id}`, { headers: auth });
  assert(balanceTransactions.some((item) => item.type === "admin_recharge"), "Wallet recharge transaction missing");
  assert(balanceTransactions.some((item) => item.type === "balance_pay" && item.order?.id === balanceRegistration.order.id), "Balance payment transaction missing");

  const refund = await api(`/admin/orders/${registration.order.id}/refund`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ amount: 20, reason: "烟测部分退款", refundNo: `SMOKERF${runId}` })
  });
  assert(refund.refund.status === "pending", "Refund request should wait for finance review");
  assert(refund.order.status === "paid", "Pending refund should not update order status");
  const refundAgain = await api(`/admin/orders/${registration.order.id}/refund`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ amount: 20, reason: "烟测重复退款", refundNo: `SMOKERF${runId}` })
  });
  assert(refundAgain.idempotent, "Duplicate refund should be idempotent");
  const approvedRefund = await api(`/admin/refunds/${refund.refund.id}/approve`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ remark: "烟测同意退款" })
  });
  assert(approvedRefund.refund.status === "completed", "Approved refund should be completed");
  assert(approvedRefund.order.status === "partially_refunded", "Approved partial refund should update order status");
  const operationLogs = await api("/admin/operation-logs", { headers: auth });
  assert(operationLogs.some((item) => item.action === "activity.create" && item.targetId === String(commerceActivity.id)), "Activity creation should be audited");
  assert(operationLogs.some((item) => item.action === "refund.request" && item.targetId === String(refund.refund.id)), "Refund request should be audited");
  assert(operationLogs.some((item) => item.action === "refund.approve" && item.targetId === String(refund.refund.id)), "Refund approval should be audited");

  const levels = await api("/admin/member-levels", { headers: auth });
  assert(Array.isArray(levels) && levels.length >= 3, "Member levels should be seeded");
  const smokeLevel = await api("/admin/member-levels", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: `烟测会员价 ${runId}`,
      minPoints: 45,
      discountRate: 0.9,
      priorityBooking: true,
      enabled: true,
      sortOrder: 99
    })
  });
  assert(smokeLevel.id, "Smoke member level id missing");
  const members = await api("/admin/members", { headers: auth });
  assert(Array.isArray(members), "Members should be an array");
  const member = await api(`/admin/members/${user.id}`, { headers: auth });
  assert(member.profile, "Member profile missing");
  assert(member.profile.level, "Member level should be refreshed after points");
  assert(Array.isArray(member.points), "Member point logs missing");
  assert(member.points.some((item) => item.sourceType === "order_paid"), "Paid order points should be recorded");
  assert(member.points.some((item) => item.sourceType === "order_refund"), "Refund points should be recorded");
  const memberActivity = await createSmokeActivity(auth, `${runId}-member`, categories[0]?.id);
  const memberTicket = await api("/admin/ticket-types", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      activityId: memberActivity.id,
      name: `烟测会员票 ${runId}`,
      price: 100,
      enabled: true
    })
  });
  const memberQuote = await api(`/public/activities/${memberActivity.id}/quote`, {
    method: "POST",
    headers: user.headers,
    body: JSON.stringify({ ticketTypeId: memberTicket.id })
  });
  assert(memberQuote.memberLevel, "Quote should include member level");
  assert(memberQuote.memberDiscountAmount === "10.00", "Member discount amount mismatch");
  assert(memberQuote.payableAmount === "90.00", "Member payable amount mismatch");
  const memberActivityDetail = await api(`/public/activities/${memberActivity.id}`);
  const memberRegistration = await api(`/public/activities/${memberActivity.id}/register`, {
    method: "POST",
    headers: user.headers,
    body: JSON.stringify({
      ticketTypeId: memberTicket.id,
      answers: memberActivityDetail.fields.map((field) => ({ fieldId: field.id, label: field.label, type: field.type, value: field.type === "multiple_choice" ? [] : `会员烟测${field.label}` }))
    })
  });
  assert(memberRegistration.order.memberLevel, "Order should store member level");
  assert(memberRegistration.order.memberDiscountAmount === "10.00", "Order member discount mismatch");
  assert(memberRegistration.order.amount === "90.00", "Member discounted order amount mismatch");
  const pointsUser = await h5Login(`137${String(runId).slice(-8)}`, "points-smoke-user");
  await api("/admin/member-levels", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: `积分烟测等级 ${runId}`,
      minPoints: 1,
      discountRate: 1,
      priorityBooking: false,
      enabled: true,
      sortOrder: 100
    })
  });
  const pointsTicketA = await api("/admin/ticket-types", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ activityId: memberActivity.id, name: `积分积累票 ${runId}`, price: 100, enabled: true })
  });
  const pointsDetail = await api(`/public/activities/${memberActivity.id}`);
  const pointsRegA = await api(`/public/activities/${memberActivity.id}/register`, {
    method: "POST",
    headers: pointsUser.headers,
    body: JSON.stringify({
      ticketTypeId: pointsTicketA.id,
      answers: pointsDetail.fields.map((field) => ({ fieldId: field.id, label: field.label, type: field.type, value: field.type === "multiple_choice" ? [] : `积分${field.label}` }))
    })
  });
  await api(`/public/orders/${pointsRegA.order.id}/pay/mock`, {
    method: "POST",
    headers: pointsUser.headers,
    body: JSON.stringify({ transactionNo: `POINTTX${runId}` })
  });
  const pointsMember = await api(`/admin/members/${pointsUser.id}`, { headers: auth });
  assert(pointsMember.profile.points >= 100, "Points user should have earned points");
  const redeemPoints = Math.min(500, Math.floor(pointsMember.profile.points / 100) * 100);
  assert(redeemPoints >= 100, "Points user should have redeemable points");
  const pointsActivity = await createSmokeActivity(auth, `${runId}-points`, categories[0]?.id);
  const pointsTicketB = await api("/admin/ticket-types", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ activityId: pointsActivity.id, name: `积分抵扣票 ${runId}`, price: 60, enabled: true })
  });
  const pointsQuote = await api(`/public/activities/${pointsActivity.id}/quote`, {
    method: "POST",
    headers: pointsUser.headers,
    body: JSON.stringify({ ticketTypeId: pointsTicketB.id, pointsToUse: redeemPoints })
  });
  assert(pointsQuote.pointsUsed === redeemPoints, "Quote should use requested points");
  const expectedPointsDiscount = (redeemPoints / 100).toFixed(2);
  assert(pointsQuote.pointsDiscountAmount === expectedPointsDiscount, "Points discount amount mismatch");
  const pointsActivityDetail = await api(`/public/activities/${pointsActivity.id}`);
  const pointsRegB = await api(`/public/activities/${pointsActivity.id}/register`, {
    method: "POST",
    headers: pointsUser.headers,
    body: JSON.stringify({
      ticketTypeId: pointsTicketB.id,
      pointsToUse: redeemPoints,
      answers: pointsActivityDetail.fields.map((field) => ({ fieldId: field.id, label: field.label, type: field.type, value: field.type === "multiple_choice" ? [] : `抵扣${field.label}` }))
    })
  });
  assert(pointsRegB.order.pointsUsed === redeemPoints, "Order should store used points");
  assert(pointsRegB.order.pointsDiscountAmount === expectedPointsDiscount, "Order points discount mismatch");
  await api(`/public/me/registrations/${pointsRegB.registration.id}/cancel`, { method: "POST", headers: pointsUser.headers });
  const pointsAfterCancel = await api(`/admin/members/${pointsUser.id}`, { headers: auth });
  assert(pointsAfterCancel.points.some((item) => item.sourceType === "points_redeem"), "Points redeem log missing");
  assert(pointsAfterCancel.points.some((item) => item.sourceType === "points_return"), "Points return log missing");
  const exclusiveActivity = await api("/admin/activities", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      title: `会员专属烟测活动 ${runId}`,
      coverUrl: "",
      description: "用于验证会员专属活动门槛、前台提示和报名拦截。",
      notice: "仅满足会员等级门槛的用户可以报名。",
      location: "本地烟测空间",
      startTime: new Date(Date.now() + 15 * 86400000).toISOString(),
      endTime: new Date(Date.now() + 15 * 86400000 + 7200000).toISOString(),
      registrationDeadline: new Date(Date.now() + 14 * 86400000).toISOString(),
      capacity: 20,
      price: 0,
      status: "open",
      featured: false,
      requireReview: false,
      allowCancel: true,
      categoryId: categories[0]?.id,
      minMemberLevelId: smokeLevel.id,
      fields: [
        { label: "姓名", type: "text", required: true, sortOrder: 1, options: [] },
        { label: "手机号", type: "phone", required: true, sortOrder: 2, options: [] }
      ],
      hosts: [],
      sections: []
    })
  });
  assert(exclusiveActivity.minMemberLevel?.id === smokeLevel.id, "Exclusive activity should store minimum member level");
  const lowUser = await h5Login(`136${String(runId).slice(-8)}`, "low-level-smoke-user");
  const blockedDetail = await api(`/public/activities/${exclusiveActivity.id}`, { headers: lowUser.headers });
  assert(blockedDetail.memberAccess?.eligible === false, "Low level user should be marked ineligible");
  await expectApiFailure(
    `/public/activities/${exclusiveActivity.id}/register`,
    {
      method: "POST",
      headers: lowUser.headers,
      body: JSON.stringify({
        answers: blockedDetail.fields.map((field) => ({ fieldId: field.id, label: field.label, type: field.type, value: `低等级${field.label}` }))
      })
    },
    smokeLevel.name
  );
  const eligibleDetail = await api(`/public/activities/${exclusiveActivity.id}`, { headers: user.headers });
  assert(eligibleDetail.memberAccess?.eligible === true, "Eligible member should pass access snapshot");
  const exclusiveRegistration = await api(`/public/activities/${exclusiveActivity.id}/register`, {
    method: "POST",
    headers: user.headers,
    body: JSON.stringify({
      answers: eligibleDetail.fields.map((field) => ({ fieldId: field.id, label: field.label, type: field.type, value: `会员专属${field.label}` }))
    })
  });
  assert(exclusiveRegistration.registration.status === "approved", "Eligible member exclusive registration should be approved");

  const priorityActivity = await api("/admin/activities", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      title: `优先报名烟测活动 ${runId}`,
      coverUrl: "",
      description: "用于验证优先报名窗口内的会员优先资格和普通用户拦截。",
      notice: "优先报名截止后普通用户可报名。",
      location: "本地烟测空间",
      startTime: new Date(Date.now() + 18 * 86400000).toISOString(),
      endTime: new Date(Date.now() + 18 * 86400000 + 7200000).toISOString(),
      registrationDeadline: new Date(Date.now() + 17 * 86400000).toISOString(),
      priorityMemberLevelId: smokeLevel.id,
      priorityRegistrationEndsAt: new Date(Date.now() + 16 * 86400000).toISOString(),
      capacity: 20,
      price: 0,
      status: "open",
      featured: false,
      requireReview: false,
      allowCancel: true,
      categoryId: categories[0]?.id,
      fields: [
        { label: "姓名", type: "text", required: true, sortOrder: 1, options: [] },
        { label: "手机号", type: "phone", required: true, sortOrder: 2, options: [] }
      ],
      hosts: [],
      sections: []
    })
  });
  assert(priorityActivity.priorityMemberLevel?.id === smokeLevel.id, "Priority activity should store priority member level");
  const priorityBlockedDetail = await api(`/public/activities/${priorityActivity.id}`, { headers: lowUser.headers });
  assert(priorityBlockedDetail.memberAccess?.priorityActive === true, "Priority booking should be active");
  assert(priorityBlockedDetail.memberAccess?.eligible === false, "Low level user should be blocked during priority window");
  await expectApiFailure(
    `/public/activities/${priorityActivity.id}/register`,
    {
      method: "POST",
      headers: lowUser.headers,
      body: JSON.stringify({
        answers: priorityBlockedDetail.fields.map((field) => ({ fieldId: field.id, label: field.label, type: field.type, value: `优先拦截${field.label}` }))
      })
    },
    "优先报名"
  );
  const priorityEligibleDetail = await api(`/public/activities/${priorityActivity.id}`, { headers: user.headers });
  assert(priorityEligibleDetail.memberAccess?.eligible === true, "Eligible member should pass priority booking snapshot");
  const priorityRegistration = await api(`/public/activities/${priorityActivity.id}/register`, {
    method: "POST",
    headers: user.headers,
    body: JSON.stringify({
      answers: priorityEligibleDetail.fields.map((field) => ({ fieldId: field.id, label: field.label, type: field.type, value: `优先报名${field.label}` }))
    })
  });
  assert(priorityRegistration.registration.status === "approved", "Eligible priority registration should be approved");
  console.log("OK ticket, coupon, mock payment, refund and member pricing");
  console.log("OK member levels, profiles, points, redemption, exclusive access and priority booking");

  const templates = await api("/admin/notification-templates", { headers: auth });
  assert(Array.isArray(templates), "Notification templates should be an array");
  const providers = await api("/admin/notification-providers", { headers: auth });
  assert(Array.isArray(providers), "Notification providers should be an array");
  assert(providers.some((item) => item.channel === "site" && item.ready), "Site notification provider should be ready");
  console.log("OK notification providers");

  const template = await api("/admin/notification-templates", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: `Smoke test ${runId}`,
      channel: "site",
      title: "烟测通知：{{activityTitle}}",
      content: "{{userName}}，这是一条本地烟测通知，活动地点：{{location}}。",
      enabled: true
    })
  });
  assert(template.id, "Created notification template id missing");

  const preview = await api("/admin/notifications/preview", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      templateId: template.id,
      activityId: commerceActivity.id,
      userId: user.id
    })
  });
  assert(preview.title.includes(commerceActivity.title), "Notification preview title was not rendered");
  assert(!preview.content.includes("{{"), "Notification preview content still contains raw variables");
  console.log("OK notification preview");

  const notification = await api("/admin/notifications/send", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      templateId: template.id,
      activityId: commerceActivity.id,
      userId: user.id,
      remark: "smoke"
    })
  });
  assert(notification.id, "Notification id missing");
  assert(notification.status === "sent", "Notification should be sent by mock provider");
  assert(notification.provider, "Notification provider missing");
  console.log("OK notification templates and sending");

  const failedNotification = await api("/admin/notifications/send", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      activityId: commerceActivity.id,
      userId: user.id,
      channel: "site",
      title: "[fail] 烟测失败通知",
      content: "这条通知用于验证失败和重试状态。",
      remark: "smoke failure"
    })
  });
  assert(failedNotification.status === "failed", "Forced notification should fail");
  assert(failedNotification.errorMessage, "Failed notification should include error message");
  const retry = await api(`/admin/notifications/${failedNotification.id}/retry`, {
    method: "POST",
    headers: auth
  });
  assert(retry.status === "failed", "Forced retry should keep failed status");
  assert(retry.retryCount >= 1, "Retry count should increase");
  console.log("OK notification failure and retry");

  const reminder = await api(`/admin/activities/${commerceActivity.id}/reminders/send`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      templateId: template.id,
      remark: "smoke reminder"
    })
  });
  assert(typeof reminder.sentCount === "number", "Activity reminder sent count missing");
  console.log(`OK activity reminders (${reminder.sentCount})`);

  const schedule = await api("/admin/notification-schedules", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      activityId: commerceActivity.id,
      templateId: template.id,
      name: `Smoke schedule ${runId}`,
      channel: "site",
      beforeHours: 99999,
      enabled: true,
      remark: "smoke schedule"
    })
  });
  assert(schedule.id, "Notification schedule id missing");
  const runDue = await api("/admin/notification-schedules/run-due", {
    method: "POST",
    headers: auth
  });
  assert(runDue.dueCount >= 1, "Due notification schedule was not executed");
  assert(runDue.results.some((item) => item.scheduleId === schedule.id), "Created notification schedule result missing");
  console.log("OK notification schedules");

  const recap = await api(`/admin/activities/${commerceActivity.id}/recap`, { headers: auth });
  assert(recap.funnel, "Activity recap funnel missing");
  assert(recap.reviewSummary, "Activity recap review summary missing");
  console.log("OK activity recap");

  const recapExport = await download(`/admin/activities/${commerceActivity.id}/recap/export`, { headers: auth });
  assert(recapExport.length > 1000, "Activity recap export file is too small");
  console.log("OK activity recap export");

  const ordersExport = await download("/admin/orders/export", { headers: auth });
  assert(ordersExport.length > 1000, "Orders export file is too small");
  const registrationsExport = await download("/admin/registrations/export", { headers: auth });
  assert(registrationsExport.length > 1000, "Registrations export file is too small");
  const financeExport = await download("/admin/finance/export", { headers: auth });
  assert(financeExport.length > 1000, "Finance export file is too small");
  console.log("OK registration, orders and finance exports");

  console.log("\nSmoke test passed.");
}

main().catch((error) => {
  console.error("\nSmoke test failed:");
  console.error(error.message);
  process.exitCode = 1;
});
