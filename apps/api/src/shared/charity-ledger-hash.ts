import { createHash } from "crypto";

export type CharityLedgerHashInput = {
  previousHash: string | null;
  scopeKey: string;
  sequence: number;
  businessKey: string;
  direction: "credit" | "debit";
  type: string;
  amountFen: number;
  balanceBeforeFen: number;
  balanceAfterFen: number;
  sourceType: string;
  sourceId?: string | null;
};

export function charityLedgerEntryHash(input: CharityLedgerHashInput) {
  if (!Number.isSafeInteger(input.sequence) || input.sequence <= 0) throw new Error("ledger sequence must be a positive safe integer");
  for (const [key, value] of Object.entries({ amountFen: input.amountFen, balanceBeforeFen: input.balanceBeforeFen, balanceAfterFen: input.balanceAfterFen })) {
    if (!Number.isSafeInteger(value)) throw new Error(`${key} must be a safe integer`);
  }
  const canonical = [input.previousHash || "GENESIS", input.scopeKey, input.sequence, input.businessKey, input.direction, input.type, input.amountFen, input.balanceBeforeFen, input.balanceAfterFen, input.sourceType, input.sourceId || ""].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

export function charityLedgerBusinessKey(prefix: string, businessKey: string) {
  const normalizedPrefix = String(prefix || "").trim();
  if (!/^[A-Za-z0-9_-]{2,15}$/.test(normalizedPrefix)) throw new Error("ledger business key prefix is invalid");
  return `${normalizedPrefix}:${createHash("sha256").update(String(businessKey || "")).digest("hex")}`;
}

export function verifyCharityLedgerChain(rows: Array<CharityLedgerHashInput & { entryHash: string }>) {
  let previousHash: string | null = null;
  for (const row of rows) {
    if (row.previousHash !== previousHash || charityLedgerEntryHash({ ...row, previousHash }) !== row.entryHash) return false;
    previousHash = row.entryHash;
  }
  return true;
}
