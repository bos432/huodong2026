import { describe, expect, it } from "vitest";
import { queryActivities } from "./activity-query";
import type { Activity } from "../../types/activity";

const items: Activity[] = [
  { id: 1, title: "远郊自然观察", date: "10/18", weekday: "周日", startTime: "09:00", endTime: "12:00", city: "重庆", distanceText: "12.0km", venue: "山脚集合点", cover: "", hostName: "自然组", category: "自然体验", tags: ["自然"], priceText: "¥59", registrationCount: 2, remainingSlots: 4, status: "open", highlight: "", refundPolicy: "", insuranceIncluded: false },
  { id: 2, title: "城市慢走", date: "10/07", weekday: "周三", startTime: "10:00", endTime: "12:00", city: "重庆", distanceText: "2.0km", venue: "江岸公园", cover: "", hostName: "城市组", category: "城市漫步", tags: ["轻户外"], priceText: "¥39", registrationCount: 2, remainingSlots: 4, status: "open", highlight: "", refundPolicy: "", insuranceIncluded: false },
  { id: 3, title: "已满座体验", date: "10/09", weekday: "周五", startTime: "18:00", endTime: "20:00", city: "重庆", distanceText: "未知", venue: "工作室", cover: "", hostName: "体验组", category: "手作体验", tags: [], priceText: "免费", registrationCount: 99, remainingSlots: 0, status: "full", highlight: "", refundPolicy: "", insuranceIncluded: false },
];

describe("queryActivities", () => {
  it("filters by keyword and category", () => {
    expect(queryActivities(items, { keyword: "公园", category: "推荐", sort: "recommended" }).map(item => item.id)).toEqual([2]);
    expect(queryActivities(items, { keyword: "", category: "自然体验", sort: "recommended" }).map(item => item.id)).toEqual([1]);
  });

  it("sorts by date and distance", () => {
    expect(queryActivities(items, { keyword: "", category: "推荐", sort: "nearest_time" }).map(item => item.id)).toEqual([2, 3, 1]);
    expect(queryActivities(items, { keyword: "", category: "推荐", sort: "nearest_distance" }).map(item => item.id)).toEqual([2, 1, 3]);
  });

  it("filters status and sorts trusted numeric price", () => {
    expect(queryActivities(items, { keyword: "", category: "推荐", status: "full", sort: "recommended" }).map(item => item.id)).toEqual([3]);
    expect(queryActivities(items, { keyword: "", category: "推荐", sort: "price_low" }).map(item => item.id)).toEqual([2, 1, 3]);
  });

  it("keeps demo popularity in stable order instead of inventing hotness", () => {
    const demoItems = items.map(item => ({ ...item, isDemo: true }));
    expect(queryActivities(demoItems, { keyword: "", category: "推荐", sort: "popularity" }).map(item => item.id)).toEqual([1, 2, 3]);
  });

  it("keeps unknown distance values stable", () => {
    expect(queryActivities(items, { keyword: "", category: "推荐", sort: "nearest_distance" }).map(item => item.id)).toEqual([2, 1, 3]);
  });
});
