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
const TENANT_CODE = process.env.TENANT_CODE || "qiwai-showcase";
const USERNAME = process.env.MOBILE_ADMIN_USERNAME || "showcase_ops";
const PASSWORD = process.env.MOBILE_ADMIN_PASSWORD || process.env.SHOWCASE_PASSWORD || "Qiwai123456";
const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const outputRoot = path.resolve(process.env.ACCEPTANCE_OUTPUT_DIR || path.join(repoRoot, ".local-logs"));
const outputDir = path.join(outputRoot, `mobile-admin-acceptance-${runId}`);
fs.mkdirSync(outputDir, { recursive: true });

const result = {
  runId,
  target: { webBase: WEB_BASE, tenantCode: TENANT_CODE, username: USERNAME },
  startedAt: new Date().toISOString(),
  testData: {},
  checks: [],
  screenshots: []
};

function record(name, status, detail = {}) {
  result.checks.push({ name, status, ...detail });
  const mark = status === "passed" ? "OK" : status === "warning" ? "WARN" : "FAIL";
  console.log(`${mark} ${name}${detail.note ? `：${detail.note}` : ""}`);
}

async function screenshot(page, name) {
  const file = path.join(outputDir, name);
  await page.screenshot({ path: file, fullPage: true });
  result.screenshots.push(file);
  return file;
}

function mobileUrl(route) {
  return `${WEB_BASE}/?tenantCode=${encodeURIComponent(TENANT_CODE)}#${route}`;
}

async function gotoMobileRoute(page, route) {
  await page.evaluate((url) => {
    window.location.href = url;
  }, mobileUrl(route));
  await page.waitForFunction((expectedHash) => window.location.hash === expectedHash, `#${route}`, { timeout: 15000 });
  await page.waitForTimeout(500);
}

async function waitForText(page, matcher, label, timeout = 15000) {
  const matchers = Array.isArray(matcher) ? matcher : [matcher];
  const deadline = Date.now() + timeout;
  let lastText = "";
  while (Date.now() < deadline) {
    lastText = await page.locator("body").innerText({ timeout: 1000 }).catch(() => "");
    if (matchers.some((item) => lastText.includes(item))) return lastText;
    await page.waitForTimeout(250);
  }
  await screenshot(page, `debug-${label.replace(/[^\w.-]+/g, "-").slice(0, 60)}.png`).catch(() => {});
  throw new Error(`${label} not found; current=${page.url()}; text=${lastText.slice(0, 240).replace(/\s+/g, " ")}`);
}

async function clickVisibleText(page, text, options = {}) {
  const locator = page.getByText(text, { exact: options.exact ?? true });
  const count = await locator.count();
  for (let index = count - 1; index >= 0; index -= 1) {
    const item = locator.nth(index);
    if (await item.isVisible().catch(() => false)) {
      await item.click({ timeout: options.timeout || 10000 });
      return;
    }
  }
  throw new Error(`Cannot find visible text: ${text}`);
}

async function fillByPlaceholder(page, placeholder, value) {
  const locator = page.locator(`input[placeholder="${placeholder}"], textarea[placeholder="${placeholder}"]`).first();
  if (await locator.count()) {
    await locator.fill(value, { timeout: 10000 });
    return;
  }
  throw new Error(`Cannot find placeholder: ${placeholder}`);
}

async function fillFormControl(page, index, value) {
  await page.locator("input, textarea").nth(index).fill(value, { timeout: 10000 });
}

async function fillFirstVisible(page, selector, value) {
  const locator = page.locator(selector);
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index);
    if (await item.isVisible().catch(() => false)) {
      await item.fill(value, { timeout: 10000 });
      return;
    }
  }
  throw new Error(`Cannot find visible control: ${selector}`);
}

async function waitForFormControls(page, minimum, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let count = 0;
  while (Date.now() < deadline) {
    count = await page.locator("input, textarea").count().catch(() => 0);
    if (count >= minimum) return count;
    await page.waitForTimeout(250);
  }
  await screenshot(page, `debug-${label.replace(/[^\w.-]+/g, "-").slice(0, 60)}.png`).catch(() => {});
  throw new Error(`${label} expected at least ${minimum} form controls, got ${count}`);
}

