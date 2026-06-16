import { createRouter, createWebHistory } from "vue-router";
import { AdminRole, canAccess, canAccessScope, isPlatformAdmin, permissions } from "./permissions";

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
const ConfigCheck = () => import("./views/ConfigCheck.vue");
const OpsRoutine = () => import("./views/OpsRoutine.vue");
const Tenants = () => import("./views/Tenants.vue");
const TenantProfile = () => import("./views/TenantProfile.vue");

export const router = createRouter({
  history: createWebHistory("/admin/"),
  routes: [
    { path: "/login", component: Login },
    {
      path: "/",
      component: Layout,
      children: [
        { path: "", redirect: () => (isPlatformAdmin() ? "/tenants" : "/dashboard") },
        { path: "dashboard", component: Dashboard, meta: { roles: permissions.overview, scope: "tenantOrPlatformAdmin" } },
        { path: "analytics", component: Analytics, meta: { roles: permissions.overview, scope: "tenantOrPlatformAdmin" } },
        { path: "tenants", component: Tenants, meta: { roles: permissions.superAdmin, scope: "platform" } },
        { path: "activities", component: Activities, meta: { roles: permissions.activityView, scope: "tenantOrPlatformAdmin" } },
        { path: "funnels", component: Funnels, meta: { roles: permissions.operation, scope: "tenant" } },
        { path: "recaps", component: Recaps, meta: { roles: permissions.operation, scope: "tenant" } },
        { path: "announcements", component: Announcements, meta: { roles: permissions.operation, scope: "tenantOrPlatformAdmin" } },
        { path: "homepage-builder", component: HomepageBuilder, meta: { roles: permissions.operation, scope: "tenantOrPlatformAdmin" } },
        { path: "notifications", component: Notifications, meta: { roles: permissions.operation, scope: "tenant" } },
        { path: "reviews", component: Reviews, meta: { roles: permissions.operation, scope: "tenant" } },
        { path: "registrations", component: Registrations, meta: { roles: permissions.registrationView, scope: "tenantOrPlatformAdmin" } },
        { path: "waitlists", component: Waitlists, meta: { roles: permissions.operation, scope: "tenant" } },
        { path: "tags", component: UserTags, meta: { roles: permissions.operation, scope: "tenant" } },
        { path: "members", component: Members, meta: { roles: permissions.operation, scope: "tenantOrPlatformAdmin" } },
        { path: "ticket-types", component: TicketTypes, meta: { roles: permissions.operation, scope: "tenant" } },
        { path: "coupons", component: Coupons, meta: { roles: permissions.operation, scope: "tenant" } },
        { path: "agents", component: Agents, meta: { roles: permissions.paymentAccountView, scope: "tenantOrPlatformAdmin" } },
        { path: "agent-settlements", component: AgentSettlements, meta: { roles: permissions.finance, scope: "tenant" } },
        { path: "orders", component: Orders, meta: { roles: permissions.finance, scope: "tenantOrPlatformAdmin" } },
        { path: "finance", component: Finance, meta: { roles: permissions.finance, scope: "tenantOrPlatformAdmin" } },
        { path: "charity", component: Charity, meta: { roles: permissions.overview, scope: "tenantOrPlatformAdmin" } },
        { path: "check-in", component: CheckIn, meta: { roles: permissions.checkIn, scope: "tenant" } },
        { path: "system-settings", component: SystemSettings, meta: { roles: permissions.superAdmin, scope: "tenantOrPlatformAdmin" } },
        { path: "tenant-profile", component: TenantProfile, meta: { roles: permissions.superAdmin, scope: "tenant" } },
        { path: "operation-settings", redirect: "/system-settings" },
        { path: "operation-logs", component: OperationLogs, meta: { roles: permissions.superAdmin, scope: "any" } },
        { path: "admin-login-logs", component: AdminLoginLogs, meta: { roles: permissions.superAdmin, scope: "platform" } },
        { path: "h5-code-logs", component: H5CodeLogs, meta: { roles: permissions.superAdmin, scope: "platform" } },
        { path: "config-check", component: ConfigCheck, meta: { roles: permissions.superAdmin, scope: "platform" } },
        { path: "ops-routine", component: OpsRoutine, meta: { roles: permissions.superAdmin, scope: "platform" } },
        { path: "categories", component: Categories, meta: { roles: permissions.operation, scope: "tenant" } },
        { path: "admins", component: Admins, meta: { roles: permissions.superAdmin, scope: "any" } },
        { path: ":pathMatch(.*)*", redirect: () => fallbackPath() }
      ]
    }
  ]
});

function fallbackPath() {
  if (isPlatformAdmin()) return "/tenants";
  if (canAccess(permissions.overview)) return "/dashboard";
  if (canAccess(permissions.checkIn)) return "/check-in";
  return "/login";
}

router.beforeEach((to) => {
  if (to.path !== "/login" && !localStorage.getItem("admin_token")) return "/login";
  if (to.path !== "/login" && to.meta.roles && !canAccess(to.meta.roles as AdminRole[])) return fallbackPath();
  if (to.path !== "/login" && !canAccessScope(to.meta.scope as any)) return fallbackPath();
});
