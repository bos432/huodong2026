import { clientError } from "./error-reporting";
import { queryFromUrl, queryParam, stringifyQuery } from "./query";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const DEV_PHONE = "13800000001";
const TENANT_CODE_STORAGE_KEY = "h5_tenant_code";
const TENANT_CODE_SOURCE_STORAGE_KEY = "h5_tenant_code_source";
const ACTIVITY_LIST_INTENT_STORAGE_KEY = "h5_activity_list_intent";
const USER_TOKEN_STORAGE_KEY = "user_token";

export type ActivityListIntent = {
  categoryId?: number | "all";
  keyword?: string;
  focus?: boolean;
  tenantCode?: string;
  ts?: number;
};

export class ApiClientError extends Error {
  constructor(message: string, public readonly requestId?: string) {
    super(requestId ? `${message}（请求编号：${requestId}）` : message);
    this.name = "ApiClientError";
  }
}

function headerValue(headers: unknown, name: string) {
  if (!headers || typeof headers !== "object") return undefined;
  const record = headers as Record<string, unknown>;
  const direct = record[name] ?? record[name.toLowerCase()] ?? record[name.toUpperCase()];
  return typeof direct === "string" ? direct : undefined;
}

function normalizeTenantCode(value?: unknown) {
  const code = typeof value === "string" ? value.trim() : "";
  return code || "";
}

function queryTenantCode(search?: string) {
  return normalizeTenantCode(queryParam(search, "tenantCode"));
}

function locationTenantCode() {
  if (typeof window === "undefined") return "";
  const direct = queryTenantCode(window.location.search);
  if (direct) return direct;
  const hash = window.location.hash || "";
  const queryStart = hash.indexOf("?");
  if (queryStart < 0) return "";
  return queryTenantCode(hash.slice(queryStart + 1));
}

function pageTenantCode() {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  return normalizeTenantCode(page?.options?.tenantCode);
}

export function syncTenantCodeFromRoute() {
  const code = locationTenantCode() || pageTenantCode();
  if (code) {
    uni.setStorageSync(TENANT_CODE_STORAGE_KEY, code);
    setCurrentTenantCodeSource("route");
    return code;
  }
  return normalizeTenantCode(uni.getStorageSync(TENANT_CODE_STORAGE_KEY));
}

export function getCurrentTenantCode() {
  return syncTenantCodeFromRoute();
}

export function setCurrentTenantCode(value: string) {
  const code = normalizeTenantCode(value);
  if (code) uni.setStorageSync(TENANT_CODE_STORAGE_KEY, code);
  else uni.removeStorageSync(TENANT_CODE_STORAGE_KEY);
  // #ifdef H5
  if (typeof window !== "undefined") {
    const nextUrl = new URL(window.location.href);
    if (code) nextUrl.searchParams.set("tenantCode", code);
    else nextUrl.searchParams.delete("tenantCode");
    window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }
  // #endif
  return code;
}

export function hasExplicitTenantCodeInRoute() {
  return Boolean(locationTenantCode() || pageTenantCode());
}

export function setCurrentTenantCodeSource(value: "route" | "manual" | "location" | "") {
  if (value) uni.setStorageSync(TENANT_CODE_SOURCE_STORAGE_KEY, value);
  else uni.removeStorageSync(TENANT_CODE_SOURCE_STORAGE_KEY);
}

export function getCurrentTenantCodeSource() {
  return String(uni.getStorageSync(TENANT_CODE_SOURCE_STORAGE_KEY) || "");
}

function isPublicApiUrl(url: string) {
  return url === "/public" || url.startsWith("/public/");
}

function hasTenantCode(url: string) {
  return /(?:\?|&)tenantCode=/.test(url);
}

