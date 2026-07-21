import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiBase = String(process.env.API_BASE_URL || "http://127.0.0.1:3000/api").replace(/\/$/, "");
const tenantCode = String(process.env.TENANT_CODE || "qiwai-showcase").trim();
const platformUsername = process.env.PLATFORM_ADMIN_USERNAME || "admin";
const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD || "Admin123456";
const rolePassword = process.env.PREMIUM_ACCEPTANCE_PASSWORD || process.env.SHOWCASE_PASSWORD || "Qiwai123456";
const runId = `${Date.now()}`;
const outputDir = path.resolve(process.env.ACCEPTANCE_OUTPUT_DIR || path.join(repoRoot, ".local-logs"), `premium-role-acceptance-${runId}`);
fs.mkdirSync(outputDir, { recursive: true });

const result = {
  runId,
  startedAt: new Date().toISOString(),
  tenantCode,
  status: "running",
  actors: {},
  steps: []
};

async function api(route, options = {}) {
  const response = await fetch(`${apiBase}${route}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok || payload?.code !== 0) throw new Error(`${options.method || "GET"} ${route} failed (${response.status}): ${payload?.message || text}`);
  return payload.data;
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
      if (attempt < attempts) await sleep(500 * attempt);
    }
  }
  throw new Error(`${name} failed after ${attempts} attempts: ${lastError?.message || lastError}`);
}

async function login(username, password) {
  const data = await api("/admin/auth/login", { method: "POST", body: { username, password } });
  if (!data?.token) throw new Error(`${username} login did not return a token`);
  return data;
}

async function ensurePlatformActor(platformToken, username, permissions, role = "operator") {
  const response = await api(`/admin/admins?includeSmoke=true&pageSize=100&keyword=${encodeURIComponent(username)}`, { token: platformToken });
  const existing = (response.items || response || []).find((row) => row.username === username);
  const payload = { role, enabled: true, permissions };
  let actor;
  if (existing) {
    actor = await api(`/admin/admins/${existing.id}`, { method: "PATCH", token: platformToken, body: payload });
    await api(`/admin/admins/${existing.id}/password`, { method: "POST", token: platformToken, body: { password: rolePassword } });
  } else {
    actor = await api("/admin/admins", { method: "POST", token: platformToken, body: { username, password: rolePassword, role, permissions } });
  }
  return { ...actor, ...(await login(username, rolePassword)) };
}

async function setTenantPackage(platformToken, tenantId, packagePlan, originalSettings) {
  const body = {
    packagePlan,
    activityPublishReviewRequired: originalSettings.activityPublishReviewRequired ?? false,
    registrationReviewEnabled: originalSettings.registrationReviewEnabled ?? false,
    paymentAccountEditable: originalSettings.paymentAccountEditable ?? true,
    mallEnabled: originalSettings.mallEnabled ?? true
  };
  if (originalSettings.entitlements && packagePlan === originalSettings.packagePlan) body.entitlements = originalSettings.entitlements;
  return api(`/admin/tenants/${tenantId}/permissions`, { method: "POST", token: platformToken, body });
}

async function updateTenantActor(platformToken, row, permissions) {
  await api(`/admin/admins/${row.id}`, {
    method: "PATCH",
    token: platformToken,
    body: { role: row.role, tenantId: row.tenant?.id || row.tenantId, enabled: row.enabled, permissions }
  });
}

async function getTenantActor(platformToken, username, tenantId) {
  const response = await api(`/admin/admins?includeSmoke=true&pageSize=20&keyword=${encodeURIComponent(username)}`, { token: platformToken });
  const rows = response.items || response || [];
  return rows.find((item) => item.username === username && (item.tenant?.id || item.tenantId) === tenantId) || null;
}

function samePermissions(actual, expected) {
  const normalize = (values) => [...new Set(values || [])].sort();
  return JSON.stringify(normalize(actual)) === JSON.stringify(normalize(expected));
}

function runStep(name, script, env) {
  const startedAt = new Date().toISOString();
  const execution = spawnSync(process.execPath, [path.join(repoRoot, script)], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    timeout: Number(process.env.PREMIUM_ACCEPTANCE_STEP_TIMEOUT_MS || 180000)
  });
  const step = {
    name,
    script,
    startedAt,
    finishedAt: new Date().toISOString(),
    status: execution.status === 0 ? "passed" : "failed",
    stdout: String(execution.stdout || "").trim().slice(-12000),
    stderr: String(execution.stderr || "").trim().slice(-12000)
  };
  result.steps.push(step);
  console.log(`${step.status === "passed" ? "OK" : "FAIL"} ${name}`);
  if (step.stdout) console.log(step.stdout);
  if (step.stderr) console.error(step.stderr);
  if (execution.status !== 0) throw new Error(`${name} failed with exit code ${execution.status}${execution.signal ? ` (${execution.signal})` : ""}`);
}

async function main() {
  const platform = await login(platformUsername, platformPassword);
  const tenants = await api("/admin/tenants", { token: platform.token });
  const tenant = tenants.find((row) => row.code === tenantCode);
  if (!tenant) throw new Error(`tenant not found: ${tenantCode}`);
  const originalSettings = structuredClone(tenant.settings || {});
  const tenantActorDefinitions = [
    { username: "showcase_admin", password: process.env.SHOWCASE_ADMIN_PASSWORD || "Showcase123456Aa", permissions: ["charity.view", "charity.manage"] },
    { username: "showcase_ops", password: rolePassword, permissions: ["charity.view", "charity.manage", "charity.finance"] },
    { username: "showcase_finance", password: rolePassword, permissions: ["charity.view", "charity.finance"] }
  ];
  const tenantActors = [];
  for (const definition of tenantActorDefinitions) {
    const response = await api(`/admin/admins?includeSmoke=true&pageSize=20&keyword=${encodeURIComponent(definition.username)}`, { token: platform.token });
    const rows = response.items || response || [];
    const row = rows.find((item) => item.username === definition.username && (item.tenant?.id || item.tenantId) === tenant.id);
    if (!row) throw new Error(`tenant acceptance actor not found: ${definition.username}`);
    tenantActors.push({ row, password: definition.password, originalPermissions: [...(row.permissions || [])], permissions: [...new Set([...(row.permissions || []), ...definition.permissions])] });
  }

  let premiumEnabled = false;
  const changedTenantActorIds = new Set();
  try {
    await setTenantPackage(platform.token, tenant.id, "city_partner", originalSettings);
    premiumEnabled = true;
    for (const actor of tenantActors) {
      await updateTenantActor(platform.token, actor.row, actor.permissions);
      changedTenantActorIds.add(actor.row.id);
      await api(`/admin/admins/${actor.row.id}/password`, { method: "POST", token: platform.token, body: { password: actor.password } });
    }

    const [requester, reviewer, payer] = await Promise.all([
      login("showcase_admin", tenantActors.find((actor) => actor.row.username === "showcase_admin").password),
      login("showcase_ops", tenantActors.find((actor) => actor.row.username === "showcase_ops").password),
      login("showcase_finance", tenantActors.find((actor) => actor.row.username === "showcase_finance").password)
    ]);
    const manager = await ensurePlatformActor(platform.token, "acceptance_platform_manager", ["aid.view", "aid.manage", "ambassador.manage", "partner.manage"], "super_admin");
    const platformReviewer = await ensurePlatformActor(platform.token, "acceptance_platform_reviewer", ["aid.view", "aid.manage", "ambassador.manage", "partner.manage"], "super_admin");
    const sensitive = await ensurePlatformActor(platform.token, "acceptance_platform_sensitive", ["aid.view", "aid.sensitive"]);
    const viewer = await ensurePlatformActor(platform.token, "acceptance_platform_viewer", ["aid.view"]);
    const userPhone = `13994${runId.slice(-6)}`;
    const user = await api("/public/auth/password-login", {
      method: "POST",
      headers: { "x-tenant-code": tenantCode },
      body: { phone: userPhone, password: rolePassword, nickname: `增值角色验收${runId.slice(-4)}` }
    });
    result.actors = {
      tenantId: tenant.id,
      userPhone,
      tenantRequester: "showcase_admin",
      tenantReviewer: "showcase_ops",
      tenantPayer: "showcase_finance",
      platformManagerId: manager.id,
      platformReviewerId: platformReviewer.id,
      platformSensitiveId: sensitive.id,
      platformViewerId: viewer.id
    };

    const common = {
      API_BASE_URL: apiBase,
      API_BASE: apiBase,
      TENANT_CODE: tenantCode,
      SHOWCASE_PASSWORD: rolePassword,
      SHOWCASE_ADMIN_PASSWORD: tenantActors.find((actor) => actor.row.username === "showcase_admin").password,
      PLATFORM_ADMIN_USERNAME: platformUsername,
      PLATFORM_ADMIN_PASSWORD: platformPassword
    };
    runStep("论坛与运营 API 闭环", "scripts/operations-forum-acceptance.mjs", common);
    runStep("公益三人分岗与公开披露", "scripts/charity-fund-governance-acceptance.mjs", {
      ...common,
      CHARITY_REQUESTER_TOKEN: requester.token,
      CHARITY_REVIEWER_TOKEN: reviewer.token,
      CHARITY_PAYER_TOKEN: payer.token
    });
    runStep("援助申请与敏感材料权限", "scripts/aid-application-governance-acceptance.mjs", {
      ...common,
      AID_USER_TOKEN: user.userAccessToken,
      AID_USER_PHONE: userPhone,
      AID_VIEWER_TOKEN: viewer.token,
      AID_MANAGER_TOKEN: manager.token,
      AID_MANAGER_ADMIN_ID: String(manager.id),
      AID_SENSITIVE_TOKEN: sensitive.token,
      AID_REVIEWER_TOKEN: platformReviewer.token
    });
    runStep("大使贡献与伙伴合同双人复核", "scripts/ecosystem-partner-crm-acceptance.mjs", {
      ...common,
      ECOSYSTEM_MANAGER_TOKEN: manager.token,
      ECOSYSTEM_REVIEWER_TOKEN: platformReviewer.token
    });
    runStep("志愿者报名签到工时与证明", "scripts/volunteer-governance-acceptance.mjs", {
      ...common,
      VOLUNTEER_ADMIN_TOKEN: manager.token,
      VOLUNTEER_USER_TOKEN: user.userAccessToken,
      VOLUNTEER_TENANT_ID: String(tenant.id)
    });
    runStep("论坛 H5 与后台浏览器正向流程", "scripts/browser-operations-forum-acceptance.cjs", {
      ...common,
      WEB_BASE: process.env.WEB_BASE || "http://127.0.0.1:18080",
      ADMIN_WEB_BASE: process.env.ADMIN_WEB_BASE || "http://127.0.0.1:18080"
    });
    result.status = "passed";
  } finally {
    for (const actor of tenantActors.filter((item) => changedTenantActorIds.has(item.row.id))) {
      await retry(`恢复角色权限 ${actor.row.username}`, () => updateTenantActor(platform.token, actor.row, actor.originalPermissions)).catch((error) => {
        result.steps.push({ name: `恢复角色权限 ${actor.row.username}`, status: "failed", error: error.message });
        result.status = "failed";
      });
      await retry(`恢复账号密码 ${actor.row.username}`, () => api(`/admin/admins/${actor.row.id}/password`, {
        method: "POST",
        token: platform.token,
        body: { password: actor.password }
      })).catch((error) => {
        result.steps.push({ name: `恢复账号密码 ${actor.row.username}`, status: "failed", error: error.message });
        result.status = "failed";
      });
    }
    if (premiumEnabled) {
      await retry("恢复原套餐", () => setTenantPackage(platform.token, tenant.id, originalSettings.packagePlan || "standard", originalSettings)).catch((error) => {
        result.steps.push({ name: "恢复原套餐", status: "failed", error: error.message });
        result.status = "failed";
      });
    }
    const restored = await retry("回读租户套餐", () => api("/admin/tenants", { token: platform.token }).then((rows) => rows.find((row) => row.id === tenant.id))).catch(() => null);
    result.restoredPackagePlan = restored?.settings?.packagePlan || null;
    if (result.restoredPackagePlan !== (originalSettings.packagePlan || "standard")) {
      result.steps.push({ name: "校验原套餐", status: "failed", expected: originalSettings.packagePlan || "standard", actual: result.restoredPackagePlan });
      result.status = "failed";
    }
    for (const actor of tenantActors.filter((item) => changedTenantActorIds.has(item.row.id))) {
      const restoredActor = await retry(`回读角色权限 ${actor.row.username}`, () => getTenantActor(platform.token, actor.row.username, tenant.id)).catch(() => null);
      const restoredPermissions = restoredActor?.permissions || [];
      result.steps.push({
        name: `校验角色权限 ${actor.row.username}`,
        status: restoredActor && samePermissions(restoredPermissions, actor.originalPermissions) ? "passed" : "failed",
        expected: actor.originalPermissions,
        actual: restoredPermissions
      });
      if (!restoredActor || !samePermissions(restoredPermissions, actor.originalPermissions)) result.status = "failed";
    }
    result.finishedAt = new Date().toISOString();
    if (result.status === "running") result.status = "failed";
    fs.writeFileSync(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
    console.log(`增值角色验收结果：${path.join(outputDir, "result.json")}`);
  }
}

main().catch((error) => {
  result.status = "failed";
  result.error = error.stack || error.message;
  result.finishedAt = result.finishedAt || new Date().toISOString();
  const resultFile = path.join(outputDir, "result.json");
  if (!fs.existsSync(resultFile)) fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
