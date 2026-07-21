import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { API_BASE, api, assert, auth, loginPlatformAdmin, loginShowcaseAdmin } from "./online-showcase-lib.mjs";

const require = createRequire(path.resolve("apps/api/package.json"));
const mysql = require("mysql2/promise");
const stamp = Date.now();
const runId = `payment-account-permission-${stamp}`;
const outputDir = path.resolve(".local-logs", runId);
fs.mkdirSync(outputDir, { recursive: true });

async function request(pathname, token, method = "GET", body) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { ...(token ? auth(token) : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, payload, data: payload?.data };
}

function expectDenied(result, label, statuses = [403]) {
  assert(statuses.includes(result.status), `${label} 应为 ${statuses.join("/")}，实际 ${result.status}`);
}

function assertMinimalTenant(tenant, label) {
  const keys = Object.keys(tenant || {}).sort();
  assert(JSON.stringify(keys) === JSON.stringify(["code", "enabled", "id", "name"]), `${label} 字段异常：${keys.join(",")}`);
}

const readAdmin = await loginShowcaseAdmin("showcase_payment_account_read");
const manageAdmin = await loginShowcaseAdmin("showcase_payment_account_manager");
const sensitiveAdmin = await loginShowcaseAdmin("showcase_payacct_sensitive");
const platformAdmin = await loginPlatformAdmin();

const options = await api("/admin/payment-accounts/options", { headers: auth(readAdmin.token) });
assert(options.tenants?.length === 1, "商家只读账号应只获得当前商家 options");
assertMinimalTenant(options.tenants[0], "收款账户 options 商家");
const tenantId = Number(options.tenants[0].id);
const platformOptions = await api("/admin/payment-accounts/options", { headers: auth(platformAdmin.token) });
const otherTenant = platformOptions.tenants.find((tenant) => Number(tenant.id) !== tenantId);
assert(otherTenant, "未找到跨商家验收对象");

expectDenied(await request("/admin/agents", readAdmin.token, "POST", { name: "无权创建代理" }), "只读账号创建代理");
expectDenied(await request("/admin/agent-payment-accounts", sensitiveAdmin.token, "POST", { agentId: 1, provider: "wechat" }), "敏感账号创建收款账户");
expectDenied(await request("/admin/agents?pageSize=101", readAdmin.token), "非法代理分页", [400]);
expectDenied(await request("/admin/agent-payment-accounts?provider=balance", readAdmin.token), "非法收款渠道", [400]);

