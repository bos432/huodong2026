import { mockActivities } from "../../mock/activity";
import { FieldType } from "@activity/shared";
import type { Activity } from "../../types/activity";
import { demoActivityDate } from "../../mock/demo-activity-dates";
import type { PublicActivitySummary } from "@activity/shared";

export const DEMO_SHOWCASE_TENANT = "qiwai-showcase";

export function shouldShowDemoActivities(tenantCode: string, realActivityCount: number) {
  return tenantCode === DEMO_SHOWCASE_TENANT && realActivityCount === 0;
}

export function activitiesForList(tenantCode: string, realActivities: Activity[]) {
  if (!shouldShowDemoActivities(tenantCode, realActivities.length)) return realActivities;
  return mockActivities.map((item) => ({ ...item, isDemo: true, dataSource: "mock" as const }));
}

export function demoActivitiesAsPublicSummaries(activities: Activity[], now = new Date()): PublicActivitySummary[] {
  return activities.map((item, index) => {
    const startTime = demoActivityDate(item.date, item.startTime, new Date(now.getTime() + index * 24 * 60 * 60 * 1000));
    const endTime = demoActivityDate(item.date, item.endTime || item.startTime, new Date(now.getTime() + index * 24 * 60 * 60 * 1000));
    return {
      id: item.id,
      title: item.title,
      coverUrl: item.cover,
      startTime,
      endTime,
      location: "地点信息以正式发布为准",
      locationCity: item.city,
      price: Number((item.priceText.match(/\d+(?:\.\d+)?/) || ["0"])[0]),
      status: "open",
      displayStatus: "open",
      category: { id: item.id, name: item.category },
      registeredCount: null,
      remainingSeats: null,
      capacity: null,
      isTest: true
    } as PublicActivitySummary;
  });
}

export function demoDetailForTenant(tenantCode: string, activityId: number, now = new Date()) {
  if (tenantCode !== DEMO_SHOWCASE_TENANT) return null;
  const item = mockActivities.find((row) => row.id === activityId);
  if (!item) return null;
  return {
    id: item.id,
    title: item.title,
    isTest: true,
    displayStatus: "open",
    bookingDisabledReason: "演示活动，仅供浏览，不接受报名",
    category: { name: item.category },
    startTime: demoActivityDate(item.date, item.startTime, now),
    endTime: demoActivityDate(item.date, item.endTime || item.startTime, now),
    registrationDeadline: demoActivityDate(item.date, item.startTime, now),
    location: item.venue,
    locationCity: item.city,
    price: Number((item.priceText.match(/\d+(?:\.\d+)?/) || ["0"])[0]),
    remainingSeats: null,
    capacity: null,
    registeredCount: null,
    requireReview: false,
    fields: [{ id: 1, label: "想体验的内容", type: FieldType.Text, required: false, placeholder: "可选填写，仅在本页体验，不会保存" }],
    description: item.description || "此为演示内容，用于了解页面信息结构，不代表真实活动安排。",
    notice: "本样例仅供浏览，不接受报名或支付；时间、地点和费用均为示例信息。",
    refundInstructions: "演示页面不可报名，不产生订单或收款。",
    coverUrl: item.cover,
    gallery: [item.cover].filter(Boolean),
    hosts: [{ id: 1, name: "演示主理人", title: "演示资料", bio: "用于展示页面结构，不代表真实组织者。" }],
    attendees: [],
    sections: [{ id: "intro", title: "样例说明", content: "这是 qiwai-showcase 演示商家的页面样例，不代表已经确定的真实活动。" }],
    relatedActivities: mockActivities.filter((row) => row.id !== item.id).slice(0, 2).map((row) => ({
      id: row.id,
      title: row.title,
      coverUrl: row.cover,
      startTime: new Date(now.getFullYear(), 9, 24, 14, 0).toISOString(),
      location: row.venue,
      price: Number((row.priceText.match(/\d+(?:\.\d+)?/) || ["0"])[0]),
      isTest: true
    }))
  };
}
