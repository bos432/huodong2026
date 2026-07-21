import fs from "node:fs";
import path from "node:path";
import { API_BASE, auth, loginAdmin, tenantHeader } from "./online-showcase-lib.mjs";

const rolePassword = process.env.SHOWCASE_PASSWORD || "Qiwai123456";
const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD || "Admin123456";
const output = path.resolve(
  process.env.FINAL_ROLE_ACCOUNT_RESULT || path.join(".local-logs", `final-role-account-audit-${Date.now()}`, "result.json")
);

const adminCases = [
  {
    label: "平台管理员",
    username: process.env.PLATFORM_ADMIN_USERNAME || "admin",
    password: platformPassword,
    role: "super_admin",
    tenantId: null,
    minPermissions: 140,
    require: ["tenant.view", "partner.view", "finance.view"],
    forbid: [],
    allow: ["/admin/tenants?page=1&pageSize=1", "/admin/partner/applications?page=1&pageSize=1"],
    deny: []
  },
  {
    label: "租户管理员",
    username: "showcase_admin",
    role: "operator",
    tenantId: 23,
    minPermissions: 90,
    require: ["activity.manage", "member.manage", "mall.product.manage", "operation_settings.manage"],
    forbid: ["tenant.view", "partner.view"],
    allow: ["/admin/activities?page=1&pageSize=1", "/admin/members?page=1&pageSize=1"],
    deny: ["/admin/tenants?page=1&pageSize=1"]
  },
  {
    label: "运营",
    username: "showcase_ops",
    role: "operator",
    tenantId: 23,
    minPermissions: 75,
    require: ["activity.manage", "registration.manage", "notification.manage", "homepage.manage"],
    forbid: ["finance.view", "order.refund", "payment_account.view", "agent_settlement.view"],
    allow: ["/admin/activities?page=1&pageSize=1", "/admin/registrations?page=1&pageSize=1"],
    deny: ["/admin/finance/dashboard"]
  },
  {
    label: "财务",
    username: "showcase_finance",
    role: "finance",
    tenantId: 23,
    minPermissions: 34,
    require: ["finance.manage", "order.refund", "mall.finance.view", "agent_settlement.pay"],
    forbid: ["activity.manage", "notification.manage", "mall.product.manage", "mall.settlement.manage"],
    allow: ["/admin/finance/dashboard", "/admin/orders?page=1&pageSize=1"],
    deny: ["/admin/marketing-popups?page=1&pageSize=1"]
  },
  {
    label: "核销员",
    username: "showcase_checkin",
    role: "checkin_staff",
    tenantId: 23,
    minPermissions: 4,
    require: ["dashboard.view", "activity.view", "registration.view", "checkin.manage"],
    forbid: ["registration.manage", "finance.view", "ad_center.view"],
    allow: ["/admin/activities?page=1&pageSize=1", "/admin/registrations?page=1&pageSize=1"],
    deny: ["/admin/ad-campaigns?page=1&pageSize=1"]
  },
  {
    label: "店铺负责人",
    username: "showcase_store_owner",
    role: "operator",
    tenantId: 23,
    minPermissions: 13,
    require: ["mall.product.manage", "mall.order.manage", "mall.logistics.manage"],
    forbid: ["agent_settlement.view"],
    allow: ["/admin/mall/accessible-merchants", "/admin/mall/products?pageSize=1&merchantId={merchantId}", "/admin/mall/orders?pageSize=1&merchantId={merchantId}"],
    deny: ["/admin/agent-settlements"]
  },
  {
    label: "店铺财务",
    username: "showcase_store_finance",
    role: "finance",
    tenantId: 23,
    minPermissions: 9,
    require: ["mall.order.manage", "mall.finance.view", "mall.payment.manage"],
    forbid: ["mall.product.manage", "mall.settlement.manage"],
    allow: ["/admin/mall/accessible-merchants", "/admin/mall/orders?pageSize=1&merchantId={merchantId}", "/admin/mall/settlements?pageSize=1&merchantId={merchantId}"],
    deny: ["/admin/mall/products?pageSize=1&merchantId={merchantId}"]
  },
  {
    label: "代理负责人",
    username: "showcase_agent_owner",
    role: "finance",
    tenantId: 23,
    minPermissions: 16,
    require: ["agent_settlement.manage", "agent_settlement.pay", "mall.order.view"],
    forbid: ["mall.product.manage"],
    allow: ["/admin/mall/accessible-merchants", "/admin/agent-settlements", "/admin/mall/orders?pageSize=1&merchantId={merchantId}"],
    deny: ["/admin/mall/products?pageSize=1&merchantId={merchantId}"]
  },
  {
    label: "讲师",
    username: "showcase_course_teacher",
    role: "operator",
    tenantId: 23,
    minPermissions: 4,
    require: ["course.teacher_scope", "course.manage"],
    forbid: ["activity.view", "finance.view"],
    allow: ["/admin/courses?page=1&pageSize=1"],
    deny: ["/admin/activities?page=1&pageSize=1"]
  },
  {
    label: "伙伴管理",
    username: "showcase_partner_manager",
    role: "operator",
    tenantId: null,
    minPermissions: 4,
    require: ["partner.view", "partner.manage", "partner.sensitive", "partner.export"],
    forbid: ["tenant.view", "activity.view"],
    allow: ["/admin/partner/applications?page=1&pageSize=1", "/admin/partner/contracts?page=1&pageSize=1"],
    deny: ["/admin/tenants?page=1&pageSize=1"]
  }
];