const agentBody = {
  tenantId,
  name: `收款代理-${runId}`,
  region: "华东验收区",
  contactName: "收款验收联系人",
  contactPhone: "13912345678",
  enabled: true,
  settlementConfig: { commissionRate: 12.5, scenario: runId }
};
const agent = await api("/admin/agents", { method: "POST", headers: { ...auth(platformAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify(agentBody) });
assert(agent.id && agent.contactPhone === agentBody.contactPhone, "平台创建代理敏感响应异常");
assert(!JSON.stringify(agent).includes("settlementConfig"), "代理响应泄露结算配置");

const accountBody = {
  agentId: agent.id,
  provider: "wechat",
  merchantName: `收款商户-${runId}`,
  merchantNo: `MCH${String(stamp).slice(-10)}`,
  enabled: true,
  config: {
    WECHAT_PAY_APP_ID: `wx-${runId}`,
    WECHAT_PAY_MCH_ID: `mch-${runId}`,
    WECHAT_PAY_API_V3_KEY: `secret-${runId}`,
    WECHAT_TRANSFER_OPENID: `openid-${runId}`,
    WECHAT_TRANSFER_REAL_NAME: "收款验收人",
    nested: { apiKey: `nested-secret-${runId}`, note: "保留非敏感配置" }
  }
};

const concurrentAgent = await api("/admin/agents", { method: "POST", headers: { ...auth(platformAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ ...agentBody, name: `并发收款代理-${runId}` }) });
const raceBody = { ...accountBody, agentId: concurrentAgent.id, merchantName: `并发账户-${runId}` };
const race = await Promise.all([
  request("/admin/agent-payment-accounts", platformAdmin.token, "POST", raceBody),
  request("/admin/agent-payment-accounts", platformAdmin.token, "POST", { ...raceBody, merchantName: `并发账户B-${runId}` })
]);
const raceStatuses = race.map((item) => item.status).sort();
assert(JSON.stringify(raceStatuses) === JSON.stringify([201, 400]), `同渠道账户并发应为 201/400，实际 ${raceStatuses.join("/")}`);
const account = await api("/admin/agent-payment-accounts", { method: "POST", headers: { ...auth(platformAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify(accountBody) });

const readAgents = await api(`/admin/agents?keyword=${encodeURIComponent(runId)}&includeDisabled=true&page=1&pageSize=20`, { headers: auth(readAdmin.token) });
const readAgent = readAgents.items.find((item) => item.id === agent.id);
assert(readAgent?.contactPhone === "139****5678", "只读代理手机号未脱敏");
assertMinimalTenant(readAgent.tenant, "只读代理商家");
assert(!JSON.stringify(readAgent).includes("settlementConfig"), "只读代理泄露结算配置");

const readAccounts = await api(`/admin/agent-payment-accounts?agentId=${agent.id}&includeDisabled=true&page=1&pageSize=20`, { headers: auth(readAdmin.token) });
const readAccount = readAccounts.items.find((item) => item.id === account.id);
assert(readAccount && readAccount.config === null && readAccount.merchantNo !== accountBody.merchantNo, "只读收款账户未隐藏配置或商户号");
assert(Array.isArray(readAccount.configKeys) && readAccount.configKeys.includes("WECHAT_PAY_API_V3_KEY"), "只读收款账户缺少配置摘要");
assertMinimalTenant(readAccount.tenant, "只读收款账户商家");

const managerAccounts = await api(`/admin/agent-payment-accounts?agentId=${agent.id}&includeDisabled=true&page=1&pageSize=20`, { headers: auth(manageAdmin.token) });
const managerAccount = managerAccounts.items.find((item) => item.id === account.id);
assert(managerAccount?.config?.WECHAT_PAY_API_V3_KEY === "***", "维护账号未掩码支付密钥");
assert(managerAccount?.config?.WECHAT_TRANSFER_OPENID === "***", "维护账号未掩码收款身份");
assert(managerAccount?.config?.nested?.apiKey === "***", "维护账号未递归掩码嵌套密钥");
assert(managerAccount?.config?.nested?.note === "保留非敏感配置", "维护账号非敏感配置丢失");

const sensitiveAgents = await api(`/admin/agents?keyword=${encodeURIComponent(runId)}&includeDisabled=true&page=1&pageSize=20`, { headers: auth(sensitiveAdmin.token) });
assert(sensitiveAgents.items.find((item) => item.id === agent.id)?.contactPhone === agentBody.contactPhone, "敏感账号未返回完整代理手机号");
const sensitiveAccounts = await api(`/admin/agent-payment-accounts?agentId=${agent.id}&includeDisabled=true&page=1&pageSize=20`, { headers: auth(sensitiveAdmin.token) });
const sensitiveAccount = sensitiveAccounts.items.find((item) => item.id === account.id);
assert(sensitiveAccount?.merchantNo === accountBody.merchantNo && sensitiveAccount.config === null, "敏感只读账号字段边界异常");

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 13306),
  user: process.env.DB_USERNAME || "activity",
  password: process.env.DB_PASSWORD || "activitypass",
  database: process.env.DB_DATABASE || "activity_registration",
  timezone: "+08:00"
});
const [beforeRows] = await db.execute("SELECT merchantNo, config FROM agent_payment_accounts WHERE id = ?", [account.id]);
const before = beforeRows[0];
await api(`/admin/agent-payment-accounts/${account.id}`, { method: "PATCH", headers: { ...auth(manageAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ agentId: agent.id, provider: "wechat", merchantName: `${accountBody.merchantName}-已更新`, enabled: true, config: managerAccount.config }) });
const [afterRows] = await db.execute("SELECT merchantNo, config FROM agent_payment_accounts WHERE id = ?", [account.id]);
const after = afterRows[0];
assert(after.merchantNo === before.merchantNo, "无敏感权限更新覆盖了商户号");
assert(after.config.WECHAT_PAY_API_V3_KEY === before.config.WECHAT_PAY_API_V3_KEY, "星号占位覆盖了支付密钥");
assert(after.config.WECHAT_TRANSFER_OPENID === before.config.WECHAT_TRANSFER_OPENID, "星号占位覆盖了收款身份");
assert(after.config.nested.apiKey === before.config.nested.apiKey, "星号占位覆盖了嵌套密钥");

const crossAgent = await api("/admin/agents", { method: "POST", headers: { ...auth(platformAdmin.token), "Content-Type": "application/json" }, body: JSON.stringify({ ...agentBody, tenantId: Number(otherTenant.id), name: `跨商家收款代理-${runId}` }) });
expectDenied(await request(`/admin/agents/${crossAgent.id}`, manageAdmin.token, "PATCH", { ...agentBody, tenantId: undefined, name: "越权修改" }), "跨商家修改代理", [404]);

const [auditRows] = await db.execute("SELECT id, action FROM admin_operation_logs WHERE action = 'payment_account.sensitive.view' ORDER BY id DESC LIMIT 10");
await db.end();
assert(auditRows.length >= 2, "敏感查看审计未写入");

const result = {
  runId,
  tenantId,
  retained: {
    agentId: agent.id,
    accountId: account.id,
    concurrentAgentId: concurrentAgent.id,
    concurrentAccountId: race.find((item) => item.status === 201)?.data?.id || null,
    crossTenantAgentId: crossAgent.id
  },
  privacy: {
    readPhone: readAgent.contactPhone,
    readMerchantNo: readAccount.merchantNo,
    sensitivePhone: sensitiveAgents.items.find((item) => item.id === agent.id)?.contactPhone,
    sensitiveMerchantNo: sensitiveAccount.merchantNo,
    managerSecret: managerAccount.config.WECHAT_PAY_API_V3_KEY,
    managerNestedSecret: managerAccount.config.nested.apiKey
  },
  races: { accountStatuses: raceStatuses },
  preservation: {
    merchantNo: after.merchantNo === before.merchantNo,
    apiV3Key: after.config.WECHAT_PAY_API_V3_KEY === before.config.WECHAT_PAY_API_V3_KEY,
    openid: after.config.WECHAT_TRANSFER_OPENID === before.config.WECHAT_TRANSFER_OPENID,
    nestedApiKey: after.config.nested.apiKey === before.config.nested.apiKey
  },
  audits: auditRows.map((row) => Number(row.id)),
  createdAt: new Date().toISOString()
};
fs.writeFileSync(path.join(outputDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
console.log(`Evidence: ${outputDir}`);
