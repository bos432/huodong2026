export type ConnectivityStatus = "ok" | "warning" | "error" | "disabled";

export function configuredChannelCheck(key: string, label: string, enabled: boolean, required: Array<[string, unknown]>) {
  if (!enabled) return { key, label, status: "disabled" as ConnectivityStatus, message: "通道未启用", missing: [] as string[] };
  const missing = required.filter(([, value]) => !String(value || "").trim()).map(([name]) => name);
  return { key, label, status: missing.length ? "error" as ConnectivityStatus : "ok" as ConnectivityStatus, message: missing.length ? `缺少配置：${missing.join("、")}` : "必要参数已配置", missing };
}

export function safeConnectivityUrl(value: unknown, production = process.env.NODE_ENV === "production") {
  const text = String(value || "").trim();
  if (!text) return null;
  let url: URL;
  try { url = new URL(text); } catch { return null; }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  const host = url.hostname.toLowerCase();
  const privateHost = host === "localhost" || host === "0.0.0.0" || host === "::1" || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (production && (url.protocol !== "https:" || privateHost)) return null;
  return url;
}
