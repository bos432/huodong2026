import fs from "node:fs";

const failures = [];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function checkSourceIncludes(source, needle, label) {
  check(source.includes(needle), `${label} must include ${needle}.`);
}

function checkSourceIncludesAll(source, needles, label) {
  for (const needle of needles) checkSourceIncludes(source, needle, label);
}

const packageJson = JSON.parse(read("package.json"));
const transferEntity = read("apps/api/src/entities/agent-settlement-transfer.entity.ts");
const settlementEntity = read("apps/api/src/entities/agent-settlement.entity.ts");
const transferMigration = read("apps/api/src/migrations/1780516000000-AgentSettlementTransfers.ts");
const adminDto = read("apps/api/src/modules/admin/dto.ts");
const adminController = read("apps/api/src/modules/admin/admin.controller.ts");
const adminService = read("apps/api/src/modules/admin/admin.service.ts");
const transferCapability = read("apps/api/src/modules/admin/agent-transfer-capability.ts");
const transferAdapters = read("apps/api/src/modules/public/agent-transfer-adapters.ts");
const adminSpec = read("apps/api/src/modules/admin/admin.service.spec.ts");
const transferAdapterSpec = read("apps/api/src/modules/public/agent-transfer-adapters.spec.ts");
const agentsView = read("apps/admin/src/views/Agents.vue");
const agentSettlementsView = read("apps/admin/src/views/AgentSettlements.vue");
const tenantSmoke = read("scripts/tenant-smoke.mjs");
const realPaymentPlan = read("docs/real-payment-integration-plan.md");
const launchChecklist = read("docs/launch-checklist.md");
const localAcceptance = read("docs/local-acceptance-test-plan.md");
const runbook = read("docs/production-runbook.md");
const progress = read("docs/project-progress.md");

checkSourceIncludes(packageJson.scripts?.["test:preflight-guards"] || "", "node scripts/preflight-agent-settlement-transfer-guard.mjs", "package preflight guards script");

checkSourceIncludesAll(settlementEntity, [
  '@Entity("agent_settlements")',
  '@Unique(["settlementNo"])',
  "agent",
  "tenant",
  "periodStart",
  "periodEnd",
  "transactionCount",
  "refundCount",
  "grossAmount",
  "refundAmount",
  "netAmount",
  "commissionRate",
  "commissionAmount",
  "payableAmount",
  "paidReference",
  "paidProofUrl",
  "payload"
], "agent settlement entity");

checkSourceIncludesAll(transferEntity, [
  '@Entity("agent_settlement_transfers")',
  '@Unique(["transferNo"])',
  "settlement",
  "tenant",
  "agent",
  "account",
  "provider",
  "mode",
  "transferNo",
  "providerTransferNo",
  "amount",
  "status",
  "failureReason",
  "requestedBy",
  "syncedAt",
  "completedAt",
  "retryCount",
  "nextQueryAt",
  "payload"
], "agent settlement transfer entity");

checkSourceIncludesAll(transferMigration, [
  'name: "agent_settlement_transfers"',
  'name: "settlementId"',
  'name: "tenantId"',
  'name: "agentId"',
  'name: "accountId"',
  'name: "transferNo"',
  'name: "providerTransferNo"',
  'name: "failureReason"',
  'name: "retryCount"',
  "isUnique: true",
  "IDX_agent_settlement_transfers_settlement",
  "IDX_agent_settlement_transfers_tenant"
], "agent settlement transfer migration");

checkSourceIncludesAll(adminDto, [
  "export class AgentSettlementGenerateDto",
  "export class AgentSettlementQueryDto",
  "export class AgentSettlementPayDto",
  "export class AgentSettlementSandboxTransferDto",
  "simulateStatus",
  "failureReason",
  'provider?: "wechat" | "alipay"'
], "agent settlement DTOs");

