import { unref } from "vue";
import { getCurrentTenantCode, withTenantCode } from "./api";

type ShareValue<T> = T | { value: T } | (() => T);

export type MiniProgramShareOptions = {
  title?: ShareValue<string | undefined>;
  path?: ShareValue<string | undefined>;
  imageUrl?: ShareValue<string | undefined>;
};

function resolveShareValue<T>(value: ShareValue<T | undefined> | undefined, fallback: T): T {
  try {
    if (typeof value === "function") return (value as () => T | undefined)() || fallback;
    return unref(value as any) || fallback;
  } catch {
    return fallback;
  }
}

function currentPageUrl(fallbackPath = "/pages/index/index") {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const path = page?.route ? `/${page.route}` : fallbackPath;
  const query: Record<string, string> = {};
  const options = page?.options && typeof page.options === "object" ? page.options as Record<string, unknown> : {};
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null || value === "") continue;
    query[key] = String(value);
  }
  const tenantCode = getCurrentTenantCode();
  if (tenantCode) query.tenantCode = tenantCode;
  const search = Object.entries(query)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return search ? `${path}?${search}` : path;
}

export function defaultMiniProgramShare(options: MiniProgramShareOptions = {}) {
  const title = resolveShareValue(options.title, "慢π活动报名");
  const path = withTenantCode(resolveShareValue(options.path, currentPageUrl()));
  const imageUrl = resolveShareValue(options.imageUrl, "");
  return {
    title,
    path,
    ...(imageUrl ? { imageUrl } : {})
  };
}

export function defaultMiniProgramTimelineShare(options: MiniProgramShareOptions = {}) {
  const share = defaultMiniProgramShare(options);
  const query = share.path.includes("?") ? share.path.slice(share.path.indexOf("?") + 1) : "";
  return {
    title: share.title,
    query,
    ...(share.imageUrl ? { imageUrl: share.imageUrl } : {})
  };
}

export function showMiniProgramShareMenu() {
  // #ifdef MP-WEIXIN
  uni.showShareMenu({
    withShareTicket: true,
    menus: ["shareAppMessage", "shareTimeline"] as any
  });
  // #endif
}