function appendTenantCode(url: string, tenantCode: string) {
  if (!tenantCode || !isPublicApiUrl(url) || hasTenantCode(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}tenantCode=${encodeURIComponent(tenantCode)}`;
}

export function withTenantCode(url: string) {
  const tenantCode = getCurrentTenantCode();
  if (!tenantCode || hasTenantCode(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}tenantCode=${encodeURIComponent(tenantCode)}`;
}

export function setActivityListIntent(intent: ActivityListIntent) {
  uni.setStorageSync(ACTIVITY_LIST_INTENT_STORAGE_KEY, {
    ...intent,
    tenantCode: getCurrentTenantCode(),
    ts: Date.now()
  });
}

export function setActivityListIntentFromUrl(url: string, fallback: ActivityListIntent = {}) {
  const query = queryFromUrl(url);
  const categoryIdText = queryParam(query, "categoryId");
  const categoryId = categoryIdText && Number.isFinite(Number(categoryIdText)) ? Number(categoryIdText) : fallback.categoryId;
  setActivityListIntent({
    ...fallback,
    categoryId,
    keyword: queryParam(query, "keyword") || fallback.keyword,
    focus: queryParam(query, "focus") === "1" || queryParam(query, "focus") === "true" || fallback.focus
  });
}

export function consumeActivityListIntent(): ActivityListIntent | null {
  const raw = uni.getStorageSync(ACTIVITY_LIST_INTENT_STORAGE_KEY);
  uni.removeStorageSync(ACTIVITY_LIST_INTENT_STORAGE_KEY);
  if (!raw || typeof raw !== "object") return null;
  return raw as ActivityListIntent;
}

export function request<T>(url: string, options: UniApp.RequestOptions = {}): Promise<T> {
  const tenantCode = getCurrentTenantCode();
  const requestUrl = appendTenantCode(url, tenantCode);
  const tenantHeader = tenantCode && isPublicApiUrl(url) ? { "x-tenant-code": tenantCode } : {};
  const userToken = isPublicApiUrl(url) ? String(uni.getStorageSync(USER_TOKEN_STORAGE_KEY) || "") : "";
  const authHeader = userToken ? { Authorization: `Bearer ${userToken}` } : {};
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}${requestUrl}`,
      method: options.method || "GET",
      data: options.data,
      header: { "Content-Type": "application/json", ...tenantHeader, ...authHeader, ...(options.header || {}) },
      success(res) {
        const body = res.data as any;
        if (res.statusCode >= 200 && res.statusCode < 300 && body?.code === 0) resolve(body.data as T);
        else reject(new ApiClientError(body?.message || "请求失败", body?.requestId || headerValue(res.header, "x-request-id")));
      },
      fail(error) {
        reject(clientError(error, "请求失败", { method: options.method || "GET", url: requestUrl }));
      }
    });
  });
}

function isInvalidUserSessionError(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as any)?.message || error || "");
  return message.includes("登录凭证无效") || message.includes("登录已过期") || message.includes("登录已失效");
}

export function getUserId() {
  return Number(uni.getStorageSync("user_id") || 0);
}

export function getCurrentRouteWithQuery() {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  if (!page?.route) return "/pages/index/index";
  const options = { ...(page.options || {}) };
  const tenantCode = getCurrentTenantCode();
  if (tenantCode && !options.tenantCode) options.tenantCode = tenantCode;
  const query = stringifyQuery(options);
  return `/${page.route}${query ? `?${query}` : ""}`;
}

export function clearUser() {
  uni.removeStorageSync("user_id");
  uni.removeStorageSync(USER_TOKEN_STORAGE_KEY);
  uni.removeStorageSync("user_phone");
  uni.removeStorageSync("user_nickname");
}

export function getUserToken() {
  return String(uni.getStorageSync(USER_TOKEN_STORAGE_KEY) || "");
}

export async function requestH5Code(phone: string) {
  return request<any>("/public/auth/h5-code", { method: "POST", data: { phone } });
}

export async function loginH5(phone: string, verificationToken: string, verificationCode: string, nickname?: string) {
  const result = await request<any>("/public/auth/h5-login", { method: "POST", data: { phone, nickname, verificationToken, verificationCode } });
  return saveUserSession(result, phone, nickname);
}

export async function loginH5Password(phone: string, password: string, nickname?: string) {
  const result = await request<any>("/public/auth/password-login", { method: "POST", data: { phone, password, nickname } });
  return saveUserSession(result, phone, nickname);
}

function saveUserSession(result: any, phone: string, nickname?: string) {
  const user = result.user || result;
  uni.setStorageSync("user_id", user.id);
  if (result.userAccessToken) uni.setStorageSync(USER_TOKEN_STORAGE_KEY, result.userAccessToken);
  uni.setStorageSync("user_phone", phone);
  uni.setStorageSync("user_nickname", user.nickname || nickname || "");
  return user;
}

export function saveProfileSession(user: any) {
  if (user?.phone) uni.setStorageSync("user_phone", user.phone);
  else uni.removeStorageSync("user_phone");
  uni.setStorageSync("user_nickname", user?.nickname || "");
  return user;
}

export async function fetchMyProfile() {
  const profile = await request<any>("/public/me/profile");
  saveProfileSession(profile);
  return profile;
}

export async function fetchMyCharityTransactions(page = 1, pageSize = 20) {
  return request<any>(`/public/me/charity/transactions?page=${page}&pageSize=${pageSize}`);
}

export async function requestRegistrationRefund(id: number) {
  return request<any>(`/public/me/registrations/${id}/refund-request`, { method: "POST" });
}

export async function updateMyProfile(data: { nickname?: string; avatarUrl?: string }) {
  const profile = await request<any>("/public/me/profile", { method: "PATCH", data });
  saveProfileSession(profile);
  return profile;
}

export async function updateMyPassword(password: string) {
  return request<any>("/public/me/password", { method: "POST", data: { password } });
}

export async function requestPhoneChangeCode(phone: string) {
  return request<any>("/public/me/phone/change-code", { method: "POST", data: { phone } });
}

export async function updateMyPhone(phone: string, verificationToken: string, verificationCode: string) {
  const profile = await request<any>("/public/me/phone", { method: "POST", data: { phone, verificationToken, verificationCode } });
  saveProfileSession(profile);
  return profile;
}

export function uploadMyAvatar(filePath: string): Promise<{ url: string; path: string }> {
  const token = getUserToken();
  const tenantCode = getCurrentTenantCode();
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE}${appendTenantCode("/public/me/avatar", tenantCode)}`,
      filePath,
      name: "file",
      header: { ...(tenantCode ? { "x-tenant-code": tenantCode } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      success(res) {
        let body: any = res.data;
        if (typeof body === "string") {
          try {
            body = JSON.parse(body);
          } catch {
            body = null;
          }
        }
        if (res.statusCode >= 200 && res.statusCode < 300 && body?.code === 0) resolve(body.data);
        else reject(new ApiClientError(body?.message || "上传失败", body?.requestId || headerValue(res.header, "x-request-id")));
      },
      fail(error) {
        reject(clientError(error, "上传失败", { method: "UPLOAD", url: appendTenantCode("/public/me/avatar", tenantCode) }));
      }
    });
  });
}

