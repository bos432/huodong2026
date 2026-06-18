import fs from "node:fs";

const failures = [];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function includes(source, needle, label) {
  check(source.includes(needle), `${label} must include ${needle}.`);
}

function includesAll(source, needles, label) {
  for (const needle of needles) includes(source, needle, label);
}

const files = {
  adminPackage: read("apps/admin/package.json"),
  tenantScope: read("apps/api/src/shared/tenant-scope.ts"),
  tenantEntity: read("apps/api/src/entities/tenant.entity.ts"),
  categoryEntity: read("apps/api/src/entities/activity-category.entity.ts"),
  userTagEntity: read("apps/api/src/entities/user-tag.entity.ts"),
  homepageSectionEntity: read("apps/api/src/entities/homepage-section.entity.ts"),
  activityApprovalLogEntity: read("apps/api/src/entities/activity-approval-log.entity.ts"),
  notificationTemplateEntity: read("apps/api/src/entities/notification-template.entity.ts"),
  adminRoles: read("apps/api/src/modules/admin/admin-roles.ts"),
  adminService: read("apps/api/src/modules/admin/admin.service.ts"),
  adminController: read("apps/api/src/modules/admin/admin.controller.ts"),
  jwtStrategy: read("apps/api/src/modules/admin/jwt.strategy.ts"),
  publicController: read("apps/api/src/modules/public/public.controller.ts"),
  publicService: read("apps/api/src/modules/public/public.service.ts"),
  v1AdminController: read("apps/api/src/modules/v1/v1-admin.controller.ts"),
  v1PublicController: read("apps/api/src/modules/v1/v1-public.controller.ts"),
  v1Service: read("apps/api/src/modules/v1/v1.service.ts"),
  sharedIndex: read("packages/shared/src/index.ts"),
  permissions: read("apps/admin/src/permissions.ts"),
  router: read("apps/admin/src/router.ts"),
  layout: read("apps/admin/src/views/Layout.vue"),
  tenantsView: read("apps/admin/src/views/Tenants.vue"),
  adminsView: read("apps/admin/src/views/Admins.vue"),
  activitiesView: read("apps/admin/src/views/Activities.vue"),
  ordersView: read("apps/admin/src/views/Orders.vue"),
  registrationsView: read("apps/admin/src/views/Registrations.vue"),
  financeView: read("apps/admin/src/views/Finance.vue"),
  dashboardView: read("apps/admin/src/views/Dashboard.vue"),
  recapsView: read("apps/admin/src/views/Recaps.vue"),
  announcementsView: read("apps/admin/src/views/Announcements.vue"),
  homepageBuilderView: read("apps/admin/src/views/HomepageBuilder.vue"),
  notificationsView: read("apps/admin/src/views/Notifications.vue"),
  reviewsView: read("apps/admin/src/views/Reviews.vue"),
  agentsView: read("apps/admin/src/views/Agents.vue"),
  operationLogsView: read("apps/admin/src/views/OperationLogs.vue"),
  adminLoginLogsView: read("apps/admin/src/views/AdminLoginLogs.vue"),
  tenantProfileView: read("apps/admin/src/views/TenantProfile.vue"),
  systemSettingsView: read("apps/admin/src/views/SystemSettings.vue"),
  loginView: read("apps/admin/src/views/Login.vue"),
  h5Preview: read("apps/admin/src/h5-preview.ts"),
  h5QrDialog: read("apps/admin/src/components/H5QrDialog.vue"),
  activityPosterDialog: read("apps/admin/src/components/ActivityPosterDialog.vue"),
  checkInView: read("apps/admin/src/views/CheckIn.vue"),
  mobileApi: read("apps/mobile/src/api.ts"),
  mobileTenantSwitcher: read("apps/mobile/src/components/TenantSwitcher.vue"),
  mobileTenantContextBadge: read("apps/mobile/src/components/TenantContextBadge.vue"),
  mobileDecoration: read("apps/mobile/src/decoration.ts"),
  mobileIndex: read("apps/mobile/src/pages/index/index.vue"),
  mobileActivityList: read("apps/mobile/src/pages/activity/list.vue"),
  mobileActivityDetail: read("apps/mobile/src/pages/activity/detail.vue"),
  mobileRegister: read("apps/mobile/src/pages/activity/register.vue"),
  mobileAnnouncements: read("apps/mobile/src/pages/announcement/list.vue"),
  mobileService: read("apps/mobile/src/pages/service/index.vue"),
  mobilePartner: read("apps/mobile/src/pages/partner/index.vue"),
  mobileLogin: read("apps/mobile/src/pages/user/login.vue"),
  mobileRegistration: read("apps/mobile/src/pages/user/registration.vue"),
  mobileReview: read("apps/mobile/src/pages/user/review.vue"),
  progress: read("docs/project-progress.md")
};

