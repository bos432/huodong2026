import type { Activity, ActivitySort } from "../../types/activity";

export interface ActivityQuery {
  keyword: string;
  category: string;
  sort: ActivitySort;
  status?: "all" | "open" | "full";
  city?: string;
}

function hasExpired(item: Activity, now: Date) {
  const deadline = item.registrationDeadline;
  if (deadline) {
    const timestamp = new Date(deadline).getTime();
    return Number.isFinite(timestamp) && timestamp <= now.getTime();
  }
  if (item.startDateTime) {
    const timestamp = new Date(item.startDateTime).getTime();
    return Number.isFinite(timestamp) && timestamp <= now.getTime();
  }
  if (item.dataSource === "api") return false;
  const [month, day] = item.date.split("/").map(Number);
  const start = new Date(now.getFullYear(), (month || 1) - 1, day || 1, Number(item.startTime.slice(0, 2)), Number(item.startTime.slice(3, 5)));
  if (item.dataSource !== "api" && start.getTime() < now.getTime()) start.setFullYear(start.getFullYear() + 1);
  return start.getTime() <= now.getTime();
}

function dateValue(item: Activity, now: Date) {
  const [month, day] = item.date.split("/").map(Number);
  const date = new Date(now.getFullYear(), (month || 1) - 1, day || 1, Number(item.startTime.slice(0, 2)), Number(item.startTime.slice(3, 5)));
  if (date.getTime() < now.getTime()) date.setFullYear(date.getFullYear() + 1);
  return date.getTime();
}

function distanceValue(item: Activity) {
  return Number.parseFloat(item.distanceText) || Number.MAX_SAFE_INTEGER;
}

function priceValue(item: Activity) {
  const value = Number.parseFloat(item.priceText.replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

export function queryActivities(items: Activity[], query: ActivityQuery, now = new Date()) {
  const keyword = query.keyword.trim().toLowerCase();
  const filtered = items.filter(item => {
    const matchesKeyword = !keyword || `${item.title}${item.venue}${item.hostName}${item.category}${item.tags.join("")}`.toLowerCase().includes(keyword);
    const matchesCategory = query.category === "推荐" || item.category === query.category || item.tags.includes(query.category);
    const matchesStatus = (!query.status || query.status === "all" || item.status === query.status)
      && item.status !== "ended"
      && item.status !== "cancelled"
      && (item.status !== "open" || !hasExpired(item, now));
    const selectedCity = query.city?.trim();
    const activityCity = [item.city, item.province, item.district].filter(Boolean).join(" ");
    const matchesCity = !selectedCity || !activityCity || activityCity.includes(selectedCity);
    return matchesKeyword && matchesCategory && matchesStatus && matchesCity;
  });
  return [...filtered].sort((a, b) => {
    if (query.sort === "nearest_time") return dateValue(a, now) - dateValue(b, now);
    if (query.sort === "nearest_distance") {
      const aDistance = distanceValue(a);
      const bDistance = distanceValue(b);
      return aDistance === Number.MAX_SAFE_INTEGER || bDistance === Number.MAX_SAFE_INTEGER ? a.id - b.id : aDistance - bDistance;
    }
    if (query.sort === "popularity") {
      if (a.isDemo || b.isDemo) return a.id - b.id;
      return b.registrationCount - a.registrationCount;
    }
    if (query.sort === "price_low") return priceValue(a) - priceValue(b);
    return a.id - b.id;
  });
}
