import { createRouter, createWebHistory } from "vue-router";
import { isAdminFeaturePathEnabled } from "./feature-gates";
import { adminSession, canAccess, canAccessScope, currentTenantSettings, isPlatformAdmin, isPlatformScopedAdmin, permissions } from "./permissions";

const Login = () => import("./views/Login.vue");
const AdminInviteAccept = () => import("./views/AdminInviteAccept.vue");
const Layout = () => import("./views/Layout.vue");
const Dashboard = () => import("./views/Dashboard.vue");
const Analytics = () => import("./views/Analytics.vue");
const SupportSearch = () => import("./views/SupportSearch.vue");
const Activities = () => import("./views/Activities.vue");
const Funnels = () => import("./views/Funnels.vue");
const Recaps = () => import("./views/Recaps.vue");
const Announcements = () => import("./views/Announcements.vue");
const HomepageBuilder = () => import("./views/HomepageBuilder.vue");
const MarketingPopups = () => import("./views/MarketingPopups.vue");
const AdCenter = () => import("./views/AdCenter.vue");
const Notifications = () => import("./views/Notifications.vue");
const Reviews = () => import("./views/Reviews.vue");
const ActivitySpace = () => import("./views/ActivitySpace.vue");
const Registrations = () => import("./views/Registrations.vue");
const Orders = () => import("./views/Orders.vue");
const UnifiedOrders = () => import("./views/UnifiedOrders.vue");
const CourseRefunds = () => import("./views/CourseRefunds.vue");
const TicketTypes = () => import("./views/TicketTypes.vue");
const Coupons = () => import("./views/Coupons.vue");
const Agents = () => import("./views/Agents.vue");
const AgentSettlements = () => import("./views/AgentSettlements.vue");
const Ambassador = () => import("./views/Ambassador.vue");
const Volunteers = () => import("./views/Volunteers.vue");
const CheckIn = () => import("./views/CheckIn.vue");
const Waitlists = () => import("./views/Waitlists.vue");
const UserTags = () => import("./views/UserTags.vue");
const Members = () => import("./views/Members.vue");
const Categories = () => import("./views/Categories.vue");
const Admins = () => import("./views/Admins.vue");
const Finance = () => import("./views/Finance.vue");
const Charity = () => import("./views/Charity.vue");
const CredentialTemplates = () => import("./views/CredentialTemplates.vue");
const AidApplications = () => import("./views/AidApplications.vue");
const SystemSettings = () => import("./views/SystemSettings.vue");
const OperationLogs = () => import("./views/OperationLogs.vue");
const AdminLoginLogs = () => import("./views/AdminLoginLogs.vue");
const H5CodeLogs = () => import("./views/H5CodeLogs.vue");
const Courses = () => import("./views/Courses.vue");
const Community = () => import("./views/Community.vue");
const MallMerchants = () => import("./views/MallMerchants.vue");
const MallPayments = () => import("./views/MallPayments.vue");
const MallProducts = () => import("./views/MallProducts.vue");
const MallCategories = () => import("./views/MallCategories.vue");
const MallProductAudits = () => import("./views/MallProductAudits.vue");
const MallInventory = () => import("./views/MallInventory.vue");
const MallReviews = () => import("./views/MallReviews.vue");
const MallMarketing = () => import("./views/MallMarketing.vue");
const MallLogistics = () => import("./views/MallLogistics.vue");
const MallStatistics = () => import("./views/MallStatistics.vue");
const MallPaymentLogs = () => import("./views/MallPaymentLogs.vue");
const MallSettlements = () => import("./views/MallSettlements.vue");
const MallRefunds = () => import("./views/MallRefunds.vue");
const MallFinance = () => import("./views/MallFinance.vue");
const MallOrders = () => import("./views/MallOrders.vue");
const ConfigCheck = () => import("./views/ConfigCheck.vue");
const MiniprogramRelease = () => import("./views/MiniprogramRelease.vue");
const OperationGuide = () => import("./views/OperationGuide.vue");
const OperationFlow = () => import("./views/OperationFlow.vue");
const OpsRoutine = () => import("./views/OpsRoutine.vue");
const Tenants = () => import("./views/Tenants.vue");
const TenantRegions = () => import("./views/TenantRegions.vue");
const TenantRegionHitLogs = () => import("./views/TenantRegionHitLogs.vue");
const TenantProfile = () => import("./views/TenantProfile.vue");
const BusinessJobs = () => import("./views/BusinessJobs.vue");

