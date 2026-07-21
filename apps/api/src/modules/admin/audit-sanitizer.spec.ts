import { describe, expect, it } from "vitest";
import { sanitizeAuditValue } from "./audit-sanitizer";

describe("audit detail sanitizer", () => {
  it("recursively masks credentials and preserves useful business fields", () => {
    expect(sanitizeAuditValue({ orderNo: "OD1", password: "plain", nested: { apiV3Key: "secret", amount: 100 }, rows: [{ accessToken: "token", status: "ok" }] })).toEqual({ orderNo: "OD1", password: "********", nested: { apiV3Key: "********", amount: 100 }, rows: [{ accessToken: "********", status: "ok" }] });
  });

  it("masks password hashes in nested refund responses", () => {
    const response = sanitizeAuditValue({ refund: { order: { registration: { user: { id: 7, phone: "13900000000", passwordHash: "bcrypt-value" } } } } }) as any;
    expect(response.refund.order.registration.user).toEqual({ id: 7, phone: "13900000000", passwordHash: "********" });
  });

  it("preserves dates as ISO strings", () => {
    expect(sanitizeAuditValue({ createdAt: new Date("2026-07-17T00:00:00.000Z") })).toEqual({ createdAt: "2026-07-17T00:00:00.000Z" });
  });
});
