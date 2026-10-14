import { describe, expect, it } from "vitest";
import { queryInspirations, weekendInspirations } from "./weekend-inspiration";

describe("weekend inspiration discovery", () => {
  it("keeps Tongliang content within the approved merchants", () => {
    expect(queryInspirations("cq_tongliang", "推荐", "")).toHaveLength(6);
    expect(queryInspirations("qiwai-showcase", "推荐", "")).toHaveLength(6);
    expect(queryInspirations("chengdu", "推荐", "")).toEqual([]);
  });
  it("respects combined category and keyword filters", () => {
    expect(queryInspirations("cq_tongliang", "轻户外", "玄天湖").map(item => item.id)).toEqual(["lake"]);
    expect(queryInspirations("cq_tongliang", "阅读分享", "玄天湖")).toEqual([]);
    expect(queryInspirations("cq_tongliang", "推荐", "  绘本 ").map(item => item.id)).toEqual(["reading"]);
  });
  it("provides sources and explicit context without bookable activity fields", () => {
    for (const item of weekendInspirations) {
      expect(item.sourceUrl).toMatch(/^https?:\/\//);
      expect(item.context.length).toBeGreaterThan(5);
      expect(item).not.toHaveProperty("registrationDeadline");
      expect(item).not.toHaveProperty("price");
    }
  });
});
