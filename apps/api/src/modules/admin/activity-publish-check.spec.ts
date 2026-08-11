import { describe, expect, it } from "vitest";
import { activityPublishReadinessIssues } from "./activity-lifecycle";

function activity(overrides: Record<string, unknown> = {}) {
  const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  return {
    id: 7,
    title: "发布检查验收活动",
    coverUrl: "https://example.com/cover.jpg",
    description: "活动介绍",
    location: "重庆",
    startTime: start,
    endTime: new Date(start.getTime() + 2 * 60 * 60 * 1000),
    registrationDeadline: new Date(start.getTime() - 60 * 60 * 1000),
    fields: [{ label: "姓名" }],
    sections: [{ title: "活动亮点" }],
    hosts: [{ name: "主办方" }],
    tenant: { id: 3 },
    price: 0,
    ...overrides
  };
}

describe("activity publish check", () => {
  it("blocks an activity whose registration deadline has already passed", async () => {
    const result = activityPublishReadinessIssues({ ...activity({ registrationDeadline: new Date(Date.now() - 60 * 1000) }), hasOrganizerProfile: true, hasCustomerServiceContact: true });

    expect(result).toContainEqual(expect.objectContaining({ field: "registrationDeadline", blocking: true, message: "报名截止时间已过，请调整后再发布" }));
  });

  it("keeps operating recommendations non-blocking when the activity can be published", async () => {
    const result = activityPublishReadinessIssues({ ...activity({ hosts: [] }), hasOrganizerProfile: false, hasCustomerServiceContact: false });

    expect(result.some((issue) => issue.blocking)).toBe(false);
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "hosts", blocking: false }),
      expect.objectContaining({ field: "organizerProfile", blocking: false }),
      expect.objectContaining({ field: "customerService", blocking: false })
    ]));
  });

  it("still blocks paid activities without an enabled payment method", async () => {
    const result = activityPublishReadinessIssues({ ...activity({ price: 19.9 }), hasOrganizerProfile: true, hasCustomerServiceContact: true, paymentMethods: { free: true, wechat: false, alipay: false, balance: false, offline: false } });

    expect(result).toContainEqual(expect.objectContaining({ field: "paymentMethods", blocking: true }));
  });
});
