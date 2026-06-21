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
const statementEntity = read("apps/api/src/entities/payment-statement-record.entity.ts");
const statementMigration = read("apps/api/src/migrations/1780518000000-PaymentStatementRecords.ts");
const adminDto = read("apps/api/src/modules/admin/dto.ts");
const adminController = read("apps/api/src/modules/admin/admin.controller.ts");
const adminService = read("apps/api/src/modules/admin/admin.service.ts");
const financeOperations = read("apps/api/src/modules/admin/finance-operations.ts");
const statementImport = read("apps/api/src/modules/admin/payment-statement-import.ts");
const paymentProvider = read("apps/api/src/modules/public/payment-provider.service.ts");
const realAdapters = read("apps/api/src/modules/public/real-payment-adapters.ts");
const paymentProviderSpec = read("apps/api/src/modules/public/payment-provider.service.spec.ts");
const adminFinanceView = read("apps/admin/src/views/Finance.vue");
const smoke = read("scripts/smoke.mjs");
const tenantSmoke = read("scripts/tenant-smoke.mjs");
const launchChecklist = read("docs/launch-checklist.md");
const runbook = read("docs/production-runbook.md");
const localAcceptance = read("docs/local-acceptance-test-plan.md");
const multiTenantPlan = read("docs/multi-tenant-isolation-plan.md");
const progress = read("docs/project-progress.md");

checkSourceIncludes(packageJson.scripts?.["test:preflight-guards"] || "", "node scripts/preflight-finance-reconciliation-guard.mjs", "package preflight guards script");

checkSourceIncludesAll(statementEntity, [
  '@Entity("payment_statement_records")',
  '@Unique(["provider", "transactionNo"])',
  "order",
  "tenant",
  "provider",
  "transactionNo",
  "orderNo",
  "amount",
  "tradeType",
  "providerStatus",
  "tradedAt",
  "batchNo",
  "reconciliationStatus",
  "discrepancyType",
  "remark",
  "rawPayload",
  "importedBy",
  "importedAt"
], "payment statement entity");

checkSourceIncludesAll(statementMigration, [
  'name: "payment_statement_records"',
  'name: "orderId"',
  'name: "provider"',
  'name: "transactionNo"',
  'name: "orderNo"',
  'name: "amount"',
  'name: "reconciliationStatus"',
  'name: "rawPayload"',
  "IDX_payment_statement_provider_transaction",
  "IDX_payment_statement_order_no",
  "IDX_payment_statement_reconciliation"
], "payment statement migration");

checkSourceIncludesAll(adminDto, [
  "export class PaymentStatementImportItemDto",
  "transactionNo",
  "orderNo",
  "amount",
  "tradeType",
  "providerStatus",
  "tradedAt",
  "raw?: Record<string, unknown>",
  "export class PaymentStatementImportDto",
  'provider!: "wechat" | "alipay"',
  "batchNo",
  "items!: PaymentStatementImportItemDto[]",
  "export class PaymentStatementFetchDto",
  "statementDate",
  "agentId"
], "payment statement dtos");

checkSourceIncludesAll(adminController, [
  '@Get("finance/dashboard")',
  "this.service.financeDashboard(query, admin)",
  '@Get("finance/reconciliation")',
  "this.service.listPaymentReconciliation(query, 200, admin)",
  '@Post("finance/reconciliation/scan")',
  "this.service.scanPaymentReconciliation()",
  '@Get("finance/statements")',
  "this.service.listPaymentStatements(query, 200, admin)",
  '@Post("finance/statements/import")',
  "this.service.importPaymentStatements(dto, admin)",
  '@Post("finance/statements/fetch")',
  "this.service.fetchPaymentStatements(dto, admin)",
  '@Post("finance/refunds/provider-scan")',
  "this.service.scanProviderRefunds(admin)",
  '@Post("finance/transactions/:id/resolve")',
  "this.service.resolvePaymentTransaction(id, dto, admin)",
  '@Get("finance/export")',
  "this.service.exportFinance(query, admin)"
], "admin finance controller");

checkSourceIncludesAll(adminService, [
  "@InjectRepository(PaymentStatementRecord)",
  "financeDashboard(query",
  "financeDailyReport",
  "financeRiskAlerts",
  "businessDayRange",
  "countTransactionsForAgentInRange",
  "transactionSumForAgentInRange",
  "refundSumForAgentInRange",
  "this.listPaymentStatements(query, 8, admin)",
  "pendingStatementCount",
  "dailyReport",
  "riskAlerts",
  "listPaymentStatements(query",
  'this.applyTenantScope(builder, "statement", admin)',
  'this.applyAgentFilter(builder, query, "orderAgent")',
  "async importPaymentStatements",
  "normalizePaymentStatementItem",
  "paymentStatementOrderWhere(normalized.orderNo, admin)",
  "reconcileStatementWithOrder",
  "tenant: this.tenantRelation(admin, order?.tenant || record.tenant)",
  "rawPayload: normalized.raw",
  "importedBy: admin.username",
  "upsertStatementPaymentTransaction",
  '"finance.statement_import"',
  "async fetchPaymentStatements",
  "this.paymentProvider.fetchStatement",
  "agentId: dto.agentId || null",
  "tenantId: admin.tenantId || null",
  '"finance.statement_fetch"',
  '"finance.statement_fetch_unimplemented"',
  "async scanPaymentReconciliation",
  "amount_mismatch",
  "order_status_mismatch",
  "provider_callback_error",
  "async resolvePaymentTransaction",
  "this.assertTenantAccess(transaction, admin)",
  'transaction.reconciliationStatus = "resolved"',
  "transaction.reconciledBy = this.actorName(admin)",
  "transaction.reconciledAt = new Date()",
  "async exportFinance",
  "const statementSheet = workbook.addWorksheet",
  "statementRecords.forEach"
], "admin finance service");

