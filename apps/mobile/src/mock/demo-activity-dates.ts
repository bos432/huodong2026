import type { Activity } from "../types/activity";

type DemoActivity = Omit<Activity, "date" | "weekday"> & { daysFromToday?: number };

const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function createDemoActivities(items: DemoActivity[], now = new Date()): Activity[] {
  return items.map((item, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (item.daysFromToday ?? index + 1));
    return {
      ...item,
      date: `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`,
      weekday: weekdays[date.getDay()]
    };
  });
}

export function demoActivityDate(date: string, time: string, now = new Date()) {
  const [month, day] = date.split("/").map(Number);
  const dateOnly = new Date(now.getFullYear(), (month || now.getMonth() + 1) - 1, day || now.getDate());
  const candidate = new Date(now.getFullYear(), dateOnly.getMonth(), dateOnly.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (candidate < today) candidate.setFullYear(candidate.getFullYear() + 1);
  const [hour = "00", minute = "00"] = time.split(":");
  candidate.setHours(Number(hour), Number(minute), 0, 0);
  return `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, "0")}-${String(candidate.getDate()).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+08:00`;
}
