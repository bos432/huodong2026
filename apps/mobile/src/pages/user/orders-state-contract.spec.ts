import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ordersSource = readFileSync(resolve(__dirname, "orders.vue"), "utf8");
const registrationSource = readFileSync(resolve(__dirname, "registration.vue"), "utf8");
const mySource = readFileSync(resolve(__dirname, "my.vue"), "utf8");

describe("mobile activity refund failure state contract", () => {
  it("shows activity refund failures with a recoverable explanation", () => {
    expect(ordersSource).toContain('if (refund?.status === "failed") return "退款处理异常";');
    expect(ordersSource).toContain('refund.failureReason || "请联系运营人员处理"');
    expect(registrationSource).toContain('refund.status !== "failed"');
    expect(registrationSource).toContain("退款处理异常");
  });

  it("counts failed activity refunds in the after-sale entry", () => {
    expect(mySource).toContain('["pending", "processing", "failed", "rejected"]');
  });
});
