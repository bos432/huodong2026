import { reactive } from "vue";

export enum AdminRole {
  SuperAdmin = "super_admin",
  Operator = "operator",
  Finance = "finance",
  CheckInStaff = "checkin_staff"
}

export const roleOptions = [
  { value: AdminRole.SuperAdmin, label: "超级管理员", description: "拥有全部后台权限，负责系统设置、账号和上线体检。" },
  { value: AdminRole.Operator, label: "运营人员", description: "管理活动、报名、公告、通知、候补、评价、标签和会员。" },
  { value: AdminRole.Finance, label: "财务人员", description: "管理订单、确认收款、退款和财务对账。" },
  { value: AdminRole.CheckInStaff, label: "签到人员", description: "仅用于现场签到核销和必要活动查看。" }
];

export const adminPermissionGroups = [
  { group: "总览", items: [{ key: "dashboard.view", label: "工作台/数据看板" }, { key: "analytics.view", label: "数据中心" }] },
  { group: "平台管理", items: [{ key: "tenant.manage", label: "商家管理", platformOnly: true }, { key: "tenant_region.manage", label: "区域保护", platformOnly: true }, { key: "admin.manage", label: "后台账号管理" }] },
  { group: "系统安全", items: [{ key: "logs.view", label: "操作/登录/验证码日志" }, { key: "system.manage", label: "系统设置/上线体检" }, { key: "miniprogram_release.manage", label: "小程序发布管理", platformOnly: true }] },
  { group: "活动", items: [{ key: "activity.view", label: "查看活动" }, { key: "activity.manage", label: "创建/编辑/下架活动" }, { key: "activity.approve", label: "平台审核活动", platformOnly: true }, { key: "category.manage", label: "活动分类管理" }, { key: "ticket.manage", label: "票种管理" }, { key: "coupon.manage", label: "优惠码管理" }] },
  { group: "报名签到", items: [{ key: "registration.view", label: "查看报名" }, { key: "registration.manage", label: "审核/取消报名" }, { key: "registration.export", label: "导出报名" }, { key: "waitlist.manage", label: "候补管理" }, { key: "checkin.manage", label: "签到核销" }] },
  { group: "订单财务", items: [{ key: "order.view", label: "查看订单" }, { key: "order.manage", label: "订单备注/确认收款/关闭" }, { key: "order.refund", label: "退款处理" }, { key: "order.export", label: "导出订单" }, { key: "finance.view", label: "财务对账查看" }, { key: "finance.manage", label: "对账处理/流水导入" }, { key: "finance.export", label: "导出财务数据" }, { key: "finance.wallet_adjust", label: "会员余额调整" }, { key: "payment_account.view", label: "查看收款账户" }, { key: "payment_account.manage", label: "维护收款账户" }, { key: "agent_settlement.view", label: "查看代理结算" }, { key: "agent_settlement.manage", label: "生成/审核代理结算" }, { key: "agent_settlement.pay", label: "标记代理结算打款" }, { key: "agent_settlement.transfer", label: "代理结算转账/扫描" }, { key: "agent_settlement.export", label: "导出代理结算" }, { key: "upload.settlement_proof", label: "上传结算凭证" }] },
  { group: "商城管理", items: [{ key: "mall.product.manage", label: "商城商品/营销管理" }, { key: "mall.logistics.manage", label: "商城物流设置" }, { key: "mall.order.view", label: "查看商城订单" }, { key: "mall.order.manage", label: "商城发货/确认收款" }, { key: "mall.refund.manage", label: "商城售后退款" }, { key: "mall.finance.view", label: "商城财务查看" }] },
  { group: "会员运营", items: [{ key: "member.view", label: "查看会员" }, { key: "member.manage", label: "创建/编辑会员" }, { key: "member.password", label: "重置会员密码" }, { key: "member_level.manage", label: "会员等级管理" }, { key: "tag.manage", label: "用户标签管理" }, { key: "notification.manage", label: "通知中心" }, { key: "review.manage", label: "评价管理" }] },
  { group: "装修营销", items: [{ key: "homepage.manage", label: "首页装修" }, { key: "announcement.manage", label: "公告管理" }, { key: "operation_settings.manage", label: "运营设置" }, { key: "upload.image", label: "上传图片" }] },
  { group: "商家设置", items: [{ key: "tenant_profile.manage", label: "商家资料" }] },
  { group: "公益招募", items: [{ key: "charity.view", label: "查看公益池" }, { key: "charity.manage", label: "公益项目/设置" }, { key: "charity.finance", label: "公益流水/拨付" }, { key: "ambassador.manage", label: "文化大使招募", platformOnly: true }] },
  { group: "书院运营", items: [{ key: "course.manage", label: "课程管理" }, { key: "community.manage", label: "书院动态/共修管理" }] }
] as const;

