import { describe, expect, it } from "vitest";
import { isNotificationScheduleDue } from "./notification-schedule-due";

describe("activity reminder delivery window", () => {
  const now = new Date("2026-10-12T09:00:00Z");
  const rule = (overrides = {}) => ({ enabled: true, lastRunAt: null, beforeHours: 24, activity: { status: "open", startTime: new Date("2026-10-13T09:00:00Z") }, ...overrides });

  it("sends at the trigger boundary and accepts closed registration", () => {
    expect(isNotificationScheduleDue(rule(), now)).toBe(true);
    expect(isNotificationScheduleDue(rule({ activity: { status: "closed", startTime: new Date("2026-10-13T09:00:00Z") } }), now)).toBe(true);
    expect(isNotificationScheduleDue(rule(), new Date(now.getTime() - 1))).toBe(false);
  });

  it.each(["draft", "pending_approval", "rejected", "cancelled", "ended"])("does not send for %s activities", (status) => {
    expect(isNotificationScheduleDue(rule({ activity: { status, startTime: new Date("2026-10-13T09:00:00Z") } }), now)).toBe(false);
  });

  it("does not replay reminders at or after activity start", () => {
    expect(isNotificationScheduleDue(rule(), new Date("2026-10-13T09:00:00Z"))).toBe(false);
    expect(isNotificationScheduleDue(rule(), new Date("2026-10-20T09:00:00Z"))).toBe(false);
  });

  it("rejects disabled, claimed, missing and invalid schedules", () => {
    for (const input of [rule({enabled:false}), rule({lastRunAt:now}), rule({activity:null}), rule({beforeHours:-1}), rule({beforeHours:NaN}), rule({activity:{status:"open",startTime:"invalid"}})]) {
      expect(isNotificationScheduleDue(input, now)).toBe(false);
    }
    expect(isNotificationScheduleDue(rule(), new Date(NaN))).toBe(false);
  });

  it("rechecking rejects a schedule edited after candidate selection", () => {
    const candidate = rule();
    expect(isNotificationScheduleDue(candidate, now)).toBe(true);
    candidate.activity.status = "cancelled";
    expect(isNotificationScheduleDue(candidate, now)).toBe(false);
    candidate.activity.status = "open";
    candidate.activity.startTime = new Date("2026-11-01T09:00:00Z");
    expect(isNotificationScheduleDue(candidate, now)).toBe(false);
  });
});
