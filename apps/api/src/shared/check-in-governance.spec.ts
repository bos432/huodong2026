import { describe, expect, it } from "vitest";
import { checkInRevocationAllowed } from "./check-in-governance";

describe("check-in revocation governance", () => {
  const now = new Date("2030-01-01T12:00:00Z");
  it("allows staff within the configured window", () => expect(checkInRevocationAllowed({ checkedInAt: new Date("2030-01-01T10:30:00Z"), now, maxMinutes: 120, isSuperAdmin: false })).toBe(true));
  it("blocks staff after the window but allows a super admin", () => {
    const checkedInAt = new Date("2030-01-01T09:00:00Z");
    expect(checkInRevocationAllowed({ checkedInAt, now, maxMinutes: 120, isSuperAdmin: false })).toBe(false);
    expect(checkInRevocationAllowed({ checkedInAt, now, maxMinutes: 120, isSuperAdmin: true })).toBe(true);
  });
});
