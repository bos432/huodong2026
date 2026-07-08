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
      // Try next candidate.
    }
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
const ADMIN_WEB_BASE = (process.env.ADMIN_WEB_BASE || WEB_BASE).replace(/\/$/, "");
const API_BASE = (process.env.API_BASE || `${WEB_BASE}/api`).replace(/\/$/, "");
const TENANT_CODE = process.env.TENANT_CODE || "qiwai-showcase";
const SHOWCASE_PASSWORD = process.env.SHOWCASE_PASSWORD || "Qiwai123456";
const PLATFORM_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || process.env.SHOWCASE_ADMIN_PASSWORD || "Admin123456";
const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const outputRoot = path.resolve(process.env.ACCEPTANCE_OUTPUT_DIR || path.join(repoRoot, ".local-logs"));
const outputDir = path.join(outputRoot, `browser-operations-forum-${runId}`);
fs.mkdirSync(outputDir, { recursive: true });

const result = {
  runId,
  target: { webBase: WEB_BASE, adminWebBase: ADMIN_WEB_BASE, apiBase: API_BASE, tenantCode: TENANT_CODE },
  startedAt: new Date().toISOString(),
  checks: [],
  screenshots: []
};

function record(name, status, detail = {}) {
  result.checks.push({ name, status, ...detail });
  const mark = status === "passed" ? "OK" : status === "warning" ? "WARN" : "FAIL";
  console.log(`${mark} ${name}${detail.note ? `：${detail.note}` : ""}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function api(route, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || 15000);
  try {
    const res = await fetch(`${API_BASE}${route}`, {
      method: options.method || "GET",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(options.tenant !== false ? { "x-tenant-code": TENANT_CODE } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers || {})
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok || body?.code !== 0) throw new Error(`${options.method || "GET"} ${route} failed: ${body?.message || text || res.status}`);
    return body.data;
  } finally {
    clearTimeout(timer);
  }
}

async function screenshot(page, name) {
  const file = path.join(outputDir, name);
  await page.screenshot({ path: file, fullPage: true });
  result.screenshots.push(file);
  return file;
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

async function loginAdminApi(username, password) {
  const data = await api("/admin/auth/login", { method: "POST", tenant: false, body: { username, password } });
  assert(data.token, `${username} API login did not return token`);
  return data;
}

async function prepareForumData(adminToken, userToken) {
  const category = await api("/admin/forum/categories", {
    method: "POST",
    token: adminToken,
    body: {
      name: `【浏览器验收】论坛版块 ${runId}`,
      description: "浏览器验收保留数据",
      enabled: true,
      postPermission: "user",
      auditMode: "post",
      sortOrder: 1
    }
  });
  const title = `【浏览器验收】默认城市论坛 ${runId}`;
  const created = await api(`/public/forum/topics?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    token: userToken,
    body: {
      categoryId: category.id,
      title,
      content: "浏览器验收保留帖子：用于验证 H5 论坛列表、详情、发帖入口和后台论坛管理。",
      tags: ["浏览器验收", "论坛"]
    }
  });
  await api(`/admin/forum/topics/${created.topic.id}/pin`, { method: "POST", token: adminToken, body: { pinned: true } });
  await api(`/admin/forum/topics/${created.topic.id}/feature`, { method: "POST", token: adminToken, body: { featured: true } });
  return { category, topic: created.topic, title };
}

