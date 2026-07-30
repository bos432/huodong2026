import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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
    expect(v1).toContain("notificationTemplateVersions");
    expect(v1).toContain("notificationMonitor");
    expect(v1).toContain("notificationJobIdentity");
    expect(jobs).toContain("retryByIdentity");
    expect(postEvent).toContain('const JOB_TYPE = "post-event.notification"');
    expect(postEvent).toContain('remark: `post_event:${scene}:${businessId}`');
  });
});
