import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/modules/admin/admin.service.ts"), "utf8");

describe("agent settlement business boundary", () => {
  it("excludes test activities and test users from formal payment and refund settlement rows", () => {
    const transactions = source.slice(source.indexOf("private agentSettlementTransactions"), source.indexOf("private resolveAgentCommissionRate"));
    expect(transactions).toContain("settlementActivity.isTest = 0");
    expect(transactions).toContain("settlementUser.sourceChannel <> 'test'");
    expect(transactions).toContain("settlementRefundActivity.isTest = 0");
    expect(transactions).toContain("settlementRefundUser.sourceChannel <> 'test'");
  });
});
