const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const playwrightRunnerDir = path.resolve(process.env.PLAYWRIGHT_RUNNER_DIR || path.join(repoRoot, ".local-logs", "playwright-runner"));

function loadPlaywright() {
  for (const candidate of ["playwright", path.join(playwrightRunnerDir, "node_modules", "playwright")]) {
    try {
      return require(candidate);
    } catch {
      // Try the next location before installing a local runner copy.
    }
  }
  if (process.env.ACCEPTANCE_INSTALL_PLAYWRIGHT === "false") {
    throw new Error("Playwright is not installed. Run npm install --prefix .local-logs/playwright-runner playwright or install it in the workspace.");
  }
  fs.mkdirSync(playwrightRunnerDir, { recursive: true });
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const install = spawnSync(npmCommand, ["install", "--prefix", playwrightRunnerDir, "playwright", "--no-audit", "--no-fund"], {
    cwd: repoRoot,
    stdio: "inherit"
  });
  if (install.status !== 0) throw new Error("Failed to install Playwright acceptance runner dependency.");
  return require(path.join(playwrightRunnerDir, "node_modules", "playwright"));
}

const { chromium } = loadPlaywright();

const WEB_BASE = (process.env.WEB_BASE || "http://127.0.0.1:18080").replace(/\/$/, "");
const API_BASE = (process.env.API_BASE || `${WEB_BASE}/api`).replace(/\/$/, "");
const TENANT_CODE = process.env.TENANT_CODE || "qiwai-showcase";
const SHOWCASE_PASSWORD = process.env.SHOWCASE_PASSWORD || "Qiwai123456";
const ADMIN_PASSWORD = process.env.SHOWCASE_ADMIN_PASSWORD || "Admin123456";
const H5_LOGIN_MODE = process.env.H5_LOGIN_MODE || (WEB_BASE.startsWith("https://rd.chaimen666.com") ? "password" : "code");
const H5_SMS_CODE = process.env.H5_SMS_CODE || "";
const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const outputRoot = path.resolve(process.env.ACCEPTANCE_OUTPUT_DIR || path.join(repoRoot, ".local-logs"));
const outputDir = path.resolve(outputRoot, `browser-acceptance-${runId}`);
fs.mkdirSync(outputDir, { recursive: true });

const result = {
  runId,
  target: { webBase: WEB_BASE, apiBase: API_BASE, tenantCode: TENANT_CODE },
  startedAt: new Date().toISOString(),
  testData: {},
  checks: [],
  screenshots: []
};

