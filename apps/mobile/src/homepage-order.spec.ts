import { describe, expect, it } from "vitest";
import { groupHomepageActivities, sortHomepageSections } from "./homepage-order";

describe("sortHomepageSections", () => {
  it("keeps the backend sort order across different module types", () => {
    const sections = [
      { id: 1, type: "activity_feed", sortOrder: 10 },
      { id: 2, type: "featured_activities", sortOrder: 30 },
      { id: 3, type: "image_banner", sortOrder: 20 }
    ];

    expect(sortHomepageSections(sections).map((section) => section.id)).toEqual([1, 3, 2]);
  });

  it("uses the backend id tie-breaker when sort values are equal", () => {
    const sections = [
      { id: 1, type: "activity_feed", sortOrder: 20 },
      { id: 2, type: "featured_activities", sortOrder: 20 },
      { id: 3, type: "activity_tabs", sortOrder: 20 }
    ];

    expect(sortHomepageSections(sections).map((section) => section.id)).toEqual([1, 2, 3]);
  });

  it("groups homepage activity flow by Shanghai calendar date", () => {
    const groups = groupHomepageActivities([
      { id: 1, startTime: "2026-10-03T01:00:00.000Z" },
      { id: 2, startTime: "2026-10-02T09:00:00+08:00" },
      { id: 3, startTime: null }
    ]);

    expect(groups.map((group) => group.key)).toEqual(["2026-10-02", "2026-10-03", "undated"]);
    expect(groups[0].items.map((item) => item.id)).toEqual([2]);
  });
});
