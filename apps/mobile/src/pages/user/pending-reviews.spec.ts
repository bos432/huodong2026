import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pendingReviewState } from "./pending-review-state";

describe("pending feedback queue", () => {
  it("never infers eligibility from attendance or an absent API flag", () => {
    const state = pendingReviewState([{ id: 1, status: "checked_in" }, { id: 2, status: "checked_in", canReview: true }, { id: 3, status: "checked_in", canReview: false }, { id: 4, status: "approved" }]);
    expect(state.rows.map((row) => row.id)).toEqual([2]);
    expect(state.unknown).toBe(true);
    expect(pendingReviewState([]).unknown).toBe(false);
  });
  it("links the profile to the queue, never the default upcoming journeys", () => {
    const profile = readFileSync(resolve(__dirname, "../prototype/me.vue"), "utf8");
    expect(profile).toContain('path: "/pages/user/pending-reviews"');
    expect(profile).not.toContain('if (item.title === "待评价"');
    const page = readFileSync(resolve(__dirname, "pending-reviews.vue"), "utf8");
    expect(page).toContain('"/public/me/registrations"');
    expect(page).toContain('onHide(');
    expect(page).toContain('current-path="/pages/user/pending-reviews"');
    expect(page).toContain('aria-label="返回上一页"');
    expect(page).toContain("userToken === getUserToken()");
    expect(page).toContain("onUnload(invalidate)");
  });
});
