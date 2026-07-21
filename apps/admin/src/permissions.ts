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
  { group: "证书管理", items: [{ key: "certificate_template.view", label: "查看证书模板" }, { key: "certificate_template.manage", label: "维护和发布证书模板" }] },
  { group: "总览", items: [{ key: "dashboard.view", label: "工作台/数据看板" }, { key: "analytics.view", label: "数据中心" }, { key: "analytics.export", label: "导出分析数据" }, { key: "analytics.manage", label: "统计指标重算" }, { key: "business_job.view", label: "查看业务任务" }, { key: "business_job.manage", label: "重放/取消业务任务" }] },
  { group: "平台管理", items: [{ key: "tenant.view", label: "查看商家/代理", platformOnly: true }, { key: "tenant.manage", label: "维护商家资料/状态", platformOnly: true }, { key: "tenant.permissions.manage", label: "维护商家权益", platformOnly: true }, { key: "tenant.subscription.manage", label: "维护商家套餐", platformOnly: true }, { key: "tenant.export", label: "导出商家数据", platformOnly: true }, { key: "tenant_region.view", label: "查看区域保护", platformOnly: true }, { key: "tenant_region.manage", label: "维护区域保护", platformOnly: true }, { key: "tenant_region.approve", label: "审批区域冲突", platformOnly: true }, { key: "tenant_region_hit_log.view", label: "查看定位命中日志", platformOnly: true }, { key: "tenant_region_hit_log.sensitive", label: "查看定位日志坐标/IP", platformOnly: true }, { key: "tenant_region_hit_log.export", label: "导出定位命中日志", platformOnly: true }, { key: "admin.view", label: "查看后台账号" }, { key: "admin.manage", label: "创建/编辑后台账号" }, { key: "support.view", label: "客服查询台" }, { key: "support.manage", label: "客服工单处理" }, { key: "support.sensitive", label: "客服敏感手机号查看" }] },
  { group: "系统安全", items: [{ key: "admin.security.manage", label: "后台账号安全操作" }, { key: "logs.view", label: "查看操作日志" }, { key: "logs.sensitive", label: "查看操作日志敏感终端" }, { key: "logs.export", label: "导出操作日志" }, { key: "security_log.view", label: "查看登录/验证码日志", platformOnly: true }, { key: "security_log.sensitive", label: "查看安全日志敏感信息", platformOnly: true }, { key: "security_log.export", label: "导出登录/验证码日志", platformOnly: true }, { key: "system.view", label: "查看系统设置/上线体检", platformOnly: true }, { key: "system.manage", label: "维护系统设置/执行检测", platformOnly: true }, { key: "miniprogram_release.view", label: "查看小程序发布配置/记录", platformOnly: true }, { key: "miniprogram_release.manage", label: "维护小程序配置/执行发布", platformOnly: true }] },
  { group: "活动", items: [{ key: "activity.view", label: "查看活动" }, { key: "activity.manage", label: "创建/编辑/下架活动" }, { key: "activity.approve", label: "平台审核活动", platformOnly: true }, { key: "category.view", label: "查看活动分类" }, { key: "category.manage", label: "活动分类管理" }, { key: "ticket.view", label: "查看票种" }, { key: "ticket.manage", label: "票种管理" }, { key: "coupon.view", label: "查看活动优惠券" }, { key: "coupon.manage", label: "维护活动优惠券" }, { key: "coupon.export", label: "导出活动优惠券" }, { key: "redemption_code.view", label: "查看统一兑换码" }, { key: "redemption_code.manage", label: "维护统一兑换码" }, { key: "redemption_code.export", label: "导出统一兑换码" }] },
  { group: "报名签到", items: [{ key: "registration.view", label: "查看报名" }, { key: "registration.manage", label: "审核/取消报名" }, { key: "registration.export", label: "导出报名" }, { key: "waitlist.view", label: "查看候补" }, { key: "waitlist.manage", label: "补位/取消候补" }, { key: "waitlist.sensitive", label: "查看候补敏感报名信息" }, { key: "checkin.manage", label: "签到核销" }] },
  { group: "订单财务", items: [{ key: "order.view", label: "查看订单" }, { key: "order.manage", label: "订单备注/确认收款/关闭" }, { key: "order.refund", label: "退款处理" }, { key: "order.export", label: "导出订单" }, { key: "course_order.view", label: "查看课程订单" }, { key: "course_order.manage", label: "确认课程线下收款" }, { key: "finance.view", label: "财务对账查看" }, { key: "finance.manage", label: "对账处理/流水导入" }, { key: "finance.export", label: "导出财务数据" }, { key: "finance.wallet_adjust", label: "会员余额调整" }, { key: "payment_account.view", label: "查看收款账户" }, { key: "payment_account.manage", label: "维护收款账户" }, { key: "payment_account.sensitive", label: "查看收款账户敏感资料" }, { key: "agent_settlement.view", label: "查看代理结算" }, { key: "agent_settlement.manage", label: "生成/审核代理结算" }, { key: "agent_settlement.pay", label: "标记代理结算打款" }, { key: "agent_settlement.transfer", label: "代理结算转账/扫描" }, { key: "agent_settlement.sensitive", label: "查看代理结算敏感资料" }, { key: "agent_settlement.export", label: "导出代理结算" }, { key: "upload.settlement_proof", label: "上传结算凭证" }] },
  { group: "商城管理", items: [{ key: "mall.merchant.manage", label: "商城店铺/授权管理" }, { key: "mall.merchant.view", label: "查看可管理商城店铺" }, { key: "mall.product.manage", label: "商城商品/营销管理" }, { key: "mall.product.audit", label: "商城商品审核", platformOnly: true }, { key: "mall.review.manage", label: "商城评价管理" }, { key: "mall.logistics.manage", label: "商城物流设置" }, { key: "mall.order.view", label: "查看商城订单" }, { key: "mall.order.manage", label: "商城发货/确认收款" }, { key: "mall.refund.manage", label: "商城售后退款" }, { key: "mall.finance.view", label: "商城财务查看" }, { key: "mall.payment.manage", label: "商城支付配置" }, { key: "mall.settlement.manage", label: "商城结算管理", platformOnly: true }, { key: "mall.statistics.view", label: "商城统计查看" }] },
  { group: "会员运营", items: [{ key: "member.view", label: "查看会员" }, { key: "member.manage", label: "创建/编辑会员" }, { key: "member.password", label: "重置会员密码" }, { key: "member.points.manage", label: "调整会员积分" }, { key: "member.lifecycle.manage", label: "执行会员生命周期扫描" }, { key: "member.sensitive", label: "查看会员敏感身份" }, { key: "member.export", label: "导出会员数据" }, { key: "member_level.manage", label: "会员等级管理" }, { key: "member_point_rule.view", label: "查看会员积分规则" }, { key: "member_point_rule.manage", label: "维护会员积分规则" }, { key: "tag.view", label: "查看用户标签/分群" }, { key: "tag.manage", label: "维护用户标签/分群" }, { key: "tag.sensitive", label: "查看标签/分群会员敏感信息" }, { key: "notification.view", label: "查看通知中心" }, { key: "notification.template.manage", label: "维护通知模板/规则" }, { key: "notification.send", label: "发送/重试通知" }, { key: "notification.preference.manage", label: "维护会员通知偏好" }, { key: "notification.sensitive", label: "查看通知敏感信息" }, { key: "notification.manage", label: "通知中心全管理（兼容）" }, { key: "review.view", label: "查看活动评价/举报" }, { key: "review.manage", label: "处置活动评价/举报" }, { key: "review.sensitive", label: "查看评价/举报会员敏感信息" }] },
  { group: "装修营销", items: [{ key: "homepage.manage", label: "首页装修" }, { key: "marketing_popup.view", label: "查看营销弹窗" }, { key: "marketing_popup.manage", label: "维护营销弹窗" }, { key: "ad_center.view", label: "查看广告中心" }, { key: "ad_center.manage", label: "维护广告主/合同/投放" }, { key: "ad_center.finance", label: "广告结算/收益导入" }, { key: "ad_center.sensitive", label: "查看广告敏感资料" }, { key: "ad_center.export", label: "导出广告中心数据" }, { key: "announcement.view", label: "查看公告中心" }, { key: "announcement.manage", label: "维护公告" }, { key: "operation_settings.view", label: "查看运营设置" }, { key: "operation_settings.manage", label: "维护运营设置/执行检测" }, { key: "upload.image", label: "上传图片" }] },
  { group: "商家设置", items: [{ key: "tenant_profile.manage", label: "商家资料" }] },
  { group: "公益招募", items: [{ key: "charity.view", label: "查看公益池" }, { key: "charity.manage", label: "公益项目/设置" }, { key: "charity.finance", label: "公益流水/拨付" }, { key: "aid.view", label: "查看援助申请脱敏信息", platformOnly: true }, { key: "aid.manage", label: "援助申请审批跟进", platformOnly: true }, { key: "aid.sensitive", label: "查看援助敏感信息/材料", platformOnly: true }, { key: "ambassador.view", label: "查看文化大使招募", platformOnly: true }, { key: "ambassador.manage", label: "管理文化大使招募", platformOnly: true }, { key: "ambassador.sensitive", label: "查看大使完整联系方式", platformOnly: true }, { key: "ambassador.export", label: "导出大使招募数据", platformOnly: true }, { key: "partner.view", label: "查看合作伙伴 CRM", platformOnly: true }, { key: "partner.manage", label: "管理合作伙伴合同/转换", platformOnly: true }, { key: "partner.sensitive", label: "查看伙伴联系方式/合同敏感信息", platformOnly: true }, { key: "partner.export", label: "导出合作伙伴 CRM", platformOnly: true }] },
  { group: "慢π运营", items: [{ key: "course.manage", label: "课程管理" }, { key: "course.export", label: "导出课程经营与学员数据" }, { key: "course.teacher_scope", label: "仅本人讲师课程范围" }, { key: "community.manage", label: "共修动态管理" }, { key: "forum.manage", label: "论坛管理" }, { key: "forum.moderate", label: "论坛审核/举报处理" }] }
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
    const normalized = parsed.map((item) => String(item)).filter((item) => allPermissionSet.has(item));
    return currentTenantId() ? normalized.filter((item) => !platformOnlyPermissionSet.has(item)) : normalized;
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
  return expandPermissionDependencies(Array.from(new Set(value.map((item) => String(item)).filter((item) => allPermissionSet.has(item)))));
}

