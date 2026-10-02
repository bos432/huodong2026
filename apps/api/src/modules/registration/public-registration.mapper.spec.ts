import { describe, expect, it } from "vitest";
import { toPublicRegistration } from "./public-registration.mapper";

describe("toPublicRegistration", () => {
  it("keeps answers and consent state while mapping activity through the public boundary", () => {
    const activity = { id: 8, title: "周末活动" };
    const result = toPublicRegistration({
      id: 12,
      activity,
      status: "approved",
      answers: [{ fieldId: 1, label: "姓名", type: "text", value: "用户" }],
      formSchemaVersion: 3,
      formSnapshot: [{ id: 1, label: "姓名" }],
      companions: [{ name: "同行人" }],
      privacyConsentAt: new Date("2026-10-01T00:00:00.000Z"),
      reviewRemark: null,
      cancelReason: null,
      createdAt: new Date("2026-10-01T00:00:00.000Z"),
      updatedAt: new Date("2026-10-01T00:00:00.000Z"),
      checkInCode: "private-code",
      user: { id: 77, passwordHash: "private-password" }
    } as any, (value) => ({ id: value.id, title: value.title }));

    expect(result).toMatchObject({ id: 12, activity: { id: 8, title: "周末活动" }, status: "approved", formSchemaVersion: 3 });
    expect(result.answers).toHaveLength(1);
    expect(result).not.toHaveProperty("checkInCode");
    expect(result).not.toHaveProperty("user");
  });
});
