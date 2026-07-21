import { createHash } from "crypto";

export type WalletLedgerHashInput = {
  previousHash?: string | null;
  walletId: number;
  transactionNo: string;
  direction: string;
  type: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  frozenBefore: string;
  frozenAfter: string;
  giftBefore: string;
  giftAfter: string;
  frozenGiftBefore: string;
  frozenGiftAfter: string;
  idempotencyKey?: string | null;
};

export function walletLedgerCanonical(input: WalletLedgerHashInput) {
  return [input.previousHash || "", input.walletId, input.transactionNo, input.direction, input.type, input.amount, input.balanceBefore, input.balanceAfter, input.frozenBefore, input.frozenAfter, input.giftBefore, input.giftAfter, input.frozenGiftBefore, input.frozenGiftAfter, input.idempotencyKey || ""].join("|");
}

export function walletLedgerHash(input: WalletLedgerHashInput) {
  return createHash("sha256").update(walletLedgerCanonical(input), "utf8").digest("hex");
}

export function verifyWalletLedgerChain(rows: Array<WalletLedgerHashInput & { entryHash: string }>) {
  let previousHash = "";
  for (const row of rows) {
    if ((row.previousHash || "") !== previousHash) return false;
    if (walletLedgerHash(row) !== row.entryHash) return false;
    previousHash = row.entryHash;
  }
  return true;
}
