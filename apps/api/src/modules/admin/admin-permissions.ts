import { AdminRole, normalizeAdminRole } from "./admin-roles";

export const ADMIN_PERMISSION_DEFINITIONS = [
  { key: "dashboard.view", label: "工作台/数据看板", group: "总览" },
  { key: "analytics.view", label: "数据中心", group: "总览" },
  { key: "tenant.manage", label: "商家管理", group: "平台管理", platformOnly: true },
  { key: "tenant_region.manage", label: "区域保护", group: "平台管理", platformOnly: true },
  { key: "admin.manage", label: "后台账号管理", group: "平台管理" },
  { key: "logs.view", label: "操作/登录/验证码日志", group: "系统安全" },
  { key: "system.manage", label: "系统设置/上线体检", group: "系统安全" },
  { key: "miniprogram_release.manage", label: "小程序发布管理", group: "系统安全", platformOnly: true },
  { key: "activity.view", label: "查看活动", group: "活动" },
  { key: "activity.manage", label: "创建/编辑/下架活动", group: "活动" },
  { key: "activity.approve", label: "平台审核活动", group: "活动", platformOnly: true },
  { key: "category.manage", label: "活动分类管理", group: "活动" },
  { key: "ticket.manage", label: "票种管理", group: "活动" },
  { key: "coupon.manage", label: "优惠码管理", group: "活动" },
  { key: "registration.view", label: "查看报名", group: "报名签到" },
  { key: "registration.manage", label: "审核/取消报名", group: "报名签到" },
  { key: "registration.export", label: "导出报名", group: "报名签到" },
  { key: "waitlist.manage", label: "候补管理", group: "报名签到" },
  { key: "checkin.manage", label: "签到核销", group: "报名签到" },
  { key: "order.view", label: "查看订单", group: "订单财务" },
  { key: "order.manage", label: "订单备注/确认收款/关闭", group: "订单财务" },
  { key: "order.refund", label: "退款处理", group: "订单财务" },
  { key: "order.export", label: "导出订单", group: "订单财务" },
  { key: "finance.view", label: "财务对账查看", group: "订单财务" },
  { key: "finance.manage", label: "对账处理/流水导入", group: "订单财务" },
  { key: "finance.export", label: "导出财务数据", group: "订单财务" },
  { key: "finance.wallet_adjust", label: "会员余额调整", group: "订单财务" },
  { key: "mall.product.manage", label: "商城商品/营销管理", group: "商城管理" },
  { key: "mall.logistics.manage", label: "商城物流设置", group: "商城管理" },
  { key: "mall.order.view", label: "查看商城订单", group: "商城管理" },
  { key: "mall.order.manage", label: "商城发货/确认收款", group: "商城管理" },
  { key: "mall.refund.manage", label: "商城售后退款", group: "商城管理" },
  { key: "mall.finance.view", label: "商城财务查看", group: "商城管理" },
  { key: "payment_account.view", label: "查看收款账户", group: "订单财务" },
  { key: "payment_account.manage", label: "维护收款账户", group: "订单财务" },
  { key: "agent_settlement.view", label: "查看代理结算", group: "订单财务" },
  { key: "agent_settlement.manage", label: "生成/审核代理结算", group: "订单财务" },
  { key: "agent_settlement.pay", label: "标记代理结算打款", group: "订单财务" },
  { key: "agent_settlement.transfer", label: "代理结算转账/扫描", group: "订单财务" },
  { key: "agent_settlement.export", label: "导出代理结算", group: "订单财务" },
  { key: "member.view", label: "查看会员", group: "会员运营" },
  { key: "member.manage", label: "创建/编辑会员", group: "会员运营" },
  { key: "member.password", label: "重置会员密码", group: "会员运营" },
  { key: "member_level.manage", label: "会员等级管理", group: "会员运营" },
  { key: "tag.manage", label: "用户标签管理", group: "会员运营" },
  { key: "notification.manage", label: "通知中心", group: "会员运营" },
  { key: "review.manage", label: "评价管理", group: "会员运营" },
  { key: "homepage.manage", label: "首页装修", group: "装修营销" },
  { key: "announcement.manage", label: "公告管理", group: "装修营销" },
  { key: "operation_settings.manage", label: "运营设置", group: "装修营销" },
  { key: "tenant_profile.manage", label: "商家资料", group: "商家设置" },
  { key: "charity.view", label: "查看公益池", group: "公益招募" },
  { key: "charity.manage", label: "公益项目/设置", group: "公益招募" },
  { key: "charity.finance", label: "公益流水/拨付", group: "公益招募" },
  { key: "ambassador.manage", label: "文化大使招募", group: "公益招募", platformOnly: true },
  { key: "course.manage", label: "课程管理", group: "书院运营" },
  { key: "community.manage", label: "书院动态/共修管理", group: "书院运营" },
  { key: "upload.image", label: "上传图片", group: "通用能力" },
  { key: "upload.settlement_proof", label: "上传结算凭证", group: "通用能力" }
] as const;

