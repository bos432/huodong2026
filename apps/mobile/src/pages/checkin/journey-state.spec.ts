import { describe, expect, it } from "vitest";
import type { PublicMemberRegistrationRecord } from "@activity/shared";
import { getJourneyGroup, getJourneyStatus } from "./journey-state";

const now = new Date("2026-10-12T10:00:00+08:00").getTime();

function registration(status: string, startTime: string, endTime: string, latestRefund?: { status: string }): PublicMemberRegistrationRecord {
  return {
    id: 1,
    status,
    latestRefund,
    activity: { id: 9, title: "慢π线下活动", startTime, endTime }
  } as PublicMemberRegistrationRecord;
}

describe("journey status", () => {
  it("keeps pending payment and review in the pending group", () => {
    expect(getJourneyGroup(registration("pending_payment", "2026-10-13T10:00:00+08:00", "2026-10-13T12:00:00+08:00"), now)).toBe("pending");
    expect(getJourneyGroup(registration("pending_review", "2026-10-13T10:00:00+08:00", "2026-10-13T12:00:00+08:00"), now)).toBe("pending");
  });

  it("shows an approved future registration as upcoming", () => {
    expect(getJourneyGroup(registration("approved", "2026-10-13T10:00:00+08:00", "2026-10-13T12:00:00+08:00"), now)).toBe("upcoming");
  });

  it("requires an actual checked-in state before treating an ended activity as completed", () => {
    expect(getJourneyGroup(registration("checked_in", "2026-10-10T10:00:00+08:00", "2026-10-10T12:00:00+08:00"), now)).toBe("completed");
    expect(getJourneyGroup(registration("checked_in", "2026-10-13T10:00:00+08:00", "2026-10-13T12:00:00+08:00"), now)).toBe("upcoming");
    expect(getJourneyGroup(registration("approved", "2026-10-10T10:00:00+08:00", "2026-10-10T12:00:00+08:00"), now)).toBe("missed");
  });

  it("surfaces refund processing as pending and completed refunds as inactive", () => {
    expect(getJourneyGroup(registration("approved", "2026-10-13T10:00:00+08:00", "2026-10-13T12:00:00+08:00", { status: "processing" }), now)).toBe("pending");
    expect(getJourneyGroup(registration("approved", "2026-10-13T10:00:00+08:00", "2026-10-13T12:00:00+08:00", { status: "completed" }), now)).toBe("inactive");
  });

  it("does not label unknown dates as upcoming", () => {
    expect(getJourneyGroup(registration("approved", "", ""), now)).toBe("inactive");
  });

  it("uses precise status copy without claiming attendance", () => {
    expect(getJourneyStatus(registration("approved", "2026-10-13T10:00:00+08:00", "2026-10-13T12:00:00+08:00"), now).label).toBe("待参加");
    expect(getJourneyStatus(registration("approved", "2026-10-10T10:00:00+08:00", "2026-10-10T12:00:00+08:00"), now).label).toBe("未签到");
  });
});
