import { describe, expect, it } from "vitest";
import type { PublicMemberRegistrationRecord } from "@activity/shared";
import { summarizeProfileRegistrations } from "./profile-state";

const now = Date.parse("2026-10-13T10:00:00+08:00");
function row(id: number, status: string, end: string, extras = {}): PublicMemberRegistrationRecord {
  return { id, status, activity: { id, title: `Test ${id}`, startTime: "2026-10-13T08:00:00+08:00", endTime: end }, ...extras };
}

describe("personal activity record summary", () => {
  it("counts attendance only with check-in and excludes cancelled or refunded bookings", () => {
    const result = summarizeProfileRegistrations([
      row(1, "approved", "2026-10-14T12:00:00+08:00"),
      row(2, "checked_in", "2026-10-13T09:00:00+08:00", { canReview: true }),
      row(3, "approved", "2026-10-12T09:00:00+08:00"),
      row(4, "cancelled", "2026-10-14T12:00:00+08:00"),
      row(5, "completed", "2026-10-12T09:00:00+08:00", { latestRefund: { status: "completed" } }),
      row(6, "pending_review", "2026-10-14T12:00:00+08:00")
    ], now);
    expect(result.attendedCount).toBe(1);
    expect(result.upcoming.map((item) => item.id)).toEqual([1]);
    expect(result.records.map((item) => item.id)).toEqual([2]);
    expect(result.reviewable.map((item) => item.id)).toEqual([2]);
    expect(result.ticketCount).toBe(2);
  });

  it("does not infer review eligibility or attendance from an ended approved booking", () => {
    const result = summarizeProfileRegistrations([row(1, "approved", "2026-10-12T09:00:00+08:00")], now);
    expect(result.attendedCount).toBe(0);
    expect(result.reviewable).toEqual([]);
    expect(result.records).toEqual([]);
  });

  it("keeps eligibility unknown when older APIs omit the review flag", () => {
    const result = summarizeProfileRegistrations([row(1, "checked_in", "2026-10-12T09:00:00+08:00")], now);
    expect(result.reviewable).toEqual([]);
    expect(result.reviewEligibilityKnown).toBe(false);
  });

  it("counts and links reviewable registrations without redirecting to the upcoming journey tab", () => {
    const result = summarizeProfileRegistrations([
      row(1, "checked_in", "2026-10-12T09:00:00+08:00", { canReview: true }),
      row(2, "checked_in", "2026-10-12T09:00:00+08:00", { canReview: false })
    ], now);
    expect(result.reviewable.map((item) => item.id)).toEqual([1]);
    expect(result.reviewEligibilityKnown).toBe(true);
  });

  it("chooses the nearest upcoming activity and does not mutate the API rows", () => {
    const rows = [
      { ...row(2, "approved", "2026-10-15T12:00:00+08:00"), activity: { id: 2, title: "Later", startTime: "2026-10-15T08:00:00+08:00", endTime: "2026-10-15T12:00:00+08:00" } },
      { ...row(1, "approved", "2026-10-14T12:00:00+08:00"), activity: { id: 1, title: "Sooner", startTime: "2026-10-14T08:00:00+08:00", endTime: "2026-10-14T12:00:00+08:00" } }
    ];
    expect(summarizeProfileRegistrations(rows, now).upcoming[0].id).toBe(1);
    expect(rows[0].id).toBe(2);
  });
});
