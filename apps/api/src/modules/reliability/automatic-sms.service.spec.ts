import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../entities/activity.entity", () => ({ Activity: class Activity {} }));
vi.mock("../../entities/notification-preference.entity", () => ({ NotificationPreference: class NotificationPreference {} }));
vi.mock("../../entities/notification.entity", () => ({ Notification: class Notification {} }));
vi.mock("../../entities/operation-setting.entity", () => ({ OperationSetting: class OperationSetting {} }));
vi.mock("../../entities/registration.entity", () => ({ Registration: class Registration {} }));
vi.mock("../../entities/user.entity", () => ({ User: class User {} }));

import { AutomaticSmsService, defaultAutomaticSmsSettings, normalizeAutomaticSmsSettings } from "./automatic-sms.service";

function setting(automaticSms: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
  return {
    id: 3,
    tenant: { id: 3 },
    smsProviderEnabled: true,
    smsProvider: "luosimao-sms",
    smsAccessKeyId: null,
    smsAccessKeySecret: "key-test",
    smsSignName: "测试",
    smsTemplateId: null,
    smsSdkAppId: null,
    automaticSms,
    ...overrides
  } as any;
}

function createHarness(input: { automaticSms?: Record<string, unknown>; phone?: string | null; unsubscribed?: boolean; delivery?: { status: "sent" | "failed"; provider: string; providerMessageId?: string; errorMessage?: string } } = {}) {
  const notifications: any[] = [];
  const currentSetting = setting(input.automaticSms || { enabled: true, registrationSubmitted: true });
  const operationSettings: any = { findOne: vi.fn(async () => currentSetting), find: vi.fn(async () => [currentSetting]) };
  const notificationRepository: any = {
    findOne: vi.fn(async ({ where }: any) => notifications.find((row) => row.remark === where.remark && row.tenantScopeKey === where.tenantScopeKey) || null),
    create: vi.fn((value: any) => ({ id: notifications.length + 1, ...value })),
    save: vi.fn(async (value: any) => {
      if (!notifications.includes(value)) notifications.push(value);
      return value;
    })
  };
  const preferences: any = { findOne: vi.fn(async () => input.unsubscribed ? { subscribed: false, reason: "用户主动退订" } : null) };
  const users: any = { findOneBy: vi.fn(async () => ({ id: 7, phone: input.phone === undefined ? "13800138000" : input.phone })) };
  const activities: any = { findOneBy: vi.fn(async () => ({ id: 9, title: "城市徒步", location: "中心公园", tenant: { id: 3 } })) };
  const registrations: any = { find: vi.fn(async () => []), createQueryBuilder: vi.fn() };
  const handlers = new Map<string, (payload: Record<string, unknown>) => Promise<unknown>>();
  const jobs: any = {
    register: vi.fn((type: string, callback: (payload: Record<string, unknown>) => Promise<unknown>) => { handlers.set(type, callback); }),
    publish: vi.fn(async (value: any) => ({ id: 1, ...value }))
  };
  const provider: any = { deliver: vi.fn(async () => input.delivery || { status: "sent", provider: "luosimao-sms", providerMessageId: "sms-1" }) };
  const config: any = { get: vi.fn((key: string, fallback: unknown) => key === "AUTOMATIC_SMS_REMINDER_WORKER_ENABLED" ? "false" : fallback) };
  const service = new AutomaticSmsService(operationSettings, notificationRepository, preferences, users, activities, registrations, jobs, provider, config);
  service.onModuleInit();
  return { service, currentSetting, notifications, registrations, jobs, provider, handler: (type = "automatic-sms.deliver") => handlers.get(type)! };
}

