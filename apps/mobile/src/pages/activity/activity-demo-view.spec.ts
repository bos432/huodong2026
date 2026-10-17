import { describe, expect, it } from "vitest";
import { activitiesForList, demoActivitiesAsPublicSummaries, demoDetailForTenant, shouldShowDemoActivities } from "./activity-demo-view";

describe("showcase activities remain isolated and non-bookable", () => {
  it("shows sample cards only when the showcase tenant has no real public activities", () => {
    expect(shouldShowDemoActivities("qiwai-showcase", 0)).toBe(true);
    expect(activitiesForList("qiwai-showcase", []).length).toBeGreaterThan(0);
    expect(activitiesForList("qiwai-showcase", [{ id: 42 } as any])).toEqual([{ id: 42 }]);
    expect(activitiesForList("cq_tongliang", [])).toEqual([]);
    expect(activitiesForList("manpi-demo", [])).toEqual([]);
  });

  it("provides a non-bookable sample detail only for the showcase tenant", () => {
    const activity = demoDetailForTenant("qiwai-showcase", 1, new Date("2026-10-15T00:00:00+08:00"));
    expect(activity).toMatchObject({ isTest: true, bookingDisabledReason: "演示活动，仅供浏览，不接受报名", registeredCount: null, remainingSeats: null });
    expect(activity?.notice).toContain("不接受真实报名或支付");
    expect(demoDetailForTenant("cq_tongliang", 1)).toBeNull();
    expect(demoDetailForTenant("qiwai-showcase", 999)).toBeNull();
  });

  it("uses packaged category photos for demo activity covers", () => {
    const citywalk = demoDetailForTenant("qiwai-showcase", 1);
    const ceramics = demoDetailForTenant("qiwai-showcase", 2);
    const nature = demoDetailForTenant("qiwai-showcase", 4);
    expect(citywalk?.coverUrl).toContain("activity-citywalk.jpg");
    expect(ceramics?.coverUrl).toContain("activity-ceramics.jpg");
    expect(nature?.coverUrl).toContain("activity-mountain.jpg");
  });

  it("turns samples into explicitly marked list rows with future dates and no capacity claims", () => {
    const rows = demoActivitiesAsPublicSummaries(activitiesForList("qiwai-showcase", []), new Date("2026-10-15T00:00:00+08:00"));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.isTest && row.registeredCount === null && row.remainingSeats === null && row.capacity === null)).toBe(true);
    expect(rows.every((row) => new Date(row.startTime!).getTime() > new Date("2026-10-15T00:00:00+08:00").getTime())).toBe(true);
  });
});
