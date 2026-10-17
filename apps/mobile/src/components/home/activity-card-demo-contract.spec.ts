import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./ActivityCard.vue", import.meta.url), "utf8");

describe("demo activity card trust contract", () => {
  it("does not present demo availability, distance, venue, organizer, or attendance as live facts", () => {
    expect(source).toContain("v-if=\"!activity.isDemo\"");
    expect(source).toContain("地点与主理人信息以正式发布为准");
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

  it("lets cards grow to fit their content and keeps the cover aligned", () => {
    expect(source).toMatch(/\.activity-card\{[^}]*min-height:164px/);
    expect(source).not.toMatch(/\.activity-card\{[^}]*height:153px/);
    expect(source).toContain("class=\"activity-cover-frame\"");
    expect(source).toContain(".activity-cover-frame{position:relative");
    expect(source).toContain(".activity-cover{position:absolute;inset:0");
  });
});
