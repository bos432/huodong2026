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
const outputDir = path.join(outputRoot, `browser-activity-lifecycle-pricing-${runId}`);
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

function latestPassedResult() {
  if (process.env.ACTIVITY_LIFECYCLE_PRICING_RESULT) return path.resolve(process.env.ACTIVITY_LIFECYCLE_PRICING_RESULT);
  const files = fs.readdirSync(outputRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("activity-lifecycle-pricing-"))
    .map((entry) => path.join(outputRoot, entry.name, "result.json"))
    .filter((file) => fs.existsSync(file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const passed = files.find((file) => JSON.parse(fs.readFileSync(file, "utf8")).status === "passed");
  if (!passed) throw new Error("No passed activity lifecycle pricing result found");
  return passed;
}

const sourceResultFile = latestPassedResult();
const source = JSON.parse(fs.readFileSync(sourceResultFile, "utf8"));
const retained = source.retained;
const result = { runId, startedAt: new Date().toISOString(), sourceResultFile, target: { webBase, apiBase, tenantCode }, status: "running", checks: [], screenshots: [] };

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

async function closeOverlay(page) {
  const closeButton = page.locator(
    ".el-overlay:visible .el-drawer__close-btn, .el-overlay:visible .el-dialog__headerbtn"
  ).last();
  if (await closeButton.count()) await closeButton.click();
  else await page.keyboard.press("Escape");
  await page.locator(".el-overlay:visible").waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
}

async function main() {
  assert(retained?.lifecycleActivityId && retained?.ticketActivityId && retained?.ticketTypeId, "source result is missing retained records");
  const browserPhone = `130${runId.slice(-8)}`;
  const browserUser = await api("/public/auth/password-login", { method: "POST", body: { phone: browserPhone, password: userPassword, nickname: `票种浏览器验收${runId.slice(-4)}` } });
  assert(browserUser.userAccessToken, "browser user token missing");

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
    }, { token: browserUser.userAccessToken, code: tenantCode, userId: browserUser.user?.id || browserUser.id, phone: browserPhone, nickname: browserUser.user?.nickname || browserUser.nickname });
    const mobile = await mobileContext.newPage();
    await mobile.goto(`${webBase}/?tenantCode=${tenantCode}#/pages/activity/detail?id=${retained.ticketActivityId}&tenantCode=${tenantCode}`, { waitUntil: "domcontentloaded" });
    await waitForText(mobile, [retained.ticketActivityTitle, "杭州市西湖区慢π活动中心", "查看地图 / 导航", "慢π主理人"], "H5 地图与主办方");
    await screenshot(mobile, "h5-activity-map-host.png");
    result.checks.push({ name: "H5 活动地图、导航和主办方", status: "passed" });

    await mobile.goto(`${webBase}/?tenantCode=${tenantCode}#/pages/activity/register?id=${retained.ticketActivityId}&tenantCode=${tenantCode}`, { waitUntil: "domcontentloaded" });
    await waitForText(mobile, [retained.ticketActivityTitle, "限量早鸟会员阶梯票", "限 1 人", "早鸟"], "H5 票种规则");
    await screenshot(mobile, "h5-ticket-pricing-sold-out.png");
    result.checks.push({ name: "H5 限量早鸟票种与售罄状态", status: "passed" });
    await mobileContext.close();

    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const admin = await adminContext.newPage();
    await loginAdmin(admin);
    await admin.goto(`${webBase}/admin/activities?activityId=${retained.lifecycleActivityId}`, { waitUntil: "domcontentloaded" });
    await waitForText(admin, [retained.lifecycleActivityTitle, "已结束", "生命周期验收分类"], "PC 活动列表");
    const activityRow = admin.locator("tbody tr").filter({
      has: admin.getByText(retained.lifecycleActivityTitle, { exact: true })
    }).first();
    assert(await activityRow.count(), "lifecycle activity row not found");
    await waitForText(admin, ["基础信息", "报名字段", "主理人", "详情模块", "报名规则", "分享标题", "地图纬度"], "PC 活动五步向导");
    await screenshot(admin, "admin-activity-wizard.png");
    result.checks.push({ name: "PC 活动五步向导与地图分享配置", status: "passed" });
    await closeOverlay(admin);

    await activityRow.getByRole("button", { name: "更多" }).click();
    await admin.locator(".el-dropdown-menu:visible").getByText("版本记录", { exact: true }).click();
    await waitForText(admin, ["活动版本记录", "V1", "V2", "V3", "每次保存都会生成版本"], "PC 活动版本记录");
    await screenshot(admin, "admin-activity-versions.png");
    result.checks.push({ name: "PC 活动版本记录", status: "passed" });
    await closeOverlay(admin);

    await activityRow.getByRole("button", { name: "更多" }).click();
    await admin.locator(".el-dropdown-menu:visible").getByText("渠道", { exact: true }).click();
    await waitForText(admin, ["渠道推广与转化", retained.channelCode, "生命周期验收渠道", "100%"], "PC 渠道归因");
    await screenshot(admin, "admin-activity-channel-report.png");
    result.checks.push({ name: "PC 活动渠道链接与转化报告", status: "passed" });
    await closeOverlay(admin);

    await admin.goto(`${webBase}/admin/ticket-types`, { waitUntil: "domcontentloaded" });
    await waitForText(admin, ["票种管理", "新建票种"], "PC 票种管理");
    const activitySelect = admin.locator(".table-card .el-select").first();
    await activitySelect.click();
    await admin.getByText(retained.ticketActivityTitle, { exact: true }).last().click();
    await waitForText(admin, [retained.ticketActivityTitle, "限量早鸟会员阶梯票", "早鸟 ¥70.00", "会员 ¥60.00"], "PC 票种列表");
    const ticketRow = admin.locator("tr").filter({ hasText: "限量早鸟会员阶梯票" }).first();
    await ticketRow.getByRole("button", { name: "编辑" }).click();
    await waitForText(admin, ["编辑票种", "销售时间", "早鸟价", "会员专享价", "阶梯价", "每人限购"], "PC 票种规则编辑");
    await screenshot(admin, "admin-ticket-pricing-rules.png");
    result.checks.push({ name: "PC 早鸟、会员、阶梯、库存和限购配置", status: "passed" });
    await closeOverlay(admin);
    await adminContext.close();
  } finally {
    await browser.close();
  }

  result.retainedBrowserUserPhone = browserPhone;
  result.status = "passed";
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
  console.log(`活动生命周期与票种浏览器验收结果：${path.join(outputDir, "result.json")}`);
}

main().catch((error) => {
  result.status = "failed";
  result.error = error.stack || error.message;
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