export type AdminPermissionKey = (typeof ADMIN_PERMISSION_DEFINITIONS)[number]["key"];

export const ALL_ADMIN_PERMISSIONS = ADMIN_PERMISSION_DEFINITIONS.map((item) => item.key);
const ALL_PERMISSION_SET = new Set<string>(ALL_ADMIN_PERMISSIONS);
const PLATFORM_ONLY_PERMISSION_SET = new Set<string>(ADMIN_PERMISSION_DEFINITIONS.filter((item) => "platformOnly" in item && item.platformOnly).map((item) => item.key));

const OPERATOR_PERMISSIONS: AdminPermissionKey[] = [
  "dashboard.view",
  "analytics.view",
  "activity.view",
  "activity.manage",
  "category.manage",
  "ticket.manage",
  "coupon.manage",
  "registration.view",
  "registration.manage",
  "registration.export",
  "waitlist.manage",
  "checkin.manage",
  "member.view",
  "member.manage",
  "member.password",
  "member_level.manage",
  "tag.manage",
  "notification.manage",
  "review.manage",
  "mall.product.manage",
  "mall.logistics.manage",
  "mall.order.view",
  "mall.order.manage",
  "homepage.manage",
  "announcement.manage",
  "operation_settings.manage",
  "tenant_profile.manage",
  "charity.view",
  "charity.manage",
  "course.manage",
  "community.manage",
  "upload.image"
];

const FINANCE_PERMISSIONS: AdminPermissionKey[] = [
  "dashboard.view",
  "analytics.view",
  "activity.view",
  "registration.view",
  "order.view",
  "order.manage",
  "order.refund",
  "order.export",
  "finance.view",
  "finance.manage",
  "finance.export",
  "finance.wallet_adjust",
  "mall.order.view",
  "mall.order.manage",
  "mall.refund.manage",
  "mall.finance.view",
  "payment_account.view",
  "agent_settlement.view",
  "agent_settlement.manage",
  "agent_settlement.pay",
  "agent_settlement.transfer",
  "agent_settlement.export",
  "charity.view",
  "charity.finance",
  "upload.settlement_proof"
];

const CHECKIN_PERMISSIONS: AdminPermissionKey[] = ["activity.view", "registration.view", "checkin.manage"];

export function normalizeAdminPermissions(value: unknown) {
  if (!Array.isArray(value)) return null;
  return Array.from(new Set(value.map((item) => String(item)).filter((item) => ALL_PERMISSION_SET.has(item)))) as AdminPermissionKey[];
}

export function defaultPermissionsForRole(role?: string | null, tenantScoped = false) {
  const normalizedRole = normalizeAdminRole(role);
  if (normalizedRole === AdminRole.SuperAdmin) {
    return tenantScoped ? ALL_ADMIN_PERMISSIONS.filter((key) => !PLATFORM_ONLY_PERMISSION_SET.has(key)) : [...ALL_ADMIN_PERMISSIONS];
  }
  if (normalizedRole === AdminRole.Operator) return [...OPERATOR_PERMISSIONS];
  if (normalizedRole === AdminRole.Finance) return [...FINANCE_PERMISSIONS];
  if (normalizedRole === AdminRole.CheckInStaff) return [...CHECKIN_PERMISSIONS];
  return [];
}

export function effectivePermissionsForAdmin(input: { role?: string | null; tenantId?: number | null; permissions?: unknown }) {
  const assigned = normalizeAdminPermissions(input.permissions);
  return assigned ?? defaultPermissionsForRole(input.role, Boolean(input.tenantId));
}

export function hasAdminPermission(input: { role?: string | null; tenantId?: number | null; permissions?: unknown }, permission: string) {
  return effectivePermissionsForAdmin(input).includes(permission as AdminPermissionKey);
}

