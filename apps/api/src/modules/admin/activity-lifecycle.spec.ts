import { describe, expect, it } from "vitest";
import { ActivityStatus } from "../../shared/domain";
import { canTransitionActivity, hasPaidPaymentMethod, scheduledPublishWindowIssue } from "./activity-lifecycle";

describe("activity lifecycle", () => {
  it("allows the complete review and operating flow", () => {
    expect(canTransitionActivity("submit", ActivityStatus.Draft, ActivityStatus.PendingApproval)).toBe(true);
    expect(canTransitionActivity("approve", ActivityStatus.PendingApproval, ActivityStatus.Open)).toBe(true);
    expect(canTransitionActivity("close", ActivityStatus.Open, ActivityStatus.Closed)).toBe(true);
    expect(canTransitionActivity("reopen", ActivityStatus.Closed, ActivityStatus.Open)).toBe(true);
    expect(canTransitionActivity("end", ActivityStatus.Open, ActivityStatus.Ended)).toBe(true);
  });

  it("allows withdrawal, rejection, scheduling and cancellation only from their legal states", () => {
    expect(canTransitionActivity("withdraw", ActivityStatus.PendingApproval, ActivityStatus.Draft)).toBe(true);
    expect(canTransitionActivity("reject", ActivityStatus.PendingApproval, ActivityStatus.Rejected)).toBe(true);
    expect(canTransitionActivity("schedule", ActivityStatus.Open, ActivityStatus.Closed)).toBe(true);
    expect(canTransitionActivity("cancel", ActivityStatus.Closed, ActivityStatus.Cancelled)).toBe(true);
    expect(canTransitionActivity("cancel", ActivityStatus.Draft, ActivityStatus.Cancelled)).toBe(false);
  });

  it("rejects terminal-state reopening and direct review bypasses", () => {
    expect(canTransitionActivity("reopen", ActivityStatus.Cancelled, ActivityStatus.Open)).toBe(false);
    expect(canTransitionActivity("reopen", ActivityStatus.Ended, ActivityStatus.Open)).toBe(false);
    expect(canTransitionActivity("approve", ActivityStatus.Draft, ActivityStatus.Open)).toBe(false);
    expect(canTransitionActivity("withdraw", ActivityStatus.Open, ActivityStatus.Draft)).toBe(false);
  });

  it("requires scheduled publishing to be in the future and before the activity ends", () => {
    const now = new Date("2026-07-15T08:00:00.000Z");
    const endAt = new Date("2026-07-20T08:00:00.000Z");
    expect(scheduledPublishWindowIssue(new Date("2026-07-15T07:59:59.000Z"), now, endAt)).toBe("not_future");
    expect(scheduledPublishWindowIssue(endAt, now, endAt)).toBe("not_before_end");
    expect(scheduledPublishWindowIssue(new Date("2026-07-18T08:00:00.000Z"), now, endAt)).toBeNull();
  });

  it("requires at least one enabled paid payment method for paid activities", () => {
    expect(hasPaidPaymentMethod({ free: true, wechat: false, alipay: false, balance: false, offline: false })).toBe(false);
    expect(hasPaidPaymentMethod({ free: true, balance: true })).toBe(true);
    expect(hasPaidPaymentMethod({ offline: true })).toBe(true);
    expect(hasPaidPaymentMethod(null)).toBe(false);
  });
});
