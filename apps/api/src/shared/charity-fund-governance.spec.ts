import { describe, expect, it } from "vitest";
import { cappedCharityReversalFen, hasSeparatedCharityActors } from "./charity-fund-governance";

describe("charity fund governance", () => {
  it("caps cumulative refund reversals at the original accrual", () => {
    expect(cappedCharityReversalFen(100, 30, 50)).toBe(50);
    expect(cappedCharityReversalFen(100, 80, 50)).toBe(20);
    expect(cappedCharityReversalFen(100, 100, 50)).toBe(0);
  });

  it("requires requester, reviewer and payer to be different administrators", () => {
    expect(hasSeparatedCharityActors(1, 2, 3)).toBe(true);
    expect(hasSeparatedCharityActors(1, 2, 2)).toBe(false);
    expect(hasSeparatedCharityActors(1, null, 3)).toBe(false);
  });
});
