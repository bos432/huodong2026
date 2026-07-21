import { describe, expect, it } from "vitest";
import { charityLedgerBusinessKey, charityLedgerEntryHash, verifyCharityLedgerChain } from "./charity-ledger-hash";

describe("charity ledger hash", () => {
  it("builds and verifies a deterministic balance chain", () => {
    const first = { previousHash: null, scopeKey: "tenant:7", sequence: 1, businessKey: "accrual:1", direction: "credit" as const, type: "charity_accrual", amountFen: 500, balanceBeforeFen: 0, balanceAfterFen: 500, sourceType: "activity_order", sourceId: "1" };
    const firstHash = charityLedgerEntryHash(first);
    const second = { previousHash: firstHash, scopeKey: "tenant:7", sequence: 2, businessKey: "disbursement:1", direction: "debit" as const, type: "project_disbursement", amountFen: 200, balanceBeforeFen: 500, balanceAfterFen: 300, sourceType: "charity_project", sourceId: "9" };
    const secondHash = charityLedgerEntryHash(second);
    expect(verifyCharityLedgerChain([{ ...first, entryHash: firstHash }, { ...second, entryHash: secondHash }])).toBe(true);
    expect(verifyCharityLedgerChain([{ ...first, entryHash: firstHash }, { ...second, amountFen: 201, entryHash: secondHash }])).toBe(false);
  });

  it("compresses external business keys into the ledger column limit", () => {
    const key = charityLedgerBusinessKey("charity-pay", "x".repeat(160));
    expect(key).toHaveLength(76);
    expect(key).toBe(charityLedgerBusinessKey("charity-pay", "x".repeat(160)));
  });
});