export const allAdminPermissionKeys = adminPermissionGroups.flatMap((group) => group.items.map((item) => item.key));
const allPermissionSet = new Set<string>(allAdminPermissionKeys);
const platformOnlyPermissionSet = new Set<string>(adminPermissionGroups.flatMap((group) => group.items.filter((item) => "platformOnly" in item && item.platformOnly).map((item) => item.key)));

type AdminSessionInput = {
  username?: string | null;
  role?: string | null;
  tenantId?: number | string | null;
  tenant?: { name?: string | null; code?: string | null; settings?: TenantPermissionSettings | Record<string, unknown> | null } | null;
  permissions?: string[] | null;
};

export const adminSession = reactive({
  version: 0
});

export function bumpAdminSession() {
  adminSession.version += 1;
}

export function normalizeRole(role?: string | null) {
  return role === "admin" ? AdminRole.SuperAdmin : role || "";
}

export function currentRole() {
  void adminSession.version;
  return normalizeRole(localStorage.getItem("admin_role"));
}

export function currentPermissions() {
  void adminSession.version;
  const raw = localStorage.getItem("admin_permissions");
  if (!raw) return defaultPermissionsForRole(currentRole(), Boolean(currentTenantId()));
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultPermissionsForRole(currentRole(), Boolean(currentTenantId()));
    return parsed.map((item) => String(item)).filter((item) => allPermissionSet.has(item));
  } catch {
    return defaultPermissionsForRole(currentRole(), Boolean(currentTenantId()));
  }
}

export function setStoredPermissions(permissions?: string[] | null) {
  if (Array.isArray(permissions)) localStorage.setItem("admin_permissions", JSON.stringify(normalizePermissionList(permissions)));
  else localStorage.removeItem("admin_permissions");
  bumpAdminSession();
}

export function setStoredAdminSession(admin?: AdminSessionInput | null) {
  if (!admin) return;
  if (admin.username !== undefined && admin.username !== null) localStorage.setItem("admin_username", admin.username);
  if (admin.role !== undefined && admin.role !== null) localStorage.setItem("admin_role", normalizeRole(admin.role));
  if (admin.tenantId) localStorage.setItem("admin_tenant_id", String(admin.tenantId));
  else localStorage.removeItem("admin_tenant_id");
  if (admin.tenant?.name) localStorage.setItem("admin_tenant_name", admin.tenant.name);
  else localStorage.removeItem("admin_tenant_name");
  if (admin.tenant?.code) localStorage.setItem("admin_tenant_code", admin.tenant.code);
  else localStorage.removeItem("admin_tenant_code");
  if (admin.tenant?.settings) localStorage.setItem("admin_tenant_settings", JSON.stringify(admin.tenant.settings));
  else localStorage.removeItem("admin_tenant_settings");
  if (Array.isArray(admin.permissions)) localStorage.setItem("admin_permissions", JSON.stringify(normalizePermissionList(admin.permissions)));
  else localStorage.removeItem("admin_permissions");
  bumpAdminSession();
}

export function clearStoredAdminSession() {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_username");
  localStorage.removeItem("admin_role");
  localStorage.removeItem("admin_tenant_id");
  localStorage.removeItem("admin_tenant_name");
  localStorage.removeItem("admin_tenant_code");
  localStorage.removeItem("admin_tenant_settings");
  localStorage.removeItem("admin_permissions");
  bumpAdminSession();
}

export function normalizePermissionList(value?: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return Array.from(new Set(value.map((item) => String(item)).filter((item) => allPermissionSet.has(item))));
}

