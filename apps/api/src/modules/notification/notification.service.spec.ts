import { describe, expect, it } from "vitest";
import { NotificationService } from "./notification.service";

describe("NotificationService", () => {
  it("maps a notification through the existing masking callbacks", () => {
    const service = new NotificationService();
    const result = service.toPublicRecord({
      id: 41,
      channel: "sms",
      scene: "registration_success",
      tenantScopeKey: "tenant:7",
      title: "报名成功 13800138000",
      content: "签到码 AB123456",
      status: "sent",
      provider: "luosimao",
      providerMessageId: "provider-41",
      errorMessage: null,
      variablesSnapshot: { userPhone: "13800138000", checkInCode: "AB123456" },
      providerTemplateId: "template-1",
      templateVersion: 1,
      retryCount: 0,
      sentAt: new Date("2026-10-02T02:00:00.000Z"),
      failedAt: null,
      user: { id: 9, nickname: "慢友", phone: "13800138000" },
      activity: null,
      remark: null,
      createdAt: new Date("2026-10-02T01:00:00.000Z"),
      deliveryOptions: { apiKey: "must-not-leak" }
    } as any, false, {
      toVariables: () => ({ userPhone: "138****8000", checkInCode: "AB****56" }),
      sanitizeText: (text) => text.replaceAll("13800138000", "138****8000").replaceAll("AB123456", "AB****56"),
      toUser: () => ({ id: 9, phone: "138****8000", sensitiveMasked: true })
    });

    expect(result).toMatchObject({ id: 41, title: "报名成功 138****8000", providerMessageId: null, sensitiveMasked: true });
    expect(result).not.toHaveProperty("deliveryOptions");
  });
});
