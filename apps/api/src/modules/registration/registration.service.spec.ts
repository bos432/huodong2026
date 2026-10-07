import { describe, expect, it } from "vitest";
import { RegistrationService } from "./registration.service";

describe("RegistrationService", () => {
  it("maps a registration without exposing check-in or user entity data", () => {
    const service = new RegistrationService();
    const result = service.toPublicSummary({
      id: 19,
      status: "approved",
      activity: { id: 8, title: "城市漫步" },
      answers: [{ fieldId: 1, value: "慢友" }],
      formSchemaVersion: 2,
      formSnapshot: [{ id: 1, label: "姓名" }],
      companions: [],
      privacyConsentAt: new Date("2026-10-02T00:00:00.000Z"),
      reviewRemark: null,
      cancelReason: null,
      createdAt: new Date("2026-10-01T00:00:00.000Z"),
      updatedAt: new Date("2026-10-02T00:00:00.000Z"),
      checkInCode: "secret-code",
      user: { id: 4, phone: "13800138000" }
    } as any, (activity) => ({ id: activity?.id, title: activity?.title }));

    expect(result).toMatchObject({ id: 19, status: "approved", activity: { id: 8, title: "城市漫步" }, answers: [{ value: "慢友" }] });
    expect(result).not.toHaveProperty("checkInCode");
    expect(result).not.toHaveProperty("user");
  });
});
