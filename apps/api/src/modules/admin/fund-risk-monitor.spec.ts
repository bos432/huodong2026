import { describe, expect, it } from "vitest";
import { rediscoverFundRisk } from "../../shared/fund-risk-lifecycle";

describe("fund risk candidate merge", () => {
  it("keeps required candidate fields when a new alert is rediscovered", () => {
    const row = { status: "open", occurrenceCount: 0, type: undefined, severity: undefined, title: undefined } as any;
    const candidate = { type: "statement_mismatch", severity: "high", title: "渠道账单差异" };
    Object.assign(row, rediscoverFundRisk(row), candidate);
    expect(row).toMatchObject({ status: "open", occurrenceCount: 1, type: "statement_mismatch", severity: "high", title: "渠道账单差异" });
  });
});
