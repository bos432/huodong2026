import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function mobilePagePaths(source: string) {
  const pagesJson = JSON.parse(source) as {
    pages: Array<{ path: string }>;
    subPackages?: Array<{ root: string; pages: Array<{ path: string }> }>;
  };
  return [
    ...pagesJson.pages.map((page) => page.path),
    ...(pagesJson.subPackages || []).flatMap((subpackage) => subpackage.pages.map((page) => `${subpackage.root}/${page.path}`))
  ];
}

describe("admin and mobile menu integrity", () => {
  it("keeps the mobile refund workbench complete and permission guarded", () => {
    const pages = readRepoFile("apps/mobile/src/pages.json");
    const navigation = readRepoFile("apps/mobile/src/components/AdminBottomNav.vue");
    const refundPage = readRepoFile("apps/mobile/src/pages/admin/refunds.vue");

    expect(mobilePagePaths(pages)).toContain("pages/admin/refunds");
    expect(navigation).toContain('permission: "canViewRefunds"');
    expect(refundPage).toContain('const canManageRefunds = computed(() => Boolean(bootstrap.value?.permissions?.canManageRefunds))');
    expect(refundPage).toContain('row.status === "pending"');
    expect(refundPage).toContain('row.status === "failed"');
    expect(refundPage).toContain('/admin/refunds/${row.id}/retry');
    expect(refundPage).toContain('/admin/finance/refunds/provider-scan');
    expect(refundPage).toContain('currentSession.token !== session.token || currentSession.tenantId !== session.tenantId');
  });

  it("keeps mobile analytics on the shared analytics permission and endpoints", () => {
    const service = readRepoFile("apps/api/src/modules/admin/admin.service.ts");
    const pages = readRepoFile("apps/mobile/src/pages.json");
    const navigation = readRepoFile("apps/mobile/src/components/AdminBottomNav.vue");
    const analyticsPage = readRepoFile("apps/mobile/src/pages/admin/analytics.vue");

    expect(service).toContain('const canViewAnalytics = hasPermission("analytics.view")');
    expect(service).toContain("canCheckIn, canViewAnalytics, canViewFinanceRisks, canManageFinanceRisks");
    expect(service).toContain('canSelectTenant: hasPermission("tenant.view")');
    expect(mobilePagePaths(pages)).toContain("pages/admin/analytics");
    expect(navigation).toContain('permission: "canViewAnalytics"');
    expect(analyticsPage).toContain('/admin/analytics/overview?${query}');
    expect(analyticsPage).toContain('/admin/analytics/trends?${query}');
    expect(analyticsPage).toContain('/admin/analytics/channels?${query}');
    expect(analyticsPage).toContain("Promise.allSettled");
  });

  it("keeps mobile fund risk viewing and handling on separate finance permissions", () => {
    const service = readRepoFile("apps/api/src/modules/admin/admin.service.ts");
    const pages = readRepoFile("apps/mobile/src/pages.json");
    const analyticsPage = readRepoFile("apps/mobile/src/pages/admin/analytics.vue");
    const riskPage = readRepoFile("apps/mobile/src/pages/admin/risk-alerts.vue");

    expect(service).toContain('const canViewFinanceRisks = hasPermission("finance.view")');
    expect(service).toContain('const canManageFinanceRisks = hasPermission("finance.manage")');
    expect(mobilePagePaths(pages)).toContain("pages/admin/risk-alerts");
    expect(analyticsPage).toContain('bootstrap?.permissions?.canViewFinanceRisks');
    expect(riskPage).toContain('/admin/finance/risk-alerts/scan');
    expect(riskPage).toContain('/admin/finance/risk-alerts/${rowSnapshot.id}/handle');
    expect(riskPage).toContain('requiresRemark && !remark');
    expect(riskPage).toContain('!current || !isCurrentSession(session) || !canManage.value');
    expect(riskPage).toContain('currentRow.status !== rowSnapshot.status');
  });

  it("keeps member segment snapshots drillable and strictly tenant scoped", () => {
    const service = readRepoFile("apps/api/src/modules/admin/admin.service.ts");
    const page = readRepoFile("apps/admin/src/views/UserTags.vue");

    expect(service).toContain("assertMemberSegmentScope(row, admin)");
    expect(service).toContain("assertMemberSegmentScope(segment, admin)");
    expect(service).toContain("assertMemberSegmentScope(snapshot, admin)");
    expect(page).toContain('/admin/member-segment-snapshots/${row.id}/members');
    expect(page).toContain("不可变成员快照，共 {{ snapshotMemberTotal }} 人");
    expect(page).toContain('layout="prev, pager, next, total"');
  });

  it("keeps member point responses and tag filters in the active member scope", () => {
    const service = readRepoFile("apps/api/src/modules/admin/admin.service.ts");

    expect(service).toContain('const tenantScopeKey = tenant ? `tenant:${tenant.id}` : "platform"');
    expect(service).toContain("where: { user: { id: userId }, tenantScopeKey }");
    expect(service).toContain('tenantId ? "tag.tenantId = :memberTagTenantId" : "tag.tenantId IS NULL"');
    expect(service).toContain("memberTagTenantId: tenantId");
  });

  it("recovers member profile creation when a concurrent request wins the unique key", () => {
    const service = readRepoFile("apps/api/src/modules/admin/admin.service.ts");
    expect(service).toContain("isDuplicateEntryError(error)");
    expect(service).toContain("if (!profile) throw error");
    expect(service).toContain("await this.ensureMemberProfileRows(users, profileTenant)");
    expect(service).toContain(".orIgnore()");
    expect(service).toContain("} else if (!this.isTenantScoped(admin)) {");
    expect(service).toContain('builder.andWhere("user.id IN (:...scopedUserIds)", { scopedUserIds })');
    expect(service).not.toContain('else builder.where("1=1")');
  });

  it("keeps admin menu items backed by router records", () => {
    const adminMenu = readRepoFile("apps/admin/src/navigation/admin-menu.ts");
    const router = readRepoFile("apps/admin/src/router.ts");
    const menuIndexes = Array.from(adminMenu.matchAll(/\{\s*index:\s*"([^"]+)"/g)).map((match) => match[1]);
    const routePaths = new Set(Array.from(router.matchAll(/path:\s*"([^"]+)"/g)).map((match) => `/${match[1]}`.replace(/\/$/, "")));
    const missing = menuIndexes
      .filter((index) => index.startsWith("/"))
      .map((index) => index.split("?")[0])
      .filter((index, position, list) => list.indexOf(index) === position)
      .filter((index) => !routePaths.has(index));

    expect(missing).toEqual([]);
  });

  it("keeps platform dashboard menu role aligned with the route permission", () => {
    const adminMenu = readRepoFile("apps/admin/src/navigation/admin-menu.ts");

    expect(adminMenu).toContain('{ index: "/dashboard", icon: "DataAnalysis", label: "全局数据看板", roles: permissions.overview');
  });

  it("keeps mall finance read-only access separate from statement and commission writes", () => {
    const page = readRepoFile("apps/admin/src/views/MallPaymentLogs.vue");

    expect(page).toContain('const canManageStatements = hasPermission("mall.payment.manage")');
    expect(page).toContain('const canManageCommissions = hasPermission("mall.settlement.manage")');
    expect(page).toContain('v-if="canManageStatements" :loading="actionKey === \'statement:fetch\'"');
    expect(page).toContain('v-if="canManageStatements" label="操作"');
    expect(page).toContain('v-if="canManageCommissions" size="small" type="primary"');
    expect(page).toContain("if (!canManageStatements || actionKey.value) return;");
    expect(page).toContain("if (!canManageCommissions || actionKey.value) return;");
  });

  it("keeps support lookup, work-order handling, and phone disclosure on separate permissions", () => {
    const page = readRepoFile("apps/admin/src/views/SupportSearch.vue");

    expect(page).toContain('const canManageWorkOrders = computed(() => hasPermission("support.manage"))');
    expect(page).toContain('const canRevealPhone = computed(() => hasPermission("support.sensitive"))');
    expect(page).toContain('v-if="canManageWorkOrders" type="primary" :icon="Plus"');
    expect(page).toContain('v-if="canRevealPhone && !revealedPhones[row.id]"');
    expect(page).toContain('if (!canManageWorkOrders.value) return ElMessage.error("当前账号无客服工单处理权限")');
    expect(page).toContain('if (!canRevealPhone.value) return ElMessage.error("当前账号无敏感手机号查看权限")');
  });

  it("keeps analytics recomputation, exports, funnels, and cross-module links permission guarded", () => {
    const analyticsPage = readRepoFile("apps/admin/src/views/Analytics.vue");
    const funnelsPage = readRepoFile("apps/admin/src/views/Funnels.vue");
    const router = readRepoFile("apps/admin/src/router.ts");
    const menu = readRepoFile("apps/admin/src/navigation/admin-menu.ts");
    const adminService = readRepoFile("apps/api/src/modules/admin/admin.service.ts");
    const v1Service = readRepoFile("apps/api/src/modules/v1/v1.service.ts");

    expect(analyticsPage).toContain('const canExportAnalytics = computed(() => hasPermission("analytics.export"))');
    expect(analyticsPage).toContain('const canManageAnalytics = computed(() => hasPermission("analytics.manage"))');
    expect(analyticsPage).toContain('v-if="canManageAnalytics" type="warning"');
    expect(analyticsPage).toContain('v-if="canExportAnalytics" :loading="metricsExporting"');
    expect(analyticsPage).toContain('if (!canOpenBusinessModule(item)) return ElMessage.error("当前账号无目标业务模块查看权限")');
    expect(funnelsPage).toContain('const canExportGrowth = computed(() => hasPermission("analytics.export"))');
    expect(funnelsPage).toContain('const canViewActivityFunnel = computed(() => hasPermission("analytics.view"))');
    expect(funnelsPage).toContain('v-if="canViewActivityFunnel" label="单活动漏斗"');
    expect(router).toContain('{ path: "funnels", component: Funnels, meta: { roles: ["analytics.view"]');
    expect(router).toContain('{ path: "/analytics", roles: permissions.analytics, scope: "tenantOrPlatformAdmin" }');
    expect(menu).toContain('{ index: "/funnels", icon: "TrendCharts", label: "增长分析", roles: ["analytics.view"]');
    expect(adminService).toContain('const rate = (value: number, total: number) => boundedPercentage(value, total);');
    expect(adminService).toContain('return boundedPercentage(numerator, denominator);');
    expect(v1Service).toContain('signupRate: boundedPercentage(registrationCount, viewCount).toFixed(1)');
    expect(v1Service).toContain('paymentRate: boundedPercentage(paidCount, registrationCount).toFixed(1)');
  });

  it("keeps ambassador and partner viewing, management, sensitive disclosure, and exports permission guarded", () => {
    const page = readRepoFile("apps/admin/src/views/Ambassador.vue");
    const router = readRepoFile("apps/admin/src/router.ts");
    const menu = readRepoFile("apps/admin/src/navigation/admin-menu.ts");
    const permissions = readRepoFile("apps/admin/src/permissions.ts");
    const layout = readRepoFile("apps/admin/src/views/Layout.vue");

    expect(page).toContain('const canManageAmbassador = computed(() => hasPermission("ambassador.manage"))');
    expect(page).toContain('const canViewAmbassadorSensitive = computed(() => hasPermission("ambassador.sensitive"))');
    expect(page).toContain('const canExportAmbassador = computed(() => hasPermission("ambassador.export"))');
    expect(page).toContain('const canViewPartner = computed(() => hasPermission("partner.view"))');
    expect(page).toContain('const canPartnerManage = computed(() => hasPermission("partner.manage"))');
    expect(page).toContain('const canViewPartnerSensitive = computed(() => hasPermission("partner.sensitive"))');
    expect(page).toContain('const canExportPartner = computed(() => hasPermission("partner.export"))');
    expect(page).toContain('v-if="canRevealApplication(row) && !revealedApplications[row.id]"');
    expect(page).toContain('v-if="canViewPartnerSensitive && !revealedContracts[row.id]"');
    expect(page).toContain('if (!canManageAmbassador.value) return ElMessage.error("当前账号无文化大使管理权限")');
    expect(page).toContain('if (!partnerMode && !canViewAmbassadorSensitive.value) return ElMessage.error("当前账号无完整联系方式查看权限")');
    expect(page).toContain('if (!canExportAmbassador.value) return ElMessage.error("当前账号无文化大使数据导出权限")');
    expect(page).toContain('if (!canExportPartner.value) return ElMessage.error("当前账号无合作伙伴数据导出权限")');
    expect(router).toContain('{ path: "ambassador", component: Ambassador, meta: { roles: ["ambassador.view", "partner.view"], scope: "platform" }');
    expect(router).toContain('{ path: "/ambassador", roles: ["ambassador.view", "partner.view"], scope: "platform" }');
    expect(router).toContain("return isAdminFeaturePathEnabled(path, isPlatformScopedAdmin())");
    expect(menu).toContain('{ index: "/ambassador", icon: "Flag", label: "大使与伙伴 CRM", roles: ["ambassador.view", "partner.view"], scope: "platform" }');
    expect(permissions).toContain("export function isPlatformScopedAdmin()");
    expect(permissions).toContain('if (scope === "platform") return isPlatformScopedAdmin()');
    expect(layout).toContain('if (isPlatformScopedAdmin()) return "平台运营后台"');
    expect(layout).toContain('if (isPlatformScopedAdmin()) return "平台运营账号：当前仅显示已授权的平台功能，数据范围不下沉到任何商家。"');
    expect(layout).toContain('const setting = canAccess(["operation_settings.view"]) ? await api.get<any, any>("/admin/settings/operation") : null');
  });

  it("keeps mall order read access separate from fulfillment, refund, logistics, and marketing writes", () => {
    const page = readRepoFile("apps/admin/src/views/MallOrders.vue");

    expect(page).toContain('const canManageOrders = computed(() => hasPermission("mall.order.manage"))');
    expect(page).toContain('const canManageRefunds = computed(() => hasPermission("mall.refund.manage"))');
    expect(page).toContain('const canManageProducts = computed(() => hasPermission("mall.product.manage"))');
    expect(page).toContain('const canManageLogistics = computed(() => hasPermission("mall.logistics.manage"))');
    expect(page).toContain('v-if="canManageRefunds" label="操作"');
    expect(page).toContain('v-if="canManageOrders" class="drawer-actions"');
    expect(page).toContain('if (!canManageOrders.value) return ElMessage.error("当前账号无商城订单处理权限")');
    expect(page).toContain('if (!canManageRefunds.value) return ElMessage.error("当前账号无商城售后处理权限")');
    expect(page).toContain('if (!canManageLogistics.value) return ElMessage.error("当前账号无商城物流管理权限")');
    expect(page).toContain('if (!canManageProducts.value) return ElMessage.error("当前账号无商城营销管理权限")');
  });

  it("keeps mall logistics viewers and marketing operators out of configuration-only writes", () => {
    const logisticsPage = readRepoFile("apps/admin/src/views/MallLogistics.vue");
    const marketingPage = readRepoFile("apps/admin/src/views/MallMarketing.vue");

    expect(logisticsPage).toContain('const canManageLogistics = computed(() => hasPermission("mall.logistics.manage"))');
    expect(logisticsPage).toContain('v-if="canManageLogistics" shadow="never" class="form-card"');
    expect(logisticsPage).toContain('v-if="canManageLogistics" label="操作"');
    expect(logisticsPage).toContain('if (!canManageLogistics.value) return ElMessage.error("当前账号无商城物流设置权限")');
    expect(marketingPage).toContain('const canManageCommissionRules = computed(() => hasPermission("mall.settlement.manage"))');
    expect(marketingPage).toContain('v-if="canManageCommissionRules" label="佣金规则"');
    expect(marketingPage).toContain('if (!canManageCommissionRules.value) return ElMessage.error("当前账号无商城结算规则管理权限")');
    expect(marketingPage).toContain('...(canManageCommissionRules.value ? [loadCommissionRules()] : [])');
  });

  it("keeps mall logistics reads and writes bound to the current store scope", () => {
    const page = readRepoFile("apps/admin/src/views/MallLogistics.vue");

    expect(page).toContain("let tenantLoadSequence = 0");
    expect(page).toContain("let merchantLoadSequence = 0");
    expect(page).toContain("let logisticsLoadSequence = 0");
    expect(page).toContain("function logisticsScopeKey");
    expect(page).toContain("function captureLogisticsTarget");
    expect(page).toContain("function assertLogisticsTarget");
    expect(page).toContain("物流列表或店铺范围已变化，请刷新后重新操作");
    expect(page).toContain('const writeLocked = computed(() => saving.value || Boolean(actionKey.value))');
    expect(page).toContain(':disabled="writeLocked" @change="handleTenantChange"');
    expect(page).toContain(':disabled="writeLocked" @change="handleMerchantChange"');
    expect(page).toContain("logisticsCompanies.value = []");
    expect(page).toContain("if (sequence !== logisticsLoadSequence || scopeKey !== logisticsScopeKey()) return");
    expect(page).toContain("const current = assertLogisticsTarget(target)");
  });

  it("keeps mall category rows and writes bound to the current store scope", () => {
    const page = readRepoFile("apps/admin/src/views/MallCategories.vue");

    expect(page).toContain("let tenantLoadSequence = 0");
    expect(page).toContain("let merchantLoadSequence = 0");
    expect(page).toContain("let categoryLoadSequence = 0");
    expect(page).toContain("function categoryScopeKey");
    expect(page).toContain("function captureCategoryTarget");
    expect(page).toContain("function assertCategoryTarget");
    expect(page).toContain("分类列表或店铺范围已变化，请刷新后重新操作");
    expect(page).toContain('const writeLocked = computed(() => saving.value || actionId.value !== null)');
    expect(page).toContain(':disabled="writeLocked" @change="handleTenantChange"');
    expect(page).toContain(':disabled="writeLocked" @change="handleMerchantChange"');
    expect(page).toContain("categories.value = []");
    expect(page).toContain("if (sequence !== categoryLoadSequence || scopeKey !== categoryScopeKey()) return");
    expect(page).toContain("assertCategoryTarget(target)");
    expect(page).toContain("merchantId: target.merchantId");
  });

  it("keeps mall refund workbench shortcuts within the account read scope", () => {
    const page = readRepoFile("apps/admin/src/views/MallRefunds.vue");

    expect(page).toContain('const canViewOrders = computed(() => hasPermission("mall.order.view"))');
    expect(page).toContain('const canViewFinance = computed(() => hasPermission("mall.finance.view"))');
    expect(page).toContain('const canViewStatistics = computed(() => hasPermission("mall.statistics.view"))');
    expect(page).toContain('v-if="canViewStatistics" size="small" type="success" plain');
  });

  it("keeps mall cross-workbench shortcuts and payment diagnostics within permission scope", () => {
    const financePage = readRepoFile("apps/admin/src/views/MallFinance.vue");
    const inventoryPage = readRepoFile("apps/admin/src/views/MallInventory.vue");
    const reviewsPage = readRepoFile("apps/admin/src/views/MallReviews.vue");
    const merchantsPage = readRepoFile("apps/admin/src/views/MallMerchants.vue");

    expect(financePage).toContain('v-if="canViewStatistics" size="small" type="success" plain');
    expect(financePage).toContain('const settlementErrorMessage = ref("")');
    expect(financePage).toContain('settlementErrorMessage.value = error.message || "当前店铺未授予结算查看权限，核心财务数据仍可正常查看。"');
    expect(inventoryPage).toContain('const canViewOrders = computed(() => hasPermission("mall.order.view"))');
    expect(inventoryPage).toContain('v-if="canViewStatistics" size="small" type="success" plain');
    expect(reviewsPage).toContain('v-if="canManageProducts" size="small" type="primary" plain');
    expect(reviewsPage).toContain('v-if="canViewOrders" size="small" text type="primary"');
    expect(merchantsPage).toContain('const canManagePayments = computed(() => hasPermission("mall.payment.manage"))');
    expect(merchantsPage).toContain('v-if="canViewFinance" :loading="readinessLoading"');
    expect(merchantsPage).toContain('if (!canManagePayments.value) return ElMessage.error("当前账号无商城支付配置权限")');
  });

  it("keeps settlement and system settings shortcuts within their target permissions", () => {
    const settlementsPage = readRepoFile("apps/admin/src/views/MallSettlements.vue");
    const settingsPage = readRepoFile("apps/admin/src/views/SystemSettings.vue");

    expect(settlementsPage).toContain('const canViewStatistics = computed(() => hasPermission("mall.statistics.view"))');
    expect(settlementsPage).toContain('v-if="canViewOrders" size="small" type="primary" plain');
    expect(settingsPage).toContain('const canManageCategories = computed(() => hasPermission("category.manage"))');
    expect(settingsPage).toContain('const canViewAdmins = computed(() => hasPermission("admin.view"))');
    expect(settingsPage).toContain('const canViewLogs = computed(() => hasPermission("logs.view"))');
    expect(settingsPage).toContain('const canViewSecurityLogs = computed(() => hasPermission("security_log.view"))');
    expect(settingsPage).toContain('const hasManagementLinks = computed(() => canManageCategories.value');
    expect(settingsPage).toContain('v-if="hasManagementLinks" label="管理入口"');
    expect(settingsPage).toContain('const canUploadImages = computed(() => canEditSettings.value && hasPermission("upload.image"))');
    expect(settingsPage).toContain('if (!canUploadImages.value)');
    expect(settingsPage).toContain('v-if="canViewSecurityLogs" text @click="go(\'/h5-code-logs\')"');
    expect(settingsPage).toContain('el-upload v-if="canUploadImages"');
    expect(settingsPage).toContain('v-if="canViewAdmins" class="link-card"');
    expect(settingsPage).toContain('v-if="canViewLogs" class="link-card"');
  });

  it("keeps the tenant profile workbench recoverable for a profile-only account", () => {
    const page = readRepoFile("apps/admin/src/views/TenantProfile.vue");
    const router = readRepoFile("apps/admin/src/router.ts");

    expect(router).toContain('{ path: "/tenant-profile", roles: ["tenant_profile.manage"], scope: "tenant" }');
    expect(page).toContain('const loadError = ref("")');
    expect(page).toContain('const saveError = ref("")');
    expect(page).toContain('const hasChanges = computed(');
    expect(page).toContain('v-if="loadError" class="page-error"');
    expect(page).toContain('v-if="saveError" class="save-error"');
    expect(page).toContain('catch {\n    confirming.value = false;\n    return;\n  }');
    expect(page).toContain(':disabled="scopeLocked || !hasChanges"');
  });

  it("keeps every permission-protected admin page reachable from the login fallback", () => {
    const router = readRepoFile("apps/admin/src/router.ts");
    const fallbackStart = router.indexOf("const candidates = [");
    const fallbackEnd = router.indexOf("  ];", fallbackStart);
    const fallback = router.slice(fallbackStart, fallbackEnd);
    const protectedPaths = [...router.matchAll(/\{ path: "([^":*]+)", component: [^,]+, meta:/g)].map((match) => match[1]);

    expect(fallbackStart).toBeGreaterThan(0);
    expect(protectedPaths.length).toBeGreaterThan(40);
    for (const routePath of protectedPaths) expect(fallback).toContain(`path: "/${routePath}"`);
  });

  it("keeps the ambassador and partner workbench truthful during partial failures and rapid reloads", () => {
    const page = readRepoFile("apps/admin/src/views/Ambassador.vue");

    expect(page).toContain("let loadSequence = 0");
    expect(page).toContain("const sequence = ++loadSequence");
    expect(page).toContain("Promise.allSettled(sections.map((section) => section.request()))");
    expect(page).toContain("if (sequence !== loadSequence) return");
    expect(page).toContain("sections.forEach((section) => section.clear())");
    expect(page).toContain("失败分区已清空，成功分区仍可使用");
    expect(page).toContain('v-if="loadError" class="page-error" type="error"');
    expect(page).toContain("<p>{{ loadError }}</p>");
    expect(page).toContain('@click="load">重新同步</el-button>');
  });

  it("keeps merchant governance data truthful across failures and dialog target changes", () => {
    const page = readRepoFile("apps/admin/src/views/MallMerchants.vue");

    expect(page).toContain("let merchantLoadSequence = 0");
    expect(page).toContain("const sequence = ++merchantLoadSequence");
    expect(page).toContain("if (sequence !== merchantLoadSequence) return");
    expect(page).toContain("rows.value = []");
    expect(page).toContain("paymentReadiness.value = {}");
    expect(page).toContain("失败店铺已明确标记为“读取失败”");
    expect(page).toContain("const items = Array.isArray(result) ? result : result?.items");
    expect(page).toContain("page: 1, pageSize: 100");
    expect(page).toContain("if (accessMerchant.value?.id !== row.id) return");
    expect(page).toContain("if (governanceMerchant.value?.id !== merchantId) return");
    expect(page).toContain("if (paymentMerchant.value?.id !== merchantId) return");
    expect(page).toContain("Promise.allSettled([");
    expect(page).toContain('v-if="merchantError" class="page-error" type="error"');
    expect(page).toContain('v-if="accessError" class="dialog-error" type="error"');
    expect(page).toContain('v-if="governanceError" class="dialog-error" type="error"');
    expect(page).toContain('v-if="paymentError" class="dialog-error" type="error"');
  });

  it("keeps mall order, refund, payment, settlement, and analytics sections truthful across scope changes", () => {
    const page = readRepoFile("apps/admin/src/views/MallOrders.vue");

    expect(page).toContain("let scopeLoadSequence = 0");
    expect(page).toContain("let orderLoadSequence = 0");
    expect(page).toContain("let paymentLoadSequence = 0");
    expect(page).toContain("let checkoutGroupTraceLoadSequence = 0");
    expect(page).toContain("const sequence = ++orderLoadSequence");
    expect(page).toContain("if (sequence !== orderLoadSequence) return");
    expect(page).toContain("orders.value = []");
    expect(page).toContain("mallAnalytics.value = {}");
    expect(page).toContain("paymentReadiness.value = null");
    expect(page).toContain("Promise.allSettled([");
    expect(page).toContain("const failures = results.flatMap");
    expect(page).toContain('v-if="scopeError" class="page-error" type="error"');
    expect(page).toContain('v-if="orderError" class="page-error" type="error"');
    expect(page).toContain('v-if="analyticsError" class="page-error" type="error"');
    expect(page).toContain('v-if="refundError" class="page-error" type="error"');
    expect(page).toContain('v-if="paymentError" class="page-error" type="error"');
    expect(page).toContain('v-if="settlementError" class="page-error" type="error"');
    expect(page).toContain('v-if="checkoutGroupTraceError" class="page-error" type="error"');
    expect(page).toContain("let detailLoadSequence = 0");
    expect(page).toContain("let shipLoadSequence = 0");
    expect(page).toContain("let logisticsLoadSequence = 0");
    expect(page).toContain("const sequence = ++detailLoadSequence");
    expect(page).toContain("Number(detailTargetRow.value?.id || 0) !== orderId");
    expect(page).toContain("shipOrderTarget.value = detail");
    expect(page).toContain("Number(shipTargetRow.value?.id || 0) !== orderId");
    expect(page).toContain("enabledShipLogisticsCompanies");
    expect(page).toContain('v-if="detailError" class="dialog-error"');
    expect(page).toContain('v-if="checkoutGroupError" class="dialog-error"');
    expect(page).toContain('v-if="shipError" class="dialog-error"');
    expect(page).toContain('v-if="shipLogisticsError" class="dialog-error"');
    expect(page).toContain('v-if="logisticsError" class="dialog-error"');
    expect(page).toContain("let couponOptionsLoadSequence = 0");
    expect(page).toContain("let promotionLoadSequence = 0");
    expect(page).toContain("function merchantContextMatches(merchantId: number, tenantId: number)");
    expect(page).toContain("page: 1, pageSize: 100");
    expect(page).toContain("const items = Array.isArray(result) ? result : result?.items");
    expect(page).toContain('v-if="couponOptionsError" class="dialog-error"');
    expect(page).toContain('v-if="couponError" class="dialog-error"');
    expect(page).toContain('v-if="flashSaleError" class="dialog-error"');
    expect(page).toContain('v-if="groupBuyError" class="dialog-error"');
    expect(page).toContain('v-if="groupBuyRecordError" class="dialog-error"');
    expect(page).toContain('v-if="agentError" class="dialog-error"');
    expect(page).toContain('v-if="promotionError" class="dialog-error"');
  });

  it("keeps mall product lists, forms, inventory, coupons, and audit dialogs bound to their opening target", () => {
    const page = readRepoFile("apps/admin/src/views/MallProducts.vue");

    expect(page).toContain("let scopeLoadSequence = 0");
    expect(page).toContain("let productLoadSequence = 0");
    expect(page).toContain("let productFormLoadSequence = 0");
    expect(page).toContain("let couponLoadSequence = 0");
    expect(page).toContain("let inventoryLogLoadSequence = 0");
    expect(page).toContain("let auditHistoryLoadSequence = 0");
    expect(page).toContain("Promise.allSettled([");
    expect(page).toContain("const categoryTarget = formContext ? formCategories : categories");
    expect(page).toContain("formMerchantOptions.value = [detail.merchant]");
    expect(page).toContain('productCode: "", title: "", skus: []');
    expect(page).toContain("商品详情归属与打开目标不一致");
    expect(page).toContain("所选 SKU 不属于当前商品");
    expect(page).toContain("function invalidateScopedDialogs()");
    expect(page).toContain('v-if="scopeError" class="page-error" type="error"');
    expect(page).toContain('v-if="productError" class="page-error" type="error"');
    expect(page).toContain('v-if="productFormError" class="dialog-error" type="error"');
    expect(page).toContain('v-if="couponError" class="dialog-error" type="error"');
    expect(page).toContain('v-if="inventoryLogsError" class="dialog-error" type="error"');
    expect(page).toContain('v-if="auditHistoryError" class="dialog-error" type="error"');
    expect(page).toContain('v-if="inventoryAnomalyError" class="dialog-error" type="error"');
  });

  it("keeps dedicated mall inventory and product audit pages truthful across failures and scope changes", () => {
    const inventory = readRepoFile("apps/admin/src/views/MallInventory.vue");
    const audits = readRepoFile("apps/admin/src/views/MallProductAudits.vue");

    expect(inventory).toContain("let productLoadSequence = 0");
    expect(inventory).toContain("let lowStockLoadSequence = 0");
    expect(inventory).toContain("let inventoryLogLoadSequence = 0");
    expect(inventory).toContain("let anomalyLoadSequence = 0");
    expect(inventory).toContain("function currentInventoryScopeMatches(tenantId: number, merchantId: number)");
    expect(inventory).toContain("function invalidateInventoryScope()");
    expect(inventory).toContain("stockTarget.value = {");
    expect(inventory).toContain("所选 SKU 不属于当前商品");
    expect(inventory).toContain("contextSequence !== anomalyLoadSequence");
    expect(inventory).toContain('v-if="productsError" class="section-error"');
    expect(inventory).toContain('v-if="lowStockError" class="section-error"');
    expect(inventory).toContain('v-if="logsError" class="section-error"');
    expect(inventory).toContain('v-if="anomaliesError" class="section-error"');

    expect(audits).toContain("const scopeError = ref");
    expect(audits).toContain("const auditError = ref");
    expect(audits).toContain("let auditLoadSequence = 0");
    expect(audits).toContain("function currentAuditScopeMatches(tenantId: number, merchantId: number)");
    expect(audits).toContain("function invalidateAuditScope()");
    expect(audits).toContain("contextSequence !== auditLoadSequence");
    expect(audits).toContain('v-else-if="scopeError" class="scope-alert"');
    expect(audits).toContain('v-if="auditError" class="audit-error"');
  });

  it("keeps mall review and after-sale sections isolated and bound to the confirmed target", () => {
    const reviews = readRepoFile("apps/admin/src/views/MallReviews.vue");
    const refunds = readRepoFile("apps/admin/src/views/MallRefunds.vue");

    expect(reviews).toContain("let reviewLoadSequence = 0");
    expect(reviews).toContain("let reportLoadSequence = 0");
    expect(reviews).toContain("reviews.value = []");
    expect(reviews).toContain("reviewReports.value = []");
    expect(reviews).toContain("Promise.allSettled([loadReviewRows(), loadReportRows()])");
    expect(reviews).toContain("sequence !== reviewLoadSequence || !sameReviewContext(context)");
    expect(reviews).toContain("sequence !== reportLoadSequence || !sameReviewContext(context)");
    expect(reviews).toContain("评价列表或店铺范围已变化，请刷新后重新操作");
    expect(reviews).toContain("举报列表或店铺范围已变化，请刷新后重新操作");
    expect(reviews).toContain('v-if="reviewsError" class="section-error"');
    expect(reviews).toContain('v-if="reportsError" class="section-error"');

    expect(refunds).toContain("let refundLoadSequence = 0");
    expect(refunds).toContain("let refundLogLoadSequence = 0");
    expect(refunds).toContain("refunds.value = []");
    expect(refunds).toContain("refundLogs.value = []");
    expect(refunds).toContain("Promise.allSettled([loadRefundRows(), loadRefundLogRows()])");
    expect(refunds).toContain("sequence !== refundLoadSequence || !sameRefundContext(context)");
    expect(refunds).toContain("sequence !== refundLogLoadSequence || !sameRefundContext(context)");
    expect(refunds).toContain("function requireCurrentRefundTarget");
    expect(refunds).toContain("售后列表或店铺范围已变化，请刷新后重新操作");
    expect(refunds).toContain('v-if="refundErrorMessage" class="section-error"');
    expect(refunds).toContain('v-if="refundLogErrorMessage" class="section-error"');
  });

  it("keeps mall settlement, finance, and statistics data bound to their current scope", () => {
    const settlements = readRepoFile("apps/admin/src/views/MallSettlements.vue");
    const finance = readRepoFile("apps/admin/src/views/MallFinance.vue");
    const statistics = readRepoFile("apps/admin/src/views/MallStatistics.vue");

    expect(settlements).toContain("let settlementLoadSequence = 0");
    expect(settlements).toContain("let detailLoadSequence = 0");
    expect(settlements).toContain("function currentSettlementContext()");
    expect(settlements).toContain("function invalidateSettlementDetail()");
    expect(settlements).toContain("function assertCurrentSettlementTarget");
    expect(settlements).toContain("结算列表或店铺范围已变化，请刷新后重新操作");
    expect(settlements).toContain("结算明细归属与打开目标不一致");
    expect(settlements).toContain("生成商城结算单");

    expect(finance).toContain("let summaryLoadSequence = 0");
    expect(finance).toContain("let transactionLoadSequence = 0");
    expect(finance).toContain("let refundLoadSequence = 0");
    expect(finance).toContain("let commissionLoadSequence = 0");
    expect(finance).toContain("let settlementLoadSequence = 0");
    expect(finance).toContain("Promise.allSettled([loadOrderSummary(), loadPaymentTransactions(), loadRefundLogs(), loadCommissionSummary(), loadSettlementRisk()])");
    expect(finance).toContain('v-if="summaryErrorMessage" class="section-alert"');
    expect(finance).toContain('v-if="transactionErrorMessage" class="section-alert"');
    expect(finance).toContain('v-if="refundErrorMessage" class="section-alert"');
    expect(finance).toContain('v-if="commissionErrorMessage" class="section-alert"');
    expect(finance).toContain('v-if="settlementErrorMessage" class="section-alert"');

    expect(statistics).toContain("let analyticsLoadSequence = 0");
    expect(statistics).toContain("function currentAnalyticsContext()");
    expect(statistics).toContain("mallAnalytics.value = {}");
    expect(statistics).toContain("sequence !== analyticsLoadSequence || !sameAnalyticsContext(context)");
    expect(statistics).toContain("<p>{{ analyticsErrorMessage }}</p>");
  });

  it("keeps mall payment configuration and financial logs isolated across failures and scope changes", () => {
    const payments = readRepoFile("apps/admin/src/views/MallPayments.vue");
    const logs = readRepoFile("apps/admin/src/views/MallPaymentLogs.vue");

    expect(payments).toContain("let merchantLoadSequence = 0");
    expect(payments).toContain("let selectedDataSequence = 0");
    expect(payments).toContain("let readinessLoadSequence = 0");
    expect(payments).toContain("let accountLoadSequence = 0");
    expect(payments).toContain("function clearSelectedMerchantData()");
    expect(payments).toContain("Promise.allSettled([loadReadiness(), loadPaymentAccounts()])");
    expect(payments).toContain('v-if="merchantError" class="page-error"');
    expect(payments).toContain('v-if="readinessError" class="section-error"');
    expect(payments).toContain('v-if="accountsError" class="section-error"');

    expect(logs).toContain("let transactionLoadSequence = 0");
    expect(logs).toContain("let callbackLoadSequence = 0");
    expect(logs).toContain("let refundLoadSequence = 0");
    expect(logs).toContain("let commissionLoadSequence = 0");
    expect(logs).toContain("let statementLoadSequence = 0");
    expect(logs).toContain("transactionLoading.value = false");
    expect(logs).toContain("statementLoading.value = false");
    expect(logs).toContain("if (sequence === commissionLoadSequence) commissionLoading.value = false");
    expect(logs).toContain("Promise.allSettled([loadTransactions(), loadCallbacks(), loadRefundLogs(), loadCommissions(), loadStatements()])");
    expect(logs).toContain("function assertCommissionTarget");
    expect(logs).toContain("function assertStatementTarget");
    expect(logs).toContain("佣金列表或店铺范围已变化，请刷新后重新操作");
    expect(logs).toContain("渠道账单列表或店铺范围已变化，请刷新后重新操作");
    expect(logs).toContain('v-if="transactionError" class="scope-alert"');
    expect(logs).toContain('v-if="callbackError" class="scope-alert"');
    expect(logs).toContain('v-if="refundError" class="scope-alert"');
    expect(logs).toContain('v-if="commissionError" class="scope-alert"');
    expect(logs).toContain('v-if="statementError" class="scope-alert"');
  });

  it("keeps mall marketing catalogs, campaigns, risks, and commission rules bound to their current scope", () => {
    const page = readRepoFile("apps/admin/src/views/MallMarketing.vue");

    expect(page).toContain("let merchantLoadSequence = 0");
    expect(page).toContain("let catalogLoadSequence = 0");
    expect(page).toContain("let couponLoadSequence = 0");
    expect(page).toContain("let couponUsageLoadSequence = 0");
    expect(page).toContain("let flashSaleLoadSequence = 0");
    expect(page).toContain("let groupBuyLoadSequence = 0");
    expect(page).toContain("let groupBuyRecordLoadSequence = 0");
    expect(page).toContain("let agentLoadSequence = 0");
    expect(page).toContain("let promotionLoadSequence = 0");
    expect(page).toContain("let promotionRiskLoadSequence = 0");
    expect(page).toContain("let promotionAlertLoadSequence = 0");
    expect(page).toContain("let commissionRuleLoadSequence = 0");
    expect(page).toContain("Promise.allSettled(requests.map((request) => request.run()))");
    expect(page).toContain("Promise.allSettled([loadCoupons(), loadCouponUsages()])");
    expect(page).toContain("Promise.allSettled([loadGroupBuys(), loadGroupBuyRecords()])");
    expect(page).toContain("function assertMarketingTarget");
    expect(page).toContain("function assertMarketingFormTarget");
    expect(page).toContain("列表或店铺范围已变化，请刷新后重新操作");
    expect(page).toContain("page: 1, pageSize: 100");
    expect(page).toContain("const rows = Array.isArray(result) ? result : result?.items");
    expect(page).toContain('v-if="catalogError" class="scope-alert section-error"');
    expect(page).toContain('v-if="platformCatalogError && couponForm.issuerScope === \'platform\'"');
    expect(page).toContain('v-if="couponError" class="section-error"');
    expect(page).toContain('v-if="couponUsageError" class="section-error"');
    expect(page).toContain('v-if="flashSaleError" class="section-error"');
    expect(page).toContain('v-if="groupBuyError" class="section-error"');
    expect(page).toContain('v-if="groupBuyRecordError" class="section-error"');
    expect(page).toContain('v-if="agentError" class="section-error"');
    expect(page).toContain('v-if="promotionError" class="section-error"');
    expect(page).toContain('v-if="promotionRiskError" class="section-error"');
    expect(page).toContain('v-if="promotionAlertError" class="section-error"');
    expect(page).toContain('v-if="commissionRuleError" class="section-error"');
  });

  it("keeps business job viewing, handling, worker observability, and audit boundaries separate", () => {
    const page = readRepoFile("apps/admin/src/views/BusinessJobs.vue");
    const router = readRepoFile("apps/admin/src/router.ts");
    const menu = readRepoFile("apps/admin/src/navigation/admin-menu.ts");
    const service = readRepoFile("apps/api/src/modules/admin/admin.service.ts");
    const jobService = readRepoFile("apps/api/src/modules/reliability/business-job.service.ts");

    expect(router).toContain('{ path: "business-jobs", component: BusinessJobs, meta: { roles: ["business_job.view"]');
    expect(router).toContain('{ path: "/business-jobs", roles: ["business_job.view"], scope: "tenantOrPlatformAdmin" }');
    expect(menu).toContain('{ index: "/business-jobs", icon: "List", label: "业务任务", roles: ["business_job.view"]');
    expect(page).toContain('const canManageJobs = computed(() => hasPermission("business_job.manage"))');
    expect(page).toContain('v-if="!canManageJobs" class="page-error"');
    expect(page).toContain('v-if="canManageJobs" label="操作"');
    expect(page).toContain('row.lastWorkerId || "-"');
    expect(page).toContain('if (!canManageJobs.value) return ElMessage.error("当前账号无业务任务处理权限")');
    expect(service).toContain('"business_job.replay"');
    expect(service).toContain('"business_job.cancel"');
    expect(service).toContain('"business_job.run_due"');
    expect(jobService).toContain('setLock("pessimistic_write")');
    expect(jobService).toContain('lastWorkerId: job.lastWorkerId');
    expect(jobService).toContain('return { ...this.serializeForAdmin(job), operationApplied }');
  });

  it("keeps settlement snapshot scalar reads out of TypeORM entity pagination", () => {
    const service = readRepoFile("apps/api/src/modules/mall/mall.service.ts");

    expect(service).toContain('.select("line.sourceType", "sourceType")');
    expect(service).toContain('.addSelect("line.sourceId", "sourceId")');
    expect(service).toContain('.getRawMany<{ sourceType: string; sourceId: string }>()');
    expect(service).not.toContain('select(["line.sourceType", "line.sourceId"]).take(10000).getMany()');
  });

  it("keeps mobile pages.json paths backed by Vue files", () => {
    const pagePaths = mobilePagePaths(readRepoFile("apps/mobile/src/pages.json"));
    const missing = pagePaths
      .map((pagePath) => `apps/mobile/src/${pagePath}.vue`)
      .filter((relativePath) => !fs.existsSync(path.join(repoRoot, relativePath)));

    expect(missing).toEqual([]);
    expect(new Set(pagePaths).size).toBe(pagePaths.length);
  });
});
