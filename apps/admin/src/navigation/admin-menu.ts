import { permissions } from "../permissions";

export type AdminMenuScope = "platform" | "tenant" | "tenantOrPlatformAdmin" | "any";

export type AdminMenuItem = {
  index: string;
  icon: string;
  label: string;
  roles?: string[];
  scope: AdminMenuScope;
  requiresMallEnabled?: boolean;
};

export type AdminMenuGroup = {
  index: string;
  icon: string;
  label: string;
  scope: AdminMenuScope;
  items: AdminMenuItem[];
};

export type TenantQuickLink = {
  label: string;
  path: string;
  requiresMallEnabled?: boolean;
};

export const tenantScopedRoutePaths = new Set([
  "/activities",
  "/activity-space",
  "/support",
  "/registrations",
  "/orders",
  "/unified-orders",
  "/course-refunds",
  "/mall-merchants",
  "/mall-payments",
  "/mall-products",
  "/mall-categories",
  "/mall-inventory",
  "/mall-orders",
  "/mall-refunds",
  "/mall-logistics",
  "/mall-marketing",
  "/mall-payment-logs",
  "/mall-settlements",
  "/mall-statistics",
  "/mall-finance",
  "/finance",
  "/admins",
  "/agents",
  "/announcements",
  "/marketing-popups",
  "/ad-center",
  "/homepage-builder",
  "/operation-logs",
  "/business-jobs",
  "/courses",
  "/community",
  "/notifications"
]);

export const tenantQuickLinks: TenantQuickLink[] = [
  { label: "活动", path: "/activities" },
  { label: "活动空间", path: "/activity-space" },
  { label: "客服", path: "/support" },
  { label: "报名", path: "/registrations" },
  { label: "订单", path: "/orders" },
  { label: "统一订单", path: "/unified-orders" },
  { label: "商城", path: "/mall-products" },
  { label: "商城订单", path: "/mall-orders" },
  { label: "商城统计", path: "/mall-statistics" },
  { label: "商城收款", path: "/mall-payments", requiresMallEnabled: true },
  { label: "财务", path: "/finance" },
  { label: "装修", path: "/homepage-builder" },
  { label: "课程", path: "/courses" },
  { label: "动态/共修", path: "/community" },
  { label: "账号", path: "/admins" },
  { label: "日志", path: "/operation-logs" }
];

