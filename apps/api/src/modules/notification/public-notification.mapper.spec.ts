import { describe, expect, it } from "vitest";
import { toPublicNotificationRecord } from "./public-notification.mapper";

const row = {
  id: 41,
  channel: "sms",
  scene: "registration_success",
  tenantScopeKey: "tenant:7",
  title: "报名成功 13800138000",
  content: "手机号 13800138000，签到码 AB123456",
  status: "failed",
  provider: "luosimao",
  providerMessageId: "provider-message-41",
  errorMessage: "provider rejected 13800138000",
  providerTemplateId: "template-1",
  templateVersion: 3,
  suppressedReason: null,
  variablesSnapshot: { userPhone: "13800138000", checkInCode: "AB123456" },
  deliveryOptions: { apiKey: "must-not-leak", page: "pages/activity/detail" },
  retryCount: 2,
  sentAt: null,
  failedAt: new Date("2026-10-02T02:00:00.000Z"),
  user: { id: 9, nickname: "慢友", phone: "13800138000" },
  activity: {
    id: 12,
    title: "城市漫步",
    status: "published",
    tenant: { id: 7, code: "cq", name: "重庆慢π", providerSecret: "must-not-leak" }
  },
  remark: "首次发送",
  createdAt: new Date("2026-10-02T01:00:00.000Z"),
  providerPrivateKey: "must-not-leak"
} as any;

const dependencies = {
  toVariables: (variables: Record<string, string> | null | undefined, includeSensitive: boolean) => includeSensitive
    ? { ...(variables || {}) }
    : { userPhone: "138****8000", checkInCode: "AB****56" },
  sanitizeText: (text: string, _original: Record<string, string> | null | undefined, _safe: Record<string, string>, includeSensitive: boolean) => includeSensitive
    ? text
    : text.replaceAll("13800138000", "138****8000").replaceAll("AB123456", "AB****56"),
  toUser: (user: typeof row.user, includeSensitive: boolean) => user
    ? { id: user.id, nickname: user.nickname, phone: includeSensitive ? user.phone : "138****8000", sensitiveMasked: !includeSensitive }
    : null
};

describe("toPublicNotificationRecord", () => {
  it("masks personal and provider delivery details by default", () => {
    const result = toPublicNotificationRecord(row, false, dependencies);

    expect(result).toMatchObject({
      id: 41,
      title: "报名成功 138****8000",
      content: "手机号 138****8000，签到码 AB****56",
      providerMessageId: null,
      errorMessage: null,
      variablesSnapshot: { userPhone: "138****8000", checkInCode: "AB****56" },
      user: { id: 9, phone: "138****8000", sensitiveMasked: true },
      activity: { id: 12, tenant: { id: 7, code: "cq", name: "重庆慢π" } },
      sensitiveMasked: true
    });
    expect(result).not.toHaveProperty("deliveryOptions");
    expect(result).not.toHaveProperty("providerPrivateKey");
    expect(result.activity?.tenant).not.toHaveProperty("providerSecret");
  });

  it("reveals delivery details only when sensitive access is explicit", () => {
    const result = toPublicNotificationRecord(row, true, dependencies);

    expect(result).toMatchObject({
      providerMessageId: "provider-message-41",
      errorMessage: "provider rejected 13800138000",
      variablesSnapshot: { userPhone: "13800138000", checkInCode: "AB123456" },
      user: { phone: "13800138000", sensitiveMasked: false },
      sensitiveMasked: false
    });
    expect(result).not.toHaveProperty("deliveryOptions");
  });
});