export const router = createRouter({
  history: createWebHistory("/admin/"),
  routes: [
    { path: "/login", component: Login },
    { path: "/invite", component: AdminInviteAccept },
    {
      path: "/",
      component: Layout,
      children: [
        { path: "", redirect: "/dashboard" },
        { path: "dashboard", component: Dashboard, meta: { roles: permissions.overview, scope: "tenantOrPlatformAdmin" } },
        { path: "analytics", component: Analytics, meta: { roles: permissions.analytics, scope: "tenantOrPlatformAdmin" } },
        { path: "support", component: SupportSearch, meta: { roles: ["support.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "courses", component: Courses, meta: { roles: ["course.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "community", component: Community, meta: { roles: ["community.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-merchants", component: MallMerchants, meta: { roles: ["mall.merchant.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-payments", component: MallPayments, meta: { roles: ["mall.payment.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-products", component: MallProducts, meta: { roles: ["mall.product.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-categories", component: MallCategories, meta: { roles: ["mall.product.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-product-audits", component: MallProductAudits, meta: { roles: ["mall.product.audit"], scope: "platform" } },
        { path: "mall-inventory", component: MallInventory, meta: { roles: ["mall.product.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-reviews", component: MallReviews, meta: { roles: ["mall.review.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-coupons", redirect: (to) => ({ path: "/mall-marketing", query: { ...to.query, tab: "coupons" } }) },
        { path: "mall-orders", component: MallOrders, meta: { roles: ["mall.order.view", "mall.finance.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-refunds", component: MallRefunds, meta: { roles: ["mall.refund.manage", "mall.finance.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-logistics", component: MallLogistics, meta: { roles: ["mall.logistics.manage", "mall.order.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-marketing", component: MallMarketing, meta: { roles: ["mall.product.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-payment-logs", component: MallPaymentLogs, meta: { roles: ["mall.finance.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-settlements", component: MallSettlements, meta: { roles: ["mall.settlement.manage", "mall.finance.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-statistics", component: MallStatistics, meta: { roles: ["mall.statistics.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-finance", component: MallFinance, meta: { roles: ["mall.finance.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "tenants", component: Tenants, meta: { roles: ["tenant.view"], scope: "platform" } },
        { path: "tenant-regions", component: TenantRegions, meta: { roles: ["tenant_region.view"], scope: "platform" } },
        { path: "tenant-region-hit-logs", component: TenantRegionHitLogs, meta: { roles: ["tenant_region_hit_log.view"], scope: "platform" } },
        { path: "ambassador", component: Ambassador, meta: { roles: ["ambassador.view", "partner.view"], scope: "platform" } },
        { path: "aid-applications", component: AidApplications, meta: { roles: ["aid.view"], scope: "platform" } },
        { path: "volunteers", component: Volunteers, meta: { roles: ["ambassador.manage"], scope: "platform" } },
        { path: "activities", component: Activities, meta: { roles: permissions.activityView, scope: "tenantOrPlatformAdmin" } },
        { path: "funnels", component: Funnels, meta: { roles: ["analytics.view"], scope: "tenant" } },
        { path: "recaps", component: Recaps, meta: { roles: ["analytics.view"], scope: "tenant" } },
        { path: "announcements", component: Announcements, meta: { roles: ["announcement.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "homepage-builder", component: HomepageBuilder, meta: { roles: permissions.operation, scope: "tenantOrPlatformAdmin" } },
        { path: "marketing-popups", component: MarketingPopups, meta: { roles: ["marketing_popup.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "ad-center", component: AdCenter, meta: { roles: ["ad_center.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "notifications", component: Notifications, meta: { roles: ["notification.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "reviews", component: Reviews, meta: { roles: ["review.view"], scope: "tenant" } },
        { path: "activity-space", component: ActivitySpace, meta: { roles: permissions.activityView, scope: "tenantOrPlatformAdmin" } },
        { path: "registrations", component: Registrations, meta: { roles: permissions.registrationView, scope: "tenantOrPlatformAdmin" } },
        { path: "waitlists", component: Waitlists, meta: { roles: ["waitlist.view"], scope: "tenant" } },
        { path: "tags", component: UserTags, meta: { roles: ["tag.view"], scope: "tenant" } },
        { path: "members", component: Members, meta: { roles: ["member.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "ticket-types", component: TicketTypes, meta: { roles: ["ticket.view"], scope: "tenant" } },
        { path: "coupons", component: Coupons, meta: { roles: ["coupon.view", "redemption_code.view"], scope: "tenant" } },
        { path: "agents", component: Agents, meta: { roles: permissions.paymentAccountView, scope: "tenantOrPlatformAdmin" } },
        { path: "agent-settlements", component: AgentSettlements, meta: { roles: ["agent_settlement.view"], scope: "tenant" } },
        { path: "orders", component: Orders, meta: { roles: ["order.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "unified-orders", component: UnifiedOrders, meta: { roles: ["order.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "course-refunds", component: CourseRefunds, meta: { roles: ["order.refund"], scope: "tenantOrPlatformAdmin" } },
        { path: "finance", component: Finance, meta: { roles: permissions.finance, scope: "tenantOrPlatformAdmin" } },
        { path: "charity", component: Charity, meta: { roles: ["charity.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "credential-templates", component: CredentialTemplates, meta: { roles: ["certificate_template.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "check-in", component: CheckIn, meta: { roles: permissions.checkIn, scope: "tenant" } },
        { path: "system-settings", component: SystemSettings, meta: { roles: ["system.view", "operation_settings.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "tenant-profile", component: TenantProfile, meta: { roles: ["tenant_profile.manage"], scope: "tenant" } },
        { path: "operation-settings", redirect: "/system-settings" },
        { path: "operation-logs", component: OperationLogs, meta: { roles: ["logs.view"], scope: "any" } },
        { path: "business-jobs", component: BusinessJobs, meta: { roles: ["business_job.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "admin-login-logs", component: AdminLoginLogs, meta: { roles: ["security_log.view"], scope: "platform" } },
        { path: "h5-code-logs", component: H5CodeLogs, meta: { roles: ["security_log.view"], scope: "platform" } },
        { path: "config-check", component: ConfigCheck, meta: { roles: ["system.view"], scope: "platform" } },
        { path: "miniprogram-release", component: MiniprogramRelease, meta: { roles: ["miniprogram_release.view"], scope: "platform" } },
        { path: "operation-guide", component: OperationGuide, meta: { roles: ["system.view"], scope: "platform" } },
        { path: "operation-flow", component: OperationFlow, meta: { roles: ["dashboard.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "ops-routine", component: OpsRoutine, meta: { roles: ["system.view", "dashboard.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "categories", component: Categories, meta: { roles: ["category.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "admins", component: Admins, meta: { roles: ["admin.view"], scope: "any" } },
        { path: ":pathMatch(.*)*", redirect: () => fallbackPath() }
      ]
    }
  ]
});

function fallbackPath() {
  if (canAccess(permissions.overview)) return "/dashboard";
  if (canAccess(permissions.checkIn)) return "/check-in";
  const candidates = [
    { path: "/dashboard", roles: permissions.overview, scope: "tenantOrPlatformAdmin" },
    { path: "/analytics", roles: permissions.analytics, scope: "tenantOrPlatformAdmin" },
    { path: "/support", roles: ["support.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/courses", roles: ["course.manage"], scope: "tenantOrPlatformAdmin" },
    { path: "/community", roles: ["community.manage"], scope: "tenantOrPlatformAdmin" },
    { path: "/ambassador", roles: ["ambassador.view", "partner.view"], scope: "platform" },
    { path: "/aid-applications", roles: ["aid.view"], scope: "platform" },
    { path: "/volunteers", roles: ["ambassador.manage"], scope: "platform" },
    { path: "/tenants", roles: ["tenant.view"], scope: "platform" },
    { path: "/tenant-regions", roles: ["tenant_region.view"], scope: "platform" },
    { path: "/tenant-region-hit-logs", roles: ["tenant_region_hit_log.view"], scope: "platform" },
    { path: "/activities", roles: ["activity.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/activity-space", roles: ["activity.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/funnels", roles: ["analytics.view"], scope: "tenant" },
    { path: "/recaps", roles: ["analytics.view"], scope: "tenant" },
    { path: "/announcements", roles: ["announcement.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/homepage-builder", roles: permissions.operation, scope: "tenantOrPlatformAdmin" },
    { path: "/marketing-popups", roles: ["marketing_popup.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/ad-center", roles: ["ad_center.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/notifications", roles: ["notification.view"], scope: "tenant" },
    { path: "/reviews", roles: ["review.view"], scope: "tenant" },
    { path: "/categories", roles: ["category.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/ticket-types", roles: ["ticket.view"], scope: "tenant" },
    { path: "/coupons", roles: ["coupon.view", "redemption_code.view"], scope: "tenant" },
    { path: "/registrations", roles: ["registration.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/waitlists", roles: ["waitlist.view"], scope: "tenant" },
    { path: "/tags", roles: ["tag.view"], scope: "tenant" },
    { path: "/orders", roles: ["order.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/unified-orders", roles: ["order.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/course-refunds", roles: ["order.refund"], scope: "tenantOrPlatformAdmin" },
    { path: "/finance", roles: ["finance.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/agents", roles: ["payment_account.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/agent-settlements", roles: ["agent_settlement.view"], scope: "tenant" },
    { path: "/mall-merchants", roles: ["mall.merchant.manage"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-payments", roles: ["mall.payment.manage"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-orders", roles: ["mall.order.view", "mall.finance.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-payment-logs", roles: ["mall.finance.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-settlements", roles: ["mall.settlement.manage", "mall.finance.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-statistics", roles: ["mall.statistics.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-refunds", roles: ["mall.refund.manage", "mall.finance.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-logistics", roles: ["mall.logistics.manage", "mall.order.manage"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-marketing", roles: ["mall.product.manage"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-finance", roles: ["mall.finance.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-products", roles: ["mall.product.manage"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-categories", roles: ["mall.product.manage"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-inventory", roles: ["mall.product.manage"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-reviews", roles: ["mall.review.manage"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-product-audits", roles: ["mall.product.audit"], scope: "platform" },
    { path: "/members", roles: ["member.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/charity", roles: ["charity.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/credential-templates", roles: ["certificate_template.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/business-jobs", roles: ["business_job.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/system-settings", roles: ["system.view", "operation_settings.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/operation-logs", roles: ["logs.view"], scope: "any" },
    { path: "/admin-login-logs", roles: ["security_log.view"], scope: "platform" },
    { path: "/h5-code-logs", roles: ["security_log.view"], scope: "platform" },
    { path: "/config-check", roles: ["system.view"], scope: "platform" },
    { path: "/miniprogram-release", roles: ["miniprogram_release.view"], scope: "platform" },
    { path: "/operation-guide", roles: ["system.view"], scope: "platform" },
    { path: "/operation-flow", roles: ["dashboard.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/ops-routine", roles: ["system.view", "dashboard.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/tenant-profile", roles: ["tenant_profile.manage"], scope: "tenant" },
    { path: "/check-in", roles: permissions.checkIn, scope: "tenant" },
    { path: "/admins", roles: ["admin.view"], scope: "any" }
  ];
  const match = candidates.find((item) => canAccess(item.roles) && canAccessScope(item.scope as any) && !mallRouteDisabled(item.path) && adminFeatureRouteEnabled(item.path));
  if (match) return match.path;
  return "/login";
}

function mallRouteDisabled(path: string) {
  return path.startsWith("/mall-") && !isPlatformAdmin() && !currentTenantSettings().mallEnabled;
}

function adminFeatureRouteEnabled(path: string) {
  return isAdminFeaturePathEnabled(path, isPlatformScopedAdmin());
}

router.beforeEach((to) => {
  void adminSession.version;
  const publicRoute = to.path === "/login" || to.path === "/invite";
  if (!publicRoute && !localStorage.getItem("admin_token")) return "/login";
  if (!publicRoute && to.meta.roles && !canAccess(to.meta.roles as string[])) return fallbackPath();
  if (!publicRoute && !canAccessScope(to.meta.scope as any)) return fallbackPath();
  if (!publicRoute && mallRouteDisabled(to.path)) return fallbackPath();
  if (!publicRoute && !adminFeatureRouteEnabled(to.path)) return fallbackPath();
});

