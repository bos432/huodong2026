import { API_BASE, assert, env, loginAdmin, reportStep } from "./online-showcase-lib.mjs";

const password = env("SHOWCASE_PASSWORD");

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { status: response.status, contentType, data };
}

function ok(result, label) {
  assert(result.status >= 200 && result.status < 300, `${label} failed with HTTP ${result.status}`);
  if (!Buffer.isBuffer(result.data)) assert(result.data?.code === 0, `${label} failed: ${result.data?.message || "unknown error"}`);
  return Buffer.isBuffer(result.data) ? result.data : result.data.data;
}

function forbidden(result, label) {
  assert(result.status === 403, `${label} must return 403, got ${result.status}`);
}

const readonly = await loginAdmin("showcase_partner_readonly", password);
const sensitive = await loginAdmin("showcase_partner_sensitive", password);
const manager = await loginAdmin("showcase_partner_manager", password);

const applications = ok(await request("/admin/partner/applications", { token: manager.token }), "manager partner list");
assert(Array.isArray(applications) && applications.length > 0, "partner acceptance needs at least one retained application");
assert(applications.every((row) => row.kind === "partner"), "partner list must not include non-partner applications");
const application = applications[0];
assert(/^1\d{2}\*{4}.{4}$/.test(String(application.phone || "")), "partner list must return a masked phone");
assert(String(application.wechat || "").includes("*"), "partner list must return a masked contact handle");
assert(application.remarkEncrypted === undefined && application.phoneLookupHash === undefined, "partner list must not expose storage-only fields");

const contracts = ok(await request("/admin/partner/contracts", { token: manager.token }), "manager contract list");
assert(Array.isArray(contracts) && contracts.length > 0, "partner acceptance needs at least one retained contract");
const contract = contracts[0];
assert(contract.termsEncrypted === undefined && contract.documentReferenceEncrypted === undefined && contract.reviewRemarkEncrypted === undefined, "contract list must not expose encrypted storage fields");
assert(contract.reviewRemark === undefined, "contract list must not decrypt review remarks by default");

ok(await request("/admin/partner/applications", { token: readonly.token }), "readonly partner list");
ok(await request("/admin/partner/contracts", { token: readonly.token }), "readonly contract list");
ok(await request(`/admin/partner/applications/${application.id}/followups`, { token: readonly.token }), "readonly followup list");
forbidden(await request(`/admin/partner/applications/${application.id}/reveal`, { method: "POST", token: readonly.token, body: { reason: "越权验收" } }), "readonly application reveal");
forbidden(await request(`/admin/partner/contracts/${contract.id}/reveal`, { method: "POST", token: readonly.token, body: { reason: "越权验收" } }), "readonly contract reveal");
forbidden(await request(`/admin/partner/applications/${application.id}`, { method: "PATCH", token: readonly.token, body: { status: application.status } }), "readonly update");
forbidden(await request("/admin/partner/export", { token: readonly.token }), "readonly export");
reportStep("伙伴只读账号仅可查看脱敏线索、合同摘要和跟进记录");

const sensitiveApplication = ok(await request(`/admin/partner/applications/${application.id}/reveal`, { method: "POST", token: sensitive.token, body: { reason: "自动化验收：伙伴联系方式复核" } }), "sensitive application reveal");
assert(sensitiveApplication.phone !== application.phone && sensitiveApplication.wechat !== application.wechat, "partner sensitive reveal must differ from masked values");
const sensitiveContract = ok(await request(`/admin/partner/contracts/${contract.id}/reveal`, { method: "POST", token: sensitive.token, body: { reason: "自动化验收：伙伴合同复核" } }), "sensitive contract reveal");
assert(sensitiveContract.contractNo === contract.contractNo, "contract reveal must return the requested contract");
forbidden(await request(`/admin/partner/applications/${application.id}`, { method: "PATCH", token: sensitive.token, body: { status: application.status } }), "sensitive update");
forbidden(await request("/admin/partner/export", { token: sensitive.token }), "sensitive export");
reportStep("伙伴敏感账号仅可带理由查看联系方式和合同敏感信息");

ok(await request(`/admin/partner/applications/${application.id}/reveal`, { method: "POST", token: manager.token, body: { reason: "自动化验收：伙伴管理账号核对联系方式" } }), "manager application reveal");
ok(await request(`/admin/partner/contracts/${contract.id}/reveal`, { method: "POST", token: manager.token, body: { reason: "自动化验收：伙伴管理账号核对合同" } }), "manager contract reveal");
ok(await request(`/admin/partner/applications/${application.id}`, { method: "PATCH", token: manager.token, body: { status: application.status } }), "manager update");
const exportResult = await request("/admin/partner/export", { token: manager.token });
const exportBuffer = ok(exportResult, "manager export");
assert(exportResult.contentType.includes("spreadsheetml"), "partner export must return an Excel workbook");
assert(exportBuffer.length > 1000, "partner export workbook is unexpectedly small");
reportStep("伙伴管理账号可更新线索、受控查看并导出完整 CRM 工作簿");

const platform = await loginAdmin(env("PLATFORM_ADMIN_USERNAME", "admin"), env("PLATFORM_ADMIN_PASSWORD", "Admin123456"));
const applicationAudit = ok(await request("/admin/operation-logs?action=partner.application.sensitive_reveal&pageSize=50", { token: platform.token }), "partner application reveal audit");
const contractAudit = ok(await request("/admin/operation-logs?action=partner.contract.sensitive_reveal&pageSize=50", { token: platform.token }), "partner contract reveal audit");
for (const audit of [applicationAudit, contractAudit]) {
  const auditedUsers = new Set((audit.items || []).map((item) => item.adminUsername));
  assert(auditedUsers.has("showcase_partner_manager") && auditedUsers.has("showcase_partner_sensitive"), "partner sensitive reveal audit must include manager and sensitive accounts");
}
reportStep("伙伴联系方式与合同敏感查看审计已落库");

console.log("\n合作伙伴隐私与权限专项验收通过。");