async function login(page) {
  await page.goto(mobileUrl("/pages/admin/login"), { waitUntil: "domcontentloaded" });
  await waitForText(page, "手机管理端", "mobile admin login loaded");
  await fillFormControl(page, 0, USERNAME);
  await fillFormControl(page, 1, PASSWORD);
  const loginButton = page.locator("uni-button.button.primary, button.button.primary, .button.primary").filter({ hasText: "登录管理端" }).first();
  await loginButton.scrollIntoViewIfNeeded().catch(() => {});
  await loginButton.click({ timeout: 10000 });
  await page.waitForFunction(() => window.location.hash === "#/pages/admin/home", null, { timeout: 15000 });
  await waitForText(page, ["手机管理", "发布活动", "活动管理"], "mobile admin logged in");
  await waitForText(page, "最近活动", "mobile admin home loaded");
  await screenshot(page, "01-login-home.png");
  record("手机管理端登录和工作台", "passed", { account: USERNAME, screenshot: "01-login-home.png" });
}

async function visitRoute(page, route, expected, shotName, checkName) {
  await gotoMobileRoute(page, route);
  await waitForText(page, expected, checkName);
  await page.waitForTimeout(500);
  await screenshot(page, shotName);
  record(checkName, "passed", { screenshot: shotName });
}

async function createAndPublishActivity(page) {
  const title = `【手机验收保留】活动发布 ${runId}`;
  result.testData.activityTitle = title;
  await gotoMobileRoute(page, "/pages/admin/activity/edit");
  await waitForText(page, "活动标题", "mobile activity edit loaded");
  await waitForFormControls(page, 6, "mobile activity edit controls");
  await fillFormControl(page, 0, title);
  await fillFormControl(page, 1, "手机管理端自动化验收活动，保留用于上线回归追踪。");
  await fillFormControl(page, 2, "线上验收保留地址");
  await screenshot(page, "04-activity-edit-basic.png");

  await clickVisibleText(page, "保存");
  await page.waitForFunction(() => window.location.hash.includes("id="), null, { timeout: 20000 });
  result.testData.activityId = Number((page.url().match(/[?&]id=(\d+)/) || [])[1] || 0) || undefined;
  await page.waitForFunction(() => !document.body.innerText.includes("保存中"), null, { timeout: 20000 });
  await waitForText(page, "活动标题", "mobile activity draft saved", 20000);
  await waitForFormControls(page, 6, "mobile activity controls after save");
  await screenshot(page, "05-activity-saved.png");
  record("手机管理端新建活动并保存草稿", "passed", { title, screenshot: "05-activity-saved.png" });

  await clickVisibleText(page, "详情");
  await waitForText(page, "详情内容", "mobile activity detail step loaded");
  await fillFirstVisible(page, "textarea", "这是手机管理端发布验收保留活动详情。");
  await clickVisibleText(page, "发布");
  await waitForText(page, ["已发布", "提交审核", "当前商家活动发布需要平台审核"], "mobile activity publish handled", 20000);
  await screenshot(page, "06-activity-publish-result.png");
  const text = await page.locator("body").innerText().catch(() => "");
  if (text.includes("已发布")) {
    record("手机管理端发布活动", "passed", { title, screenshot: "06-activity-publish-result.png" });
  } else if (text.includes("当前商家活动发布需要平台审核") || text.includes("提交审核")) {
    record("手机管理端发布活动", "warning", { title, note: "当前商家需要提交平台审核，发布按钮已有明确反馈。", screenshot: "06-activity-publish-result.png" });
  } else {
    throw new Error("mobile activity publish did not show success or approval feedback");
  }
}

async function main() {
  const browser = await chromium.launch({ headless: process.env.HEADLESS !== "false" });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await login(page);
    await visitRoute(page, "/pages/admin/activity/list", ["共 ", "新增"], "02-activity-list.png", "手机管理端活动列表");
    await createAndPublishActivity(page);
    await visitRoute(page, "/pages/admin/registrations", "报名", "07-registrations.png", "手机管理端报名列表");
    await visitRoute(page, "/pages/admin/orders", "订单", "08-orders.png", "手机管理端订单列表");
    await visitRoute(page, "/pages/admin/check-in", "签到核销", "09-check-in.png", "手机管理端签到核销页");
    result.finishedAt = new Date().toISOString();
    result.status = "passed";
  } catch (error) {
    result.finishedAt = new Date().toISOString();
    result.status = "failed";
    result.error = error.stack || error.message;
    record("手机管理端浏览器验收执行", "failed", { note: error.message });
    throw error;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
    console.log(`手机管理端验收结果已写入：${path.join(outputDir, "result.json")}`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
