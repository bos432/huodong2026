import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("registration payment query state contract", () => {
  const source = readFileSync("src/modules/public/public.service.ts", "utf8");
  const method = source.slice(source.indexOf("async queryRegistrationPayment"), source.indexOf("async closeRegistrationPayment"));

  it("settles a provider-success query through the idempotent payment path", () => {
    expect(method).toContain("if (result.status === \"success\")");
    expect(method).toContain("await this.applySuccessfulPayment");
    expect(method).toContain("result.transactionNo");
  });

  it("checks the provider amount before settling the local order", () => {
    expect(method).toContain("sameMoneyAmount(order.amount, result.amount)");
    expect(method).toContain("支付查单金额与订单金额不一致");
  });
});
