import { createRouter, createWebHistory } from "vue-router";
import { adminSession, canAccess, canAccessScope, isPlatformAdmin, permissions } from "./permissions";

const Login = () => import("./views/Login.vue");
const Layout = () => import("./views/Layout.vue");
const Dashboard = () => import("./views/Dashboard.vue");
const Analytics = () => import("./views/Analytics.vue");
const Activities = () => import("./views/Activities.vue");
const Funnels = () => import("./views/Funnels.vue");
const Recaps = () => import("./views/Recaps.vue");
const Announcements = () => import("./views/Announcements.vue");
const HomepageBuilder = () => import("./views/HomepageBuilder.vue");
const Notifications = () => import("./views/Notifications.vue");
const Reviews = () => import("./views/Reviews.vue");
const Registrations = () => import("./views/Registrations.vue");
const Orders = () => import("./views/Orders.vue");
const TicketTypes = () => import("./views/TicketTypes.vue");
const Coupons = () => import("./views/Coupons.vue");
const Agents = () => import("./views/Agents.vue");
const AgentSettlements = () => import("./views/AgentSettlements.vue");
const Ambassador = () => import("./views/Ambassador.vue");
const CheckIn = () => import("./views/CheckIn.vue");
const Waitlists = () => import("./views/Waitlists.vue");
const UserTags = () => import("./views/UserTags.vue");
const Members = () => import("./views/Members.vue");
const Categories = () => import("./views/Categories.vue");
const Admins = () => import("./views/Admins.vue");
const Finance = () => import("./views/Finance.vue");
const Charity = () => import("./views/Charity.vue");
const SystemSettings = () => import("./views/SystemSettings.vue");
const OperationLogs = () => import("./views/OperationLogs.vue");
const AdminLoginLogs = () => import("./views/AdminLoginLogs.vue");
const H5CodeLogs = () => import("./views/H5CodeLogs.vue");
const Courses = () => import("./views/Courses.vue");
const Community = () => import("./views/Community.vue");
const MallProducts = () => import("./views/MallProducts.vue");
const MallOrders = () => import("./views/MallOrders.vue");
const ConfigCheck = () => import("./views/ConfigCheck.vue");
const MiniprogramRelease = () => import("./views/MiniprogramRelease.vue");
const OperationGuide = () => import("./views/OperationGuide.vue");
const OperationFlow = () => import("./views/OperationFlow.vue");
const OpsRoutine = () => import("./views/OpsRoutine.vue");
const Tenants = () => import("./views/Tenants.vue");
const TenantRegions = () => import("./views/TenantRegions.vue");
const TenantProfile = () => import("./views/TenantProfile.vue");

