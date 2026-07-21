import { describe, expect, it } from "vitest";
import { verifyWalletLedgerChain, walletLedgerHash } from "./wallet-ledger-hash";

function row(previousHash = "", overrides: Record<string, unknown> = {}) {
  const value = { previousHash, walletId: 7, transactionNo: `TX${previousHash.length}`, direction: "credit", type: "admin_recharge", amount: "10.00", balanceBefore: "0.00", balanceAfter: "10.00", frozenBefore: "0.00", frozenAfter: "0.00", giftBefore: "0.00", giftAfter: "0.00", frozenGiftBefore: "0.00", frozenGiftAfter: "0.00", idempotencyKey: "key-12345678", ...overrides } as any;
  return { ...value, entryHash: walletLedgerHash(value) };
}

describe("wallet ledger hash chain", () => {
  it("verifies an ordered immutable chain", () => {
    const first = row();
    const second = row(first.entryHash, { transactionNo: "TX2", balanceBefore: "10.00", balanceAfter: "7.00", amount: "3.00", direction: "debit", type: "balance_pay" });
    expect(verifyWalletLedgerChain([first, second])).toBe(true);
  });

  it("detects changed amount or balance snapshots", () => {
    const first = row();
    const second = row(first.entryHash, { transactionNo: "TX2" });
    expect(verifyWalletLedgerChain([first, { ...second, amount: "99.00" }])).toBe(false);
    expect(verifyWalletLedgerChain([{ ...first, balanceAfter: "11.00" }, second])).toBe(false);
    expect(verifyWalletLedgerChain([first, { ...second, frozenGiftAfter: "1.00" }])).toBe(false);
  });

  it("detects deletion, reordering and broken previous hashes", () => {
    const first = row();
    const second = row(first.entryHash, { transactionNo: "TX2" });
    expect(verifyWalletLedgerChain([second])).toBe(false);
    expect(verifyWalletLedgerChain([second, first])).toBe(false);
    expect(verifyWalletLedgerChain([first, { ...second, previousHash: "broken" }])).toBe(false);
  });
});
