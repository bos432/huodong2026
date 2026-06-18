export const API_BASE = (process.env.API_BASE || "http://localhost:3000/api").replace(/\/$/, "");
export const TENANT_CODE = "qiwai-showcase";
export const TENANT_NAME = "七维书院演示中心";
export const SCENARIO = "online-showcase";

export const demoUsers = [
  { key: "free", phone: "13990000001", nickname: "演示用户A-免费报名" },
  { key: "paid", phone: "13990000002", nickname: "演示用户B-余额支付" },
  { key: "refund", phone: "13990000003", nickname: "演示用户C-退款验收" },
  { key: "comment", phone: "13990000004", nickname: "演示用户D-动态互动" },
  { key: "course", phone: "13990000005", nickname: "演示用户E-课程学习" }
];

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function env(name, fallback = "") {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`缺少环境变量：${name}`);
  return value;
}

export function optionalEnv(name, fallback = "") {
  return process.env[name] || fallback;
}

export function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

export function userAuth(token) {
  return { Authorization: `Bearer ${token}`, ...tenantHeader() };
}

export function tenantHeader(code = TENANT_CODE) {
  return { "x-tenant-code": code };
}

export async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok || body?.code !== 0) {
    throw new Error(`${options.method || "GET"} ${path} failed: ${body?.message || text || res.status}`);
  }
  return body.data;
}

export async function tryApi(path, options = {}) {
  try {
    return { ok: true, data: await api(path, options) };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function loginAdmin(username, password) {
  const result = await api("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  assert(result.token, `${username} 登录后没有返回 token`);
  return result;
}

export async function loginPlatformAdmin() {
  return loginAdmin(env("SHOWCASE_ADMIN_USERNAME", "admin"), env("SHOWCASE_ADMIN_PASSWORD"));
}

export async function loginShowcaseAdmin(username = "showcase_admin") {
  return loginAdmin(username, env("SHOWCASE_PASSWORD"));
}

export async function loginUser(phone, nickname) {
  const result = await api("/public/auth/password-login", {
    method: "POST",
    headers: tenantHeader(),
    body: JSON.stringify({ phone, password: env("SHOWCASE_PASSWORD"), nickname })
  });
  assert(result.userAccessToken, `${phone} 用户登录后没有返回 userAccessToken`);
  return result;
}

export function futureDate(days, hour = 10, minute = 0) {
  const date = new Date(Date.now() + days * 86400000);
  date.setHours(hour, minute, 0, 0);
  return formatDateTime(date);
}

export function todayDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

export function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function answers(fields = [], suffix = "") {
  return fields.map((field) => {
    let value = `七维演示验收${suffix}`;
    if (String(field.label || "").includes("姓名")) value = `演示学员${suffix}`;
    if (String(field.label || "").includes("手机") || field.type === "phone") value = `1399000${String(Date.now()).slice(-4)}`;
    if (String(field.label || "").includes("微信")) value = `showcase_${suffix || "user"}`;
    return { fieldId: field.id, label: field.label, type: field.type, value };
  });
}

export function pickList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

export function reportStep(label, detail = "") {
  console.log(`OK ${label}${detail ? `：${detail}` : ""}`);
}

export function cover(seed = 1) {
  const images = [
    "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80"
  ];
  return images[Math.abs(seed) % images.length];
}