function record(name, status, detail = {}) {
  const row = { name, status, ...detail };
  result.checks.push(row);
  const mark = status === "passed" ? "OK" : status === "warning" ? "WARN" : "FAIL";
  console.log(`${mark} ${name}${detail.note ? `：${detail.note}` : ""}`);
  return row;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function api(route, options = {}) {
  const res = await fetch(`${API_BASE}${route}`, {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json",
      ...(options.tenant !== false ? { "x-tenant-code": TENANT_CODE } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok || body?.code !== 0) {
    throw new Error(`${options.method || "GET"} ${route} failed: ${body?.message || text || res.status}`);
  }
  return body.data;
}

async function loginAdminApi(username, password) {
  const data = await api("/admin/auth/login", { method: "POST", tenant: false, body: { username, password } });
  assert(data.token, `${username} API login did not return token`);
  return data;
}

async function ensureH5PasswordMember(phone) {
  const admin = await loginAdminApi("showcase_admin", SHOWCASE_PASSWORD);
  const nickname = `浏览器验收${phone.slice(-4)}`;
  await api("/admin/members", {
    method: "POST",
    token: admin.token,
    body: {
      phone,
      password: SHOWCASE_PASSWORD,
      nickname,
      remark: `browser acceptance ${runId}`
    }
  });
  record("H5 浏览器验收会员准备", "passed", { phone, nickname });
}

async function screenshot(page, name, options = {}) {
  const file = path.join(outputDir, name);
  await page.screenshot({ path: file, fullPage: options.fullPage !== false });
  result.screenshots.push(file);
  return file;
}

async function bodyText(page) {
  return page.locator("body").innerText({ timeout: 15000 });
}

async function waitForBodyText(page, matcher, label, timeout = 15000) {
  const matchers = Array.isArray(matcher) ? matcher : [matcher];
  const deadline = Date.now() + timeout;
  let lastText = "";
  while (Date.now() < deadline) {
    lastText = await page.locator("body").innerText({ timeout: 1000 }).catch(() => "");
    if (matchers.some((item) => lastText.includes(item))) return { label, text: lastText };
    await page.waitForTimeout(250);
  }
  const debugName = `debug-wait-${label.replace(/[^\w.-]+/g, "-").slice(0, 60)}.png`;
  await screenshot(page, debugName).catch(() => {});
  throw new Error(`${label} did not contain ${matchers.join(" / ")}; current=${page.url()}; text=${lastText.slice(0, 240).replace(/\s+/g, " ")}`);
}

async function clickText(page, text, options = {}) {
  const locator = page.getByText(text, { exact: options.exact ?? true });
  await locator.last().click({ timeout: options.timeout || 10000 });
}

async function clickTextIfVisible(page, text, options = {}) {
  const locator = page.getByText(text, { exact: options.exact ?? true });
  const count = await locator.count();
  for (let index = count - 1; index >= 0; index -= 1) {
    const item = locator.nth(index);
    if (await item.isVisible().catch(() => false)) {
      await item.click({ timeout: options.timeout || 5000 }).catch(() => {});
      return true;
    }
  }
  return false;
}

async function fillFirst(page, selector, value) {
  const locator = page.locator(selector).first();
  if (await locator.count()) {
    await locator.fill(value);
    return true;
  }
  return false;
}

async function fillFieldByLabel(page, label, value) {
  const field = page.locator(".field").filter({ hasText: label }).first();
  if (await field.count()) {
    await field.locator("input, textarea").first().fill(value);
    return true;
  }
  return false;
}

async function fillLoginInput(page, field, value) {
  const selector = `[data-login-field="${field}"] input, input[data-login-field="${field}"]`;
  await page.locator(selector).first().fill(value, { timeout: 10000 });
}

async function dismissH5Overlays(page) {
  await page.waitForTimeout(350);
  await clickTextIfVisible(page, "知道了");
  await clickTextIfVisible(page, "暂不查看");
}

async function loginAdminUi(browser, username, password, viewport = { width: 1365, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${WEB_BASE}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[placeholder="请输入管理员账号"]').fill(username);
  await page.locator('input[placeholder="请输入密码"]').fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL(/\/admin\/(?!login)/, { timeout: 15000 });
  await page.waitForTimeout(800);
  return { context, page };
}

async function gotoAdmin(page, route) {
  await page.goto(`${WEB_BASE}/admin${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
}

async function h5LoginAndRegister(browser, activity) {
  const phone = `139${String(Date.now()).slice(-8)}`;
  const usePasswordLogin = H5_LOGIN_MODE !== "code" && !H5_SMS_CODE;
  if (usePasswordLogin) await ensureH5PasswordMember(phone);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const detailRoute = `/pages/activity/detail?id=${activity.id}`;
  const loginUrl = `${WEB_BASE}/?tenantCode=${encodeURIComponent(TENANT_CODE)}#/pages/user/login?redirect=${encodeURIComponent(detailRoute)}`;
  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
  await waitForBodyText(page, "手机号登录", "H5 login loaded");
  await fillLoginInput(page, "phone", phone);
  if (usePasswordLogin) {
    await clickTextIfVisible(page, "密码登录");
    await fillLoginInput(page, "password", SHOWCASE_PASSWORD);
  } else {
    await clickText(page, "验证码登录");
    await clickText(page, "获取验证码");
    if (H5_SMS_CODE) {
      await fillLoginInput(page, "code", H5_SMS_CODE);
    } else {
      await waitForBodyText(page, "本地开发验证码", "H5 dev code returned");
      const codeInput = page.locator('[data-login-field="code"] input, input[data-login-field="code"]').first();
      let code = await codeInput.inputValue().catch(() => "");
      if (!code) {
        code = "123456";
        await codeInput.fill(code);
      }
    }
  }
  await clickText(page, "登录");
  await waitForBodyText(page, activity.title, "H5 redirected to activity detail");
  await dismissH5Overlays(page);
  await screenshot(page, "h5-01-login-activity-detail.png");
  record(usePasswordLogin ? "H5 新会员密码登录" : "H5 新手机号验证码登录", "passed", { phone, screenshot: "h5-01-login-activity-detail.png" });

  await clickText(page, "立即报名", { exact: false });
  await waitForBodyText(page, "报名确认", "H5 register page loaded");
  await dismissH5Overlays(page);
  await fillFieldByLabel(page, "姓名", `浏览器验收${phone.slice(-4)}`);
  await fillFieldByLabel(page, "手机号", phone);
  await fillFieldByLabel(page, "微信号", `codex_${phone.slice(-4)}`);
  await clickTextIfVisible(page, "线下收款", { exact: false });
  await screenshot(page, "h5-02-register-form.png");
  await page.locator(".submit-bar .button").last().click();
  await page.waitForTimeout(600);
  await clickTextIfVisible(page, "确认提交");
  await page.waitForURL(/\/pages\/user\/registration\?id=/, { timeout: 20000 });
  await dismissH5Overlays(page);
  await waitForBodyText(page, ["待付款", "等待后台确认收款"], "H5 registration pending payment");
  await screenshot(page, "h5-03-registration-pending.png");
  const registrationUrl = page.url();
  const registrationId = Number((registrationUrl.match(/registration\?id=(\d+)/) || [])[1] || 0);
  assert(registrationId > 0, `cannot parse registration id from ${registrationUrl}`);
  record("H5 付费活动线下收款报名", "passed", { registrationId, phone, screenshot: "h5-03-registration-pending.png" });
  return { context, page, phone, registrationId, activityId: activity.id };
}

async function financeConfirm(browser, phone) {
  const { context, page } = await loginAdminUi(browser, "showcase_finance", SHOWCASE_PASSWORD);
  await gotoAdmin(page, "/orders");
  await page.locator('input[placeholder="搜索订单号、活动、手机号"]').fill(phone);
  await page.getByRole("button", { name: "筛选" }).click();
  await waitForBodyText(page, phone, "finance order filtered");
  const row = page.locator(".el-table__row").filter({ hasText: phone }).first();
  await row.getByRole("button", { name: "收款" }).click();
  await page.locator(".el-message-box input").fill(`浏览器验收收款 ${runId}`);
  await page.getByRole("button", { name: "确认收款" }).click();
  await page.waitForTimeout(1200);
  await waitForBodyText(page, "已付款", "finance confirmed payment");
  await screenshot(page, "admin-01-finance-confirm.png");
  record("财务角色确认线下收款", "passed", { account: "showcase_finance", screenshot: "admin-01-finance-confirm.png" });
  await context.close();
}

async function h5ShowCheckInCode(h5) {
  await h5.page.reload({ waitUntil: "domcontentloaded" });
  await dismissH5Overlays(h5.page);
  await waitForBodyText(h5.page, "报名成功", "H5 registration approved after finance confirm");
  await clickText(h5.page, "查看签到码", { exact: false });
  await h5.page.waitForSelector(".code-text", { timeout: 15000 });
  const checkInCode = (await h5.page.locator(".code-text").last().textContent()).trim();
  assert(checkInCode, "empty check-in code");
  await screenshot(h5.page, "h5-04-checkin-code.png");
  record("H5 报名详情付款后刷新并生成签到码", "passed", { checkInCode, screenshot: "h5-04-checkin-code.png" });
  return checkInCode;
}

async function checkInByRole(browser, code, phone) {
  const { context, page } = await loginAdminUi(browser, "showcase_checkin", SHOWCASE_PASSWORD);
  await gotoAdmin(page, "/check-in");
  await page.locator('input[placeholder*="签到码"]').fill(code);
  await page.locator('input[placeholder="可填写现场备注"]').fill(`浏览器验收签到 ${runId}`);
  await page.getByRole("button", { name: "核销签到" }).click();
  await waitForBodyText(page, ["最近核销", phone], "check-in result displayed");
  await screenshot(page, "admin-02-checkin-result.png");
  record("签到角色手工核销签到码", "passed", { account: "showcase_checkin", screenshot: "admin-02-checkin-result.png" });
  for (const viewport of [
    { width: 375, height: 780, name: "375" },
    { width: 768, height: 900, name: "768" },
    { width: 1280, height: 900, name: "1280" }
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(350);
    await screenshot(page, `admin-checkin-responsive-${viewport.name}.png`);
  }
  record("签到页视口回归", "passed", { viewports: "375/768/1280", screenshots: "admin-checkin-responsive-*.png" });
  await context.close();
}

async function h5VerifyCheckedIn(h5) {
  await h5.page.reload({ waitUntil: "domcontentloaded" });
  await dismissH5Overlays(h5.page);
  await waitForBodyText(h5.page, "已签到", "H5 registration checked-in status");
  await screenshot(h5.page, "h5-05-registration-checked-in.png");
  record("H5 报名详情签到状态刷新", "passed", { screenshot: "h5-05-registration-checked-in.png" });
}

async function runRoleMatrix(browser) {
  const roles = [
    { username: "admin", password: ADMIN_PASSWORD, label: "平台超管", allowed: [{ route: "/tenants", text: "商家" }, { route: "/system-settings", text: "系统设置" }, { route: "/miniprogram-release", text: "小程序" }] },
    { username: "showcase_admin", password: SHOWCASE_PASSWORD, label: "商家管理员", allowed: [{ route: "/marketing-popups", text: "营销弹窗" }, { route: "/ad-center", text: "广告中心" }, { route: "/homepage-builder", text: "首页装修" }, { route: "/members", text: "会员" }] },
    { username: "showcase_ops", password: SHOWCASE_PASSWORD, label: "运营", allowed: [{ route: "/activities", text: "活动" }, { route: "/registrations", text: "报名" }, { route: "/marketing-popups", text: "营销弹窗" }] },
    { username: "showcase_finance", password: SHOWCASE_PASSWORD, label: "财务", allowed: [{ route: "/orders", text: "订单" }, { route: "/finance", text: "财务" }], denied: ["/marketing-popups"] },
    { username: "showcase_checkin", password: SHOWCASE_PASSWORD, label: "签到", allowed: [{ route: "/check-in", text: "签到核销" }], denied: ["/ad-center"] },
    { username: "showcase_store_owner", password: SHOWCASE_PASSWORD, label: "店铺负责人", allowed: [{ route: "/mall-products", text: "商品" }, { route: "/mall-orders", text: "商城订单" }], denied: ["/agent-settlements"] },
    { username: "showcase_store_finance", password: SHOWCASE_PASSWORD, label: "店铺财务", allowed: [{ route: "/mall-orders", text: "商城订单" }, { route: "/mall-settlements", text: "结算" }], denied: ["/mall-products"] },
    { username: "showcase_agent_owner", password: SHOWCASE_PASSWORD, label: "代理负责人", allowed: [{ route: "/agent-settlements", text: "代理" }, { route: "/mall-orders", text: "商城订单" }], denied: ["/mall-products"] }
  ];

  for (const role of roles) {
    const { context, page } = await loginAdminUi(browser, role.username, role.password);
    const roleResult = { label: role.label, username: role.username, allowed: [], denied: [] };
    for (const item of role.allowed) {
      await gotoAdmin(page, item.route);
      const text = await bodyText(page);
      const ok = page.url().includes(`/admin${item.route}`) && text.includes(item.text);
      assert(ok, `${role.username} cannot access ${item.route}; current=${page.url()}`);
      roleResult.allowed.push({ route: item.route, currentUrl: page.url() });
    }
    for (const route of role.denied || []) {
      await gotoAdmin(page, route);
      const redirected = !page.url().includes(`/admin${route}`);
      assert(redirected, `${role.username} should not access ${route}`);
      roleResult.denied.push({ route, redirectedTo: page.url() });
    }
    const shotName = `role-${role.username}.png`;
    await screenshot(page, shotName);
    record(`角色浏览器权限：${role.label}`, "passed", { username: role.username, screenshot: shotName, allowed: roleResult.allowed.map((item) => item.route).join(","), denied: roleResult.denied.map((item) => item.route).join(",") });
    await context.close();
  }
}

async function runFeaturePages(browser) {
  const { context, page } = await loginAdminUi(browser, "showcase_admin", SHOWCASE_PASSWORD);
  await gotoAdmin(page, "/marketing-popups");
  await page.getByRole("button", { name: "生效检测" }).click();
  await waitForBodyText(page, ["将展示", "没有命中"], "marketing popup effective check dialog");
  await screenshot(page, "feature-01-marketing-effective-check.png");
  record("营销弹窗生效检测页面", "passed", { screenshot: "feature-01-marketing-effective-check.png" });

  await gotoAdmin(page, "/ad-center");
  await waitForBodyText(page, "广告中心", "ad center loaded");
  await screenshot(page, "feature-02-ad-center.png");
  const ad = await api("/public/ad-slots?slotKey=home_top_banner&pageKey=home&platform=h5");
  assert(ad?.resolvedImageUrl, "public ad slot did not return resolvedImageUrl");
  record("广告位 resolvedImageUrl", "passed", { resolvedImageUrl: ad.resolvedImageUrl, screenshot: "feature-02-ad-center.png" });

  await gotoAdmin(page, "/members");
  await waitForBodyText(page, "会员", "members loaded");
  const detailButton = page.getByRole("button", { name: "详情" }).first();
  if (await detailButton.count()) {
    await detailButton.click();
    await waitForBodyText(page, "用户时间线", "member timeline drawer");
  }
  await screenshot(page, "feature-03-member-timeline.png");
  record("会员详情时间线", "passed", { screenshot: "feature-03-member-timeline.png" });

  await gotoAdmin(page, "/homepage-builder");
  await waitForBodyText(page, "应用上线简洁版模板", "homepage launch template entry");
  await screenshot(page, "feature-04-homepage-template.png");
  record("首页简洁模板入口", "passed", { screenshot: "feature-04-homepage-template.png" });

  await context.close();

  const { context: platformContext, page: platformPage } = await loginAdminUi(browser, "admin", ADMIN_PASSWORD);
  await gotoAdmin(platformPage, "/system-settings");
  await clickText(platformPage, "部署配置");
  await waitForBodyText(platformPage, ["短信 SDK AppID", "Admin 静态包", "H5 静态包"], "system settings version and sms cards");
  await screenshot(platformPage, "feature-05-system-settings-version-sms.png");
  record("系统设置版本与短信配置卡片", "passed", { screenshot: "feature-05-system-settings-version-sms.png" });
  await platformContext.close();

  const h5Context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const h5Page = await h5Context.newPage();
  await h5Page.goto(`${WEB_BASE}/?tenantCode=${encodeURIComponent(TENANT_CODE)}#/`, { waitUntil: "domcontentloaded" });
  await waitForBodyText(h5Page, "Codex验收弹窗", "H5 home popup visible");
  await screenshot(h5Page, "feature-06-h5-popup-ad-home.png");
  record("H5 首页弹窗与广告首屏", "passed", { screenshot: "feature-06-h5-popup-ad-home.png" });
  await h5Context.close();
}

async function collectVersionInfo() {
  const ready = await api("/health/ready", { tenant: false });
  const h5Version = await fetch(`${WEB_BASE}/version.json`).then((res) => res.json()).catch(() => null);
  const adminVersion = await fetch(`${WEB_BASE}/admin/version.json`).then((res) => res.json()).catch(() => null);
  result.versions = { api: ready.release, h5: h5Version, admin: adminVersion };
  const commits = [ready.release?.commit, h5Version?.commit, adminVersion?.commit].filter(Boolean);
  record("三端版本信息读取", new Set(commits).size <= 1 ? "passed" : "warning", {
    note: `API=${ready.release?.commit || "-"}, Admin=${adminVersion?.commit || "-"}, H5=${h5Version?.commit || "-"}`
  });
}

async function main() {
  const paidActivities = await api("/public/activities?page=1&pageSize=20")
    .then((data) => (data.items || data).filter((item) => Number(item.price) > 0 && item.displayStatus === "open"));
  assert(paidActivities.length, "no paid open activity available");
  const activity = paidActivities[0];
  result.testData.activity = { id: activity.id, title: activity.title, price: activity.price };

  const browser = await chromium.launch({ headless: process.env.HEADLESS !== "false" });
  try {
    await collectVersionInfo();
    const h5 = await h5LoginAndRegister(browser, activity);
    result.testData.phone = h5.phone;
    result.testData.registrationId = h5.registrationId;

    const financeLogin = await loginAdminApi("showcase_finance", SHOWCASE_PASSWORD);
    const orders = await api(`/admin/orders?keyword=${encodeURIComponent(h5.phone)}&pageSize=10`, { token: financeLogin.token, tenant: false });
    const order = (orders.items || []).find((item) => item.registration?.id === h5.registrationId || item.registration?.user?.phone === h5.phone);
    if (order) result.testData.order = { id: order.id, orderNo: order.orderNo, status: order.status, amount: order.amount };

    await financeConfirm(browser, h5.phone);
    const checkInCode = await h5ShowCheckInCode(h5);
    result.testData.checkInCode = checkInCode;
    await checkInByRole(browser, checkInCode, h5.phone);
    await h5VerifyCheckedIn(h5);
    await h5.context.close();

    await runRoleMatrix(browser);
    await runFeaturePages(browser);
    result.finishedAt = new Date().toISOString();
    result.status = "passed";
  } catch (error) {
    result.finishedAt = new Date().toISOString();
    result.status = "failed";
    result.error = error.stack || error.message;
    record("浏览器验收执行", "failed", { note: error.message });
    throw error;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
    console.log(`验收结果已写入：${path.join(outputDir, "result.json")}`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
