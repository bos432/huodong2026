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
    const types = defaultHomepageSections().map((item) => item.type);
    expect(types).toContain("search_bar");
    expect(types).toContain("hero");
    expect(types).toContain("quick_nav");
    expect(types).toContain("activity_feed");
  });
});
