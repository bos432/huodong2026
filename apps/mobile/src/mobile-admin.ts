import { clientError } from "./error-reporting";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const ADMIN_TOKEN_KEY = "mobile_admin_token";
const ADMIN_ROLE_KEY = "mobile_admin_role";
const ADMIN_TENANT_ID_KEY = "mobile_admin_tenant_id";
const ADMIN_TENANT_NAME_KEY = "mobile_admin_tenant_name";
const ADMIN_TENANT_CODE_KEY = "mobile_admin_tenant_code";

export type MobileAdminSession = {
  token: string;
  role: string;
  tenantId: number | null;
  tenantName: string;
  tenantCode: string;
};

export class MobileAdminError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = "MobileAdminError";
  }
}

function headerValue(headers: unknown, name: string) {
  if (!headers || typeof headers !== "object") return undefined;
  const record = headers as Record<string, unknown>;
  const direct = record[name] ?? record[name.toLowerCase()] ?? record[name.toUpperCase()];
  return typeof direct === "string" ? direct : undefined;
}

export function getMobileAdminSession(): MobileAdminSession | null {
  const token = String(uni.getStorageSync(ADMIN_TOKEN_KEY) || "");
  if (!token) return null;
  const tenantId = Number(uni.getStorageSync(ADMIN_TENANT_ID_KEY) || 0);
  return {
    token,
    role: String(uni.getStorageSync(ADMIN_ROLE_KEY) || ""),
    tenantId: tenantId || null,
    tenantName: String(uni.getStorageSync(ADMIN_TENANT_NAME_KEY) || ""),
    tenantCode: String(uni.getStorageSync(ADMIN_TENANT_CODE_KEY) || "")
  };
}

export function clearMobileAdminSession() {
  uni.removeStorageSync(ADMIN_TOKEN_KEY);
  uni.removeStorageSync(ADMIN_ROLE_KEY);
  uni.removeStorageSync(ADMIN_TENANT_ID_KEY);
  uni.removeStorageSync(ADMIN_TENANT_NAME_KEY);
  uni.removeStorageSync(ADMIN_TENANT_CODE_KEY);
}

function saveMobileAdminSession(payload: any) {
  const admin = payload?.admin || {};
  const tenant = admin.tenant || {};
  uni.setStorageSync(ADMIN_TOKEN_KEY, payload.token || "");
  uni.setStorageSync(ADMIN_ROLE_KEY, admin.role || "");
  uni.setStorageSync(ADMIN_TENANT_ID_KEY, admin.tenantId || "");
  uni.setStorageSync(ADMIN_TENANT_NAME_KEY, tenant.name || "");
  uni.setStorageSync(ADMIN_TENANT_CODE_KEY, tenant.code || "");
}

export function requireMobileAdmin() {
  const session = getMobileAdminSession();
  if (session) return session;
  uni.redirectTo({ url: "/pages/admin/login" });
  throw new MobileAdminError("请先登录手机管理端", 401);
}

export function mobileAdminRequest<T>(url: string, options: UniApp.RequestOptions = {}): Promise<T> {
  const session = getMobileAdminSession();
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}${url}`,
      method: options.method || "GET",
      data: options.data,
      header: {
        "Content-Type": "application/json",
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...(options.header || {})
      },
      success(res) {
        const body = res.data as any;
        if (res.statusCode >= 200 && res.statusCode < 300 && body?.code === 0) {
          resolve(body.data as T);
          return;
        }
        if (res.statusCode === 401 || res.statusCode === 403) clearMobileAdminSession();
        const requestId = body?.requestId || headerValue(res.header, "x-request-id");
        reject(new MobileAdminError(requestId ? `${body?.message || "请求失败"}（请求编号：${requestId}）` : body?.message || "请求失败", res.statusCode));
      },
      fail(error) {
        reject(clientError(error, "请求失败", { method: options.method || "GET", url }));
      }
    });
  });
}

export async function loginMobileAdmin(username: string, password: string) {
  const payload = await mobileAdminRequest<any>("/admin/auth/login", { method: "POST", data: { username, password } });
  saveMobileAdminSession(payload);
  return payload;
}

export function uploadAdminImage(filePath: string): Promise<{ url: string; path: string }> {
  const session = requireMobileAdmin();
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE}/admin/uploads/images`,
      filePath,
      name: "file",
      header: { Authorization: `Bearer ${session.token}` },
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
        else reject(new MobileAdminError(body?.message || "上传失败", res.statusCode));
      },
      fail(error) {
        reject(clientError(error, "上传失败", { method: "UPLOAD", url: "/admin/uploads/images" }));
      }
    });
  });
}

export function adminActivityPreviewUrl(id: number, tenantCode?: string) {
  const query = [`id=${id}`, tenantCode ? `tenantCode=${encodeURIComponent(tenantCode)}` : ""].filter(Boolean).join("&");
  return `/pages/activity/detail?${query}`;
}
