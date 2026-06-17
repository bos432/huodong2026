function configuredH5Origin() {
  const value = String(import.meta.env.VITE_H5_ORIGIN || "").trim();
  if (value) return normalizeH5Origin(value);
  if (typeof window !== "undefined" && window.location?.hostname) {
    const { hostname, origin, protocol } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") return `${protocol}//${hostname}:4139`;
    return origin;
  }
  return "http://127.0.0.1:4139";
}

function normalizeH5Origin(value: string) {
  try {
    const url = new URL(value);
    if (url.port === "4139" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") url.port = "";
    return url.origin;
  } catch {
    return value;
  }
}

export function h5PreviewUrl(tenantCode?: string | null, path = "/") {
  const url = new URL(path || "/", configuredH5Origin());
  if (tenantCode?.trim()) url.searchParams.set("tenantCode", tenantCode.trim());
  return url.toString();
}

export function h5RoutePreviewUrl(tenantCode?: string | null, route = "/pages/index/index") {
  const base = h5PreviewUrl(tenantCode);
  const [path, query = ""] = route.split("?");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}#${normalizedPath}${query ? `?${query}` : ""}`;
}

export function activityH5PreviewUrl(activityId: number | string, tenantCode?: string | null) {
  return h5RoutePreviewUrl(tenantCode, `/pages/activity/detail?id=${encodeURIComponent(String(activityId))}`);
}

export function openH5Preview(tenantCode?: string | null) {
  window.open(h5PreviewUrl(tenantCode), "_blank", "noopener,noreferrer");
}

export async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}