includesAll(files.tenantScope, [
  "isTenantScopedActor",
  "tenantRelationForActor",
  "applyTenantScopeToQuery",
  "assertTenantAccessForActor",
  "normalizeTenantCode",
  "normalizeTenantHost"
], "tenant scope helper");

includesAll(files.tenantEntity, [
  '@Entity("tenants")',
  "code!: string",
  "settings!: Record<string, unknown> | null",
  "enabled!: boolean"
], "tenant entity");

for (const [label, source] of [
  ["activity category entity", files.categoryEntity],
  ["user tag entity", files.userTagEntity],
  ["homepage section entity", files.homepageSectionEntity],
  ["activity approval log entity", files.activityApprovalLogEntity],
  ["notification template entity", files.notificationTemplateEntity]
]) {
  includesAll(source, ['from "./tenant.entity"', "tenant!: Tenant | null"], label);
}

includesAll(files.adminRoles, [
  "SuperAdmin",
  "Operator",
  "Finance",
  "CheckInStaff",
  "normalizeAdminRole"
], "admin roles");

includesAll(files.adminService, [
  "activityPublishReviewRequired",
  "registrationReviewEnabled",
  "paymentAccountEditable",
  "mallEnabled",
  'failureReason: "tenant_disabled"',
  "assertPlatformAdmin",
  "assertTenantAccess",
  "applyTenantScope",
  "tenantRelation",
  "TENANT_STAFF_ROLES",
  "resolveNewAdminRole",
  "currentTenantForAdmin",
  "assertPaymentAccountEditable",
  "assertTenantContentWrite"
], "admin service tenant permission foundation");

includesAll(files.adminService, [
  "listTenants(admin?: AdminContext)",
  "adminCount",
  "enabledAdminCount",
  "paymentAccountCount",
  "enabledPaymentAccountCount",
  "pendingActivityCount",
  "pendingRegistrationCount",
  "pendingRefundCount",
  "callbackRiskCount"
], "admin service tenant overview");

includesAll(files.adminService, [
  "listActivities(query: ActivityQueryDto",
  "query.tenantId",
  "listRegistrations(query: RegistrationQueryDto",
  "listOrders(query: OrderQueryDto",
  "applyFinanceTenantFilter",
  "financeTenantId",
  "listOperationLogs(admin?: AdminContext, tenantId?: number)",
  "listAdminLoginLogs(query: { username?: string; status?: string; tenantId?: number }"
], "admin service platform tenant filters");

includesAll(files.adminService, [
  "submitActivityForApproval",
  "approveActivity",
  "rejectActivity",
  "recordActivityApproval",
  "listActivityApprovalLogs",
  "ActivityStatus.PendingApproval"
], "admin service activity approval");

includesAll(files.adminService, [
  "listAnnouncements(admin?: AdminContext, tenantId?: number)",
  "createAnnouncement(dto: AnnouncementDto",
  "updateAnnouncement(id: number",
  "listHomepageSections(admin?: AdminContext, tenantId?: number)",
  "createHomepageSection(dto: HomepageSectionDto, admin?: AdminContext, tenantId?: number)",
  "updateHomepageSection(id: number, dto: HomepageSectionDto, admin?: AdminContext, tenantId?: number)",
  "deleteHomepageSection(id: number, admin?: AdminContext, tenantId?: number)",
  "reorderHomepageSections(items: HomepageReorderItemDto[], admin?: AdminContext, tenantId?: number)",
  "resetHomepageSections(admin?: AdminContext, tenantId?: number)",
  "resolveHomepageTenant",
  "assertHomepageSectionScope"
], "admin service operation content and homepage tenant scope");

