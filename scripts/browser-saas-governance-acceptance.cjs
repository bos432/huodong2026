const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const webBase = String(process.env.WEB_BASE || "http://127.0.0.1:18080").replace(/\/$/, "");
const outputDir = path.resolve(process.env.SAAS_BROWSER_OUTPUT || path.join(root, ".local-logs", `browser-saas-governance-${Date.now()}`));
const tenantA = { code: required("TENANT_A_CODE"), username: required("TENANT_A_ADMIN"), password: required("TENANT_A_PASSWORD"), marker: process.env.TENANT_A_MARKER || "tenant-smoke-A" };
const tenantB = { code: required("TENANT_B_CODE"), username: required("TENANT_B_ADMIN"), password: required("TENANT_B_PASSWORD"), marker: process.env.TENANT_B_MARKER || "tenant-smoke-B" };
const result = { startedAt: new Date().toISOString(), webBase, status: "running", checks: [], screenshots: [] };
fs.mkdirSync(outputDir, { recursive: true });

function required(key) { if (!process.env[key]) throw new Error(`${key} is required`); return process.env[key]; }
function assert(condition, message) { if (!condition) throw new Error(message); }
function loadPlaywright() {
  for (const candidate of ["playwright", path.join(root, ".local-logs", "playwright-runner", "node_modules", "playwright")]) {
    try { return require(candidate); } catch {}
  }
  throw new Error("Playwright runner is not installed");
}
async function login(page, account) {
  await page.goto(`${webBase}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[placeholder="请输入管理员账号"]').fill(account.username);
  await page.locator('input[placeholder="请输入密码"]').fill(account.password);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL(/\/admin\/(?!login)/, { timeout: 20000 });
}
async function bodyText(page) { return page.locator("body").innerText({ timeout: 10000 }); }
async function main() {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const account of [tenantA, tenantB]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      await login(page, account);
      await page.goto(`${webBase}/admin/activities`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);
      const text = await bodyText(page);
      const own = `${account.marker}-`;
      const other = account === tenantA ? `${tenantB.marker}-` : `${tenantA.marker}-`;
      assert(text.includes(own), `${account.code} activity list missing own tenant activity`);
      assert(!text.includes(other), `${account.code} activity list leaked other tenant activity`);
      const file = path.join(outputDir, `${account.code}-activities.png`);
      await page.screenshot({ path: file, fullPage: true });
      result.screenshots.push(file);
      result.checks.push({ name: `${account.code} PC 活动列表租户隔离`, status: "passed" });
      await page.goto(`${webBase}/admin/finance/dashboard`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
      const financeText = await bodyText(page);
      assert(!financeText.includes("财务看板") || financeText.includes("无权限"), `${account.code} operator should not access finance dashboard`);
      result.checks.push({ name: `${account.code} PC 运营账号财务越权拦截`, status: "passed" });
      await context.close();
    }
  } finally { await browser.close(); }
  result.status = "passed";
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
  console.log(`SaaS governance browser result: ${path.join(outputDir, "result.json")}`);
}
main().catch((error) => { result.status = "failed"; result.error = error.stack || error.message; result.finishedAt = new Date().toISOString(); fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2)); console.error(error.stack || error.message); process.exitCode = 1; });