export function uploadMallReviewImage(filePath: string): Promise<{ url: string; path: string }> {
  return uploadPublicImage("/public/me/mall/review-images", filePath);
}

export function uploadMallRefundImage(filePath: string): Promise<{ url: string; path: string }> {
  return uploadPublicImage("/public/me/mall/refund-images", filePath);
}

export function uploadCommunityPostImage(filePath: string): Promise<{ url: string; path: string }> {
  return uploadPublicImage("/public/me/community/post-images", filePath);
}

function uploadPublicImage(path: string, filePath: string): Promise<{ url: string; path: string }> {
  const token = getUserToken();
  const tenantCode = getCurrentTenantCode();
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE}${appendTenantCode(path, tenantCode)}`,
      filePath,
      name: "file",
      header: { ...(tenantCode ? { "x-tenant-code": tenantCode } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      success(res) {
        let body: any = res.data;
        if (typeof body === "string") {
          try {
            body = JSON.parse(body);
          } catch {
            body = null;
          }
        }
        if (res.statusCode >= 200 && res.statusCode < 300 && body?.code === 0) resolve(body.data);
        else reject(new ApiClientError(body?.message || "上传失败", body?.requestId || headerValue(res.header, "x-request-id")));
      },
      fail(error) {
        reject(clientError(error, "上传失败", { method: "UPLOAD", url: appendTenantCode(path, tenantCode) }));
      }
    });
  });
}

export async function loginWechat(code: string, nickname?: string, avatarUrl?: string) {
  let appId = "";
  // #ifdef MP-WEIXIN
  try {
    appId = uni.getAccountInfoSync?.().miniProgram?.appId || "";
  } catch {
    appId = "";
  }
  // #endif
  const result = await request<any>("/public/auth/wechat-login", { method: "POST", data: { code, appId: appId || undefined, nickname, avatarUrl } });
  const user = result.user || result;
  uni.setStorageSync("user_id", user.id);
  if (result.userAccessToken) uni.setStorageSync(USER_TOKEN_STORAGE_KEY, result.userAccessToken);
  uni.setStorageSync("user_nickname", user.nickname || nickname || "");
  if (user.phone) uni.setStorageSync("user_phone", user.phone);
  return user;
}

export async function ensureUser() {
  const existing = getUserId();
  const existingToken = uni.getStorageSync(USER_TOKEN_STORAGE_KEY);
  if (existing && existingToken) {
    try {
      await request("/public/me/profile");
      return existing;
    } catch (error) {
      if (!isInvalidUserSessionError(error)) throw error;
      clearUser();
    }
  }
  if (existing && !existingToken) clearUser();
  if (!import.meta.env.DEV) {
    const redirect = encodeURIComponent(getCurrentRouteWithQuery());
    uni.navigateTo({ url: `/pages/user/login?redirect=${redirect}` });
    throw new Error("请先完成手机号验证码登录");
  }
  const code = await requestH5Code(DEV_PHONE);
  if (!code.devCode) throw new Error("请先完成手机号验证码登录");
  const user = await loginH5(DEV_PHONE, code.verificationToken, code.devCode, "本地演示用户");
  return user.id;
}
