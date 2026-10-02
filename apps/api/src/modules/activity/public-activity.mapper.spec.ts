import { describe, expect, it } from "vitest";
import { toPublicActivity } from "./public-activity.mapper";

describe("toPublicActivity", () => {
  it("keeps the public activity shape while excluding private entity fields", () => {
    const result = toPublicActivity({
      id: 21,
      isTest: false,
      title: "城市阅读会",
      tenant: { id: 7, code: "tenant-a", name: "慢π杭州", region: "杭州" },
      coverUrl: "/uploads/cover.jpg",
      shareTitle: "一起读书",
      shareDescription: "周末见",
      shareImageUrl: null,
      description: "活动详情",
      notice: "请提前到场",
      location: "西湖边",
      locationProvince: "浙江",
      locationCity: "杭州",
      locationDistrict: "西湖",
      locationLatitude: "30.2",
      locationLongitude: "120.1",
      locationMapUrl: "https://map.example.test/21",
      startTime: new Date("2026-10-10T02:00:00.000Z"),
      endTime: new Date("2026-10-10T04:00:00.000Z"),
      registrationDeadline: new Date("2026-10-09T10:00:00.000Z"),
      capacity: 30,
      price: "99.00",
      status: "open",
      cancelledAt: null,
      cancellationReason: null,
      featured: true,
      requireReview: true,
      allowCancel: true,
      category: { id: 3, name: "阅读", iconUrl: null, coverUrl: null },
      agent: { id: 9, name: "主理人", region: "杭州" },
      minMemberLevel: { id: 2, name: "同行", minPoints: 100, minGrowth: 100 },
      priorityMemberLevel: null,
      priorityRegistrationEndsAt: null,
      fields: [{ id: 4, label: "姓名", type: "text", required: true, options: null, sortOrder: 1 }],
      formSchemaVersion: 2,
      eligibilityRules: { minAge: 18, maxAge: null, allowedRegions: ["浙江"], maxRegistrationsPerUser: 1, requirePrivacyConsent: true, allowCompanions: false, maxCompanions: 0 },
      secretToken: "must-not-leak"
    } as any, {
      environment: "production",
      toTenant: (tenant) => ({ id: tenant?.id, code: tenant?.code, name: tenant?.name }),
      toMemberLevel: (level) => level ? { id: level.id, name: level.name } : null
    });

    expect(result).toMatchObject({
      id: 21,
      title: "城市阅读会",
      tenant: { id: 7, code: "tenant-a", name: "慢π杭州" },
      minMemberLevel: { id: 2, name: "同行" },
      fields: [{ id: 4, label: "姓名", required: true, sortOrder: 1 }]
    });
    expect(result).not.toHaveProperty("secretToken");
    expect(result).not.toHaveProperty("password");
  });

  it("marks production test activities as non-bookable", () => {
    const result = toPublicActivity({ id: 1, isTest: true, title: "测试", fields: [] } as any, {
      environment: "production",
      toTenant: () => null,
      toMemberLevel: () => null
    });

    expect(result.bookingDisabledReason).toContain("测试活动");
  });
});