export function resolveAdminRoutePermission(method: string, routePath?: string) {
  const path = String(routePath || "").replace(/^\/admin\/?/, "").replace(/^\/+/, "");
  const verb = method.toUpperCase();
  const write = ["POST", "PATCH", "PUT", "DELETE"].includes(verb);
  if (path === "dashboard") return "dashboard.view";
  if (path.startsWith("analytics/")) return "analytics.view";
  if (path === "tenants" || path === "tenants/:id" || path === "tenants/:id/permissions" || path === "tenants/export") return "tenant.manage";
  if (path.startsWith("tenant-regions")) return "tenant_region.manage";
  if (path === "tenant/profile") return verb === "GET" ? "tenant_profile.manage" : "tenant_profile.manage";
  if (path.startsWith("admins")) return "admin.manage";
  if (path === "operation-logs" || path.startsWith("auth/login-logs") || path.startsWith("auth/h5-code-logs")) return "logs.view";
  if (path.startsWith("miniprogram-release")) return "miniprogram_release.manage";
  if (path === "mall/products" || path.startsWith("mall/products/") || path.startsWith("mall/categories") || path.startsWith("mall/skus") || path.startsWith("mall/coupons")) return "mall.product.manage";
  if (path.startsWith("mall/logistics-companies")) return "mall.logistics.manage";
  if (path.startsWith("mall/inventory-logs")) return "mall.product.manage";
  if (path === "mall/orders/export") return "mall.finance.view";
  if (path === "mall/orders/summary") return "mall.finance.view";
  if (path === "mall/orders/close-expired") return "mall.finance.view";
  if (path === "mall/orders" && verb === "GET") return "mall.order.view";
  if (path.startsWith("mall/orders")) return "mall.order.manage";
  if (path === "mall/refunds" && verb === "GET") return "mall.finance.view";
  if (path.startsWith("mall/refunds")) return "mall.refund.manage";
  if (path.startsWith("system/") || path === "settings/operation") return path === "settings/operation" ? (verb === "GET" ? "operation_settings.manage" : "operation_settings.manage") : "system.manage";
  if (path === "settings/charity") return write ? "charity.manage" : "charity.view";
  if (path.startsWith("charity/projects")) return path.includes("disbursements") ? "charity.finance" : write ? "charity.manage" : "charity.view";
  if (path === "charity/transactions") return "charity.finance";
  if (path.startsWith("charity/")) return "charity.view";
  if (path.startsWith("ambassador/")) return "ambassador.manage";
  if (path === "mobile/bootstrap") return "activity.view";
  if (path === "agents") return write ? "payment_account.manage" : "payment_account.view";
  if (path.startsWith("agent-payment-accounts")) return write ? "payment_account.manage" : "payment_account.view";
  if (path === "uploads/images") return "upload.image";
  if (path === "uploads/settlement-proofs") return "upload.settlement_proof";
  if (path === "categories" || path.startsWith("categories/")) return "category.manage";
  if (path.startsWith("announcements")) return "announcement.manage";
  if (path.startsWith("homepage/sections")) return "homepage.manage";
  if (path === "activities" && verb === "GET") return "activity.view";
  if (path === "activities/:id" && verb === "GET") return "activity.view";
  if (path.includes("approval-logs") || path.includes("channel-report") || path.endsWith("/channels") && verb === "GET") return "activity.view";
  if (path.includes("/refund") || path.startsWith("refunds/")) return "order.refund";
  if (path.includes("/approve") || path.includes("/reject")) return "activity.approve";
  if (path.startsWith("activities")) return "activity.manage";
  if (path === "registrations" && verb === "GET") return "registration.view";
  if (path === "registrations/export") return "registration.export";
  if (path.startsWith("registrations")) return "registration.manage";
  if (path === "orders" && verb === "GET") return "order.view";
  if (path === "orders/export") return "order.export";
  if (path.startsWith("orders")) return write ? "order.manage" : "order.view";
  if (path === "course-orders" && verb === "GET") return "order.view";
  if (path.startsWith("course-orders")) return write ? "order.manage" : "order.view";
  if (path.startsWith("ticket-types")) return "ticket.manage";
  if (path.startsWith("coupons")) return "coupon.manage";
  if (path === "finance/export") return "finance.export";
  if (path.includes("wallet/adjust")) return "finance.wallet_adjust";
  if (path.startsWith("finance/")) return write ? "finance.manage" : "finance.view";
  if (path === "agent-settlements" || path.includes("transfer-capability") || path.includes("/details")) return "agent_settlement.view";
  if (path.includes("/mark-paid")) return "agent_settlement.pay";
  if (path.includes("/sandbox-transfer") || path.includes("/real-transfer") || path === "agent-settlement-transfers/scan") return "agent_settlement.transfer";
  if (path === "agent-settlements/export") return "agent_settlement.export";
  if (path.startsWith("agent-settlements")) return "agent_settlement.manage";
  if (path === "check-ins") return "checkin.manage";
  if (path.startsWith("waitlists")) return "waitlist.manage";
  if (path === "members" && verb === "GET") return "member.view";
  if (path === "members/:userId" && verb === "GET") return "member.view";
  if (path.includes("/password")) return "member.password";
  if (path.startsWith("members")) return "member.manage";
  if (path.startsWith("member-levels")) return "member_level.manage";
  if (path.startsWith("tags")) return "tag.manage";
  if (path.startsWith("notifications")) return "notification.manage";
  if (path.startsWith("reviews")) return "review.manage";
  if (path.startsWith("courses")) return "course.manage";
  if (path.startsWith("community")) return "community.manage";
  return null;
}
