const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const webBase = String(process.env.WEB_BASE || "http://127.0.0.1:18080").replace(/\/$/, "");
const apiBase = String(process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const outputDir = path.resolve(process.env.TENANT_REGION_BROWSER_OUTPUT || path.join(root, ".local-logs", `browser-tenant-region-${Date.now()}`));
const result = { startedAt: new Date().toISOString(), status: "running", checks: [], screenshots: [] };
fs.mkdirSync(outputDir, { recursive: true });
function loadPlaywright() { for (const candidate of ["playwright", path.join(root, ".local-logs", "playwright-runner", "node_modules", "playwright")]) { try { return require(candidate); } catch {} } throw new Error("Playwright runner is not installed"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
async function api(route, options = {}) { const response = await fetch(`${apiBase}${route}`, { method: options.method || "GET", headers: { "Content-Type": "application/json", ...(options.headers || {}) }, body: options.body === undefined ? undefined : JSON.stringify(options.body) }); const payload = await response.json(); if (!response.ok || payload?.code !== 0) throw new Error(`${route}: ${payload?.message || response.status}`); return payload.data; }
async function loginAdmin(page) { await page.goto(`${webBase}/admin/login`, { waitUntil: "domcontentloaded" }); await page.locator('input[placeholder="请输入管理员账号"]').fill(process.env.PLATFORM_ADMIN_USERNAME || "admin"); await page.locator('input[placeholder="请输入密码"]').fill(process.env.PLATFORM_ADMIN_PASSWORD || "Admin123456"); await page.getByRole("button", { name: "登录" }).click(); await page.waitForURL(/\/admin\/(?!login)/, { timeout: 20000 }); }
async function shot(page, name) { const file = path.join(outputDir, name); await page.screenshot({ path: file, fullPage: true }); result.screenshots.push(file); }
async function main() {
  const source = JSON.parse(fs.readFileSync(path.resolve(process.env.TENANT_REGION_RESULT_FILE || path.join(root, ".local-logs", "tenant-region-1784212300000", "result.json")), "utf8"));
  assert(source.status === "passed", "passed tenant region API result required");
  const platform = await api("/admin/auth/login", { method: "POST", body: { username: process.env.PLATFORM_ADMIN_USERNAME || "admin", password: process.env.PLATFORM_ADMIN_PASSWORD || "Admin123456" } });
  const regions = await api("/admin/tenant-regions", { headers: { Authorization: `Bearer ${platform.token}` } });
  const ids = source.retained.regions;
  const names = [ids.a, ids.bFar, ids.bOverlap].map((id) => regions.find((row) => row.id === id)?.name).filter(Boolean);
  assert(names.length === 3, "retained tenant regions missing");
  const { chromium } = loadPlaywright(); const browser = await chromium.launch({ headless: true });
  try {
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); const admin = await adminContext.newPage(); await loginAdmin(admin);
    await admin.goto(`${webBase}/admin/tenant-regions`, { waitUntil: "domcontentloaded" }); await admin.getByText(names[0], { exact: false }).waitFor({ timeout: 15000 }); const regionText = await admin.locator("body").innerText();
    for (const name of names) assert(regionText.includes(name), `region page missing ${name}`);
    assert(regionText.includes("授权有效") && regionText.includes("已驳回"), "region approval states missing");
    await shot(admin, "admin-tenant-regions.png"); result.checks.push({ name: "PC 区域保护与审批状态", status: "passed" });
    await admin.goto(`${webBase}/admin/tenant-region-hit-logs`, { waitUntil: "domcontentloaded" }); await admin.waitForTimeout(900); const logText = await admin.locator("body").innerText();
    assert(logText.includes("tenant-region-acceptance") && logText.includes("命中"), "tenant location logs missing");
    await shot(admin, "admin-tenant-region-hit-logs.png"); result.checks.push({ name: "PC 定位命中与兜底日志", status: "passed" }); await adminContext.close();

    const phone = `136${String(Date.now()).slice(-8)}`; const user = await api("/public/auth/password-login", { method: "POST", headers: { "x-tenant-code": "qiwai-showcase" }, body: { phone, password: "Qiwai123456", nickname: "区域切换浏览器验收" } });
    const bootstrap = await api("/public/tenants/bootstrap"); const alternate = bootstrap.tenants.find((tenant) => tenant.code !== "qiwai-showcase"); assert(alternate, "alternate public tenant missing");
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await mobileContext.addInitScript(({ token, phone }) => { localStorage.setItem("user_token", token); localStorage.setItem("user_phone", phone); localStorage.setItem("h5_tenant_code", "qiwai-showcase"); localStorage.setItem("h5_tenant_code_source", "manual"); }, { token: user.userAccessToken, phone });
    const mobile = await mobileContext.newPage(); await mobile.goto(`${webBase}/?tenantCode=qiwai-showcase#/pages/index/index?tenantCode=qiwai-showcase`, { waitUntil: "domcontentloaded" }); await mobile.waitForTimeout(1200);
    const popupClose = mobile.locator(".marketing-popup-close:visible"); if (await popupClose.count()) { await popupClose.click(); await mobile.waitForTimeout(300); }
    await mobile.locator(".tenant-entry").first().click(); await mobile.getByText("切换城市合伙人", { exact: true }).waitFor();
    const sheetText = await mobile.locator(".tenant-sheet").innerText(); assert(sheetText.includes("报名、订单、钱包、积分、课程和优惠权益按当前城市商家分别展示"), "asset scope message missing");
    await shot(mobile, "h5-tenant-switcher.png");
    await mobile.locator('.tenant-search input').fill(alternate.code); await mobile.getByText(alternate.code, { exact: false }).last().click();
    const confirm = mobile.getByText("继续切换", { exact: true }); if (await confirm.count()) await confirm.click(); await mobile.waitForTimeout(800);
    const stored = await mobile.evaluate(() => localStorage.getItem("h5_tenant_code")); assert(stored === alternate.code, "manual tenant selection was not persisted");
    result.checks.push({ name: "H5 租户切换、资产边界提示与持久化", status: "passed", targetTenantCode: alternate.code }); await mobileContext.close();
  } finally { await browser.close(); }
  result.status = "passed"; result.finishedAt = new Date().toISOString(); fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2)); console.log(`Tenant region browser result: ${path.join(outputDir, "result.json")}`);
}
main().catch((error) => { result.status = "failed"; result.error = error.stack || error.message; result.finishedAt = new Date().toISOString(); fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2)); console.error(error.stack || error.message); process.exitCode = 1; });