export const router = createRouter({
  history: createWebHistory("/admin/"),
  routes: [
    { path: "/login", component: Login },
    {
      path: "/",
      component: Layout,
      children: [
        { path: "", redirect: "/dashboard" },
        { path: "dashboard", component: Dashboard, meta: { roles: permissions.overview, scope: "tenantOrPlatformAdmin" } },
        { path: "analytics", component: Analytics, meta: { roles: permissions.analytics, scope: "tenantOrPlatformAdmin" } },
        { path: "courses", component: Courses, meta: { roles: ["course.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "community", component: Community, meta: { roles: ["community.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-products", component: MallProducts, meta: { roles: ["mall.product.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-inventory", component: MallProducts, meta: { roles: ["mall.product.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-coupons", component: MallProducts, meta: { roles: ["mall.product.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-orders", component: MallOrders, meta: { roles: ["mall.order.view", "mall.finance.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-refunds", component: MallOrders, meta: { roles: ["mall.refund.manage", "mall.finance.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-logistics", component: MallOrders, meta: { roles: ["mall.logistics.manage", "mall.order.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-marketing", component: MallOrders, meta: { roles: ["mall.product.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "mall-finance", component: MallOrders, meta: { roles: ["mall.finance.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "tenants", component: Tenants, meta: { roles: ["tenant.manage"], scope: "platform" } },
        { path: "tenant-regions", component: TenantRegions, meta: { roles: ["tenant_region.manage"], scope: "platform" } },
        { path: "ambassador", component: Ambassador, meta: { roles: ["ambassador.manage"], scope: "platform" } },
        { path: "activities", component: Activities, meta: { roles: permissions.activityView, scope: "tenantOrPlatformAdmin" } },
        { path: "funnels", component: Funnels, meta: { roles: ["activity.view"], scope: "tenant" } },
        { path: "recaps", component: Recaps, meta: { roles: ["activity.view"], scope: "tenant" } },
        { path: "announcements", component: Announcements, meta: { roles: ["announcement.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "homepage-builder", component: HomepageBuilder, meta: { roles: ["homepage.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "notifications", component: Notifications, meta: { roles: ["notification.manage"], scope: "tenant" } },
        { path: "reviews", component: Reviews, meta: { roles: ["review.manage"], scope: "tenant" } },
        { path: "registrations", component: Registrations, meta: { roles: permissions.registrationView, scope: "tenantOrPlatformAdmin" } },
        { path: "waitlists", component: Waitlists, meta: { roles: ["waitlist.manage"], scope: "tenant" } },
        { path: "tags", component: UserTags, meta: { roles: ["tag.manage"], scope: "tenant" } },
        { path: "members", component: Members, meta: { roles: ["member.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "ticket-types", component: TicketTypes, meta: { roles: ["ticket.manage"], scope: "tenant" } },
        { path: "coupons", component: Coupons, meta: { roles: ["coupon.manage"], scope: "tenant" } },
        { path: "agents", component: Agents, meta: { roles: permissions.paymentAccountView, scope: "tenantOrPlatformAdmin" } },
        { path: "agent-settlements", component: AgentSettlements, meta: { roles: ["agent_settlement.view"], scope: "tenant" } },
        { path: "orders", component: Orders, meta: { roles: ["order.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "finance", component: Finance, meta: { roles: ["finance.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "charity", component: Charity, meta: { roles: ["charity.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "check-in", component: CheckIn, meta: { roles: permissions.checkIn, scope: "tenant" } },
        { path: "system-settings", component: SystemSettings, meta: { roles: ["system.manage", "operation_settings.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "tenant-profile", component: TenantProfile, meta: { roles: ["tenant_profile.manage"], scope: "tenant" } },
        { path: "operation-settings", redirect: "/system-settings" },
        { path: "operation-logs", component: OperationLogs, meta: { roles: ["logs.view"], scope: "any" } },
        { path: "admin-login-logs", component: AdminLoginLogs, meta: { roles: ["logs.view"], scope: "platform" } },
        { path: "h5-code-logs", component: H5CodeLogs, meta: { roles: ["logs.view"], scope: "platform" } },
        { path: "config-check", component: ConfigCheck, meta: { roles: ["system.manage"], scope: "platform" } },
        { path: "miniprogram-release", component: MiniprogramRelease, meta: { roles: ["miniprogram_release.manage"], scope: "platform" } },
        { path: "operation-guide", component: OperationGuide, meta: { roles: ["system.manage"], scope: "platform" } },
        { path: "operation-flow", component: OperationFlow, meta: { roles: ["dashboard.view"], scope: "tenantOrPlatformAdmin" } },
        { path: "ops-routine", component: OpsRoutine, meta: { roles: ["system.manage"], scope: "platform" } },
        { path: "categories", component: Categories, meta: { roles: ["category.manage"], scope: "tenantOrPlatformAdmin" } },
        { path: "admins", component: Admins, meta: { roles: ["admin.manage"], scope: "any" } },
        { path: ":pathMatch(.*)*", redirect: () => fallbackPath() }
      ]
    }
  ]
});

function fallbackPath() {
  const candidates = [
    { path: "/dashboard", roles: permissions.overview, scope: "tenantOrPlatformAdmin" },
    { path: "/tenants", roles: ["tenant.manage"], scope: "platform" },
    { path: "/activities", roles: ["activity.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/registrations", roles: ["registration.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/orders", roles: ["order.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/finance", roles: ["finance.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-orders", roles: ["mall.order.view", "mall.finance.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/mall-products", roles: ["mall.product.manage"], scope: "tenantOrPlatformAdmin" },
    { path: "/members", roles: ["member.view"], scope: "tenantOrPlatformAdmin" },
    { path: "/check-in", roles: permissions.checkIn, scope: "tenant" },
    { path: "/admins", roles: ["admin.manage"], scope: "any" }
  ];
  const match = candidates.find((item) => canAccess(item.roles) && canAccessScope(item.scope as any));
  if (match) return match.path;
  return "/login";
}

router.beforeEach((to) => {
  void adminSession.version;
  if (to.path !== "/login" && !localStorage.getItem("admin_token")) return "/login";
  if (to.path !== "/login" && to.meta.roles && !canAccess(to.meta.roles as string[])) return fallbackPath();
  if (to.path !== "/login" && !canAccessScope(to.meta.scope as any)) return fallbackPath();
});