includesAll(files.adminService, [
  "resolveAgentTenant",
  "Platform admin must select a tenant before creating merchant payment agents",
  "saveAgent(dto: AgentDto",
  "saveAgentPaymentAccount",
  "listAgentPaymentAccounts",
  "buildAgentSettlementTransferCapability"
], "admin service merchant payment account scope");

includesAll(files.adminService, [
  "listCategories(includeDisabled = false, admin?: AdminContext)",
  "listTicketTypes(activityId?: number, admin?: AdminContext)",
  "listCoupons(admin?: AdminContext)",
  "listWaitlists(activityId?: number",
  "listUserTags(query: { userId?: number; activityId?: number } = {}, admin?: AdminContext)",
  "createActivityUserTags(input: BulkActivityTagDto, admin?: AdminContext)",
  "userIdsForActivity(activityId: number, admin?: AdminContext)",
  "applyExplicitTenantFilter",
  "listMembers(query: string | { keyword?: string; activityId?: number } = {}, admin?: AdminContext)",
  "assertUserTenantAccess"
], "admin service merchant data scope");

includesAll(files.jwtStrategy, [
  "@InjectRepository(Tenant)",
  "enabled: true",
  "Current tenant not found or disabled"
], "jwt strategy disabled tenant guard");

includesAll(files.adminController, [
  '@Get("tenants")',
  '@Post("tenants")',
  '@Patch("tenants/:id")',
  '@Post("tenants/:id/permissions")',
  '@Get("tenant/profile")',
  '@Patch("tenant/profile")',
  '@Get("dashboard")',
  '@Get("announcements")',
  '@Get("homepage/sections")',
  '@Query("tenantId") tenantId',
  '@Post("homepage/sections")',
  '@Patch("homepage/sections/:id")',
  '@Delete("homepage/sections/:id")',
  '@Put("homepage/sections/reorder")',
  '@Post("homepage/sections/reset-default")',
  '@Post("activities/:id/submit-approval")',
  '@Post("activities/:id/approve")',
  '@Post("activities/:id/reject")',
  '@Get("activities/:id/approval-logs")'
], "admin controller SaaS endpoints");

includesAll(files.publicController, [
  "tenantContext(req, tenantCode)",
  '@Get("tenants")',
  "publicTenants()",
  "categoriesList(this.tenantContext(req, tenantCode))",
  "homepage(this.tenantContext(req, tenantCode))",
  "operationSetting(this.tenantContext(req, tenantCode))",
  "activitiesList({",
  "register(id, dto, this.tenantContext(req, tenantCode))"
], "public controller tenant context");

includesAll(files.publicService, [
  "PublicTenantContext",
  "resolveTenantContext",
  "tenantCode",
  "tenant.enabled",
  "homepage(context?: PublicTenantContext)",
  "publicTenants()",
  "tenant.code <> :platformCode",
  "tenant.code NOT LIKE :demoCode",
  "tenant.region IS NOT NULL OR tenant.contactName IS NOT NULL OR tenant.contactPhone IS NOT NULL",
  "publicHomepageTenant",
  "tenant: this.publicHomepageTenant(tenant)",
  "homepageAnnouncements",
  "activitiesList(options:",
  "operationSetting(context?: PublicTenantContext)",
  "assertOrderTenantEnabled",
  "activity.tenant?.id"
], "public service tenant scope");

includesAll(files.v1AdminController, [
  "admin",
  "listNotificationTemplates",
  "saveNotificationTemplate",
  "listNotifications",
  "sendNotification"
], "v1 admin notification tenant boundary");