const permissionDependencies: Record<string, string[]> = {
  "order.view": ["course_order.view"],
  "order.manage": ["order.view", "course_order.manage"],
  "course_order.manage": ["course_order.view"],
  "system.manage": ["system.view"],
  "miniprogram_release.manage": ["miniprogram_release.view"],
  "operation_settings.manage": ["operation_settings.view"],
  "analytics.export": ["analytics.view"],
  "analytics.manage": ["analytics.view"],
  "business_job.manage": ["business_job.view"],
  "tenant.manage": ["tenant.view"],
  "tenant.permissions.manage": ["tenant.view"],
  "tenant.subscription.manage": ["tenant.view"],
  "tenant.export": ["tenant.view"],
  "tenant_region.manage": ["tenant_region.view"],
  "tenant_region.approve": ["tenant_region.view"],
  "admin.manage": ["admin.view"],
  "admin.security.manage": ["admin.view"],
  "logs.sensitive": ["logs.view"],
  "logs.export": ["logs.view"],
  "security_log.sensitive": ["security_log.view"],
  "security_log.export": ["security_log.view"],
  "support.manage": ["support.view"],
  "support.sensitive": ["support.view"],
  "activity.manage": ["activity.view"],
  "category.manage": ["category.view"],
  "ticket.manage": ["ticket.view"],
  "coupon.manage": ["coupon.view"],
  "coupon.export": ["coupon.view"],
  "redemption_code.manage": ["redemption_code.view"],
  "redemption_code.export": ["redemption_code.view"],
  "waitlist.manage": ["waitlist.view"],
  "waitlist.sensitive": ["waitlist.view"],
  "review.manage": ["review.view"],
  "review.sensitive": ["review.view"],
  "tag.manage": ["tag.view"],
  "tag.sensitive": ["tag.view"],
  "notification.template.manage": ["notification.view"],
  "notification.send": ["notification.view"],
  "notification.preference.manage": ["notification.view"],
  "notification.sensitive": ["notification.view"],
  "notification.manage": ["notification.view", "notification.template.manage", "notification.send", "notification.preference.manage"],
  "marketing_popup.manage": ["marketing_popup.view"],
  "ad_center.manage": ["ad_center.view"],
  "ad_center.finance": ["ad_center.view"],
  "ad_center.sensitive": ["ad_center.view"],
  "ad_center.export": ["ad_center.view"],
  "payment_account.manage": ["payment_account.view"],
  "payment_account.sensitive": ["payment_account.view"],
  "agent_settlement.manage": ["agent_settlement.view"],
  "agent_settlement.pay": ["agent_settlement.view"],
  "agent_settlement.transfer": ["agent_settlement.view"],
  "agent_settlement.sensitive": ["agent_settlement.view"],
  "agent_settlement.export": ["agent_settlement.view"],
  "member.manage": ["member.view"],
  "member.password": ["member.view"],
  "member.points.manage": ["member.view"],
  "member.lifecycle.manage": ["member.view"],
  "member.sensitive": ["member.view"],
  "member.export": ["member.view"],
  "member_level.manage": ["member.view"],
  "member_point_rule.view": ["member.view"],
  "member_point_rule.manage": ["member_point_rule.view"],
  "announcement.manage": ["announcement.view"],
  "ambassador.manage": ["ambassador.view"],
  "ambassador.sensitive": ["ambassador.view"],
  "ambassador.export": ["ambassador.view", "ambassador.sensitive"],
  "partner.manage": ["partner.view"],
  "partner.sensitive": ["partner.view"],
  "partner.export": ["partner.view", "partner.sensitive"],
  "course.export": ["course.manage"],
  "course.teacher_scope": ["course.manage", "course.export", "course_order.view"],
  "certificate_template.manage": ["certificate_template.view"],
  "mall.merchant.manage": ["mall.merchant.view"],
  "mall.product.manage": ["mall.merchant.view"],
  "mall.product.audit": ["mall.merchant.view"],
  "mall.review.manage": ["mall.merchant.view"],
  "mall.logistics.manage": ["mall.merchant.view"],
  "mall.order.manage": ["mall.merchant.view", "mall.order.view"],
  "mall.refund.manage": ["mall.merchant.view", "mall.order.view", "mall.finance.view"],
  "mall.finance.view": ["mall.merchant.view", "mall.order.view"],
  "mall.payment.manage": ["mall.merchant.view", "mall.finance.view"],
  "mall.settlement.manage": ["mall.merchant.view", "mall.finance.view"],
  "mall.statistics.view": ["mall.merchant.view"]
};

