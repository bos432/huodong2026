import { describe, expect, it } from "vitest";
import { jobRetryDelayMs, nextJobFailureState } from "./job-retry-policy";

describe("business job retry policy", () => {
  it("uses bounded exponential backoff", () => {
    expect(jobRetryDelayMs(1)).toBe(30_000);
    expect(jobRetryDelayMs(2)).toBe(60_000);
    expect(jobRetryDelayMs(20)).toBe(3_600_000);
  });

  it("moves exhausted jobs to the dead letter state", () => {
    const now = new Date("2026-07-13T00:00:00.000Z");
    expect(nextJobFailureState(2, 3, now)).toEqual({ status: "pending", nextAttemptAt: new Date(now.getTime() + 60_000), deadLetteredAt: null });
    expect(nextJobFailureState(3, 3, now)).toEqual({ status: "dead_letter", nextAttemptAt: now, deadLetteredAt: now });
  });
});