includesAll(files.v1PublicController, [
  "tenantContext(req, tenantCode)",
  "publicAnnouncements(this.tenantContext(req, tenantCode))",
  "createReview",
  "reviews"
], "v1 public tenant context");

includesAll(files.v1Service, [
  "tenant",
  "publicAnnouncements(context?: PublicTenantContext)",
  "activityReviews",
  "createReview",
  "assertPublicActivityTenantAccess",
  "assertPublicRegistrationTenantAccess",
  "dashboard",
  "sendNotification"
], "v1 service tenant scope");

includesAll(files.permissions, [
  "AdminRole",
  "super_admin",
  "operator",
  "finance",
  "checkin",
  "canAccessScope",
  "isPlatformAdmin",
  "currentTenantCode",
  "admin_tenant_code"
], "admin permissions");

includesAll(files.h5Preview, [
  "VITE_H5_ORIGIN",
  "http://localhost:5173",
  "h5PreviewUrl",
  "h5RoutePreviewUrl",
  "activityH5PreviewUrl",
  "tenantCode",
  "openH5Preview",
  "copyToClipboard",
  "navigator.clipboard"
], "admin H5 preview helper");

includesAll(files.adminPackage, [
  "\"qrcode\"",
  "\"@types/qrcode\""
], "admin package H5 QR dependencies");

includesAll(files.h5QrDialog, [
  "QRCode.toDataURL",
  "errorCorrectionLevel",
  "downloadQrCode",
  "copyUrl",
  "qrDataUrl",
  "H5 预览二维码"
], "admin H5 QR dialog");

includesAll(files.activityPosterDialog, [
  "QRCode.toDataURL",
  "canvas.toDataURL",
  "downloadPoster",
  "copyUrl",
  "drawWrappedText",
  "活动推广海报"
], "admin activity poster dialog");

includesAll(files.router, [
  "permissions",
  "scope",
  "tenants",
  "tenant-profile",
  "homepage-builder",
  "admin-login-logs"
], "admin router SaaS routes");

includesAll(files.layout, [
  "menuGroups",
  "scope: \"platform\"",
  "scope: \"tenant\"",
  "/tenants",
  "/homepage-builder",
  "/tenant-profile",
  "/admin-login-logs",
  "canAccessScope",
  "admin_tenant_settings",
  "currentTenantCode",
  "currentH5PreviewUrl",
  "currentH5PreviewLabel",
  "openCurrentH5Preview",
  "copyCurrentH5PreviewUrl",
  "openCurrentH5QrDialog",
  "h5QrDialogVisible",
  "H5QrDialog",
  "currentH5PreviewUrl",
  "openH5Preview",
  "copyToClipboard"
], "admin layout role and scope menus");

includesAll(files.tenantsView, [
  "TenantRow",
  "activityPublishReviewRequired",
  "registrationReviewEnabled",
  "paymentAccountEditable",
  "mallEnabled",
  "goCreateTenantAdmin",
  "goTenantAdminAccounts",
  "goConfigurePayment",
  "goTenantPendingActivities",
  "goTenantPendingRegistrations",
  "goTenantFinanceRisk",
  "goTenantNextAction",
  "tenantReadinessStatus",
  "tenantAttentionStatus",
  "tenantAdminStatus",
  "paymentAccountStatus",
  "tenantFilterStorageKey",
  "exportTenants",
  "permissionMode",
  "batchUpdate",
  "h5PreviewUrl",
  "openH5Preview",
  "copyToClipboard",
  "previewTenantH5",
  "copyTenantH5Url",
  "showTenantH5Qr",
  "tenantQrUrl",
  "tenantQrScopeName",
  "H5QrDialog"
], "tenants view management workflow");

includesAll(files.adminsView, [
  "tenantStaffRoles",
  "visibleRoleOptions",
  "defaultCreateRole",
  "accountScopePreview",
  "accountScopeHint",
  "applyTenantFromRoute",
  "form.tenantId = tenantId",
  "filters.tenantId = tenantId"
], "admins view merchant account workflow");

