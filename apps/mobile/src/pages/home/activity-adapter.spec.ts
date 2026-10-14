import { describe, expect, it } from "vitest";
import type { PublicActivityListResponse, PublicActivitySummary } from "@activity/shared";
import { mapPublicActivityList, mapPublicActivitySummary } from "./activity-adapter";

const summary: PublicActivitySummary = {
  id: 42,
  title: "江岸阅读会",
  coverUrl: "https://cdn.example.com/reading.jpg",
  startTime: "2026-10-12T14:00:00+08:00",
  endTime: "2026-10-12T16:30:00+08:00",
  location: "江岸公园",
  locationProvince: "重庆市",
  locationCity: "重庆市",
  locationDistrict: "渝中区",
  price: 39,
  capacity: 12,
  registeredCount: 5,
  remainingSeats: 7,
  displayStatus: "open",
  category: { id: 3, name: "阅读分享" }
};

describe("activity adapter", () => {
  it("maps a public activity summary without inventing organizer or attendance data", () => {
    const item = mapPublicActivitySummary(summary);

    expect(item).toMatchObject({
      id: 42,
      title: "江岸阅读会",
      date: "10/12",
      weekday: "周一",
      startTime: "14:00",
      startDateTime: "2026-10-12T14:00:00+08:00",
      registrationDeadline: null,
      endTime: "16:30",
      venue: "江岸公园",
      city: "重庆市",
      cover: "https://cdn.example.com/reading.jpg",
      category: "阅读分享",
      priceText: "¥39",
      registrationCount: 5,
      remainingSlots: 7,
      status: "open",
      dataSource: "api"
    });
    expect(item.hostName).toBe("主理人资料待审核");
    expect(item.tags).toEqual(["阅读分享"]);
  });

  it("safely handles missing fields and paginated envelopes", () => {
    const response: PublicActivityListResponse = {
      items: [{ id: 9, title: "待确认活动", displayStatus: "full" }],
      total: 1,
      hasMore: false
    };

    expect(mapPublicActivitySummary(response.items[0])).toMatchObject({
      date: "日期待定",
      startTime: "时间待定",
      endTime: "时间待定",
      venue: "活动地点完善中",
      cover: "",
      priceText: "价格以详情为准",
      registrationCount: 0,
      remainingSlots: 0,
      status: "full",
      dataSource: "api"
    });
    expect(mapPublicActivityList(response)).toEqual({
      items: [expect.objectContaining({ id: 9 })],
      total: 1,
      hasMore: false
    });
  });

  it("does not repeat a placeholder category when the API has no category", () => {
    const item = mapPublicActivitySummary({ id: 10, title: "活动信息完善中" });
    expect(item.category).toBe("");
    expect(item.tags).toEqual([]);
  });

  it("marks test activities explicitly for safe UI treatment", () => {
    const item = mapPublicActivitySummary({ id: 11, title: "【演示】体验活动", isTest: true, registeredCount: 8, remainingSeats: 2 });
    expect(item.isDemo).toBe(true);
    expect(item.highlight).toBe("当前仅用于页面展示");
  });
});
