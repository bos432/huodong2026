import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

export class ApiClientError extends Error {
  constructor(message: string, public readonly requestId?: string) {
    super(requestId ? `${message}（请求编号：${requestId}）` : message);
    this.name = "ApiClientError";
  }
}

function requestIdFromHeaders(headers: unknown) {
  const value = headers && typeof headers === "object" ? (headers as Record<string, unknown>)["x-request-id"] : undefined;
  return typeof value === "string" ? value : undefined;
}

function normalizeApiMessage(value: unknown, fallback: string) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return fallback;
  const data = value as Record<string, unknown>;
  const base = typeof data.message === "string" ? data.message : fallback;
  const issues = Array.isArray(data.issues)
    ? data.issues
        .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>).message : ""))
        .filter(Boolean)
        .join("；")
    : "";
  return issues ? `${base}：${issues}` : base;
}

async function errorFromFetchResponse(res: Response, fallback: string) {
  const requestId = res.headers.get("x-request-id") || undefined;
  let message = fallback;
  try {
    const body = await res.json();
    message = body?.message || message;
    throw new ApiClientError(message, body?.requestId || requestId);
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    throw new ApiClientError(message, requestId);
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data.data,
  (error) => {
    const responseMessage = error.response?.data?.message;
    const message = error.response?.status === 403 ? "当前账号无权限，请联系超级管理员" : normalizeApiMessage(responseMessage, error.message || "请求失败");
    const requestId = error.response?.data?.requestId || requestIdFromHeaders(error.response?.headers);
    return Promise.reject(new ApiClientError(message, requestId));
  }
);

export function downloadExport(params: Record<string, unknown>) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""));
  const query = new URLSearchParams(clean as Record<string, string>).toString();
  const token = localStorage.getItem("admin_token");
  return fetch(`/api/admin/registrations/export?${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(async (res) => {
    if (!res.ok) await errorFromFetchResponse(res, "导出失败");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "报名记录.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  });
}

export function downloadFile(path: string, filename: string) {
  const token = localStorage.getItem("admin_token");
  return fetch(`/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(async (res) => {
    if (!res.ok) await errorFromFetchResponse(res, "下载失败");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}