checkSourceIncludesAll(adminController, [
  '@Get("agent-settlements")',
  "this.service.listAgentSettlements(query, admin)",
  '@Post("agent-settlements/generate")',
  "this.service.generateAgentSettlement(dto, admin)",
  '@Get("agent-settlements/transfer-capability")',
  "this.service.agentSettlementTransferCapability(admin)",
  '@Get("agent-settlements/:id/details")',
  "this.service.agentSettlementDetails(id, admin)",
  '@Post("agent-settlements/:id/sandbox-transfer")',
  "this.service.sandboxTransferAgentSettlement(id, dto, admin)",
  '@Post("agent-settlements/:id/real-transfer")',
  "this.service.realTransferAgentSettlement(id, dto, admin)",
  '@Post("agent-settlement-transfers/scan")',
  "this.service.scanAgentSettlementTransfers(admin)",
  '@Get("agent-settlements/export")',
  "this.service.exportAgentSettlements(query, admin)"
], "admin settlement transfer controller");

checkSourceIncludesAll(adminService, [
  "@InjectRepository(AgentSettlement)",
  "@InjectRepository(AgentSettlementTransfer)",
  "agentSettlementTransferCapability",
  "buildAgentSettlementTransferCapability(this.config, agents, accounts)",
  "async agentSettlementDetails",
  "const transfers = await this.agentSettlementTransfers.find",
  "canMarkPaid: settlement.status === \"approved\" && !risks.some((item) => item.blocking)",
  "async markAgentSettlementPaid",
  "const details = await this.agentSettlementDetails(id, admin)",
  "async sandboxTransferAgentSettlement",
  "async realTransferAgentSettlement",
  "private async requestAgentSettlementTransfer",
  "if (settlement.status !== \"approved\")",
  "if (Number(settlement.payableAmount || 0) <= 0)",
  "if (mode === \"real\" && assessment.status !== \"real_ready\")",
  "const transferNo = this.agentSettlementTransferNo(settlement, mode)",
  "if (existing?.status === \"success\")",
  "adapter.requestSandboxTransfer",
  "adapter.requestRealTransfer",
  "error instanceof NotImplementedException",
  "processingTransfer.status = result.status === \"accepted\" ? \"processing\" : result.status",
  "if (savedTransfer.status !== \"success\")",
  "markedPaid: false",
  "settlement.status = \"paid\"",
  "markedPaid: true",
  "async scanAgentSettlementTransfers",
  'this.applyTenantScope(builder, "transfer", admin)',
  "createAgentTransferAdapter(provider, this.config, transfer.account || undefined).queryTransfer(transfer.transferNo)",
  'action: "kept_failed"',
  'action: "timeout_failed"',
  '"agent_settlement.transfer_scan"',
  "private agentSettlementTransferNo"
], "admin settlement transfer service");

checkSourceIncludesAll(transferCapability, [
  "buildAgentSettlementTransferCapability",
  'config.get<string>("REAL_PAYMENT_ENABLED", "false") === "true"',
  "assessAgentTransferAccount",
  "createAgentTransferAdapter",
  "transferDraftSupported: true",
  "realTransferImplemented: assessment.realTransferImplemented",
  "requestTransferImplemented: assessment.requestTransferImplemented",
  "queryTransferImplemented: assessment.queryTransferImplemented",
  "draftRemarkPreview",
  "realReady: accountAssessments.filter",
  "missingAgents",
  "overallStatus",
  "realTransferImplemented"
], "agent transfer capability helper");

checkSourceIncludesAll(transferAdapters, [
  "AGENT_TRANSFER_REQUIREMENTS",
  "WECHAT_TRANSFER_OPENID",
  "WECHAT_TRANSFER_REAL_NAME",
  "WECHAT_TRANSFER_APP_ID",
  "WECHAT_TRANSFER_SCENE_ID",
  "ALIPAY_PAYEE_ACCOUNT",
  "ALIPAY_PAYEE_REAL_NAME",
  "providerForPaymentMethod",
  "assessAgentTransferAccount",
  'config.get<string>("AGENT_REAL_TRANSFER_IMPLEMENTED", "false") === "true" && adapter.realTransferImplemented',
  "requestTransferImplemented: realTransferImplemented && adapter.requestTransferImplemented",
  "queryTransferImplemented: realTransferImplemented && adapter.queryTransferImplemented",
  "status: \"sandbox_ready\"",
  "status: realTransferImplemented ? \"real_ready\" : \"sandbox_ready\"",
  "class DraftOnlyAgentTransferAdapter",
  "readonly realTransferImplemented: boolean = false",
  "readonly requestTransferImplemented: boolean = false",
  "readonly queryTransferImplemented: boolean = false",
  "class WechatAgentTransferAdapter",
  "readonly realTransferImplemented = true",
  "buildWechatTransferRequestDraft",
  "buildWechatTransferQueryRequestDraft",
  "executeWechatTransferRequest",
  "executeWechatTransferQuery",
  "requestSandboxTransfer",
  "requestRealTransfer",
  "throw new NotImplementedException",
  "queryTransfer(_transferNo?: string)"
], "agent transfer adapters");