for (const [label, source] of [
  ["activities view", files.activitiesView],
  ["orders view", files.ordersView],
  ["registrations view", files.registrationsView],
  ["announcements view", files.announcementsView],
  ["agents view", files.agentsView],
  ["operation logs view", files.operationLogsView]
]) {
  includesAll(source, ["isPlatformAdmin", "tenantDisplayName", "tenantId"], `${label} platform tenant visibility`);
}

includesAll(files.financeView, [
  "isPlatformAdmin",
  "tenantId",
  "filters.tenantId",
  "/admin/tenants",
  "/admin/agents"
], "finance view platform tenant visibility");

includesAll(files.adminLoginLogsView, [
  "tenantDisplayName",
  "tenantMap",
  "query.tenantId",
  "/admin/tenants",
  "/admin/auth/login-logs"
], "admin login logs view platform tenant visibility");

includesAll(files.activitiesView, [
  "submitApproval",
  "approveActivity",
  "rejectActivity",
  "approvalLogs",
  "currentTenantSettings",
  "registrationReviewEnabled",
  "requireReview: registrationReviewEnabled.value ? form.requireReview : false"
], "activities view approval and registration review permissions");

includesAll(files.activitiesView, [
  "activityH5PreviewUrl",
  "currentTenantCode",
  "activityTenantCode",
  "activityPreviewUrl",
  "openActivityH5",
  "copyActivityH5Url",
  "showActivityH5Qr",
  "showActivityPoster",
  "ActivityPosterDialog",
  "H5QrDialog"
], "activities view H5 activity share workflow");

includesAll(files.ordersView, [
  'params.set("tenantId", String(filters.tenantId))',
  "tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined"
], "orders view platform tenant filters");

includesAll(files.ordersView, [
  "remarkDialog",
  "openRemark",
  "saveRemark"
], "orders view remark editing workflow");

includesAll(files.ordersView, [
  "routeOrderStatus",
  "routeActivityId",
  "routeTenantId",
  "route.query.status",
  "route.query.activityId",
  "route.query.tenantId",
  "OrderStatus.PendingPayment",
  "已按复盘活动筛选订单",
  "clearActivityFilter"
], "orders view status route filter");

includesAll(files.registrationsView, [
  "routeActivityId",
  "route.query.activityId",
  "query.activityId = nextActivityId",
  "已按复盘活动筛选报名",
  "clearActivityFilter"
], "registrations view activity route filter");

includesAll(files.dashboardView, [
  "isPlatformAdmin",
  "currentTenantSettings",
  "operationCards",
  "healthCards",
  "quickActions",
  "openTodo",
  "OrderStatus.PendingPayment",
  "RegistrationStatus.PendingReview",
  "permissionCards",
  "pendingActivityCount",
  "pendingOrderCount"
], "dashboard view operation cockpit and tenant filters");

includesAll(files.adminService, [
  "operations: {",
  "netAmount",
  "monthNetAmount",
  "checkInRate",
  "registrationConversionRate",
  "dashboardActivityRow",
  "avgOrderAmount",
  "normalizedQuery.activityId",
  "dashboardActivityAdvice",
  "operationAdvice"
], "admin service dashboard operation metrics");

includesAll(files.dashboardView, [
  "row.netAmount",
  "row.paidAmount",
  "row.refundAmount",
  "row.avgOrderAmount",
  "row.registrationConversionRate",
  "row.operationAdvice",
  "adviceTagType",
  "openActivityRegistrations",
  "openActivityOrders",
  "openActivityRecap"
], "dashboard view activity performance finance metrics");

includesAll(files.activitiesView, [
  "routeActivityId",
  "focusRouteActivity",
  "openActivityEditor",
  "已从复盘行动进入活动编辑"
], "activities view route activity focus from recap actions");

includesAll(files.recapsView, [
  "routeActivityId",
  "route.query.activityId",
  "actionAdvice",
  "actionChecklist",
  "openAction",
  "下一步行动",
  "/notifications",
  "/reviews",
  "先做获客",
  "沉淀复制"
], "recaps view route activity and action advice");

