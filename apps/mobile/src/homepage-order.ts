export { sortHomepageSections } from "@activity/shared";

export type HomepageOrderSection = {
  id?: number | string;
  type?: string;
  sortOrder?: number | string | null;
};

export type HomepageActivityOrderItem = {
  id?: number | string;
  startTime?: string | null;
};

/**
 * The admin/API decoration order is authoritative. IDs stabilize legacy rows
 * that intentionally share the same sort value, matching the database query.
 */
export type HomepageActivityDateGroup<T> = {
  key: string;
  label: string;
  items: T[];
};

function shanghaiDateParts(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (part: number) => String(part).padStart(2, "0");
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  return {
    key: `${year}-${pad(month)}-${pad(day)}`,
    label: `${month}月${day}日 · 周${["日", "一", "二", "三", "四", "五", "六"][shifted.getUTCDay()]}`
  };
}

export function groupHomepageActivities<T extends HomepageActivityOrderItem>(activities: T[]): HomepageActivityDateGroup<T>[] {
  const groups = new Map<string, HomepageActivityDateGroup<T>>();
  for (const item of activities) {
    const parts = shanghaiDateParts(item.startTime);
    const key = parts?.key || "undated";
    const label = parts?.label || "时间待定";
    if (!groups.has(key)) groups.set(key, { key, label, items: [] });
    groups.get(key)!.items.push(item);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: [...group.items].sort((left, right) => new Date(left.startTime || 0).getTime() - new Date(right.startTime || 0).getTime())
    }))
    .sort((left, right) => {
      if (left.key === "undated") return 1;
      if (right.key === "undated") return -1;
      return left.key.localeCompare(right.key);
    });
}