checkSourceIncludesAll(financeOperations, [
  "financeDailyReport",
  "financeRiskAlerts",
  "refundRatePercent",
  "pending_refunds",
  "pending_reconciliation",
  "failed_callbacks",
  "pending_statements",
  "high_refund_rate",
  "pending_payments"
], "finance daily report and risk alerts");

checkSourceIncludesAll(statementImport, [
  "paymentStatementOrderWhere",
  "isTenantScopedActor(admin)",
  "where.tenant = { id: admin?.tenantId }"
], "payment statement tenant matcher");

checkSourceIncludesAll(paymentProvider, [
  "export type ProviderStatementFetchRequest",
  "export type ProviderStatementItem",
  "export type ProviderStatementFetchResult",
  "fetchStatement(request: ProviderStatementFetchRequest)",
  "async fetchStatement(request",
  "this.assertRealProviderReady(request.provider",
  "this.runtimeConfigForProvider(request.provider, request.agentId || null, request.tenantId || null)",
  "return adapter.fetchStatement(request)"
], "payment provider statement contract");

checkSourceIncludesAll(realAdapters, [
  "fetchStatement(request: ProviderStatementFetchRequest)",
  "REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED",
  "buildWechatStatementDownloadUrlRequestDraft",
  "buildAlipayStatementDownloadUrlRequestDraft",
  "downloadProviderStatementText",
  "statementDownloadUrl",
  "normalizeWechatStatementText",
  "normalizeAlipayStatementText",
  "decodeProviderStatementPayload",
  "normalizeWechatStatementRow",
  "normalizeAlipayStatementRow"
], "real payment statement adapters");

checkSourceIncludesAll(paymentProviderSpec, [
  "builds signed wechat real statement download URL request drafts",
  "builds signed alipay real statement download URL request drafts",
  "normalizes provider statement CSV text",
  "normalizes provider statement text with variant column names",
  "normalizes large provider statement text",
  "downloads gzip-compressed provider statement text",
  "downloads zipped provider statement text",
  "executes wechat real statement fetch when the statement flag is enabled",
  "uses agent payment account config for real statement fetches",
  "rejects cross-tenant agent payment accounts before real statement fetches",
  "executes alipay real statement fetch when the statement flag is enabled",
  "rejects real statement fetch until the provider SDK is implemented"
], "payment provider statement tests");

checkSourceIncludesAll(adminFinanceView, [
  "/admin/finance/dashboard",
  "dailyReport",
  "riskAlerts",
  "今日经营日报",
  "异常提醒",
  "退款率",
  "/admin/finance/reconciliation/scan",
  "/admin/finance/refunds/provider-scan",
  "/admin/finance/statements/import",
  "/admin/finance/statements/fetch",
  "/admin/finance/transactions/",
  "/resolve",
  "statementRecords",
  "reconciliationItems",
  "callbackLogs",
  "exportFinance",
  "fetchStatement",
  "importStatement",
  "scanReconciliation",
  "scanProviderRefunds"
], "admin finance view");

checkSourceIncludesAll(smoke, [
  "/admin/finance/dashboard",
  "/admin/finance/reconciliation/scan",
  "/admin/finance/transactions/",
  "/admin/finance/statements/import",
  "Payment statement import should match the paid smoke order",
  "Payment statement should appear in finance dashboard",
  "/admin/finance/export"
], "main smoke finance reconciliation coverage");

checkSourceIncludesAll(tenantSmoke, [
  "loginFinance",
  "/admin/agent-settlements/transfer-capability",
  "/admin/agent-settlements/export",
  "settlementBoundary"
], "tenant smoke finance boundary coverage");

checkSourceIncludesAll(launchChecklist, ["财务对账页", "扫描对账", "支付回调日志", "服务商账单", "真实对账单拉取", "Excel 导出财务对账"], "launch checklist finance reconciliation");
checkSourceIncludesAll(runbook, ["财务对账页", "支付回调日志", "支付对账差异", "服务商账单"], "production runbook finance reconciliation");
checkSourceIncludesAll(localAcceptance, ["财务看板", "财务导出", "服务商账单", "扫描对账"], "local acceptance finance reconciliation");
checkSourceIncludesAll(multiTenantPlan, ["payment_statement_records", "对账必须按机构隔离", "A 机构财务查看订单/退款/对账/导出"], "multi-tenant finance statement boundary");
checkSourceIncludes(progress, "财务对账静态 guard", "project progress");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   preflight finance reconciliation guard covers statement import/fetch, reconciliation handling, exports, admin UI, smoke checks, and docs.");
}
