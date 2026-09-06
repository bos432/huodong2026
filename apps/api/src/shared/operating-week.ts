export function operatingWeek(weekStart?: string, now = new Date()) {
  const shifted = new Date(+now + 8 * 3600000);
  const monday = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - (shifted.getUTCDay() + 6) % 7) - 8 * 3600000;
  const start = weekStart ? new Date(`${weekStart}T00:00:00+08:00`) : new Date(monday - 7 * 86400000);
  const local = new Date(+start + 8 * 3600000);
  if (weekStart && (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !Number.isFinite(+start) || local.toISOString().slice(0, 10) !== weekStart || local.getUTCDay() !== 1 || +start > monday)) throw new Error('请选择不晚于本周的周一日期');
  const end = new Date(+start + 7 * 86400000);
  return { start, end, date: local.toISOString().slice(0, 10), complete: +end <= +now };
}