const rawMenuGroups: AdminMenuGroup[] = [
  {
    index: "platform-overview",
    icon: "DataAnalysis",
    label: "平台总览",
    scope: "platform",
    items: [
      { index: "/dashboard", icon: "DataAnalysis", label: "全局数据看板", roles: permissions.overview, scope: "platform" },
      { index: "/analytics", icon: "TrendCharts", label: "数据中心", roles: permissions.analytics, scope: "platform" },
      { index: "/support", icon: "Search", label: "客服查询台", roles: ["support.view"], scope: "platform" }
    ]
  },
  {
    index: "platform-merchant",
    icon: "OfficeBuilding",
    label: "商家管理",
    scope: "platform",
    items: [
      { index: "/tenants", icon: "OfficeBuilding", label: "商家/代理列表", roles: ["tenant.view"], scope: "platform" },
      { index: "/tenant-regions", icon: "Location", label: "区域保护", roles: ["tenant_region.view"], scope: "platform" },
      { index: "/tenant-region-hit-logs", icon: "Aim", label: "定位命中日志", roles: ["tenant_region_hit_log.view"], scope: "platform" },
      { index: "/admins", icon: "UserFilled", label: "商家账号", roles: ["admin.view"], scope: "platform" },
      { index: "/tenants?mode=permissions", icon: "Setting", label: "权限配置", roles: ["tenant.permissions.manage"], scope: "platform" }
    ]
  },
  {
    index: "platform-activity",
    icon: "Calendar",
    label: "活动监管",
    scope: "platform",
    items: [
      { index: "/activities?status=pending_approval", icon: "Calendar", label: "活动审核", roles: ["activity.approve"], scope: "platform" },
      { index: "/activities", icon: "Calendar", label: "全部活动", roles: permissions.activityView, scope: "platform" },
      { index: "/registrations", icon: "Tickets", label: "全局报名", roles: permissions.registrationView, scope: "platform" },
      { index: "/announcements", icon: "Bell", label: "公告监管", roles: ["announcement.view"], scope: "platform" },
      { index: "/categories", icon: "CollectionTag", label: "全局分类", roles: ["category.view"], scope: "platform" }
    ]
  },
  {
    index: "platform-marketing",
    icon: "Grid",
    label: "运营内容",
    scope: "platform",
    items: [
      { index: "/homepage-builder", icon: "Grid", label: "前台全局装修", roles: ["homepage.manage"], scope: "platform" },
      { index: "/marketing-popups", icon: "Promotion", label: "营销弹窗", roles: ["marketing_popup.view"], scope: "platform" },
      { index: "/ad-center", icon: "Money", label: "广告中心", roles: ["ad_center.view"], scope: "platform" }
    ]
  },
  {
    index: "platform-finance",
    icon: "Wallet",
    label: "财务监管",
    scope: "platform",
    items: [
      { index: "/orders", icon: "Wallet", label: "全局订单", roles: ["order.view"], scope: "platform" },
      { index: "/unified-orders", icon: "DocumentChecked", label: "统一订单中心", roles: ["order.view"], scope: "platform" },
      { index: "/finance", icon: "CreditCard", label: "全局对账", roles: permissions.finance, scope: "platform" },
      { index: "/course-refunds", icon: "RefreshLeft", label: "课程退款", roles: ["order.refund"], scope: "platform" },
      { index: "/agents", icon: "Shop", label: "商家收款账户", roles: ["payment_account.view"], scope: "platform" }
    ]
  },
  {
    index: "platform-mall",
    icon: "Goods",
    label: "扩展 · 商城",
    scope: "platform",
    items: [
      { index: "/mall-products", icon: "Goods", label: "商品管理", roles: ["mall.product.manage"], scope: "platform" },
      { index: "/mall-merchants", icon: "Shop", label: "店铺管理", roles: ["mall.merchant.manage"], scope: "platform" },
      { index: "/mall-categories", icon: "CollectionTag", label: "店铺分类", roles: ["mall.product.manage"], scope: "platform" },
      { index: "/mall-product-audits", icon: "Checked", label: "商品审核", roles: ["mall.product.audit"], scope: "platform" },
      { index: "/mall-inventory", icon: "Warning", label: "库存预警", roles: ["mall.product.manage"], scope: "platform" },
      { index: "/mall-reviews", icon: "ChatDotRound", label: "评价管理", roles: ["mall.review.manage"], scope: "platform" },
      { index: "/mall-orders", icon: "Tickets", label: "商城订单", roles: ["mall.order.view", "mall.finance.view"], scope: "platform" },
      { index: "/mall-refunds", icon: "RefreshLeft", label: "售后退款", roles: ["mall.refund.manage", "mall.finance.view"], scope: "platform" },
      { index: "/mall-logistics", icon: "Van", label: "物流设置", roles: ["mall.logistics.manage", "mall.order.manage"], scope: "platform" },
      { index: "/mall-marketing", icon: "Promotion", label: "营销中心", roles: ["mall.product.manage"], scope: "platform" },
      { index: "/mall-payments", icon: "CreditCard", label: "商城收款配置", roles: ["mall.payment.manage"], scope: "platform", requiresMallEnabled: true },
      { index: "/mall-payment-logs", icon: "DocumentChecked", label: "支付日志", roles: ["mall.finance.view"], scope: "platform" },
      { index: "/mall-settlements", icon: "Money", label: "商城结算", roles: ["mall.settlement.manage", "mall.finance.view"], scope: "platform" },
      { index: "/mall-statistics", icon: "DataAnalysis", label: "商城统计", roles: ["mall.statistics.view"], scope: "platform" },
      { index: "/mall-finance", icon: "Money", label: "商城财务总览", roles: ["mall.finance.view"], scope: "platform" }
    ]
  },
  {
    index: "platform-member",
    icon: "User",
    label: "会员资产",
    scope: "platform",
    items: [
      { index: "/members", icon: "User", label: "会员资料管理", roles: ["member.view"], scope: "platform" }
    ]
  },
  {
    index: "platform-charity",
    icon: "Coin",
    label: "扩展 · 公益招募",
    scope: "platform",
    items: [
      { index: "/charity", icon: "Coin", label: "公益池", roles: ["charity.view"], scope: "platform" },
      { index: "/credential-templates", icon: "Postcard", label: "证书模板", roles: ["certificate_template.view"], scope: "platform" },
      { index: "/aid-applications", icon: "FirstAidKit", label: "援助申请", roles: ["aid.view"], scope: "platform" },
      { index: "/ambassador", icon: "Flag", label: "大使与伙伴 CRM", roles: ["ambassador.view", "partner.view"], scope: "platform" },
      { index: "/volunteers", icon: "UserFilled", label: "志愿者档案", roles: ["ambassador.manage"], scope: "platform" }
    ]
  },
  {
    index: "platform-academy",
    icon: "Reading",
    label: "扩展 · 专题共修",
    scope: "platform",
    items: [
      { index: "/courses", icon: "Reading", label: "课程管理", roles: ["course.manage"], scope: "platform" },
      { index: "/community", icon: "ChatLineSquare", label: "共修动态", roles: ["community.manage"], scope: "platform" }
    ]
  },
  {
    index: "platform-security",
    icon: "Tools",
    label: "系统与安全",
    scope: "platform",
    items: [
      { index: "/system-settings", icon: "Tools", label: "系统设置", roles: ["system.view"], scope: "platform" },
      { index: "/config-check", icon: "Monitor", label: "上线体检", roles: ["system.view"], scope: "platform" },
      { index: "/miniprogram-release", icon: "Promotion", label: "小程序发布", roles: ["miniprogram_release.view"], scope: "platform" },
      { index: "/operation-flow", icon: "Connection", label: "操作流程图", roles: ["dashboard.view"], scope: "platform" },
      { index: "/operation-guide", icon: "Guide", label: "运维教程", roles: ["system.view"], scope: "platform" },
      { index: "/ops-routine", icon: "List", label: "运营巡检", roles: ["system.view", "dashboard.view"], scope: "platform" },
      { index: "/operation-logs", icon: "Document", label: "操作日志", roles: ["logs.view"], scope: "platform" },
      { index: "/business-jobs", icon: "List", label: "业务任务", roles: ["business_job.view"], scope: "platform" },
      { index: "/admin-login-logs", icon: "Key", label: "登录日志", roles: ["security_log.view"], scope: "platform" },
      { index: "/h5-code-logs", icon: "Lock", label: "验证码日志", roles: ["security_log.view"], scope: "platform" }
    ]
  },
  {
    index: "tenant-workbench",
    icon: "DataAnalysis",
    label: "工作台",
    scope: "tenant",
    items: [
      { index: "/dashboard", icon: "DataAnalysis", label: "工作台", roles: permissions.overview, scope: "tenant" },
      { index: "/analytics", icon: "TrendCharts", label: "数据中心", roles: permissions.analytics, scope: "tenant" },
      { index: "/support", icon: "Search", label: "客服查询台", roles: ["support.view"], scope: "tenant" }
    ]
  },
  {
    index: "tenant-activity",
    icon: "Calendar",
    label: "活动运营",
    scope: "tenant",
    items: [
      { index: "/activities", icon: "Calendar", label: "活动管理", roles: permissions.activityView, scope: "tenant" },
      { index: "/categories", icon: "CollectionTag", label: "分类管理", roles: ["category.view"], scope: "tenant" },
      { index: "/ticket-types", icon: "Sell", label: "票种管理", roles: ["ticket.view"], scope: "tenant" },
      { index: "/coupons", icon: "Discount", label: "优惠券与兑换码", roles: ["coupon.view", "redemption_code.view"], scope: "tenant" }
    ]
  },
  {
    index: "tenant-registration",
    icon: "Tickets",
    label: "报名签到",
    scope: "tenant",
    items: [
      { index: "/registrations", icon: "Tickets", label: "报名管理", roles: permissions.registrationView, scope: "tenant" },
      { index: "/waitlists", icon: "List", label: "候补管理", roles: ["waitlist.view"], scope: "tenant" },
      { index: "/check-in", icon: "Finished", label: "签到核销", roles: permissions.checkIn, scope: "tenant" }
    ]
  },
  {
    index: "tenant-finance",
    icon: "Wallet",
    label: "票务与财务",
    scope: "tenant",
    items: [
      { index: "/orders", icon: "Wallet", label: "订单管理", roles: ["order.view"], scope: "tenant" },
      { index: "/unified-orders", icon: "DocumentChecked", label: "统一订单中心", roles: ["order.view"], scope: "tenant" },
      { index: "/finance", icon: "CreditCard", label: "财务对账", roles: permissions.finance, scope: "tenant" },
      { index: "/course-refunds", icon: "RefreshLeft", label: "课程退款", roles: ["order.refund"], scope: "tenant" },
      { index: "/agents", icon: "Shop", label: "收款方式", roles: permissions.paymentAccountView, scope: "tenant" },
      { index: "/agent-settlements", icon: "Money", label: "代理结算", roles: ["agent_settlement.view"], scope: "tenant" }
    ]
  },
  {
    index: "tenant-mall",
    icon: "Goods",
    label: "扩展 · 商城",
    scope: "tenant",
    items: [
      { index: "/mall-merchants", icon: "Shop", label: "店铺管理", roles: ["mall.merchant.manage"], scope: "tenant" },
      { index: "/mall-products", icon: "Goods", label: "商品管理", roles: ["mall.product.manage"], scope: "tenant" },
      { index: "/mall-categories", icon: "CollectionTag", label: "店铺分类", roles: ["mall.product.manage"], scope: "tenant" },
      { index: "/mall-inventory", icon: "Warning", label: "库存预警", roles: ["mall.product.manage"], scope: "tenant" },
      { index: "/mall-reviews", icon: "ChatDotRound", label: "评价管理", roles: ["mall.review.manage"], scope: "tenant" },
      { index: "/mall-orders", icon: "Tickets", label: "商城订单", roles: ["mall.order.view", "mall.finance.view"], scope: "tenant" },
      { index: "/mall-refunds", icon: "RefreshLeft", label: "售后退款", roles: ["mall.refund.manage", "mall.finance.view"], scope: "tenant" },
      { index: "/mall-logistics", icon: "Van", label: "物流设置", roles: ["mall.logistics.manage", "mall.order.manage"], scope: "tenant" },
      { index: "/mall-marketing", icon: "Promotion", label: "营销中心", roles: ["mall.product.manage"], scope: "tenant" },
      { index: "/mall-payments", icon: "CreditCard", label: "商城收款配置", roles: ["mall.payment.manage"], scope: "tenant", requiresMallEnabled: true },
      { index: "/mall-payment-logs", icon: "DocumentChecked", label: "支付日志", roles: ["mall.finance.view"], scope: "tenant" },
      { index: "/mall-settlements", icon: "Money", label: "商城结算", roles: ["mall.settlement.manage", "mall.finance.view"], scope: "tenant" },
      { index: "/mall-statistics", icon: "DataAnalysis", label: "商城统计", roles: ["mall.statistics.view"], scope: "tenant" },
      { index: "/mall-finance", icon: "Money", label: "商城财务总览", roles: ["mall.finance.view"], scope: "tenant" }
    ]
  },
  {
    index: "tenant-member",
    icon: "User",
    label: "会员运营",
    scope: "tenantOrPlatformAdmin",
    items: [
      { index: "/members", icon: "User", label: "会员资料管理", roles: ["member.view"], scope: "tenant" },
      { index: "/tags", icon: "PriceTag", label: "用户标签", roles: ["tag.view"], scope: "tenant" },
      { index: "/notifications", icon: "Message", label: "通知中心", roles: ["notification.view"], scope: "tenantOrPlatformAdmin" },
      { index: "/reviews", icon: "ChatDotRound", label: "评价管理", roles: ["review.view"], scope: "tenant" }
    ]
  },
  {
    index: "tenant-marketing",
    icon: "Grid",
    label: "装修营销",
    scope: "tenant",
    items: [
      { index: "/homepage-builder", icon: "Grid", label: "首页装修", roles: permissions.operation, scope: "tenant" },
      { index: "/marketing-popups", icon: "Promotion", label: "营销弹窗", roles: ["marketing_popup.view"], scope: "tenant" },
      { index: "/ad-center", icon: "Money", label: "广告中心", roles: ["ad_center.view"], scope: "tenant" },
      { index: "/announcements", icon: "Bell", label: "公告管理", roles: ["announcement.view"], scope: "tenant" },
      { index: "/funnels", icon: "TrendCharts", label: "增长分析", roles: ["analytics.view"], scope: "tenant" },
      { index: "/recaps", icon: "PieChart", label: "活动复盘", roles: ["analytics.view"], scope: "tenant" }
    ]
  },
  {
    index: "tenant-academy",
    icon: "Reading",
    label: "扩展 · 专题共修",
    scope: "tenant",
    items: [
      { index: "/courses", icon: "Reading", label: "课程管理", roles: ["course.manage"], scope: "tenant" },
      { index: "/community", icon: "ChatLineSquare", label: "共修动态", roles: ["community.manage"], scope: "tenant" }
    ]
  },
  {
    index: "tenant-charity",
    icon: "Coin",
    label: "扩展 · 公益池",
    scope: "tenant",
    items: [
      { index: "/charity", icon: "Coin", label: "公益池", roles: ["charity.view"], scope: "tenant" },
      { index: "/credential-templates", icon: "Postcard", label: "证书模板", roles: ["certificate_template.view"], scope: "tenant" }
    ]
  },
  {
    index: "tenant-system",
    icon: "Tools",
    label: "设置",
    scope: "tenant",
    items: [
      { index: "/system-settings", icon: "Tools", label: "运营设置", roles: ["operation_settings.view"], scope: "tenant" },
      { index: "/operation-flow", icon: "Connection", label: "操作流程图", roles: ["dashboard.view"], scope: "tenant" },
      { index: "/ops-routine", icon: "List", label: "运营巡检", roles: ["dashboard.view"], scope: "tenant" },
      { index: "/tenant-profile", icon: "Shop", label: "商家资料", roles: ["tenant_profile.manage"], scope: "tenant" },
      { index: "/admins", icon: "UserFilled", label: "员工账号", roles: ["admin.view"], scope: "tenant" },
      { index: "/operation-logs", icon: "Document", label: "操作日志", roles: ["logs.view"], scope: "tenant" },
      { index: "/business-jobs", icon: "List", label: "业务任务", roles: ["business_job.view"], scope: "tenant" }
    ]
  }
];

const menuGroupOrder = [
  "platform-overview",
  "platform-merchant",
  "platform-activity",
  "platform-finance",
  "platform-member",
  "platform-marketing",
  "platform-mall",
  "platform-academy",
  "platform-charity",
  "platform-security",
  "tenant-workbench",
  "tenant-activity",
  "tenant-registration",
  "tenant-finance",
  "tenant-member",
  "tenant-marketing",
  "tenant-mall",
  "tenant-academy",
  "tenant-charity",
  "tenant-system"
];

const menuGroupOrderMap = new Map(menuGroupOrder.map((index, order) => [index, order]));

export const menuGroups = [...rawMenuGroups].sort(
  (a, b) => (menuGroupOrderMap.get(a.index) ?? rawMenuGroups.length) - (menuGroupOrderMap.get(b.index) ?? rawMenuGroups.length)
);
