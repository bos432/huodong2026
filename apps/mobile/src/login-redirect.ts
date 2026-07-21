import { queryEntries, queryFromUrl, stringifyQuery } from "./query";

const HOME_PAGE_URL = "/pages/index/index";
const LOGIN_PAGE_URL = "/pages/user/login";
const PAGE_PATH_PATTERN = /^\/pages\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/;

function decodeRedirectTarget(value: unknown) {
  const text = String(value || "").trim();
  if (text.startsWith("/pages/")) return text;
  try {
    return decodeURIComponent(text);
  } catch {
    return "";
  }
}

export function normalizeLoginRedirectTarget(value: unknown, tenantCode: string) {
  const target = decodeRedirectTarget(value);
  if (!target || /[\\#\u0000-\u001f\u007f]/.test(target)) return `${HOME_PAGE_URL}?tenantCode=${encodeURIComponent(tenantCode)}`;
  const path = target.split("?")[0];
  if (!PAGE_PATH_PATTERN.test(path) || path === LOGIN_PAGE_URL) return `${HOME_PAGE_URL}?tenantCode=${encodeURIComponent(tenantCode)}`;
  const params: Record<string, string> = {};
  for (const [key, itemValue] of queryEntries(queryFromUrl(target))) {
    if (!key || key === "tenantCode") continue;
    params[key] = itemValue;
  }
  if (tenantCode) params.tenantCode = tenantCode;
  const query = stringifyQuery(params);
  return `${path}${query ? `?${query}` : ""}`;
}
