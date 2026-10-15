import { describe, expect, it } from "vitest";
import { demoActivitiesForTenant } from "./demo-activity-feed";

describe("demo activity feed", () => {
  it("shows browseable but explicitly demo-only cards for the showcase tenant", () => {
    const activities = demoActivitiesForTenant("qiwai-showcase", []);
    expect(activities.length).toBeGreaterThan(0);
    expect(activities.every((item) => item.isDemo && item.dataSource === "mock")).toBe(true);
  });

  it("never substitutes samples for an operating tenant or real public activity", () => {
    expect(demoActivitiesForTenant("cq_tongliang", []).length).toBe(0);
    expect(demoActivitiesForTenant("manpi-demo", []).length).toBe(0);
    expect(demoActivitiesForTenant("qiwai-showcase", [{ id: 42 } as any])).toEqual([]);
  });
});