export function expandPermissionDependencies(permissions: string[]) {
  const expanded = new Set(permissions);
  const queue = [...permissions];
  while (queue.length) {
    const permission = queue.shift()!;
    for (const dependency of permissionDependencies[permission] || []) {
      if (expanded.has(dependency)) continue;
      expanded.add(dependency);
      queue.push(dependency);
    }
  }
  return Array.from(expanded);
}

export function defaultPermissionsForRole(role?: string | null, tenantScoped = false) {
  const normalized = normalizeRole(role);
  const scoped = (permissions: string[]) => tenantScoped ? permissions.filter((key) => !platformOnlyPermissionSet.has(key)) : permissions;
  if (normalized === AdminRole.SuperAdmin) return expandPermissionDependencies(tenantScoped ? allAdminPermissionKeys.filter((key) => !platformOnlyPermissionSet.has(key)) : [...allAdminPermissionKeys]);
  if (normalized === AdminRole.Operator) return expandPermissionDependencies(scoped([
    "certificate_template.view", "certificate_template.manage",
    "dashboard.view", "analytics.view", "analytics.export", "analytics.manage", "business_job.view", "business_job.manage", "support.view", "support.manage", "support.sensitive", "activity.view", "activity.manage", "category.manage", "ticket.manage", "coupon.manage", "redemption_code.manage",
    "registration.view", "registration.manage", "registration.export", "waitlist.manage", "checkin.manage", "member.view",
    "member.manage", "member.password", "member.points.manage", "member.lifecycle.manage", "member.export", "member_level.manage", "member_point_rule.view", "member_point_rule.manage", "tag.manage", "notification.manage", "review.manage",
    "mall.merchant.view", "mall.product.manage", "mall.review.manage", "mall.logistics.manage", "mall.order.view", "mall.order.manage", "homepage.manage", "marketing_popup.manage", "ad_center.manage", "ad_center.finance", "ad_center.sensitive", "ad_center.export", "announcement.manage", "operation_settings.manage", "tenant_profile.manage", "charity.view", "charity.manage",
    "course.manage", "course.export", "community.manage", "forum.manage", "forum.moderate", "upload.image"
  ]));
  if (normalized === AdminRole.Finance) return expandPermissionDependencies(scoped([
    "dashboard.view", "analytics.view", "analytics.export", "business_job.view", "support.view", "activity.view", "registration.view", "order.view", "order.manage", "order.refund", "order.export",
    "finance.view", "finance.manage", "finance.export", "finance.wallet_adjust", "payment_account.view", "mall.merchant.view", "ad_center.view", "ad_center.finance", "ad_center.export", "agent_settlement.view",
    "agent_settlement.manage", "agent_settlement.pay", "agent_settlement.transfer", "agent_settlement.sensitive", "agent_settlement.export", "mall.order.view", "mall.order.manage", "mall.refund.manage", "mall.finance.view", "mall.payment.manage", "mall.settlement.manage", "mall.statistics.view", "charity.view", "charity.finance", "upload.settlement_proof"
  ]));
  if (normalized === AdminRole.CheckInStaff) return expandPermissionDependencies(scoped(["activity.view", "registration.view", "checkin.manage"]));
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

export function isPlatformScopedAdmin() {
  return Boolean(currentRole()) && !currentTenantId();
}

export function isTenantAdmin() {
  return currentRole() === AdminRole.SuperAdmin && Boolean(currentTenantId());
}

export function canAccess(required?: string[]) {
  if (!required?.length) return true;
  if (required.every((key) => Object.values(AdminRole).includes(key as AdminRole))) {
    const roles = required as AdminRole[];
    return roles.includes(currentRole() as AdminRole);
  }
  const granted = currentPermissions();
  return required.some((key) => granted.includes(key));
}

export function hasPermission(key: string) {
  return canAccess([key]);
}

export function canAccessScope(scope?: "platform" | "tenant" | "tenantOrPlatformAdmin" | "any") {
  if (!scope || scope === "any") return true;
  if (scope === "platform") return isPlatformScopedAdmin();
  if (scope === "tenantOrPlatformAdmin") return Boolean(currentTenantId()) || isPlatformScopedAdmin();
  return Boolean(currentTenantId());
}

export const permissions = {
  superAdmin: [AdminRole.SuperAdmin],
  overview: ["dashboard.view"],
  analytics: ["analytics.view"],
  operation: ["homepage.manage"],
  finance: ["finance.view", "finance.manage"],
  checkIn: ["checkin.manage"],
  activityView: ["activity.view", "activity.manage"],
  registrationView: ["registration.view", "registration.manage"],
  paymentAccountView: ["payment_account.view"],
  adminView: ["admin.view"],
  tenantManage: ["tenant.manage"],
  logsView: ["logs.view"],
  systemManage: ["system.manage"]
};
