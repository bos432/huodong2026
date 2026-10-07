import type { PublicActivityListResponse, PublicActivitySummary } from "@activity/shared";
import type { Activity } from "../../types/activity";

const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function dateParts(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date: `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`,
    weekday: weekdays[date.getDay()],
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
  };
}

function statusOf(item: PublicActivitySummary): Activity["status"] {
  const value = String(item.displayStatus || item.status || "open");
  if (value === "full" || value === "ended" || value === "cancelled") return value;
  return "open";
}

function priceLabel(value: PublicActivitySummary["price"]) {
  if (value === null || value === undefined || value === "") return "价格以详情为准";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "价格以详情为准";
  return amount > 0 ? `¥${amount}` : "免费";
}

export function mapPublicActivitySummary(item: PublicActivitySummary): Activity {
  const start = dateParts(item.startTime);
  const end = dateParts(item.endTime);
  const title = item.title || "未命名活动";
  const isDemo = Boolean(item.isTest) || title.startsWith("【演示】");
  const category = item.category?.name?.trim() || "";
  return {
    id: item.id,
    title,
    date: start?.date || "日期待定",
    weekday: start?.weekday || "",
    startTime: start?.time || "时间待定",
    endTime: end?.time || "时间待定",
    city: "",
    distanceText: "距离信息暂不可用",
    venue: item.location || "活动地点完善中",
    cover: item.coverUrl || "",
    hostName: "主理人资料待审核",
    category,
    tags: category ? [category] : [],
    priceText: priceLabel(item.price),
    registrationCount: Number(item.registeredCount) || 0,
    remainingSlots: Number(item.remainingSeats) || 0,
    status: statusOf(item),
    highlight: isDemo ? "当前仅用于页面展示" : "报名信息以详情页为准",
    refundPolicy: "退款规则以活动详情为准",
    insuranceIncluded: false,
    dataSource: "api",
    isDemo
  };
}

export function mapPublicActivityList(payload: PublicActivityListResponse | PublicActivitySummary[]) {
  const items = Array.isArray(payload) ? payload : payload.items || [];
  return {
    items: items.map(mapPublicActivitySummary),
    total: Array.isArray(payload) ? items.length : payload.total ?? items.length,
    hasMore: Array.isArray(payload) ? false : Boolean(payload.hasMore)
  };
}