export function defaultPermissionsForRole(role?: string | null, tenantScoped = false) {
  const normalized = normalizeRole(role);
  if (normalized === AdminRole.SuperAdmin) return tenantScoped ? allAdminPermissionKeys.filter((key) => !platformOnlyPermissionSet.has(key)) : [...allAdminPermissionKeys];
  if (normalized === AdminRole.Operator) return [
    "dashboard.view", "analytics.view", "activity.view", "activity.manage", "category.manage", "ticket.manage", "coupon.manage",
    "registration.view", "registration.manage", "registration.export", "waitlist.manage", "checkin.manage", "member.view",
    "member.manage", "member.password", "member_level.manage", "tag.manage", "notification.manage", "review.manage",
    "mall.product.manage", "mall.logistics.manage", "mall.order.view", "mall.order.manage", "homepage.manage", "announcement.manage", "operation_settings.manage", "tenant_profile.manage", "charity.view", "charity.manage",
    "course.manage", "community.manage", "upload.image"
  ];
  if (normalized === AdminRole.Finance) return [
    "dashboard.view", "analytics.view", "activity.view", "registration.view", "order.view", "order.manage", "order.refund", "order.export",
    "finance.view", "finance.manage", "finance.export", "finance.wallet_adjust", "payment_account.view", "agent_settlement.view",
    "agent_settlement.manage", "agent_settlement.pay", "agent_settlement.transfer", "agent_settlement.export", "mall.order.view", "mall.order.manage", "mall.refund.manage", "mall.finance.view", "charity.view", "charity.finance", "upload.settlement_proof"
  ];
  if (normalized === AdminRole.CheckInStaff) return ["activity.view", "registration.view", "checkin.manage"];
  return [];
}

export function availablePermissionGroups(tenantScoped = Boolean(currentTenantId())) {
  return adminPermissionGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !tenantScoped || !("platformOnly" in item && item.platformOnly)) }))
    .filter((group) => group.items.length);
}

export function currentTenantId() {
  void adminSession.version;
  const value = localStorage.getItem("admin_tenant_id");
  const id = value ? Number(value) : 0;
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function currentTenantName() {
  void adminSession.version;
  return localStorage.getItem("admin_tenant_name") || "";
}

export function currentTenantCode() {
  void adminSession.version;
  return localStorage.getItem("admin_tenant_code") || "";
}

export type TenantPermissionSettings = {
  activityPublishReviewRequired: boolean;
  registrationReviewEnabled: boolean;
  paymentAccountEditable: boolean;
  mallEnabled: boolean;
};

export function currentTenantSettings(): TenantPermissionSettings {
  void adminSession.version;
  const defaults = {
    activityPublishReviewRequired: true,
    registrationReviewEnabled: false,
    paymentAccountEditable: true,
    mallEnabled: true
  };
  const raw = localStorage.getItem("admin_tenant_settings");
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Partial<TenantPermissionSettings>;
    return {
      activityPublishReviewRequired: parsed.activityPublishReviewRequired === undefined ? defaults.activityPublishReviewRequired : Boolean(parsed.activityPublishReviewRequired),
      registrationReviewEnabled: parsed.registrationReviewEnabled === undefined ? defaults.registrationReviewEnabled : Boolean(parsed.registrationReviewEnabled),
      paymentAccountEditable: parsed.paymentAccountEditable === undefined ? defaults.paymentAccountEditable : Boolean(parsed.paymentAccountEditable),
      mallEnabled: parsed.mallEnabled === undefined ? defaults.mallEnabled : Boolean(parsed.mallEnabled)
    };
  } catch {
    return defaults;
  }
}

export function isPlatformAdmin() {
  return currentRole() === AdminRole.SuperAdmin && !currentTenantId();
}

export function isTenantAdmin() {
  return currentRole() === AdminRole.SuperAdmin && Boolean(currentTenantId());
}

export function canAccess(required?: string[]) {
  if (!required?.length) return true;
  const granted = currentPermissions();
  return required.some((key) => granted.includes(key));
}

export function hasPermission(key: string) {
  return canAccess([key]);
}

export function canAccessScope(scope?: "platform" | "tenant" | "tenantOrPlatformAdmin" | "any") {
  if (!scope || scope === "any") return true;
  if (scope === "platform") return isPlatformAdmin();
  if (scope === "tenantOrPlatformAdmin") return Boolean(currentTenantId()) || isPlatformAdmin();
  return Boolean(currentTenantId());
}

export const permissions = {
  superAdmin: ["tenant.manage", "admin.manage", "system.manage"],
  overview: ["dashboard.view"],
  analytics: ["analytics.view"],
  operation: ["activity.manage"],
  finance: ["finance.view", "order.view"],
  checkIn: ["checkin.manage"],
  activityView: ["activity.view"],
  registrationView: ["registration.view"],
  paymentAccountView: ["payment_account.view"],
  adminManage: ["admin.manage"],
  tenantManage: ["tenant.manage"],
  logsView: ["logs.view"],
  systemManage: ["system.manage"]
};
