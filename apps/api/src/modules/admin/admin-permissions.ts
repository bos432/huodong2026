import { AdminRole, normalizeAdminRole } from "./admin-roles";

export const ADMIN_PERMISSION_DEFINITIONS = [
  { key: "dashboard.view", label: "工作台/数据看板", group: "总览" },
  { key: "analytics.view", label: "数据中心", group: "总览" },
  { key: "analytics.export", label: "导出分析数据", group: "总览" },
  { key: "analytics.manage", label: "统计指标重算", group: "总览" },
  { key: "business_job.view", label: "查看业务任务", group: "总览" },
  { key: "business_job.manage", label: "重放/取消业务任务", group: "总览" },
  { key: "tenant.view", label: "查看商家/代理", group: "平台管理", platformOnly: true },
  { key: "tenant.manage", label: "维护商家资料/状态", group: "平台管理", platformOnly: true },
  { key: "tenant.permissions.manage", label: "维护商家权益", group: "平台管理", platformOnly: true },
  { key: "tenant.subscription.manage", label: "维护商家套餐", group: "平台管理", platformOnly: true },
  { key: "tenant.export", label: "导出商家数据", group: "平台管理", platformOnly: true },
  { key: "tenant_region.view", label: "查看区域保护", group: "平台管理", platformOnly: true },
  { key: "tenant_region.manage", label: "维护区域保护", group: "平台管理", platformOnly: true },
  { key: "tenant_region.approve", label: "审批区域冲突", group: "平台管理", platformOnly: true },
  { key: "tenant_region_hit_log.view", label: "查看定位命中日志", group: "平台管理", platformOnly: true },
  { key: "tenant_region_hit_log.sensitive", label: "查看定位日志坐标/IP", group: "平台管理", platformOnly: true },
  { key: "tenant_region_hit_log.export", label: "导出定位命中日志", group: "平台管理", platformOnly: true },
  { key: "admin.view", label: "查看后台账号", group: "平台管理" },
  { key: "admin.manage", label: "创建/编辑后台账号", group: "平台管理" },
  { key: "admin.security.manage", label: "后台账号安全操作", group: "系统安全" },
  { key: "support.view", label: "客服查询台", group: "平台管理" },
  { key: "support.manage", label: "客服工单处理", group: "平台管理" },
  { key: "support.sensitive", label: "客服敏感手机号查看", group: "平台管理" },
  { key: "logs.view", label: "查看操作日志", group: "系统安全" },
  { key: "logs.sensitive", label: "查看操作日志敏感终端", group: "系统安全" },
  { key: "logs.export", label: "导出操作日志", group: "系统安全" },
  { key: "security_log.view", label: "查看登录/验证码日志", group: "系统安全", platformOnly: true },
  { key: "security_log.sensitive", label: "查看安全日志敏感信息", group: "系统安全", platformOnly: true },
  { key: "security_log.export", label: "导出登录/验证码日志", group: "系统安全", platformOnly: true },
  { key: "system.view", label: "查看系统设置/上线体检", group: "系统安全", platformOnly: true },
  { key: "system.manage", label: "维护系统设置/执行检测", group: "系统安全", platformOnly: true },
  { key: "miniprogram_release.view", label: "查看小程序发布配置/记录", group: "系统安全", platformOnly: true },
  { key: "miniprogram_release.manage", label: "维护小程序配置/执行发布", group: "系统安全", platformOnly: true },
  { key: "activity.view", label: "查看活动", group: "活动" },
  { key: "activity.manage", label: "创建/编辑/下架活动", group: "活动" },
  { key: "activity.approve", label: "平台审核活动", group: "活动", platformOnly: true },
  { key: "category.view", label: "查看活动分类", group: "活动" },
  { key: "category.manage", label: "活动分类管理", group: "活动" },
  { key: "ticket.view", label: "查看票种", group: "活动" },
  { key: "ticket.manage", label: "票种管理", group: "活动" },
  { key: "coupon.view", label: "查看活动优惠券", group: "活动" },
  { key: "coupon.manage", label: "维护活动优惠券", group: "活动" },
  { key: "coupon.export", label: "导出活动优惠券", group: "活动" },
  { key: "redemption_code.view", label: "查看统一兑换码", group: "活动" },
  { key: "redemption_code.manage", label: "维护统一兑换码", group: "活动" },
  { key: "redemption_code.export", label: "导出统一兑换码", group: "活动" },
  { key: "registration.view", label: "查看报名", group: "报名签到" },
  { key: "registration.manage", label: "审核/取消报名", group: "报名签到" },
  { key: "registration.export", label: "导出报名", group: "报名签到" },
  { key: "waitlist.view", label: "查看候补", group: "报名签到" },
  { key: "waitlist.manage", label: "补位/取消候补", group: "报名签到" },
  { key: "waitlist.sensitive", label: "查看候补敏感报名信息", group: "报名签到" },
  { key: "checkin.manage", label: "签到核销", group: "报名签到" },
  { key: "order.view", label: "查看订单", group: "订单财务" },
  { key: "order.manage", label: "订单备注/确认收款/关闭", group: "订单财务" },
  { key: "order.refund", label: "退款处理", group: "订单财务" },
  { key: "order.export", label: "导出订单", group: "订单财务" },
  { key: "course_order.view", label: "查看课程订单", group: "订单财务" },
  { key: "course_order.manage", label: "确认课程线下收款", group: "订单财务" },
  { key: "finance.view", label: "财务对账查看", group: "订单财务" },
  { key: "finance.manage", label: "对账处理/流水导入", group: "订单财务" },
  { key: "finance.export", label: "导出财务数据", group: "订单财务" },
  { key: "finance.wallet_adjust", label: "会员余额调整", group: "订单财务" },
  { key: "mall.merchant.manage", label: "商城店铺/授权管理", group: "商城管理" },
  { key: "mall.merchant.view", label: "查看可管理商城店铺", group: "商城管理" },
  { key: "mall.product.manage", label: "商城商品/营销管理", group: "商城管理" },
  { key: "mall.product.audit", label: "商城商品审核", group: "商城管理", platformOnly: true },
  { key: "mall.review.manage", label: "商城评价管理", group: "商城管理" },
  { key: "mall.logistics.manage", label: "商城物流设置", group: "商城管理" },
  { key: "mall.order.view", label: "查看商城订单", group: "商城管理" },
  { key: "mall.order.manage", label: "商城发货/确认收款", group: "商城管理" },
  { key: "mall.refund.manage", label: "商城售后退款", group: "商城管理" },
  { key: "mall.finance.view", label: "商城财务查看", group: "商城管理" },
  { key: "mall.payment.manage", label: "商城支付配置", group: "商城管理" },
  { key: "mall.settlement.manage", label: "商城结算管理", group: "商城管理", platformOnly: true },
  { key: "mall.statistics.view", label: "商城统计查看", group: "商城管理" },
  { key: "payment_account.view", label: "查看收款账户", group: "订单财务" },
  { key: "payment_account.manage", label: "维护收款账户", group: "订单财务" },
  { key: "payment_account.sensitive", label: "查看收款账户敏感资料", group: "订单财务" },
  { key: "agent_settlement.view", label: "查看代理结算", group: "订单财务" },
  { key: "agent_settlement.manage", label: "生成/审核代理结算", group: "订单财务" },
  { key: "agent_settlement.pay", label: "标记代理结算打款", group: "订单财务" },
  { key: "agent_settlement.transfer", label: "代理结算转账/扫描", group: "订单财务" },
  { key: "agent_settlement.sensitive", label: "查看代理结算敏感资料", group: "订单财务" },
  { key: "agent_settlement.export", label: "导出代理结算", group: "订单财务" },
  { key: "member.view", label: "查看会员", group: "会员运营" },
  { key: "member.manage", label: "创建/编辑会员", group: "会员运营" },
  { key: "member.password", label: "重置会员密码", group: "会员运营" },
  { key: "member.points.manage", label: "调整会员积分", group: "会员运营" },
  { key: "member.lifecycle.manage", label: "执行会员生命周期扫描", group: "会员运营" },
  { key: "member.sensitive", label: "查看会员敏感身份", group: "会员运营" },
  { key: "member.export", label: "导出会员数据", group: "会员运营" },
  { key: "member_level.manage", label: "会员等级管理", group: "会员运营" },
  { key: "member_point_rule.view", label: "查看会员积分规则", group: "会员运营" },
  { key: "member_point_rule.manage", label: "维护会员积分规则", group: "会员运营" },
  { key: "tag.view", label: "查看用户标签/分群", group: "会员运营" },
  { key: "tag.manage", label: "维护用户标签/分群", group: "会员运营" },
  { key: "tag.sensitive", label: "查看标签/分群会员敏感信息", group: "会员运营" },
  { key: "notification.view", label: "查看通知中心", group: "会员运营" },
  { key: "notification.template.manage", label: "维护通知模板/规则", group: "会员运营" },
  { key: "notification.send", label: "发送/重试通知", group: "会员运营" },
  { key: "notification.preference.manage", label: "维护会员通知偏好", group: "会员运营" },
  { key: "notification.sensitive", label: "查看通知敏感信息", group: "会员运营" },
  { key: "notification.manage", label: "通知中心全管理（兼容）", group: "会员运营" },
  { key: "review.view", label: "查看活动评价/举报", group: "会员运营" },
  { key: "review.manage", label: "处置活动评价/举报", group: "会员运营" },
  { key: "review.sensitive", label: "查看评价/举报会员敏感信息", group: "会员运营" },
  { key: "homepage.manage", label: "首页装修", group: "装修营销" },
  { key: "marketing_popup.view", label: "查看营销弹窗", group: "装修营销" },
  { key: "marketing_popup.manage", label: "维护营销弹窗", group: "装修营销" },
  { key: "ad_center.view", label: "查看广告中心", group: "装修营销" },
  { key: "ad_center.manage", label: "维护广告主/合同/投放", group: "装修营销" },
  { key: "ad_center.finance", label: "广告结算/收益导入", group: "装修营销" },
  { key: "ad_center.sensitive", label: "查看广告敏感资料", group: "装修营销" },
  { key: "ad_center.export", label: "导出广告中心数据", group: "装修营销" },
  { key: "announcement.view", label: "查看公告中心", group: "装修营销" },
  { key: "announcement.manage", label: "维护公告", group: "装修营销" },
  { key: "operation_settings.view", label: "查看运营设置", group: "装修营销" },
  { key: "operation_settings.manage", label: "维护运营设置/执行检测", group: "装修营销" },
  { key: "tenant_profile.manage", label: "商家资料", group: "商家设置" },
  { key: "charity.view", label: "查看公益池", group: "公益招募" },
  { key: "charity.manage", label: "公益项目/设置", group: "公益招募" },
  { key: "charity.finance", label: "公益流水/拨付", group: "公益招募" },
  { key: "certificate_template.view", label: "查看证书模板", group: "公益招募" },
  { key: "certificate_template.manage", label: "维护和发布证书模板", group: "公益招募" },
  { key: "aid.view", label: "查看援助申请脱敏信息", group: "公益招募", platformOnly: true },
  { key: "aid.manage", label: "援助申请审批跟进", group: "公益招募", platformOnly: true },
  { key: "aid.sensitive", label: "查看援助敏感信息/材料", group: "公益招募", platformOnly: true },
  { key: "ambassador.view", label: "查看文化大使招募", group: "公益招募", platformOnly: true },
  { key: "ambassador.manage", label: "管理文化大使招募", group: "公益招募", platformOnly: true },
  { key: "ambassador.sensitive", label: "查看大使完整联系方式", group: "公益招募", platformOnly: true },
  { key: "ambassador.export", label: "导出大使招募数据", group: "公益招募", platformOnly: true },
  { key: "partner.view", label: "查看合作伙伴 CRM", group: "公益招募", platformOnly: true },
  { key: "partner.manage", label: "管理合作伙伴合同/转换", group: "公益招募", platformOnly: true },
  { key: "partner.sensitive", label: "查看伙伴联系方式/合同敏感信息", group: "公益招募", platformOnly: true },
  { key: "partner.export", label: "导出合作伙伴 CRM", group: "公益招募", platformOnly: true },
  { key: "course.manage", label: "课程管理", group: "慢π运营" },
  { key: "course.export", label: "导出课程经营与学员数据", group: "慢π运营" },
  { key: "course.teacher_scope", label: "仅本人讲师课程范围", group: "慢π运营" },
  { key: "community.manage", label: "共修动态管理", group: "慢π运营" },
  { key: "forum.manage", label: "论坛管理", group: "慢π运营" },
  { key: "forum.moderate", label: "论坛审核/举报处理", group: "慢π运营" },
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
  "analytics.export",
  "analytics.manage",
  "business_job.view",
  "business_job.manage",
  "support.view",
  "support.manage",
  "support.sensitive",
  "activity.view",
  "activity.manage",
  "category.manage",
  "ticket.manage",
  "coupon.manage",
  "redemption_code.manage",
  "registration.view",
  "registration.manage",
  "registration.export",
  "waitlist.manage",
  "checkin.manage",
  "member.view",
  "member.manage",
  "member.password",
  "member.points.manage",
  "member.lifecycle.manage",
  "member.export",
  "member_level.manage",
  "member_point_rule.view",
  "member_point_rule.manage",
  "tag.manage",
  "notification.manage",
  "review.manage",
  "mall.merchant.view",
  "mall.product.manage",
  "mall.review.manage",
  "mall.logistics.manage",
  "mall.order.view",
  "mall.order.manage",
  "homepage.manage",
  "marketing_popup.manage",
  "ad_center.manage",
  "ad_center.finance",
  "ad_center.sensitive",
  "ad_center.export",
  "announcement.manage",
  "operation_settings.manage",
  "tenant_profile.manage",
  "charity.view",
  "charity.manage",
  "certificate_template.view",
  "certificate_template.manage",
  "course.manage",
  "course.export",
  "community.manage",
  "forum.manage",
  "forum.moderate",
  "upload.image"
];

