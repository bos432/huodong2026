import fs from "node:fs";

const failures = [];
const read = (file) => fs.readFileSync(file, "utf8");
const check = (condition, message) => { if (!condition) failures.push(message); };
const includes = (source, value, label) => check(source.includes(value), `${label} must include ${value}`);
const excludes = (source, value, label) => check(!source.includes(value), `${label} must not include ${value}`);

const service = read("apps/api/src/modules/charity-fund.service.ts");
const transactionEntity = read("apps/api/src/entities/charity-fund-transaction.entity.ts");
const accountEntity = read("apps/api/src/entities/charity-fund-account.entity.ts");
const disbursementEntity = read("apps/api/src/entities/charity-project-disbursement.entity.ts");
const projectEntity = read("apps/api/src/entities/charity-project.entity.ts");
const fundMigration = read("apps/api/src/migrations/1783700000000-CharityFundLedger.ts");
const projectMigration = read("apps/api/src/migrations/1783710000000-CharityProjectGovernance.ts");
const historyBackfillMigration = read("apps/api/src/migrations/1783780000000-CharityLedgerHistoryBackfill.ts");
const controller = read("apps/api/src/modules/admin/admin.controller.ts");
const permissions = read("apps/api/src/modules/admin/admin-permissions.ts");
const adminView = read("apps/admin/src/views/Charity.vue");
const acceptance = read("scripts/charity-fund-governance-acceptance.mjs");

includes(accountEntity, "reservedFen", "charity account");
includes(accountEntity, "ledgerHeadHash", "charity account");
includes(transactionEntity, "balanceBeforeFen", "charity ledger");
includes(transactionEntity, "charity_retention", "charity immutable refund retention");
includes(service, "pessimistic_write", "charity transaction locking");
includes(service, "cappedCharityReversalFen", "charity cumulative reversal cap");
includes(service, "hasSeparatedCharityActors", "charity three-actor separation");
includes(service, "charityLedgerBusinessKey", "charity bounded ledger idempotency key");
includes(service, "disbursement_cancelled", "charity reservation release event");
includes(service, "releaseReservedFen", "charity paid reservation release");
includes(service, "ledgerIntegrity", "charity hash-chain verification");
includes(service, "publicFundEntries", "charity public fund disclosure");
includes(service, "publicProjectView", "charity public project field whitelist");
includes(service, "publicDisbursementView", "charity public disbursement field whitelist");
includes(service, "status: \"paid\"", "charity public paid-disbursement filter");
excludes(service, "accrual.retainedOnRefund = true", "charity immutable ledger");
includes(disbursementEntity, "cancelBusinessKey", "charity cancellation replay");
includes(projectEntity, "VersionColumn", "charity project optimistic version");
includes(fundMigration, "UQ_charity_disbursement_cancel_key", "charity fund migration");
includes(projectMigration, "charity_project_events", "charity project event migration");
includes(historyBackfillMigration, "charityLedgerEntryHash", "charity ledger history backfill migration");
includes(historyBackfillMigration, "ledgerHeadHash", "charity ledger history backfill migration");
includes(controller, "charity/disbursements/:id/cancel", "charity cancel endpoint");
includes(permissions, "charity.finance", "charity finance permission");
includes(adminView, "cancelDisbursement", "charity admin cancellation control");
includes(acceptance, "CHARITY_PAYER_TOKEN", "charity acceptance actor separation");

if (failures.length) {
  for (const failure of failures) console.error(`ERR  ${failure}`);
  process.exitCode = 1;
} else {
  console.log("OK   charity governance guard covers isolated funds, immutable ledger, actor separation, reservation release, public disclosure and acceptance entrypoints.");
}
