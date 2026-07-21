import { MigrationInterface, QueryRunner } from "typeorm";
import { charityLedgerEntryHash } from "../shared/charity-ledger-hash";

type AccountRow = { id: number; scopeKey: string };

type TransactionRow = {
  id: number;
  direction: "credit" | "debit";
  type: string;
  sourceType: string;
  amount: string;
  amountFen: string | number;
  idempotencyKey: string;
  orderId: number | null;
  refundId: number | null;
  projectId: number | null;
  disbursementId: number | null;
};

export class CharityLedgerHistoryBackfill1783780000000 implements MigrationInterface {
  name = "CharityLedgerHistoryBackfill1783780000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("charity_fund_accounts")) || !(await queryRunner.hasTable("charity_fund_transactions"))) return;

    const orphanRows = await queryRunner.query("SELECT COUNT(*) AS `count` FROM `charity_fund_transactions` WHERE `accountId` IS NULL");
    if (Number(orphanRows[0]?.count || 0) > 0) throw new Error("Cannot backfill charity ledger while transactions are missing an account");

    await queryRunner.query("UPDATE `charity_fund_transactions` SET `businessSnapshot` = JSON_SET(COALESCE(`businessSnapshot`, JSON_OBJECT()), '$.__charityLedgerHistoryBackfill', 'legacy_v1') WHERE `ledgerVersion` <> 'charity_ledger_v2'");
    await this.rebuildAccounts(queryRunner, false);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("charity_fund_accounts")) || !(await queryRunner.hasTable("charity_fund_transactions"))) return;

    await queryRunner.query("UPDATE `charity_fund_transactions` SET `ledgerVersion` = 'legacy_v1', `ledgerSequence` = 0, `balanceBeforeFen` = 0, `balanceAfterFen` = 0, `previousHash` = NULL, `entryHash` = NULL, `businessSnapshot` = CASE WHEN JSON_LENGTH(JSON_REMOVE(COALESCE(`businessSnapshot`, JSON_OBJECT()), '$.__charityLedgerHistoryBackfill')) = 0 THEN NULL ELSE JSON_REMOVE(`businessSnapshot`, '$.__charityLedgerHistoryBackfill') END WHERE JSON_UNQUOTE(JSON_EXTRACT(`businessSnapshot`, '$.__charityLedgerHistoryBackfill')) = 'legacy_v1'");
    await this.rebuildAccounts(queryRunner, true);
  }

  private async rebuildAccounts(queryRunner: QueryRunner, preserveLegacy: boolean): Promise<void> {
    const accounts = await queryRunner.query("SELECT `id`, `scopeKey` FROM `charity_fund_accounts` ORDER BY `id` ASC") as AccountRow[];
    for (const account of accounts) {
      const legacyRows = preserveLegacy
        ? await queryRunner.query("SELECT `direction`, `amountFen`, `amount` FROM `charity_fund_transactions` WHERE `accountId` = ? AND `ledgerVersion` <> 'charity_ledger_v2' ORDER BY `createdAt` ASC, `id` ASC", [account.id])
        : [];
      let sequence = legacyRows.length;
      let balanceFen = legacyRows.reduce((sum: number, row: { direction: "credit" | "debit"; amountFen: string | number; amount: string }) => {
        const amountFen = this.integerFen(row.amountFen, row.amount);
        return row.direction === "credit" ? sum + amountFen : sum - amountFen;
      }, 0);
      let previousHash: string | null = null;
      let totalCreditFen = 0;
      let totalDebitFen = 0;

      const allRows = await queryRunner.query("SELECT `id`, `direction`, `type`, `sourceType`, `amount`, `amountFen`, `idempotencyKey`, `orderId`, `refundId`, `projectId`, `disbursementId` FROM `charity_fund_transactions` WHERE `accountId` = ? ORDER BY `createdAt` ASC, `id` ASC", [account.id]) as TransactionRow[];
      for (const row of allRows) {
        const amountFen = this.integerFen(row.amountFen, row.amount);
        if (row.direction === "credit") totalCreditFen += amountFen;
        else totalDebitFen += amountFen;
      }

      const rows = preserveLegacy
        ? await queryRunner.query("SELECT `id`, `direction`, `type`, `sourceType`, `amount`, `amountFen`, `idempotencyKey`, `orderId`, `refundId`, `projectId`, `disbursementId` FROM `charity_fund_transactions` WHERE `accountId` = ? AND `ledgerVersion` = 'charity_ledger_v2' ORDER BY `createdAt` ASC, `id` ASC", [account.id]) as TransactionRow[]
        : allRows;

      if (!preserveLegacy) {
        sequence = 0;
        balanceFen = 0;
      }

      for (const row of rows) {
        const amountFen = this.integerFen(row.amountFen, row.amount);
        const balanceBeforeFen = balanceFen;
        balanceFen = row.direction === "credit" ? balanceFen + amountFen : balanceFen - amountFen;
        sequence += 1;
        const sourceId = row.disbursementId || row.projectId || row.refundId || row.orderId || null;
        const entryHash = charityLedgerEntryHash({
          previousHash,
          scopeKey: account.scopeKey,
          sequence,
          businessKey: row.idempotencyKey,
          direction: row.direction,
          type: row.type,
          amountFen,
          balanceBeforeFen,
          balanceAfterFen: balanceFen,
          sourceType: row.sourceType,
          sourceId: sourceId ? String(sourceId) : null
        });
        await queryRunner.query("UPDATE `charity_fund_transactions` SET `amountFen` = ?, `balanceBeforeFen` = ?, `balanceAfterFen` = ?, `ledgerSequence` = ?, `previousHash` = ?, `entryHash` = ?, `ledgerVersion` = 'charity_ledger_v2' WHERE `id` = ?", [amountFen, balanceBeforeFen, balanceFen, sequence, previousHash, entryHash, row.id]);
        previousHash = entryHash;
      }

      const finalBalanceFen = allRows.reduce((sum, row) => {
        const amountFen = this.integerFen(row.amountFen, row.amount);
        return row.direction === "credit" ? sum + amountFen : sum - amountFen;
      }, 0);
      await queryRunner.query("UPDATE `charity_fund_accounts` SET `balanceFen` = ?, `totalCreditFen` = ?, `totalDebitFen` = ?, `ledgerSequence` = ?, `ledgerHeadHash` = ? WHERE `id` = ?", [finalBalanceFen, totalCreditFen, totalDebitFen, allRows.length, previousHash, account.id]);
    }
  }

  private integerFen(value: string | number, legacyAmount: string): number {
    const parsed = Number(value);
    const amountFen = Number.isSafeInteger(parsed) ? parsed : Math.round(Number(legacyAmount || 0) * 100);
    if (!Number.isSafeInteger(amountFen) || amountFen < 0) throw new Error("Charity ledger amount must be a non-negative safe integer");
    return amountFen;
  }
}
