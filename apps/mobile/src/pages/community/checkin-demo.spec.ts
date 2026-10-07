import { describe, expect, it } from "vitest";
import { DEMO_CHECKIN_ROUTE, getDemoCheckinFallback } from "./checkin-demo";

describe("community check-in demo fallback", () => {
  it("offers a clearly labeled local challenge when the real task is unavailable", () => {
    const fallback = getDemoCheckinFallback("共修暂未开放");

    expect(fallback.route).toBe(DEMO_CHECKIN_ROUTE);
    expect(fallback.title).toContain("演示");
    expect(fallback.description).toContain("不会写入真实签到记录");
    expect(fallback.errorMessage).toBe("共修暂未开放");
  });
});
