import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadMemberReviewEligibility } from "./member-review-eligibility";

describe("member registration review eligibility", () => {
  const now = Date.parse("2026-10-13T00:00:00Z");
  it("excludes unverified attendance, existing reviews, future and invalid dates", async () => {
    const rows = [
      { id: 1, status: "checked_in", activity: { endTime: "2020-01-01T00:00:00Z" } },
      { id: 2, status: "checked_in", activity: { endTime: "2020-01-01T00:00:00Z" } },
      { id: 3, status: "approved", activity: { endTime: "2020-01-01T00:00:00Z" } },
      { id: 4, status: "checked_in", activity: { endTime: "2099-01-01T00:00:00Z" } },
      { id: 5, status: "checked_in", activity: { endTime: "invalid" } }
    ];
    const loadIds = vi.fn().mockResolvedValue([2]);
    const eligible = await loadMemberReviewEligibility(rows, loadIds, now);
    expect(rows.map((row) => eligible.has(row.id))).toEqual([true, false, false, false, false]);
    expect(loadIds).toHaveBeenCalledWith([1, 2]);
    expect(loadIds).toHaveBeenCalledTimes(1);
  });
  it("skips queries for empty lists and propagates review lookup failures", async () => {
    const loadIds = vi.fn().mockRejectedValue(new Error("database unavailable"));
    expect(await loadMemberReviewEligibility([], loadIds, now)).toEqual(new Set());
    expect(loadIds).not.toHaveBeenCalled();
    await expect(loadMemberReviewEligibility([{ id: 1, status: "checked_in", activity: { endTime: "2020-01-01" } }], loadIds, now)).rejects.toThrow("database unavailable");
  });
  it("wires flags only to the scoped member registration query", () => {
    const service = readFileSync(resolve(__dirname, "public.service.ts"), "utf8");
    const list = service.slice(service.indexOf("private async myRegistrationsForTenant"), service.indexOf("async myCourseOrders"));
    expect(list).toContain("loadMemberReviewEligibility(rows");
    expect(list).toContain("canReview: reviewableIds.has(registration.id)");
    expect(list).toContain('where("user.id = :userId", { userId })');
  });
});
