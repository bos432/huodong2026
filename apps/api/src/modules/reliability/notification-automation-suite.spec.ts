import "reflect-metadata";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../entities/activity.entity", () => ({ Activity: class Activity {} }));
vi.mock("../../entities/activity-review.entity", () => ({ ActivityReview: class ActivityReview {} }));
vi.mock("../../entities/certificate.entity", () => ({ Certificate: class Certificate {} }));
vi.mock("../../entities/notification.entity", () => ({ Notification: class Notification {} }));
vi.mock("../../entities/operation-setting.entity", () => ({ OperationSetting: class OperationSetting {} }));
vi.mock("../../entities/registration.entity", () => ({ Registration: class Registration {} }));
import { PostEventAutomationService } from "./post-event-automation.service";

const root = resolve(process.cwd(), "../../");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("notification automation suite", () => {
  it("keeps automatic channels disabled by default and clamps worker timing", () => {
    const wechat = read("apps/api/src/modules/reliability/automatic-wechat.service.ts");
    const postEvent = read("apps/api/src/modules/reliability/post-event-automation.service.ts");
    expect(wechat).toContain("enabled: false");
    expect(wechat).toContain("Math.max(1, Math.min(168");
    expect(postEvent).toContain("enabled: false");
    expect(postEvent).toContain("Math.max(0, Math.min(168");
  });

  it("records one-time WeChat grants and exposes authenticated public endpoints", () => {
    const service = read("apps/api/src/modules/reliability/automatic-wechat.service.ts");
    const controller = read("apps/api/src/modules/public/public.controller.ts");
    expect(service).toContain("recordAuthorizations");
    expect(service).toContain('acceptedAt: status === "accepted" ?');
    expect(service).toContain("consumeGrant(grant.id");
    expect(service).toContain("reserveAvailableGrant");
    expect(service).toContain("releaseGrant(grant.id");
    expect(controller).toContain('@Get("wechat-subscriptions/templates")');
    expect(controller).toContain('@Post("me/wechat-subscriptions")');
    expect(controller).toContain("requireUserFromAuthorization");
  });

  it("keeps mini-program subscription requests and H5 calendar fallback", () => {
    const api = read("apps/mobile/src/api.ts");
    const detail = read("apps/mobile/src/pages/activity/detail.vue");
    expect(api).toContain("requestSubscribeMessage");
    expect(api).toContain("slice(0, 3)");
    expect(api).toContain('statusMap[String(response[item.templateId] || "reject")]');
    expect(detail).toContain("fetchWechatSubscriptionTemplates");
    expect(detail).toContain("addActivityToCalendar");
  });

  it("keeps monitor, template history, queue retry and post-event jobs connected", () => {
    const v1 = read("apps/api/src/modules/v1/v1.service.ts");
    const jobs = read("apps/api/src/modules/reliability/business-job.service.ts");
    const postEvent = read("apps/api/src/modules/reliability/post-event-automation.service.ts");
    const sms = read("apps/api/src/modules/reliability/automatic-sms.service.ts");
    expect(v1).toContain("notificationTemplateVersions");
    expect(v1).toContain("notificationMonitor");
    expect(v1).toContain("notificationJobIdentity");
    expect(jobs).toContain("retryByIdentity");
    expect(postEvent).toContain('const JOB_TYPE = "post-event.notification"');
    expect(postEvent).toContain('"returnVisitReminder"');
    expect(postEvent).toContain("recallDays: [30, 60, 90]");
    expect(postEvent).toContain('remark: `post_event:${scene}:${businessId}`');
    expect(sms).toContain('"reviewInvitation"');
    expect(sms).toContain('"certificateAvailable"');
    expect(sms).toContain('"activityRecommendations"');
    expect(sms).toContain('"returnVisitReminder"');
    expect(postEvent).toContain("automaticNotifications.publish");
    expect(postEvent).toContain("shouldPublishExternal");
    expect(sms).toContain('用户手机号格式无效');
    expect(read("apps/api/src/modules/reliability/automatic-wechat.service.ts")).toContain('微信场景模板不可用或已撤回');
    expect(read("apps/api/src/modules/reliability/automatic-wechat.service.ts")).toContain('return this.suppress');
  });

  it("delivers delayed recall channels only when the scheduled worker job is due", () => {
    const postEvent = read("apps/api/src/modules/reliability/post-event-automation.service.ts");
    const recallLoop = postEvent.slice(postEvent.indexOf('if (automation.returnVisitReminders)'), postEvent.indexOf('if (automation.certificateAvailable)'));
    const deliver = postEvent.slice(postEvent.indexOf("private async deliver"), postEvent.indexOf("private async message"));
    expect(recallLoop).not.toContain("publishExternal");
    expect(deliver).toContain('scene === "returnVisitReminder"');
    expect(deliver).toContain("this.publishExternal(setting, scene, userId, tenantId, activityId, businessId");
  });

  it("publishes post-event external channels only after a deliverable message exists", () => {
    const postEvent = read("apps/api/src/modules/reliability/post-event-automation.service.ts");
    const scan = postEvent.slice(postEvent.indexOf("async scan("), postEvent.indexOf("private shouldPublishExternal"));
    const deliver = postEvent.slice(postEvent.indexOf("private async deliver"), postEvent.indexOf("private async message"));

    expect(scan).not.toContain("publishExternal");
    expect(deliver).toContain("if (!message) return { status: \"suppressed\", reason: \"当前没有可发送的运营内容\" };");
    expect(deliver).toContain("await this.publishExternal(setting, scene, userId, tenantId, activityId, businessId");
  });

  it("does not send external channels while scanning post-event registrations", async () => {
    const registration = {
      id: 17,
      status: "checked_in",
      user: { id: 42 },
      activity: { id: 8, endTime: new Date("2026-09-30T10:00:00.000Z"), status: "ended", title: "秋日共修", tenant: null }
    };
    const query = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getMany: vi.fn(async () => [registration])
    };
    const setting = {
      tenant: null,
      postEventAutomation: { enabled: true, reviewInvitation: true, activityRecommendations: true, returnVisitReminders: false, certificateAvailable: false, recallDays: [30, 60, 90], delayHours: 0 },
      smsProviderEnabled: true,
      automaticSms: { enabled: true, reviewInvitation: true, activityRecommendations: true },
      automaticWechat: { enabled: true, reviewInvitation: true, activityRecommendations: true }
    };
    const jobs = { register: vi.fn(), publish: vi.fn(async () => ({ id: 1 })) };
    const external = { publish: vi.fn(async () => ({ sms: null, wechat: null })) };
    const service = new PostEventAutomationService(
      { find: vi.fn(async () => [setting]) } as any,
      { createQueryBuilder: vi.fn(() => query) } as any,
      {} as any,
      { exist: vi.fn(async () => false) } as any,
      { find: vi.fn(async () => []) } as any,
      { findOne: vi.fn(async () => null), create: vi.fn((value) => value), save: vi.fn(async (value) => value) } as any,
      jobs as any,
      { get: vi.fn((_key: string, fallback: unknown) => fallback) } as any,
      external as any
    );

    await service.scan(new Date("2026-10-03T10:00:00.000Z"));

    expect(jobs.publish).toHaveBeenCalled();
    expect(jobs.publish).toHaveBeenCalledWith(expect.objectContaining({ type: "post-event.notification", scene: "reviewInvitation" }));
    expect(external.publish).not.toHaveBeenCalled();
  });
});
