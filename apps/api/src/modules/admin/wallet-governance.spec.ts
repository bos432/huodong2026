import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const service = readFileSync(resolve(process.cwd(), "src/modules/admin/admin.service.ts"), "utf8");

describe("admin wallet governance", () => {
  it("uses the bounded wallet transaction query for both member detail scopes", () => {
    const memberDetail = service.slice(service.indexOf("async memberDetail"), service.indexOf("private publicMemberLevel"));
    expect(memberDetail.match(/visibleWalletTransactionsForUser\(userId, admin\)/g)).toHaveLength(2);
    expect(memberDetail).not.toContain("this.walletTransactions.find(");
  });

  it("rechecks idempotency with a current read after the wallet lock", () => {
    expect(service).toContain("const repeated = await findExisting(true)");
    expect(service).toContain('mode: "pessimistic_read"');
    expect(service).toContain("frozenGiftBefore: fenToYuan(frozenGiftBeforeFen)");
    expect(service).toContain("frozenGiftAfter: fenToYuan(frozenGiftAfterFen)");
  });
});
