const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const outputRoot = path.resolve(process.env.ACCEPTANCE_OUTPUT_DIR || path.join(root, ".local-logs"));
const webBase = String(process.env.WEB_BASE || "http://127.0.0.1:18080").replace(/\/$/, "");
const apiBase = String(process.env.API_BASE_URL || process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const tenantCode = process.env.TENANT_CODE || "qiwai-showcase";
const adminPassword = process.env.SHOWCASE_ADMIN_PASSWORD || "Showcase123456Aa";
const userPassword = process.env.SHOWCASE_PASSWORD || "Qiwai123456";
const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const outputDir = path.join(outputRoot, `browser-activity-commerce-${runId}`);
fs.mkdirSync(outputDir, { recursive: true });

function loadPlaywright() {
  const runner = path.join(outputRoot, "playwright-runner");
  for (const candidate of ["playwright", path.join(runner, "node_modules", "playwright")]) {
    try { return require(candidate); } catch {}
  }
  fs.mkdirSync(runner, { recursive: true });
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const install = spawnSync(command, ["install", "--prefix", runner, "playwright", "--no-audit", "--no-fund"], { cwd: root, stdio: "inherit" });
  if (install.status !== 0) throw new Error("Failed to install Playwright acceptance runner");
  return require(path.join(runner, "node_modules", "playwright"));
}

function latestApiResult() {
  if (process.env.ACTIVITY_COMMERCE_RESULT) return path.resolve(process.env.ACTIVITY_COMMERCE_RESULT);
  const directories = fs.readdirSync(outputRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("activity-commerce-acceptance-"))
    .map((entry) => path.join(outputRoot, entry.name, "result.json"))
    .filter((file) => fs.existsSync(file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const passed = directories.find((file) => JSON.parse(fs.readFileSync(file, "utf8")).status === "passed");
  if (!passed) throw new Error("No passed activity commerce acceptance result was found");
  return passed;
}

const sourceResultFile = latestApiResult();
const sourceResult = JSON.parse(fs.readFileSync(sourceResultFile, "utf8"));
const retained = sourceResult.retained;
const result = { runId, startedAt: new Date().toISOString(), sourceResultFile, target: { webBase, apiBase, tenantCode }, checks: [], screenshots: [] };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function api(route, options = {}) {
  const response = await fetch(`${apiBase}${route}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", "x-tenant-code": tenantCode, ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const body = await response.json();
  if (!response.ok || body?.code !== 0) throw new Error(`${options.method || "GET"} ${route} failed: ${body?.message || response.status}`);
  return body.data;
}

async function loginUser(phone) {
  return api("/public/auth/password-login", { method: "POST", body: { phone, password: userPassword, nickname: `浏览器活动验收${runId.slice(-4)}` } });
}

async function screenshot(page, filename) {
  const file = path.join(outputDir, filename);
  await page.screenshot({ path: file, fullPage: true });
  result.screenshots.push(file);
}

async function waitForText(page, texts, label, timeout = 20000) {
  const expected = Array.isArray(texts) ? texts : [texts];
  const deadline = Date.now() + timeout;
  let body = "";
  while (Date.now() < deadline) {
    body = await page.locator("body").innerText({ timeout: 1000 }).catch(() => "");
    if (expected.every((text) => body.includes(text))) return body;
    await page.waitForTimeout(250);
  }
  await screenshot(page, `debug-${label.replace(/[^\w.-]+/g, "-")}.png`).catch(() => {});
  throw new Error(`${label} missing ${expected.filter((text) => !body.includes(text)).join(", ")}; url=${page.url()}`);
}

async function loginAdmin(page) {
  await page.goto(`${webBase}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[placeholder="请输入管理员账号"]').fill("showcase_admin");
  await page.locator('input[placeholder="请输入密码"]').fill(adminPassword);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL(/\/admin\/(?!login)/, { timeout: 20000 });
}

async function main() {
  assert(retained?.activityId && retained?.reviewIds?.length === 2, "source result is missing retained activity data");
  const firstUser = await loginUser(retained.userPhones.first);
  const reporter = await loginUser(retained.userPhones.blocked);
  assert(firstUser.userAccessToken && reporter.userAccessToken, "browser users did not receive access tokens");
  const pendingReport = await api(`/public/reviews/${retained.reviewIds[1]}/report`, {
    method: "POST",
    token: reporter.userAccessToken,
    body: { reason: `浏览器待处理举报验收 ${runId}` }
  });
  result.retainedPendingReportId = pendingReport.report.id;
  const pendingReportReason = pendingReport.report.reason;

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await mobileContext.addInitScript(({ token, code, userId, phone, nickname }) => {
      localStorage.setItem("user_token", token);
      localStorage.setItem("h5_tenant_code", code);
      localStorage.setItem("user_id", String(userId));
      localStorage.setItem("user_phone", phone);
      localStorage.setItem("user_nickname", nickname || "");
    }, {
      token: firstUser.userAccessToken,
      code: tenantCode,
      userId: firstUser.user?.id || firstUser.id,
      phone: retained.userPhones.first,
      nickname: firstUser.user?.nickname || firstUser.nickname
    });
    const mobile = await mobileContext.newPage();
    await mobile.goto(`${webBase}/?tenantCode=${tenantCode}#/pages/activity/detail?id=${retained.activityId}&tenantCode=${tenantCode}`, { waitUntil: "domcontentloaded" });
    await waitForText(mobile, [retained.title, "慢π验收中心 A 厅"], "H5 活动详情");
    await screenshot(mobile, "h5-activity-detail.png");
    result.checks.push({ name: "H5 活动详情", status: "passed" });

    await mobile.goto(`${webBase}/?tenantCode=${tenantCode}#/pages/activity/register?id=${retained.activityId}&tenantCode=${tenantCode}`, { waitUntil: "domcontentloaded" });
    await waitForText(mobile, ["年龄", "所在地区", "补充说明", "同行人", "隐私政策"], "H5 动态报名表单");
    await screenshot(mobile, "h5-registration-form-v2.png");
    result.checks.push({ name: "H5 V2 动态表单、同行人和隐私授权", status: "passed" });
    await mobileContext.close();

    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const admin = await adminContext.newPage();
    await loginAdmin(admin);
    await admin.goto(`${webBase}/admin/registrations?activityId=${retained.activityId}`, { waitUntil: "domcontentloaded" });
    await waitForText(admin, [retained.title, "批量通知", "打印名单", "按当前筛选导出 Excel", "已签到"], "PC 报名运营");
    await screenshot(admin, "admin-registration-operations.png");
    result.checks.push({ name: "PC 报名批量运营与导出入口", status: "passed" });

    await admin.goto(`${webBase}/admin/reviews?activityId=${retained.activityId}`, { waitUntil: "domcontentloaded" });
    await waitForText(admin, [retained.title, "精选", "感谢参与，欢迎继续关注。", "待处理举报", pendingReportReason], "PC 评价治理");
    await screenshot(admin, "admin-review-governance.png");
    result.checks.push({ name: "PC 评价回复、精选和待处理举报", status: "passed", pendingReportId: pendingReport.report.id });

    await admin.goto(`${webBase}/admin/recaps?activityId=${retained.activityId}`, { waitUntil: "domcontentloaded" });
    await waitForText(admin, [retained.title, "活动复盘", "导出 Excel", "浏览到报名转化", "评价均分"], "PC 活动复盘");
    await screenshot(admin, "admin-activity-recap.png");
    result.checks.push({ name: "PC 活动复盘与导出入口", status: "passed" });
    await adminContext.close();
  } finally {
    await browser.close();
  }

  result.status = "passed";
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
  console.log(`活动商业闭环浏览器验收结果：${path.join(outputDir, "result.json")}`);
}

main().catch((error) => {
  result.status = "failed";
  result.error = error.stack || error.message;
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
