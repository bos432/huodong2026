import { describe, expect, it } from "vitest";
import { defaultHomepageSections, HOMEPAGE_SECTION_TYPES, isPlainJsonObject } from "./homepage-defaults";

describe("homepage defaults", () => {
  it("creates ordered enabled modules with json object config and layout", () => {
    const sections = defaultHomepageSections();
    expect(sections.length).toBeGreaterThan(0);
    expect(sections.every((item) => HOMEPAGE_SECTION_TYPES.includes(item.type as any))).toBe(true);
    expect(sections.every((item) => item.enabled)).toBe(true);
    expect(sections.every((item) => isPlainJsonObject(item.config) && isPlainJsonObject(item.layout))).toBe(true);
    expect(sections.map((item) => item.sortOrder)).toEqual([...sections.map((item) => item.sortOrder)].sort((a, b) => a - b));
  });

  it("keeps the first screen usable by default", () => {
    const sections = defaultHomepageSections();
    const types = sections.map((item) => item.type);
    expect(types).toContain("search_bar");
    expect(types).toContain("hero");
    expect(types).toContain("quick_nav");
    expect(types).toContain("activity_feed");
    const focus = sections.find((item) => item.type === "featured_activities");
    const feed = sections.find((item) => item.type === "activity_feed");
    const quickNav = sections.find((item) => item.type === "quick_nav");
    expect(focus?.title).toBe("本周主推");
    expect(focus?.config.display).toBe("lead_rail");
    expect(feed?.title).toBe("近期活动");
    expect((quickNav?.config.items as Array<{ label: string }>).map((item) => item.label)).toEqual(["活动日历", "我的报名", "志愿服务", "公益项目"]);
  });
});
