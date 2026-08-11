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

  it("warns when rich content repeats conflicting schedule, location or price", () => {
    const result = activityPublishReadinessIssues({
      ...activity({
        description: "活动时间：2026年8月3日 13:50\n活动地点：另一处空间\n活动费用：免费",
        location: "铜梁城市书房",
        startTime: new Date("2026-08-14T21:50:00+08:00"),
        endTime: new Date("2026-08-14T23:00:00+08:00"),
        registrationDeadline: new Date("2026-08-14T20:00:00+08:00"),
        price: 19.9
      }),
      hasOrganizerProfile: true,
      hasCustomerServiceContact: true,
      paymentMethods: { wechat: true },
      now: new Date("2026-08-10T12:00:00+08:00")
    });

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "descriptionSchedule", blocking: false }),
      expect.objectContaining({ field: "descriptionLocation", blocking: false }),
      expect.objectContaining({ field: "descriptionPrice", blocking: false })
    ]));
  });
});
