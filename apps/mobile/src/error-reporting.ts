import type { App as VueApp } from "vue";

type ErrorContext = Record<string, unknown>;
const STALE_CHUNK_RELOAD_KEY = "h5_stale_chunk_reload_at";
const STALE_CHUNK_RELOAD_WINDOW_MS = 60_000;

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function compactContext(context?: ErrorContext) {
  if (!context) return "";
  const entries = Object.entries(context)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}=${String(value)}`);
  return entries.length ? ` (${entries.join(", ")})` : "";
}

function compactDetail(error: unknown, context?: ErrorContext) {
  const detail = {
    error: error instanceof Error ? { name: error.name, message: error.message } : error,
    context
  };
  const json = safeJson(detail);
  return json && json !== "{}" ? ` detail=${json.slice(0, 1200)}` : "";
}

export function describeError(error: unknown, fallback = "操作失败") {
  if (error instanceof Error) return error.message || error.name || fallback;
  if (typeof error === "string") return error || fallback;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message =
      record.message ||
      record.errMsg ||
      record.errorMessage ||
      record.msg ||
      record.statusText ||
      record.reason;
    const status = record.statusCode || record.status || record.code;
    const text = [message, status ? `status=${status}` : ""].filter(Boolean).join(" ");
    if (text) return text;
    const json = safeJson(error);
    if (json && json !== "{}") return json;
  }
  return fallback;
}

export function clientError(error: unknown, fallback: string, context?: ErrorContext) {
  if (error instanceof Error) return error;
  const message = `${describeError(error, fallback)}${compactContext(context)}`;
  const normalized = new Error(message);
  normalized.name = "H5ClientError";
  return normalized;
}

export function reportH5Error(scope: string, error: unknown, context?: ErrorContext) {
  const message = describeError(error, "未知错误");
  const contextText = compactContext(context);
  console.error(`[H5] ${scope}: ${message}${contextText}${compactDetail(error, context)}`);
}

export function isStaleChunkError(error: unknown) {
  const message = describeError(error, "").toLowerCase();
  return [
    "chunkloaderror",
    "loading chunk",
    "failed to fetch dynamically imported module",
    "error loading dynamically imported module",
    "importing a module script failed"
  ].some((pattern) => message.includes(pattern));
}

function recoverStaleChunk(error: unknown) {
  if (!isStaleChunkError(error) || typeof window === "undefined") return false;
  const lastReloadAt = Number(window.sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY) || 0);
  if (Date.now() - lastReloadAt < STALE_CHUNK_RELOAD_WINDOW_MS) return false;
  const reloadAt = Date.now();
  window.sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, String(reloadAt));
  const url = new URL(window.location.href);
  url.searchParams.set("__h5_reload", String(reloadAt));
  window.location.replace(url.toString());
  return true;
}

export function installH5ErrorReporting(app: VueApp) {
  app.config.errorHandler = (error, _instance, info) => {
    if (recoverStaleChunk(error)) return;
    reportH5Error("vue error", error, { info });
  };

  if (typeof window === "undefined") return;
  const target = window as Window & { __H5_ERROR_REPORTING_INSTALLED__?: boolean };
  if (target.__H5_ERROR_REPORTING_INSTALLED__) return;
  target.__H5_ERROR_REPORTING_INSTALLED__ = true;

  target.addEventListener("error", (event) => {
    if (recoverStaleChunk(event.error || event.message)) {
      event.preventDefault();
      return;
    }
    reportH5Error("window error", event.error || event.message, {
      filename: event.filename,
      line: event.lineno,
      column: event.colno
    });
  });

  target.addEventListener("unhandledrejection", (event) => {
    if (recoverStaleChunk(event.reason)) {
      event.preventDefault();
      return;
    }
    reportH5Error("unhandled promise rejection", event.reason);
  });
}
