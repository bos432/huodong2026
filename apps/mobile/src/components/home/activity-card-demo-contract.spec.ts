import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./ActivityCard.vue", import.meta.url), "utf8");

describe("demo activity card trust contract", () => {
  it("does not present demo availability, distance, venue, organizer, or attendance as live facts", () => {
    expect(source).toContain("v-if=\"!activity.isDemo\"");
    expect(source).toContain("地点信息以正式发布为准");
    expect(source).toContain("主理人资料待审核");
    expect(source).toContain("示例价");
    expect(source).toContain("当前仅用于页面展示");
    expect(source).toContain("报名数据未接入 · 名额信息以正式发布为准");
  });

  it("keeps live API activity fields visible for real activities", () => {
    expect(source).toContain("`${activity.distanceText} · ${activity.venue}`");
    expect(source).toContain("activity.registrationCount");
    expect(source).toContain("activity.remainingSlots");
    expect(source).toContain("activity.hostName");
  });
});
