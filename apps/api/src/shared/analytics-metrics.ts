import { yuanToFen } from "./money";

export const ANALYTICS_CALCULATION_VERSION = "activity-metrics-v1";
export const ANALYTICS_TIMEZONE_OFFSET = "+08:00";
const ANALYTICS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const conversionMetricKeys: Record<string, string> = {
  view: "activity_views",
  share_visit: "share_visits",
  register: "registrations_submitted",
  pay: "payments_succeeded",
  check_in: "check_ins",
  review: "reviews_submitted",
  cancel: "registrations_cancelled",
  refund: "refunds_succeeded"
};

export function analyticsDateText(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("invalid analytics date");
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function analyticsDayRange(dateText: string) {
  if (!ANALYTICS_DATE_PATTERN.test(String(dateText || ""))) throw new Error("invalid analytics date");
  const start = new Date(`${dateText}T00:00:00+08:00`);
  if (Number.isNaN(start.getTime()) || analyticsDateText(start) !== dateText) throw new Error("invalid analytics date");
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export function conversionMetricAmountFen(type: string, amount: unknown) {
  const numeric = Number(amount || 0);
  const fen = yuanToFen(Number.isFinite(numeric) ? numeric : 0);
  return type === "refund" ? -Math.abs(fen) : type === "pay" ? Math.abs(fen) : 0;
}

export function netRevenueFen(paidFen: number, refundedFen: number) {
  return Math.max(0, Math.trunc(paidFen) - Math.abs(Math.trunc(refundedFen)));
}