checkSourceIncludesAll(adminSpec, [
  "agent settlement transfer capability",
  "reports sandbox-ready without real transfer implementation when account fields are complete",
  "AGENT_REAL_TRANSFER_IMPLEMENTED: \"true\"",
  "realTransferImplemented: false",
  "requestTransferImplemented: false",
  "queryTransferImplemented: false",
  "reports enabled agents missing usable payment accounts"
], "admin agent transfer capability tests");

checkSourceIncludesAll(transferAdapterSpec, [
  "AGENT_REAL_TRANSFER_IMPLEMENTED",
  "marks complete WeChat transfer configuration real-ready",
  "builds signed WeChat merchant transfer request and query drafts",
  "executes WeChat transfer request and query",
  "requestTransferImplemented",
  "queryTransferImplemented",
  "requestSandboxTransfer",
  "queryTransfer",
  "NotImplementedException"
], "agent transfer adapter contract tests");

checkSourceIncludesAll(agentSettlementsView, [
  "/admin/agent-settlements/transfer-capability",
  "/admin/agent-settlement-transfers/scan",
  "/admin/agent-settlements/${row.id}/details",
  "/admin/agent-settlements/${row.id}/sandbox-transfer",
  "/admin/agent-settlements/export",
  "requestTransferImplemented",
  "queryTransferImplemented",
  "realTransferImplemented",
  "transferCapability.summary.realReady",
  "transferCapability.missingAgents",
  "details.transfers",
  "transferStatusText",
  "beforeProofUpload"
], "agent settlements admin view");

checkSourceIncludesAll(agentsView, [
  "accountRequirements",
  "WECHAT_TRANSFER_OPENID",
  "WECHAT_TRANSFER_REAL_NAME",
  "ALIPAY_PAYEE_ACCOUNT",
  "ALIPAY_PAYEE_REAL_NAME",
  "accountReadiness",
  "buildReadiness",
  "资料完整",
  "可收款待打款",
  "脱敏待确认",
  "资料缺失",
  "资料完整账户",
  "readinessDetails",
  "敏感配置返回时会被脱敏"
], "agent payment account readiness admin view");

checkSourceIncludesAll(tenantSmoke, [
  "loginFinance",
  "/admin/agent-settlements/transfer-capability",
  "/admin/agent-settlements/generate",
  "/admin/agent-settlements",
  "/admin/agent-settlements/${bSettlement.id}/details",
  "/admin/agent-settlements/export",
  "settlementBoundary",
  "Tenant A settlement export should not include Tenant B settlement"
], "tenant settlement boundary smoke");

checkSourceIncludesAll(realPaymentPlan, [
  "AgentSettlementTransfer",
  "AGENT_REAL_TRANSFER_IMPLEMENTED=false",
  "真实自动打款必须以结算单号生成幂等转账单号",
  "失败时不得把结算单标记为已打款"
], "real payment integration plan agent transfer");
checkSourceIncludesAll(launchChecklist, ["代理结算", "沙箱打款", "真实自动打款"], "launch checklist agent transfer");
checkSourceIncludesAll(localAcceptance, ["代理结算", "打款回执", "沙箱打款"], "local acceptance agent transfer");
checkSourceIncludesAll(runbook, ["代理结算", "打款", "回执"], "production runbook agent transfer");
checkSourceIncludesAll(progress, [
  "代理打款能力评估服务层测试",
  "代理收款账户就绪度"
], "project progress prior agent transfer work");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight agent settlement transfer guard covers transfer records, capability gating, real-transfer fallbacks, receipt scans, tenant boundaries, admin UI, tests, and docs.");
}