async function loginAdminUi(page, username, password) {
  await page.goto(`${ADMIN_WEB_BASE}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[placeholder="请输入管理员账号"]').fill(username);
  await page.locator('input[placeholder="请输入密码"]').fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL(/\/admin\/(?!login)/, { timeout: 15000 });
}

async function main() {
  const platform = await loginAdminApi("admin", PLATFORM_ADMIN_PASSWORD);
  const tenantAdmin = await loginAdminApi("showcase_admin", SHOWCASE_PASSWORD);
  const phone = `13993${runId.slice(-6)}`;
  const user = await api("/public/auth/password-login", {
    method: "POST",
    body: { phone, password: SHOWCASE_PASSWORD, nickname: `浏览器论坛${runId.slice(-4)}` }
  });
  const { topic, title } = await prepareForumData(tenantAdmin.token, user.userAccessToken);

  const bootstrap = await api("/public/tenants/bootstrap", { tenant: false });
  assert(bootstrap.defaultTenant?.code === TENANT_CODE, "默认入口商家不是 qiwai-showcase");

  const browser = await chromium.launch({ headless: true });
  try {
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await mobileContext.addInitScript(({ token }) => {
      localStorage.setItem("user_token", token);
      localStorage.removeItem("h5_tenant_code");
      localStorage.removeItem("h5_tenant_code_source");
    }, { token: user.userAccessToken });
    const mobile = await mobileContext.newPage();
    await mobile.goto(`${WEB_BASE}/#/pages/forum/index`, { waitUntil: "domcontentloaded" });
    await waitForText(mobile, ["共修论坛", title], "H5 论坛首页");
    await screenshot(mobile, "h5-forum-index-default-tenant.png");
    record("H5 默认入口进入论坛", "passed", { screenshot: "h5-forum-index-default-tenant.png" });

    await mobile.getByText(title).first().click();
    await waitForText(mobile, ["收藏", "举报", "回复"], "H5 论坛详情");
    await screenshot(mobile, "h5-forum-detail.png");
    record("H5 论坛详情", "passed", { topicId: topic.id, screenshot: "h5-forum-detail.png" });

    await mobile.goto(`${WEB_BASE}/?tenantCode=${TENANT_CODE}#/pages/forum/publish`, { waitUntil: "domcontentloaded" });
    await waitForText(mobile, "提交帖子", "H5 发帖页");
    await mobile.locator("uni-input.input input").nth(0).fill(`【浏览器验收】H5 发帖 ${runId}`);
    await mobile.locator("uni-textarea.textarea textarea").nth(0).fill("浏览器专项验收发帖内容，提交后进入论坛列表。");
    await mobile.locator("uni-input.input input").nth(1).fill("浏览器验收,发帖");
    await screenshot(mobile, "h5-forum-publish-filled.png");
    record("H5 论坛发帖页", "passed", { screenshot: "h5-forum-publish-filled.png" });
    await mobileContext.close();

    const adminContext = await browser.newContext({ viewport: { width: 1365, height: 900 } });
    const admin = await adminContext.newPage();
    await loginAdminUi(admin, "showcase_admin", SHOWCASE_PASSWORD);
    await admin.goto(`${ADMIN_WEB_BASE}/admin/community`, { waitUntil: "domcontentloaded" });
    await waitForText(admin, "论坛管理", "后台共修论坛管理");
    await admin.getByText("论坛管理", { exact: true }).click().catch(() => {});
    await waitForText(admin, ["版块管理", "帖子审核", "举报处理"], "后台论坛页签内容");
    await screenshot(admin, "admin-community-forum-tab.png");
    record("后台共修动态论坛管理页签", "passed", { screenshot: "admin-community-forum-tab.png" });

    const platformAdmin = await adminContext.newPage();
    await loginAdminUi(platformAdmin, "admin", PLATFORM_ADMIN_PASSWORD);
    await platformAdmin.goto(`${ADMIN_WEB_BASE}/admin/system-settings`, { waitUntil: "domcontentloaded" });
    await waitForText(platformAdmin, ["默认入口城市/商家", "qiwai-showcase", "慢π演示中心"], "后台默认入口设置");
    await screenshot(platformAdmin, "admin-system-default-tenant.png");
    record("后台默认入口城市配置", "passed", { screenshot: "admin-system-default-tenant.png" });
    await adminContext.close();
  } finally {
    await browser.close();
  }

  result.finishedAt = new Date().toISOString();
  result.status = result.checks.every((item) => item.status !== "failed") ? "passed" : "failed";
  const resultFile = path.join(outputDir, "result.json");
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2), "utf8");
  console.log(`新增模块浏览器验收结果已写入：${resultFile}`);
}

main().catch(async (error) => {
  record("新增模块浏览器验收", "failed", { note: error?.message || String(error) });
  result.finishedAt = new Date().toISOString();
  result.status = "failed";
  const resultFile = path.join(outputDir, "result.json");
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2), "utf8");
  console.error(error?.stack || error);
  process.exit(1);
});
