import { describe, expect, it } from "vitest";
import { allocateWalletFunds } from "./wallet-funds";

describe("wallet fund allocation", () => {
  it("uses gift funds first in mixed mode", () => {
    expect(allocateWalletFunds(29900, 10000, 25000, "mixed")).toEqual({ cashFen: 4900, giftFen: 25000 });
  });

  it("honors an explicit cash or gift source", () => {
    expect(allocateWalletFunds(8000, 10000, 25000, "cash")).toEqual({ cashFen: 8000, giftFen: 0 });
    expect(allocateWalletFunds(8000, 10000, 25000, "gift")).toEqual({ cashFen: 0, giftFen: 8000 });
  });

  it("rejects insufficient and invalid allocations", () => {
    expect(allocateWalletFunds(36000, 10000, 25000, "mixed")).toBeNull();
    expect(allocateWalletFunds(11000, 10000, 25000, "cash")).toBeNull();
    expect(allocateWalletFunds(26000, 10000, 25000, "gift")).toBeNull();
    expect(allocateWalletFunds(0, 10000, 25000, "mixed")).toBeNull();
  });
});
