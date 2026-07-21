import { describe, expect, it } from "vitest";
import { checkInNonce, createCheckInTicket, verifyCheckInTicket } from "./check-in-ticket";

describe("signed check-in tickets", () => {
  const secret = "test-check-in-secret";
  it("binds a valid ticket to registration, activity and expiry", () => {
    const ticket = createCheckInTicket({ registrationId: 221, activityId: 143, expiresAt: new Date("2030-01-02T00:00:00Z"), nonce: checkInNonce("legacy-code", secret) }, secret);
    expect(verifyCheckInTicket(ticket, secret, new Date("2030-01-01T00:00:00Z"))).toMatchObject({ valid: true, registrationId: 221, activityId: 143 });
  });
  it("rejects tampering and expiry", () => {
    const ticket = createCheckInTicket({ registrationId: 221, activityId: 143, expiresAt: new Date("2030-01-01T00:00:00Z"), nonce: "nonce" }, secret);
    expect(verifyCheckInTicket(ticket.replace(".143.", ".144."), secret)).toMatchObject({ valid: false, reason: "invalid_signature" });
    expect(verifyCheckInTicket(ticket, secret, new Date("2030-01-02T00:00:00Z"))).toMatchObject({ valid: false, reason: "expired" });
  });
  it("keeps legacy raw codes recognizable", () => expect(verifyCheckInTicket("legacy-uuid", secret)).toEqual({ signed: false }));
});
