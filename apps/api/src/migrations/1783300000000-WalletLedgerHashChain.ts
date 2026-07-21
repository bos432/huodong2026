import { createHash } from "crypto";
import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

function legacyWalletLedgerHash(input: Record<string, unknown>) {
  const canonical = [input.previousHash || "", input.walletId, input.transactionNo, input.direction, input.type, input.amount, input.balanceBefore, input.balanceAfter, input.frozenBefore, input.frozenAfter, input.giftBefore, input.giftAfter, input.idempotencyKey || ""].join("|");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export class WalletLedgerHashChain1783300000000 implements MigrationInterface {
  name = "WalletLedgerHashChain1783300000000";

  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasColumn("wallet_transactions", "previousHash"))) await queryRunner.addColumn("wallet_transactions", new TableColumn({ name: "previousHash", type: "char", length: "64", isNullable: true }));
    if (!(await queryRunner.hasColumn("wallet_transactions", "entryHash"))) await queryRunner.addColumn("wallet_transactions", new TableColumn({ name: "entryHash", type: "char", length: "64", isNullable: true }));
    const table = await queryRunner.getTable("wallet_transactions");
    if (!table?.indices.some((index) => index.name === "IDX_wallet_transactions_previous_hash")) await queryRunner.createIndex("wallet_transactions", new TableIndex({ name: "IDX_wallet_transactions_previous_hash", columnNames: ["previousHash"] }));
    if (!table?.indices.some((index) => index.name === "IDX_wallet_transactions_entry_hash")) await queryRunner.createIndex("wallet_transactions", new TableIndex({ name: "IDX_wallet_transactions_entry_hash", columnNames: ["entryHash"] }));
    const rows = await queryRunner.query("SELECT id, walletId, transactionNo, direction, type, amount, balanceBefore, balanceAfter, frozenBefore, frozenAfter, giftBefore, giftAfter, idempotencyKey FROM wallet_transactions ORDER BY walletId ASC, id ASC") as Array<Record<string, unknown>>;
    let walletId = 0;
    let previousHash = "";
    for (const row of rows) {
      const currentWalletId = Number(row.walletId);
      if (currentWalletId !== walletId) {
        walletId = currentWalletId;
        previousHash = "";
      }
      const entryHash = legacyWalletLedgerHash({ previousHash, walletId, transactionNo: String(row.transactionNo), direction: String(row.direction), type: String(row.type), amount: Number(row.amount).toFixed(2), balanceBefore: Number(row.balanceBefore).toFixed(2), balanceAfter: Number(row.balanceAfter).toFixed(2), frozenBefore: Number(row.frozenBefore).toFixed(2), frozenAfter: Number(row.frozenAfter).toFixed(2), giftBefore: Number(row.giftBefore).toFixed(2), giftAfter: Number(row.giftAfter).toFixed(2), idempotencyKey: row.idempotencyKey ? String(row.idempotencyKey) : null });
      await queryRunner.query("UPDATE wallet_transactions SET previousHash = ?, entryHash = ? WHERE id = ?", [previousHash, entryHash, row.id]);
      previousHash = entryHash;
    }
    await queryRunner.query("DROP TRIGGER IF EXISTS wallet_transactions_hash_chain_before_insert");
    await queryRunner.query(`CREATE TRIGGER wallet_transactions_hash_chain_before_insert BEFORE INSERT ON wallet_transactions FOR EACH ROW BEGIN SET NEW.previousHash = COALESCE((SELECT entryHash FROM wallet_transactions WHERE walletId = NEW.walletId ORDER BY id DESC LIMIT 1), ''); SET NEW.entryHash = SHA2(CONCAT_WS('|', NEW.previousHash, NEW.walletId, NEW.transactionNo, NEW.direction, NEW.type, NEW.amount, NEW.balanceBefore, NEW.balanceAfter, NEW.frozenBefore, NEW.frozenAfter, NEW.giftBefore, NEW.giftAfter, COALESCE(NEW.idempotencyKey, '')), 256); END`);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query("DROP TRIGGER IF EXISTS wallet_transactions_hash_chain_before_insert");
    const table = await queryRunner.getTable("wallet_transactions");
    for (const name of ["IDX_wallet_transactions_entry_hash", "IDX_wallet_transactions_previous_hash"]) if (table?.indices.some((index) => index.name === name)) await queryRunner.dropIndex("wallet_transactions", name);
    if (await queryRunner.hasColumn("wallet_transactions", "entryHash")) await queryRunner.dropColumn("wallet_transactions", "entryHash");
    if (await queryRunner.hasColumn("wallet_transactions", "previousHash")) await queryRunner.dropColumn("wallet_transactions", "previousHash");
  }
}