const memberCases = [
  { label: "活动会员", phone: "13990000002" },
  { label: "课程会员", phone: "13780155100" },
  { label: "商城会员", phone: "13990008991" },
  { label: "志愿者", phone: "13994384798" }
];

async function raw(route, token, options = {}) {
  const response = await fetch(`${API_BASE}${route}`, {
    ...options,
    headers: { ...(token ? auth(token) : {}), ...(options.headers || {}) }
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { status: response.status, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function responseData(result) {
  return result.payload?.data ?? result.payload;
}

async function merchantIdFor(token, username) {
  const result = await raw("/admin/mall/accessible-merchants", token);
  assert(result.status === 200 && result.payload?.code === 0, `${username} 无法读取授权店铺`);
  const merchants = responseData(result);
  const merchant = merchants.find((row) => row.code === "qiwai-showcase-main") || merchants.find((row) => row.status === "active") || merchants[0];
  assert(merchant?.id, `${username} 没有可验收店铺`);
  return Number(merchant.id);
}

function expandPath(route, merchantId) {
  return route.replaceAll("{merchantId}", String(merchantId || ""));
}

async function auditAdmin(item) {
  const login = await loginAdmin(item.username, item.password || rolePassword);
  const permissions = new Set(login.admin?.permissions || []);
  const actualTenantId = login.admin?.tenantId == null ? null : Number(login.admin.tenantId);
  assert(login.admin?.role === item.role, `${item.username} 角色错误：${login.admin?.role}`);
  assert(actualTenantId === item.tenantId, `${item.username} 租户错误：${actualTenantId}`);
  assert(permissions.size >= item.minPermissions, `${item.username} 权限数量不足：${permissions.size}`);
  for (const permission of item.require) assert(permissions.has(permission), `${item.username} 缺少权限 ${permission}`);
  for (const permission of item.forbid) assert(!permissions.has(permission), `${item.username} 越权包含 ${permission}`);

  const needsMerchant = [...item.allow, ...item.deny].some((route) => route.includes("{merchantId}"));
  const merchantId = needsMerchant ? await merchantIdFor(login.token, item.username) : null;
  const allowed = [];
  const denied = [];
  for (const route of item.allow) {
    const resolved = expandPath(route, merchantId);
    const result = await raw(resolved, login.token);
    assert(result.status >= 200 && result.status < 300 && result.payload?.code === 0, `${item.username} 应允许 ${resolved}，实际 ${result.status}`);
    allowed.push(resolved);
  }
  for (const route of item.deny) {
    const resolved = expandPath(route, merchantId);
    const result = await raw(resolved, login.token);
    assert(result.status === 403, `${item.username} 应拒绝 ${resolved}，实际 ${result.status}`);
    denied.push(resolved);
  }
  return {
    label: item.label,
    username: item.username,
    adminId: Number(login.admin.id),
    role: login.admin.role,
    tenantId: actualTenantId,
    permissionCount: permissions.size,
    merchantId,
    allowed,
    denied
  };
}

async function auditMember(item) {
  const loginResult = await raw("/public/auth/password-login", null, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...tenantHeader() },
    body: JSON.stringify({ phone: item.phone, password: rolePassword })
  });
  assert(loginResult.status === 201 && loginResult.payload?.code === 0, `${item.label} ${item.phone} 登录失败：${loginResult.status}`);
  const login = responseData(loginResult);
  assert(login.userAccessToken, `${item.label} 登录未返回访问令牌`);
  const profileResult = await raw("/public/me/profile", login.userAccessToken, { headers: tenantHeader() });
  assert(profileResult.status === 200 && profileResult.payload?.code === 0, `${item.label} 无法读取个人资料`);
  const profile = responseData(profileResult);
  const loginUserId = Number(login.user?.id || login.userId);
  const profileUserId = Number(profile.user?.id || profile.id || profile.userId);
  assert(loginUserId > 0 && profileUserId === loginUserId, `${item.label} 登录与资料用户不一致`);
  return { label: item.label, phone: item.phone, userId: loginUserId, profileUserId, tenantCode: "qiwai-showcase" };
}

async function main() {
  const result = { status: "running", apiBase: API_BASE, startedAt: new Date().toISOString(), admins: [], members: [] };
  try {
    for (const item of adminCases) result.admins.push(await auditAdmin(item));
    for (const item of memberCases) result.members.push(await auditMember(item));
    result.status = "passed";
    result.finishedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify({ status: result.status, admins: result.admins.length, members: result.members.length, allowedChecks: result.admins.reduce((sum, row) => sum + row.allowed.length, 0), deniedChecks: result.admins.reduce((sum, row) => sum + row.denied.length, 0), resultFile: output }, null, 2));
  } catch (error) {
    result.status = "failed";
    result.error = error instanceof Error ? error.stack : String(error);
    result.finishedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