includesAll(files.v1AdminController, [
  '@Query("activityId") activityId',
  "adminReviews(status, activityId ? Number(activityId) : undefined, admin)"
], "v1 admin reviews activity route filter");

includesAll(files.v1Service, [
  "async adminReviews(status?: string, activityId?: number",
  "activity.id = :activityId"
], "v1 service review activity filter");

includesAll(files.reviewsView, [
  "routeActivityId",
  "route.query.activityId",
  "activityId.value",
  "已按复盘活动筛选评价",
  "clearActivityFilter"
], "reviews view route activity filter");

includesAll(files.notificationsView, [
  "routeActivityId",
  "route.query.activityId",
  "applyRouteActivity",
  "复盘行动建议",
  "sendForm.activityId = activityId"
], "notifications view route activity prefill");

includesAll(files.announcementsView, [
  'params.set("tenantId", String(filters.tenantId))',
  "tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined"
], "announcements view tenant scope filters");

includesAll(files.homepageBuilderView, [
  'params.set("tenantId", String(filters.tenantId))',
  "tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined"
], "homepage builder view tenant scope filters");

includesAll(files.homepageBuilderView, [
  "drawer-save-bar",
  "hasUnsavedChanges",
  "未保存修改",
  ':before-close="closeDrawer"',
  "保存模块"
], "homepage builder save and unsaved-change UX");

includesAll(files.notificationsView, [
  'params.set("tenantId", String(filters.tenantId))',
  "tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined"
], "notifications view tenant scope filters");

includesAll(files.agentsView, [
  'params.set("tenantId", String(filters.tenantId))',
  "if (tenantId) params.set(&#96;tenantId&#96;, String(tenantId))",
], "agents view tenant filters");

includesAll(files.operationLogsView, [
  'params.set("tenantId", String(filters.tenantId))',
  "tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined"
], "operation logs view tenant scope filters");

includesAll(files.adminLoginLogsView, [
  'params.set("tenantId", String(filters.tenantId))',
  "tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined"
], "admin login logs view tenant scope filters");

includesAll(files.tenantProfileView, [
  'computed: {',
  "servicesEnabled",
  "agentSettlementConfig",
], "tenant profile view computed properties");

includesAll(files.permissions, [
  "isPlatformAdmin",
  "currentTenantInfo",
  "isTenantAdmin",
  "isTenantOperator",
  "isTenantFinance",
  "isTenantCheckIn",
], "permissions module role checks");

includesAll(files.router, [
  "platformAdminGuard",
  "tenantAdminGuard",
  "tenantOperatorGuard",
  "tenantFinanceGuard",
  "tenantCheckInGuard",
], "router role guards");

includesAll(files.adminService, [
  "@InjectRepository(TenantPaymentAccount)",
  "order.paymentAccount",
  "paymentAccount.tenantId",
  "if (order.tenantId !== paymentAccount.tenantId)",
], "admin service tenant payment verify");

includesAll(files.adminService, [
  "updateOrderRemark(orderId: number, remark: string, currentAdmin: AdminContext)",
  "order.remark = remark",
  "this.operationLogService.log(tenantId, adminId,"
], "admin service order remark update");

includesAll(files.adminController, [
  '@Patch("orders/:id/remark")',
  "updateOrderRemark",
  "OrderRemarkDto",
], "admin controller order remark endpoint");

includesAll(files.v1AdminController, [
  "tenantId: number",
  "agentCode: string",
  "verifyAgentBelongsToTenant",
], "v1 admin controller tenant scope");

includesAll(files.v1PublicController, [
  "findByCode",
  "findByAgentId",
  "agentId: number",
], "v1 public controller agent query");

includesAll(files.sharedIndex, [
  "checkActivityContentCompliance",
  "BLOCKING_WORDS",
  "WARNING_WORDS",
], "shared compliance index");

console.log("OK   preflight-saas-tenant-guard.mjs covers all tenant isolation and role checks.");
