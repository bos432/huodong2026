import { describe, expect, it } from "vitest";
import { createDemoActivities, demoActivityDate } from "./demo-activity-dates";

describe("demo activity dates", () => {
  it("generates upcoming dates with matching weekdays", () => {
    const items = createDemoActivities([
      { id: 1, title: "Walk", startTime: "10:00", city: "重庆", distanceText: "", venue: "", cover: "", hostName: "", category: "", tags: [], priceText: "", registrationCount: 0, remainingSlots: 0, status: "open", highlight: "", refundPolicy: "", insuranceIncluded: false }
    ], new Date(2026, 9, 13));
    expect(items[0]).toMatchObject({ date: "10/14", weekday: "周三" });
  });

  it("moves a past month/day to the next year and preserves its local time", () => {
    expect(demoActivityDate("10/07", "10:00", new Date(2026, 9, 13))).toBe("2027-10-07T10:00:00+08:00");
  });
});
