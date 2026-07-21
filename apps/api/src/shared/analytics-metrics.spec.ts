import { describe, expect, it } from "vitest";
import { analyticsDateText, analyticsDayRange, conversionMetricAmountFen, netRevenueFen } from "./analytics-metrics";
describe("analytics metric definitions", () => {
  it("groups timestamps by Asia/Shanghai calendar date", () => {
    expect(analyticsDateText("2026-07-12T16:30:00.000Z")).toBe("2026-07-13");
    const range = analyticsDayRange("2026-07-13");
    expect(range.start.toISOString()).toBe("2026-07-12T16:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-07-13T16:00:00.000Z");
  });
  it("rejects malformed and impossible calendar dates", () => {
    expect(() => analyticsDayRange("2026-7-13")).toThrow("invalid analytics date");
    expect(() => analyticsDayRange("2026-02-30")).toThrow("invalid analytics date");
  });
  it("stores payment and refund amounts with opposite signs", () => {
    expect(conversionMetricAmountFen("pay", "12.34")).toBe(1234);
    expect(conversionMetricAmountFen("refund", "2.34")).toBe(-234);
  });
  it("does not report negative net revenue", () => expect(netRevenueFen(100, 120)).toBe(0));
});
