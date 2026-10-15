import { describe, expect, it } from "vitest";
import { demoRegistrationResult, isDemoRegistration } from "./demo-registration";

describe("showcase demo registration", () => {
  it("recognizes only explicitly marked showcase activities", () => {
    expect(isDemoRegistration("qiwai-showcase", { isTest: true })).toBe(true);
    expect(isDemoRegistration("qiwai-showcase", { title: "【演示】周末活动" })).toBe(true);
    expect(isDemoRegistration("cq_tongliang", { isTest: true })).toBe(false);
    expect(isDemoRegistration("qiwai-showcase", { title: "真实周末活动" })).toBe(false);
  });

  it("returns an explicitly simulated result without a business record", () => {
    expect(demoRegistrationResult("周末示例活动")).toEqual({
      title: "周末示例活动",
      message: "演示报名已完成 · 仅保存在当前页面，不会创建真实报名、订单或收款。"
    });
  });
});
