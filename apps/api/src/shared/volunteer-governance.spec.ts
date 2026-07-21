import { describe, expect, it } from "vitest";
import { canTransitionVolunteerApplication, createVolunteerAttendanceToken, verifyVolunteerAttendanceToken, volunteerHoursFromAttendance, volunteerQualificationEffective } from "./volunteer-governance";

describe("volunteer governance", () => {
  it("only allows controlled application transitions", () => {
    expect(canTransitionVolunteerApplication("pending", "admitted")).toBe(true);
    expect(canTransitionVolunteerApplication("waitlisted", "admitted")).toBe(true);
    expect(canTransitionVolunteerApplication("cancelled", "admitted")).toBe(false);
    expect(canTransitionVolunteerApplication("completed", "cancelled")).toBe(false);
  });

  it("signs and expires attendance tokens", () => {
    const token = createVolunteerAttendanceToken(12, "check_in", 60, 1_000);
    expect(verifyVolunteerAttendanceToken(token, 20_000)).toMatchObject({ applicationId: 12, action: "check_in" });
    expect(() => verifyVolunteerAttendanceToken(token, 62_000)).toThrow("已过期");
    expect(() => verifyVolunteerAttendanceToken(`${token}x`, 20_000)).toThrow("签名无效");
  });

  it("requires an effective qualification and calculates bounded hours", () => {
    expect(volunteerQualificationEffective({ status: "qualified", expiresAt: "2030-01-01" }, new Date("2029-01-01"))).toBe(true);
    expect(volunteerQualificationEffective({ status: "qualified", expiresAt: "2028-01-01" }, new Date("2029-01-01"))).toBe(false);
    expect(volunteerHoursFromAttendance(new Date("2026-01-01T08:00:00Z"), new Date("2026-01-01T10:30:00Z"))).toBe(2.5);
  });
});