const FINANCE_PERMISSIONS: AdminPermissionKey[] = [
  "dashboard.view",
  "analytics.view",
  "analytics.export",
  "business_job.view",
  "support.view",
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
  "mall.merchant.view",
  "mall.order.view",
  "mall.order.manage",
  "mall.refund.manage",
  "mall.finance.view",
  "mall.payment.manage",
  "mall.settlement.manage",
  "mall.statistics.view",
  "ad_center.view",
  "ad_center.finance",
  "ad_center.export",
  "payment_account.view",
  "agent_settlement.view",
  "agent_settlement.manage",
  "agent_settlement.pay",
  "agent_settlement.transfer",
  "agent_settlement.sensitive",
  "agent_settlement.export",
  "charity.view",
  "charity.finance",
  "upload.settlement_proof"
];

const CHECKIN_PERMISSIONS: AdminPermissionKey[] = ["activity.view", "registration.view", "checkin.manage"];

const PERMISSION_DEPENDENCIES: Partial<Record<AdminPermissionKey, AdminPermissionKey[]>> = {
  "certificate_template.manage": ["certificate_template.view"],
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
  "tenant_region_hit_log.sensitive": ["tenant_region_hit_log.view"],
  "tenant_region_hit_log.export": ["tenant_region_hit_log.view", "tenant_region_hit_log.sensitive"],
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

export function expandAdminPermissionDependencies(permissions: AdminPermissionKey[]) {
  const expanded = new Set(permissions);
  const queue = [...permissions];
  while (queue.length) {
    const permission = queue.shift()!;
    for (const dependency of PERMISSION_DEPENDENCIES[permission] || []) {
      if (expanded.has(dependency)) continue;
      expanded.add(dependency);
      queue.push(dependency);
    }
  }
  return Array.from(expanded);
}

export function normalizeAdminPermissions(value: unknown) {
  if (!Array.isArray(value)) return null;
  return Array.from(new Set(value.map((item) => String(item)).filter((item) => ALL_PERMISSION_SET.has(item)))) as AdminPermissionKey[];
}

export function defaultPermissionsForRole(role?: string | null, tenantScoped = false) {
  const normalizedRole = normalizeAdminRole(role);
  const scoped = (permissions: AdminPermissionKey[]) => tenantScoped ? permissions.filter((key) => !PLATFORM_ONLY_PERMISSION_SET.has(key)) : permissions;
  if (normalizedRole === AdminRole.SuperAdmin) {
    return tenantScoped ? ALL_ADMIN_PERMISSIONS.filter((key) => !PLATFORM_ONLY_PERMISSION_SET.has(key)) : [...ALL_ADMIN_PERMISSIONS];
  }
  if (normalizedRole === AdminRole.Operator) return scoped([...OPERATOR_PERMISSIONS]);
  if (normalizedRole === AdminRole.Finance) return scoped([...FINANCE_PERMISSIONS]);
  if (normalizedRole === AdminRole.CheckInStaff) return scoped([...CHECKIN_PERMISSIONS]);
  return [];
}

export function effectivePermissionsForAdmin(input: { role?: string | null; tenantId?: number | null; permissions?: unknown }) {
  const assigned = normalizeAdminPermissions(input.permissions);
  const permissions = assigned || defaultPermissionsForRole(input.role, Boolean(input.tenantId));
  const scoped = input.tenantId ? permissions.filter((key) => !PLATFORM_ONLY_PERMISSION_SET.has(key)) : permissions;
  return expandAdminPermissionDependencies(scoped);
}

export function hasAdminPermission(input: { role?: string | null; tenantId?: number | null; permissions?: unknown }, permission: string) {
  return effectivePermissionsForAdmin(input).includes(permission as AdminPermissionKey);
}

export function resolveAdminRoutePermission(method: string, routePath?: string, scope?: { tenantId?: number | null }) {
  const path = String(routePath || "").replace(/^\/?(?:api\/)?admin(?:\/|$)/, "").replace(/^\/+/, "");
  const verb = method.toUpperCase();
  const write = ["POST", "PATCH", "PUT", "DELETE"].includes(verb);
  if (path === "dashboard") return "dashboard.view";
  if (path === "resource-network") return "analytics.view";
  if (path === "business-jobs" && verb === "GET") return "business_job.view";
  if (path.startsWith("business-jobs")) return "business_job.manage";
  if (path === "analytics/recompute") return "analytics.manage";
  if (path.startsWith("analytics/") && path.includes("export")) return "analytics.export";
  if (path === "activities/:id/funnel") return "analytics.view";
  if (path === "activities/:id/recap/export") return "analytics.export";
  if (path === "activities/:id/recap/versions" && verb === "POST") return "analytics.manage";
  if (path === "activities/:id/recap" || path === "activities/:id/recap/versions") return "analytics.view";
  if (path.startsWith("analytics/")) return "analytics.view";
  if (path === "tenants/export") return "tenant.export";
  if (path.startsWith("tenants/") && path.endsWith("/permissions")) return "tenant.permissions.manage";
  if (path.startsWith("tenants/") && path.endsWith("/subscription-change")) return "tenant.subscription.manage";
  if (path.startsWith("tenants/") && path.endsWith("/subscription-events")) return "tenant.view";
  if (path === "tenants") return verb === "GET" ? "tenant.view" : "tenant.manage";
  if (path.startsWith("tenants/")) return "tenant.manage";
  if (path === "tenant-regions" || path === "tenant-regions/options") return verb === "GET" ? "tenant_region.view" : "tenant_region.manage";
  if (path.startsWith("tenant-regions/") && path.endsWith("/approval")) return "tenant_region.approve";
  if (path.startsWith("tenant-regions")) return "tenant_region.manage";
  if (path === "tenant-region-hit-logs/export") return "tenant_region_hit_log.export";
  if (path.startsWith("tenant-region-hit-logs")) return "tenant_region_hit_log.view";
  if (path === "tenant/profile") return verb === "GET" ? "tenant_profile.manage" : "tenant_profile.manage";
  if (path === "admins" || path === "admins/options") return verb === "GET" ? "admin.view" : "admin.manage";
  if (path.startsWith("admins/") && (path.endsWith("/password") || path.endsWith("/status") || path.endsWith("/force-logout"))) return "admin.security.manage";
  if (path.startsWith("admins/")) return "admin.manage";
  if (path === "admin-invitations") return verb === "GET" ? "admin.view" : "admin.manage";
  if (path.startsWith("admin-invitations/")) return "admin.manage";
  if (path.startsWith("support/users/") && path.endsWith("/reveal-phone")) return "support.sensitive";
  if (path === "support/assignees") return "support.manage";
  if (path === "support/work-orders" && write) return "support.manage";
  if (path.startsWith("support/work-orders/") && write) return "support.manage";
  if (path.startsWith("support/")) return "support.view";
  if (path === "member-segments/preview") return "tag.view";
  if ((path === "member-segments" || path.startsWith("member-segments/") || path.startsWith("member-segment-snapshots/")) && verb === "GET") return "tag.view";
  if (path.startsWith("member-segments") || path.startsWith("member-segment-snapshots")) return "tag.manage";
  if (path === "redemption-codes/export") return "redemption_code.export";
  if (path === "redemption-codes" || path === "redemption-codes/options" || path.startsWith("redemption-code-usages")) return verb === "GET" ? "redemption_code.view" : "redemption_code.manage";
  if (path.startsWith("redemption-codes")) return "redemption_code.manage";
  if (path === "operation-logs/export") return "logs.export";
  if (path.startsWith("operation-logs")) return "logs.view";
  if (path === "auth/login-logs/export" || path === "auth/h5-code-logs/export") return "security_log.export";
  if (path === "auth/log-options" || path.startsWith("auth/login-logs") || path.startsWith("auth/h5-code-logs")) return "security_log.view";
  if (path.startsWith("miniprogram-release")) return write ? "miniprogram_release.manage" : "miniprogram_release.view";
  if (path === "mall/accessible-merchants") return "mall.merchant.view";
  if (path === "mall/payment-merchants") return "mall.payment.manage";
  if (path.startsWith("mall/merchants") || path.startsWith("mall/merchant-access") || path.startsWith("mall/merchant-applications") || path.startsWith("mall/merchant-qualifications") || path.startsWith("mall/merchant-contracts") || path.startsWith("mall/merchant-governance")) return "mall.merchant.manage";
  if (path.startsWith("mall/brands")) return "mall.product.manage";
  if (path.startsWith("mall/promotion-risk-")) return "mall.product.manage";
  if (path.startsWith("mall/commission-rules")) return "mall.settlement.manage";
  if (path.startsWith("mall/commission-adjustments")) return "mall.finance.view";
  if (path.startsWith("mall/review-reports")) return "mall.review.manage";
  if (path.startsWith("mall/inventory-anomalies")) return "mall.product.manage";
  if (path === "mall/payment-statements/export") return "mall.finance.view";
  if (path === "mall/payment-statements" && verb === "GET") return "mall.finance.view";
  if (path.startsWith("mall/payment-statements")) return "mall.payment.manage";
  if (path.startsWith("mall/product-audits") || path.includes("/approve") && path.startsWith("mall/products") || path.includes("/reject") && path.startsWith("mall/products")) return "mall.product.audit";
  if (path === "mall/products" || path.startsWith("mall/products/") || path.startsWith("mall/categories") || path.startsWith("mall/skus") || path.startsWith("mall/coupons") || path.startsWith("mall/coupon-usages")) return "mall.product.manage";
  if (path.startsWith("mall/logistics-companies")) return "mall.logistics.manage";
  if (path.startsWith("mall/inventory-logs")) return "mall.product.manage";
  if (path.startsWith("mall/flash-sales") || path.startsWith("mall/promotion-codes")) return "mall.product.manage";
  if (path.startsWith("mall/reviews")) return "mall.review.manage";
  if (path === "mall/group-buys/fail-expired") return "mall.finance.view";
  if (path.startsWith("mall/group-buys") || path.startsWith("mall/group-buy-records")) return "mall.product.manage";
  if (path === "mall/orders/export") return "mall.finance.view";
  if (path === "mall/orders/summary") return "mall.finance.view";
  if (path === "mall/analytics") return "mall.statistics.view";
  if (path === "mall/settlements" && verb === "GET") return "mall.finance.view";
  if (path === "mall/settlements/export") return "mall.finance.view";
  if (path.startsWith("mall/settlements")) return "mall.settlement.manage";
  if (path === "mall/payment-readiness" && verb === "GET") return "mall.finance.view";
  if (path === "mall/merchant-payment-credentials") return "mall.payment.manage";
  if (path.startsWith("mall/merchant-payment-accounts")) return "mall.payment.manage";
  if (path.startsWith("mall/payment-transactions") || path.startsWith("mall/payment-callback-logs") || path.startsWith("mall/refund-logs")) return "mall.finance.view";
  if (path.startsWith("mall/commissions")) return write ? "mall.settlement.manage" : "mall.finance.view";
  if (path === "mall/orders/close-expired") return "mall.finance.view";
  if (path === "mall/orders" && verb === "GET") return "mall.order.view";
  if (path.startsWith("mall/orders")) return "mall.order.manage";
  if (path === "mall/refunds" && verb === "GET") return "mall.finance.view";
  if (path.startsWith("mall/refunds")) return "mall.refund.manage";
  if (path.startsWith("system/")) return write ? "system.manage" : "system.view";
  if (path === "settings/operation") {
    if (scope?.tenantId) return write ? "operation_settings.manage" : "operation_settings.view";
    return write ? "system.manage" : "system.view";
  }
  if (path === "settings/sms/test" || path === "settings/connectivity-check") return scope?.tenantId ? "operation_settings.manage" : "system.manage";
  if (path === "settings/charity") return write ? "charity.manage" : "charity.view";
  if (path.startsWith("credential-templates")) return write ? "certificate_template.manage" : "certificate_template.view";
  if (path.startsWith("charity/projects")) return write ? "charity.manage" : "charity.view";
  if (path.startsWith("charity/disbursements")) return "charity.finance";
  if (path === "charity/transactions") return "charity.finance";
  if (path.startsWith("charity/")) return "charity.view";
  if (path.startsWith("aid-application-materials") || path.includes("/reveal") && path.startsWith("aid-applications")) return "aid.sensitive";
  if (path.startsWith("aid-applications")) return write ? "aid.manage" : "aid.view";
  if (path === "ambassador/applications/export") return "ambassador.export";
  if (path.startsWith("ambassador/applications/") && path.endsWith("/reveal")) return "ambassador.sensitive";
  if (path.startsWith("ambassador/")) return write ? "ambassador.manage" : "ambassador.view";
  if (path === "partner/export") return "partner.export";
  if (path.startsWith("partner/applications/") && path.endsWith("/reveal")) return "partner.sensitive";
  if (path.startsWith("partner/contracts/") && path.endsWith("/reveal")) return "partner.sensitive";
  if (path.startsWith("partner/")) return write ? "partner.manage" : "partner.view";
  if (path.startsWith("volunteer/") && path.includes("export")) return "ambassador.export";
  if (path.startsWith("volunteer/")) return write ? "ambassador.manage" : "ambassador.view";
  if (path === "mobile/bootstrap") return "activity.view";
  if (path === "payment-accounts/options") return "payment_account.view";
  if (path === "agents" || path.startsWith("agents/")) return write ? "payment_account.manage" : "payment_account.view";
  if (path.startsWith("agent-payment-accounts")) return write ? "payment_account.manage" : "payment_account.view";
  if (path === "uploads/images") return "upload.image";
  if (path === "uploads/settlement-proofs") return "upload.settlement_proof";
  if (path === "uploads/private-settlement-proofs" || path.startsWith("private-settlement-proofs/")) return "upload.settlement_proof";
  if (path.startsWith("registration-attachments/")) return "registration.view";
  if (path === "categories" && verb === "GET") return "category.view";
  if (path.startsWith("categories")) return "category.manage";
  if (path.startsWith("announcements")) return write ? "announcement.manage" : "announcement.view";
  if (path.startsWith("marketing-popups")) return write ? "marketing_popup.manage" : "marketing_popup.view";
  if (path === "ad-center/options") return "ad_center.view";
  if (path.startsWith("ad-campaigns/export") || path.startsWith("ad-settlements/export")) return "ad_center.export";
  if (path.startsWith("ad-settlements") || path.startsWith("ad-official-revenue-imports")) return write ? "ad_center.finance" : "ad_center.view";
  if (path.startsWith("ad-advertisers") || path.startsWith("ad-contracts") || path.startsWith("ad-campaigns")) return write ? "ad_center.manage" : "ad_center.view";
  if (path.startsWith("homepage/")) return "homepage.manage";
  if (path === "activities" && verb === "GET") return "activity.view";
  if (path === "activities/:id" && verb === "GET") return "activity.view";
  if (path.includes("approval-logs") || path.includes("channel-report") || path.endsWith("/channels") && verb === "GET") return "activity.view";
  if (path === "agent-settlements" || path === "agent-settlements/options" || path.includes("transfer-capability") || path.includes("/details")) return "agent_settlement.view";
  if (path.includes("/mark-paid")) return "agent_settlement.pay";
  if (path.includes("/sandbox-transfer") || path.includes("/real-transfer") || path === "agent-settlement-transfers/scan") return "agent_settlement.transfer";
  if (path === "agent-settlements/export") return "agent_settlement.export";
  if (path.startsWith("agent-settlements")) return "agent_settlement.manage";
  if (path.includes("/refund") || path.startsWith("refunds/")) return "order.refund";
  if (path.startsWith("activities") && (path.includes("/approve") || path.includes("/reject"))) return "activity.approve";
  if (path.startsWith("activities/") && path.endsWith("/reminders/send")) return "notification.send";
  if (path.startsWith("activities")) return "activity.manage";
  if (path === "registrations" && verb === "GET") return "registration.view";
  if (path === "registrations/export") return "registration.export";
  if (path === "registrations/:id/check-in") return "checkin.manage";
  if (path.startsWith("registrations")) return "registration.manage";
  if (path === "orders" && verb === "GET") return "order.view";
  if (path === "unified-orders/export" && verb === "GET") return "order.export";
  if ((path === "unified-orders" || path.startsWith("unified-orders/")) && verb === "GET") return "order.view";
  if (path === "unified-funds/export" && verb === "GET") return "finance.export";
  if (path === "unified-funds/consistency" && verb === "GET") return "finance.view";
  if (path === "unified-funds" && verb === "GET") return "finance.view";
  if (path.startsWith("users/") && path.endsWith("/wallet")) return "finance.view";
  if (path === "orders/export") return "order.export";
  if (path.startsWith("orders")) return write ? "order.manage" : "order.view";
  if (path === "course-orders" && verb === "GET") return "course_order.view";
  if (path.startsWith("course-orders")) return write ? "course_order.manage" : "course_order.view";
  if ((path === "ticket-types" || path === "ticket-types/options") && verb === "GET") return "ticket.view";
  if (path.startsWith("ticket-types")) return "ticket.manage";
  if (path === "coupons/export") return "coupon.export";
  if (path === "coupons" || path === "coupons/options" || path.startsWith("coupon-claims") || path.startsWith("coupon-usages")) return verb === "GET" ? "coupon.view" : "coupon.manage";
  if (path.startsWith("coupons")) return "coupon.manage";
  if (path === "finance/export") return "finance.export";
  if (path.includes("wallet/adjust")) return "finance.wallet_adjust";
  if (path.startsWith("finance/")) return write ? "finance.manage" : "finance.view";
  if (path === "check-ins" || path.startsWith("check-ins/") || path === "check-in-points" || path.startsWith("check-in-points/")) return "checkin.manage";
  if ((path === "waitlists" || path === "waitlists/options") && verb === "GET") return "waitlist.view";
  if (path.startsWith("waitlists")) return "waitlist.manage";
  if (path === "members/options" && verb === "GET") return "member.view";
  if (path === "members/export" && verb === "GET") return "member.export";
  if (path === "members" && verb === "GET") return "member.view";
  if (path === "members/:userId" && verb === "GET") return "member.view";
  if (path.includes("/password")) return "member.password";
  if (path.includes("/points/adjust")) return "member.points.manage";
  if (path.includes("/level")) return "member.lifecycle.manage";
  if (path === "members/lifecycle-scan") return "member.lifecycle.manage";
  if (path.startsWith("members")) return "member.manage";
  if (path.startsWith("member-levels")) return verb === "GET" ? "member.view" : "member_level.manage";
  if (path.startsWith("member-point-rules")) return verb === "GET" ? "member_point_rule.view" : "member_point_rule.manage";
  if ((path === "tags" || path === "tags/options" || path === "tags/behavior-runs") && verb === "GET") return "tag.view";
  if (path.startsWith("tags")) return "tag.manage";
  if (path === "notifications/options" || path === "notification-templates" && verb === "GET" || path.startsWith("notification-templates/") && path.endsWith("/versions") && verb === "GET" || path === "notifications" && verb === "GET" || path === "notifications/monitor" || path === "notification-providers" || path === "notification-preferences" && verb === "GET" || path === "notification-schedules" && verb === "GET") return "notification.view";
  if (path === "notifications/preview") return "notification.view";
  if (path.startsWith("notification-templates/") && path.endsWith("/test")) return "notification.send";
  if (path.startsWith("notification-templates") || path.startsWith("notification-schedules") && path !== "notification-schedules/run-due") return "notification.template.manage";
  if (path.startsWith("notification-preferences")) return "notification.preference.manage";
  if (path === "notification-schedules/run-due" || path === "notifications/send" || path === "notifications/send-by-tag" || path.startsWith("notifications/") && path.endsWith("/retry")) return "notification.send";
  if (path === "reviews/options" && verb === "GET") return "review.view";
  if ((path.startsWith("reviews") || path.startsWith("review-reports")) && verb === "GET") return "review.view";
  if (path.startsWith("reviews") || path.startsWith("review-reports")) return "review.manage";
  if (path.startsWith("course-refunds")) return "order.refund";
  if (verb === "GET" && (path === "course-assessment-attempts-export" || path.startsWith("courses/") && path.endsWith("/insights/export"))) return "course.export";
  if (path === "course-member-level-options" && verb === "GET") return "course.manage";
  if (path.startsWith("course-")) return "course.manage";
  if (path.startsWith("courses")) return "course.manage";
  if (path.startsWith("checkin-tasks")) return "community.manage";
  if (path.startsWith("content-keyword-rules") || path.startsWith("content-sanctions") || path.startsWith("content-appeals")) return "forum.moderate";
  if (path.startsWith("community")) return "community.manage";
  if (path.startsWith("forum")) return write ? "forum.moderate" : "forum.manage";
  return null;
}
