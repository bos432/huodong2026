import { createHash } from "crypto";
import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";
import { walletLedgerHash } from "../shared/wallet-ledger-hash";

type LedgerRow = Record<string, unknown>;

function legacyHash(row: LedgerRow, previousHash: string) {
  const canonical = [previousHash, row.walletId, row.transactionNo, row.direction, row.type, Number(row.amount).toFixed(2), Number(row.balanceBefore).toFixed(2), Number(row.balanceAfter).toFixed(2), Number(row.frozenBefore).toFixed(2), Number(row.frozenAfter).toFixed(2), Number(row.giftBefore).toFixed(2), Number(row.giftAfter).toFixed(2), row.idempotencyKey ? String(row.idempotencyKey) : ""].join("|");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export class WalletFrozenGiftLedger1783960000000 implements MigrationInterface {
  name = "WalletFrozenGiftLedger1783960000000";

  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasColumn("wallet_transactions", "frozenGiftBefore"))) await queryRunner.addColumn("wallet_transactions", new TableColumn({ name: "frozenGiftBefore", type: "decimal", precision: 12, scale: 2, default: 0 }));
    if (!(await queryRunner.hasColumn("wallet_transactions", "frozenGiftAfter"))) await queryRunner.addColumn("wallet_transactions", new TableColumn({ name: "frozenGiftAfter", type: "decimal", precision: 12, scale: 2, default: 0 }));
    await queryRunner.query("DROP TRIGGER IF EXISTS wallet_transactions_hash_chain_before_insert");
    const rows = await this.rows(queryRunner);
    let walletId = 0;
    let previousHash = "";
    for (const row of rows) {
      const currentWalletId = Number(row.walletId);
      if (currentWalletId !== walletId) {
        walletId = currentWalletId;
        previousHash = "";
      }
      const entryHash = walletLedgerHash({
        previousHash,
        walletId,
        transactionNo: String(row.transactionNo),
        direction: String(row.direction),
        type: String(row.type),
        amount: Number(row.amount).toFixed(2),
        balanceBefore: Number(row.balanceBefore).toFixed(2),
        balanceAfter: Number(row.balanceAfter).toFixed(2),
        frozenBefore: Number(row.frozenBefore).toFixed(2),
        frozenAfter: Number(row.frozenAfter).toFixed(2),
        giftBefore: Number(row.giftBefore).toFixed(2),
        giftAfter: Number(row.giftAfter).toFixed(2),
        frozenGiftBefore: Number(row.frozenGiftBefore).toFixed(2),
        frozenGiftAfter: Number(row.frozenGiftAfter).toFixed(2),
        idempotencyKey: row.idempotencyKey ? String(row.idempotencyKey) : null
      });
      await queryRunner.query("UPDATE wallet_transactions SET previousHash = ?, entryHash = ? WHERE id = ?", [previousHash, entryHash, row.id]);
      previousHash = entryHash;
    }
    await queryRunner.query(`CREATE TRIGGER wallet_transactions_hash_chain_before_insert BEFORE INSERT ON wallet_transactions FOR EACH ROW BEGIN SET NEW.previousHash = COALESCE((SELECT entryHash FROM wallet_transactions WHERE walletId = NEW.walletId ORDER BY id DESC LIMIT 1), ''); SET NEW.entryHash = SHA2(CONCAT_WS('|', NEW.previousHash, NEW.walletId, NEW.transactionNo, NEW.direction, NEW.type, NEW.amount, NEW.balanceBefore, NEW.balanceAfter, NEW.frozenBefore, NEW.frozenAfter, NEW.giftBefore, NEW.giftAfter, NEW.frozenGiftBefore, NEW.frozenGiftAfter, COALESCE(NEW.idempotencyKey, '')), 256); END`);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query("DROP TRIGGER IF EXISTS wallet_transactions_hash_chain_before_insert");
    const rows = await this.rows(queryRunner);
    let walletId = 0;
    let previousHash = "";
    for (const row of rows) {
      const currentWalletId = Number(row.walletId);
      if (currentWalletId !== walletId) {
        walletId = currentWalletId;
        previousHash = "";
      }
      const entryHash = legacyHash(row, previousHash);
      await queryRunner.query("UPDATE wallet_transactions SET previousHash = ?, entryHash = ? WHERE id = ?", [previousHash, entryHash, row.id]);
      previousHash = entryHash;
    }
    await queryRunner.query(`CREATE TRIGGER wallet_transactions_hash_chain_before_insert BEFORE INSERT ON wallet_transactions FOR EACH ROW BEGIN SET NEW.previousHash = COALESCE((SELECT entryHash FROM wallet_transactions WHERE walletId = NEW.walletId ORDER BY id DESC LIMIT 1), ''); SET NEW.entryHash = SHA2(CONCAT_WS('|', NEW.previousHash, NEW.walletId, NEW.transactionNo, NEW.direction, NEW.type, NEW.amount, NEW.balanceBefore, NEW.balanceAfter, NEW.frozenBefore, NEW.frozenAfter, NEW.giftBefore, NEW.giftAfter, COALESCE(NEW.idempotencyKey, '')), 256); END`);
    if (await queryRunner.hasColumn("wallet_transactions", "frozenGiftAfter")) await queryRunner.dropColumn("wallet_transactions", "frozenGiftAfter");
    if (await queryRunner.hasColumn("wallet_transactions", "frozenGiftBefore")) await queryRunner.dropColumn("wallet_transactions", "frozenGiftBefore");
  }

  private rows(queryRunner: QueryRunner): Promise<LedgerRow[]> {
    return queryRunner.query("SELECT id, walletId, transactionNo, direction, type, amount, balanceBefore, balanceAfter, frozenBefore, frozenAfter, giftBefore, giftAfter, frozenGiftBefore, frozenGiftAfter, idempotencyKey FROM wallet_transactions ORDER BY walletId ASC, id ASC");
  }
}
