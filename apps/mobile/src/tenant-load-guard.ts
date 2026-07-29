import { getCurrentTenantCode } from "./api";

export type TenantLoadToken = { id: number; tenantCode: string };

export function createTenantLoadGuard(readTenantCode: () => string = getCurrentTenantCode) {
  let latestId = 0;
  return {
    begin(): TenantLoadToken {
      return { id: ++latestId, tenantCode: readTenantCode() };
    },
    isCurrent(token: TenantLoadToken) {
      return token.id === latestId && token.tenantCode === readTenantCode();
    },
    invalidate() {
      latestId += 1;
    }
  };
}

type ShanghaiDateInput = string | number | Date | null | undefined;

type ShanghaiDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

function padDatePart(value: number) {
  return value < 10 ? `0${value}` : String(value);
}

function dateFallback(value: ShanghaiDateInput, fallback: string, includeTime: boolean) {
  if (value === null || value === undefined || value === "") return fallback;
  const source = String(value).replace("T", " ");
  return includeTime ? source.slice(0, 16) : source.slice(0, 10);
}

function civilShanghaiDateParts(source: string): ShanghaiDateParts | null {
  const match = source.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/i);
  if (!match) return null;
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] || 0),
    minute: Number(match[5] || 0)
  };
  const check = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
  return check.getUTCFullYear() === parts.year
    && check.getUTCMonth() + 1 === parts.month
    && check.getUTCDate() === parts.day
    && check.getUTCHours() === parts.hour
    && check.getUTCMinutes() === parts.minute
    ? parts
    : null;
}

function shanghaiDateParts(value: ShanghaiDateInput): ShanghaiDateParts | null {
  if (typeof value === "string") {
    const source = value.trim();
    const direct = civilShanghaiDateParts(source);
    if (/^\d{4}-\d{2}-\d{2}/.test(source) && !direct) return null;
    if (direct && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(source)) return direct;
  }
  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return null;
  const chinaDate = new Date(date.getTime() + SHANGHAI_OFFSET_MS);
  return {
    year: chinaDate.getUTCFullYear(),
    month: chinaDate.getUTCMonth() + 1,
    day: chinaDate.getUTCDate(),
    hour: chinaDate.getUTCHours(),
    minute: chinaDate.getUTCMinutes()
  };
}

function shanghaiDateText(parts: ShanghaiDateParts) {
  return `${parts.year}-${padDatePart(parts.month)}-${padDatePart(parts.day)}`;
}

export function formatShanghaiDate(value: ShanghaiDateInput, fallback = "-") {
  const parts = shanghaiDateParts(value);
  return parts ? shanghaiDateText(parts) : dateFallback(value, fallback, false);
}

export function formatShanghaiDateTime(value: ShanghaiDateInput, fallback = "-") {
  const parts = shanghaiDateParts(value);
  return parts ? `${shanghaiDateText(parts)} ${padDatePart(parts.hour)}:${padDatePart(parts.minute)}` : dateFallback(value, fallback, true);
}

export function shanghaiDateString(value: ShanghaiDateInput = new Date()) {
  return formatShanghaiDate(value, "");
}

export function addShanghaiDays(date: string, days: number) {
  const parts = civilShanghaiDateParts(date);
  if (!parts) return "";
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return `${shifted.getUTCFullYear()}-${padDatePart(shifted.getUTCMonth() + 1)}-${padDatePart(shifted.getUTCDate())}`;
}

export function formatShanghaiChineseDate(value: ShanghaiDateInput) {
  const parts = shanghaiDateParts(value);
  if (!parts) return "";
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()];
  return `${parts.year}年${parts.month}月${parts.day}日 星期${weekday}`;
}

export function formatShanghaiChineseMonth(value: ShanghaiDateInput) {
  const parts = shanghaiDateParts(value);
  return parts ? `${parts.month}月` : "";
}
