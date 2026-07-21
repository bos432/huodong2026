import { describe, expect, it } from "vitest";
import { reconcileMallStatement } from "./mall-statement-reconciliation";

describe("reconcileMallStatement", () => {
  it("matches the same order, amount and paid lifecycle", () => {
    expect(reconcileMallStatement({ amount: "19.90", orderNo: "MALL-1" }, { amount: "19.9", status: "paid" })).toEqual({
      status: "matched", discrepancyType: null, remark: "渠道账单与商城订单匹配"
    });
  });

  it("reports an unknown order", () => {
    expect(reconcileMallStatement({ amount: "19.90", orderNo: "MISSING" }, null).discrepancyType).toBe("unknown_order");
  });

  it("detects a one-cent mismatch", () => {
    expect(reconcileMallStatement({ amount: "19.91", orderNo: "MALL-1" }, { amount: "19.90", status: "paid" }).discrepancyType).toBe("amount_mismatch");
  });

  it("rejects a local order that is not in a paid lifecycle", () => {
    expect(reconcileMallStatement({ amount: "19.90", orderNo: "MALL-1" }, { amount: "19.90", status: "pending" }).discrepancyType).toBe("order_status_mismatch");
  });
});