describe("AutomaticSmsService", () => {
  it("normalizes missing and unsafe settings to fully disabled defaults", () => {
    expect(normalizeAutomaticSmsSettings(null)).toEqual(defaultAutomaticSmsSettings);
    expect(normalizeAutomaticSmsSettings({ enabled: true, paymentSucceeded: "1", reminderBeforeHours: 999 })).toMatchObject({ enabled: true, paymentSucceeded: true, registrationSubmitted: false, reminderBeforeHours: 168 });
  });

  it("does not create a business job while the total or scene switch is off", async () => {
    const { service, currentSetting, jobs } = createHarness({ automaticSms: { enabled: false, registrationSubmitted: true } });
    await service.publish({ scene: "registrationSubmitted", businessId: 10, userId: 7, activityId: 9, tenantId: 3 });
    currentSetting.automaticSms = { enabled: true, registrationSubmitted: false };
    await service.publish({ scene: "registrationSubmitted", businessId: 10, userId: 7, activityId: 9, tenantId: 3 });
    expect(jobs.publish).not.toHaveBeenCalled();
  });

  it("uses a stable business job idempotency key without putting credentials in the payload", async () => {
    const { service, jobs } = createHarness();
    await service.publish({ scene: "registrationSubmitted", businessId: 10, userId: 7, activityId: 9, tenantId: 3 });
    expect(jobs.publish).toHaveBeenCalledWith(expect.objectContaining({ type: "automatic-sms.deliver", idempotencyKey: "registrationSubmitted:10", tenantId: 3 }));
    expect(jobs.publish.mock.calls[0][0].payload).toEqual(expect.objectContaining({ userId: 7, activityId: 9, tenantId: 3 }));
    expect(JSON.stringify(jobs.publish.mock.calls[0][0].payload)).not.toContain("key-test");
  });

  it("records users without a phone as suppressed and does not call the provider", async () => {
    const { handler, notifications, provider } = createHarness({ phone: null });
    const result = await handler()({ scene: "registrationSubmitted", businessId: "10", userId: 7, activityId: 9, tenantId: 3, variables: {} });
    expect(result).toEqual(expect.objectContaining({ status: "suppressed", reason: "用户未绑定手机号" }));
    expect(notifications[0]).toMatchObject({ status: "suppressed", suppressedReason: "用户未绑定手机号" });
    expect(provider.deliver).not.toHaveBeenCalled();
  });

  it("honors SMS unsubscribe preferences", async () => {
    const { handler, notifications, provider } = createHarness({ unsubscribed: true });
    await handler()({ scene: "registrationSubmitted", businessId: "10", userId: 7, activityId: 9, tenantId: 3, variables: {} });
    expect(notifications[0]).toMatchObject({ status: "suppressed", suppressedReason: "用户主动退订" });
    expect(provider.deliver).not.toHaveBeenCalled();
  });

  it("persists provider failures so BusinessJob can retry the same notification", async () => {
    const { handler, notifications, provider } = createHarness({ delivery: { status: "failed", provider: "luosimao-sms", errorMessage: "provider unavailable" } });
    const payload = { scene: "registrationSubmitted", businessId: "10", userId: 7, activityId: 9, tenantId: 3, variables: {} };
    await expect(handler()(payload)).rejects.toThrow("provider unavailable");
    expect(notifications[0]).toMatchObject({ status: "failed", retryCount: 1, errorMessage: "provider unavailable" });
    provider.deliver.mockResolvedValueOnce({ status: "sent", provider: "luosimao-sms", providerMessageId: "sms-2" });
    await expect(handler()(payload)).resolves.toEqual(expect.objectContaining({ status: "sent", providerMessageId: "sms-2" }));
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ status: "sent", retryCount: 2, providerMessageId: "sms-2" });
  });

  it("fans an activity event out in the worker instead of blocking the admin request", async () => {
    const { service, handler, registrations, jobs } = createHarness({ automaticSms: { enabled: true, activityCancelled: true } });
    const published = await service.publishForActivity({ scene: "activityCancelled", activityId: 9, businessId: 9, tenantId: 3, variables: { reason: "天气原因" } });
    expect(published).toEqual({ queuedUsers: 0, fanoutJobId: 1 });
    expect(jobs.publish).toHaveBeenLastCalledWith(expect.objectContaining({ type: "automatic-sms.activity-fanout", idempotencyKey: "activityCancelled:9" }));

    registrations.find.mockResolvedValueOnce([
      { status: "approved", user: { id: 7 } },
      { status: "approved", user: { id: 7 } },
      { status: "rejected", user: { id: 8 } }
    ]);
    await handler("automatic-sms.activity-fanout")({ scene: "activityCancelled", activityId: 9, businessId: "9", tenantId: 3, variables: { reason: "天气原因" } });
    expect(jobs.publish).toHaveBeenLastCalledWith(expect.objectContaining({ type: "automatic-sms.deliver", idempotencyKey: "activityCancelled:9:user:7" }));
  });
});
