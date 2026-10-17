import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile client state consistency", () => {
  const readPage = (path: string) => readFileSync(`../mobile/src/pages/${path}`, "utf8");
  const memberOrderOverview = readFileSync("../mobile/src/member-order-overview.ts", "utf8");
  const communityIndex = readPage("community/index.vue");
  const communityDetail = readPage("community/detail.vue");
  const forumIndex = readPage("forum/index.vue");
  const forumDetail = readPage("forum/detail.vue");
  const forumPublish = readPage("forum/publish.vue");
  const tenantSwitcher = readFileSync("../mobile/src/components/TenantSwitcher.vue", "utf8");
  const charity = readPage("charity/index.vue");
  const mallDetail = readPage("mall/detail.vue");
  const mallMerchant = readPage("mall/merchant.vue");
  const mallReferralCommissions = readPage("user/mall-referral-commissions.vue");
  const mallOrderDetail = readPage("user/mall-order-detail.vue");
  const mallOrders = readPage("user/mall-orders.vue");
  const activityReview = readPage("user/review.vue");
  const activityReviewsPage = readPage("user/activity-reviews.vue");
  const partnerPage = readPage("partner/index.vue");
  const volunteerPage = readPage("volunteer/index.vue");
  const aidApply = readPage("apply/aid.vue");
  const ambassadorApply = readPage("apply/ambassador.vue");
  const merchantApply = readPage("mall/merchant-apply.vue");
  const courseAssessment = readPage("course/assessment.vue");
  const communityPublish = readPage("community/publish.vue");
  const mallAddresses = readPage("mall/addresses.vue");
  const mallCoupons = readPage("mall/coupons.vue");
  const userProfile = readPage("user/profile.vue");
  const communityProgram = readPage("community/program.vue");
  const communityCheckin = readPage("community/checkin.vue");
  const searchPage = readPage("search/index.vue");
  const servicePage = readPage("service/index.vue");
  const favoriteCourses = readPage("user/favorites.vue");
  const contentAppeals = readPage("user/content-appeals.vue");
  const userSettings = readPage("user/settings.vue");
  const announcementList = readPage("announcement/list.vue");
  const brandStory = readPage("brand/story.vue");
  const courseCatalog = readPage("courses/index.vue");
  const communitySocial = readPage("user/community-social.vue");
  const socialProfile = readPage("community/social-profile.vue");
  const userLogin = readPage("user/login.vue");
  const homePage = readPage("home/index.vue");
  const learningHistory = readPage("user/learning.vue");
  const courseOrderConfirm = readPage("order/confirm.vue");
  const coursePaymentResult = readPage("order/payment.vue");
  const userSecurity = readPage("user/security.vue");
  const coursePlayer = readPage("course/player.vue");
  const mobileAdminHome = readPage("admin/home.vue");
  const mobileAdminActivities = readPage("admin/activity/list.vue");
  const mobileAdminOrders = readPage("admin/orders.vue");
  const mobileAdminRegistrations = readPage("admin/registrations.vue");
  const mobileAdminCheckIn = readPage("admin/check-in.vue");
  const mobileActivityEdit = readPage("admin/activity/edit.vue");
  const mobileActivityPreview = readPage("admin/activity/preview.vue");
  const communityPosts = readPage("user/community-posts.vue");
  const userCertificates = readPage("user/certificates.vue");
  const mobileAdminLogin = readPage("admin/login.vue");
  const mobileAdminRefunds = readPage("admin/refunds.vue");
  const mobileAdminAnalytics = readPage("admin/analytics.vue");
  const mobileAdminRiskAlerts = readPage("admin/risk-alerts.vue");
  const userRegistrationDetail = readPage("user/registration.vue");
  const userCourses = readPage("user/courses.vue");
  const userForumPosts = readPage("user/forum-posts.vue");
  const ambassadorLanding = readPage("ambassador/index.vue");
  const deanRecruit = readPage("recruit/dean.vue");
  const activityDetail = readPage("activity/detail.vue");
  const activityRegister = readPage("activity/register.vue");
  const activityList = readPage("activity/list.vue");
  const activitySpace = readPage("activity/space.vue");
  const activityPreviewRow = readFileSync("../mobile/src/components/ActivityPreviewRow.vue", "utf8");
  const courseDetail = readPage("course/detail.vue");
  const mallIndex = readPage("mall/index.vue");
  const mallCart = readPage("mall/cart.vue");
  const mallFavorites = readPage("mall/favorites.vue");
  const mallHistory = readPage("mall/history.vue");
  const mallCheckout = readPage("mall/checkout.vue");
  const mallLogistics = readPage("mall/logistics.vue");
  const credentialVerify = readPage("credential/verify.vue");
  const userWallet = readPage("user/wallet.vue");
  const userOrders = readPage("user/orders.vue");
  const emptyState = readFileSync("../mobile/src/components/EmptyState.vue", "utf8");
  const loadingState = readFileSync("../mobile/src/components/LoadingState.vue", "utf8");
  const userMy = readPage("user/my.vue");
  const socialConnections = readPage("community/connections.vue");
  const communityCard = readPage("community/card.vue");
  const mobileDecorationBlocks = readFileSync("../mobile/src/components/PageDecorationBlocks.vue", "utf8");
  const mobileDecoration = readFileSync("../mobile/src/decoration.ts", "utf8");
  const appBottomNav = readFileSync("../mobile/src/components/AppBottomNav.vue", "utf8");
  const mobileScanPage = readPage("scan/index.vue");
  const mobileActivityQr = readFileSync("../mobile/src/activity-qr.ts", "utf8");
  const entryPages = readFileSync("../mobile/src/entry-pages.ts", "utf8");
  const featureGates = readFileSync("../mobile/src/feature-gates.ts", "utf8");
  const courseData = readFileSync("../mobile/src/course-data.ts", "utf8");
  const publicController = readFileSync("src/modules/public/public.controller.ts", "utf8");
  const publicService = readFileSync("src/modules/public/public.service.ts", "utf8");
  const serverMemberOrderOverview = readFileSync("src/modules/public/member-order-overview.ts", "utf8");
  const errorReporting = readFileSync("../mobile/src/error-reporting.ts", "utf8");
  const mobileAdminApi = readFileSync("../mobile/src/mobile-admin.ts", "utf8");
  const mobileDate = readFileSync("../mobile/src/tenant-load-guard.ts", "utf8");
  const mobileRuntimeCompatibility = readFileSync("../../scripts/check-mobile-runtime-compatibility.mjs", "utf8");
  const mobileMpWeixinArtifacts = readFileSync("../../scripts/check-mobile-mp-weixin-artifacts.mjs", "utf8");

  it("keeps ambassador and dean recruitment pages tenant-safe and retryable", () => {
    expect(ambassadorLanding).toContain("createTenantLoadGuard");
    expect(ambassadorLanding).toContain("loadGuard.isCurrent(token)");
    for (const page of [ambassadorLanding, deanRecruit]) {
      expect(page).toContain("await loadFeatureGates(true)");
      expect(page).toContain("guardCurrentPageFeature");
      expect(page).toContain('v-else-if="loadError"');
      expect(page).toContain("onShow(refreshPage)");
      expect(page).toContain("if (submitting.value || submitted.value) return");
      expect(page).toContain('role="alert"');
      expect(page).toContain("submitError.value = reviewSafeText");
    }
  });

  it("rejects stale activity and course detail responses and locks registration prompts", () => {
    expect(activityDetail).toContain("createTenantLoadGuard");
    expect(activityDetail).toContain("loadGuard.isCurrent(token)");
    expect(activityDetail).toContain("Promise.allSettled([load(), loadDecoration()])");
    expect(activityDetail).toContain('activeAction.value = "invite"');
    expect(activityDetail).toContain('activeAction.value = "reminder"');
    expect(activityDetail).toContain("requestWechatSubscriptions");

    for (const guard of ["pageLoadGuard", "quoteLoadGuard", "couponLoadGuard"]) {
      expect(activityRegister).toContain(`const ${guard} = createTenantLoadGuard()`);
      expect(activityRegister).toContain(`${guard}.isCurrent(token)`);
    }
    expect(activityRegister).toContain("const submitGuard = createTenantLoadGuard()");
    expect(activityRegister).toContain("const submitToken = submitGuard.begin()");
    expect(activityRegister).toContain("submitGuard.isCurrent(submitToken)");
    expect(activityRegister).toContain("submitGuard.invalidate()");
    expect(activityRegister).toContain("onHide");
    expect(activityRegister).toContain("confirming.value = true");
    expect(activityRegister).toContain("function confirmSubmit()");
    const attachmentPicker = activityRegister.slice(activityRegister.indexOf("function chooseAttachment"), activityRegister.indexOf("function submit()"));
    expect(attachmentPicker.indexOf("uploadingFieldId.value = field.id")).toBeLessThan(attachmentPicker.indexOf("uni.chooseMessageFile"));
    expect(activityRegister).toContain("getCurrentTenantCode() !== tenantCode");
    expect(activityRegister).toContain("const availableTicketOptions");
    expect(activityRegister).toContain("ticket.saleStatus === \"available\"");
    expect(activityRegister).toContain("selectedTicketTypeId.value = availableTicketOptions.value[0]?.id");
    expect(activityRegister).toContain("ticketSelectionUnavailable");
    expect(publicService).toContain('saleStatus: "available" | "sold_out" | "not_started" | "ended"');
    expect(publicService).toContain("请选择可售票种");

    for (const guard of ["courseLoadGuard", "reviewsLoadGuard", "favoriteActionGuard"]) {
      expect(courseDetail).toContain(`const ${guard} = createTenantLoadGuard()`);
      expect(courseDetail).toContain(`${guard}.isCurrent(token)`);
    }
    expect(courseDetail).toContain("getCurrentTenantCode() !== tenantCode");
    expect(mallDetail).toContain("const cartActionGuard = createTenantLoadGuard()");
    expect(mallDetail).toContain("cartActionGuard.isCurrent(token)");
    expect(mallDetail).toContain(':aria-busy="activeAction === \'add-cart\'"');
  });

  it("uses an explicit cross-platform confirmation layer before registration submission", () => {
    expect(activityRegister).toContain('class="submit-confirm-layer"');
    expect(activityRegister).toContain('class="submit-confirm-primary"');
    expect(activityRegister).toContain("function confirmSubmit()");
    expect(activityRegister).not.toContain("confirming.value = true;\n  uni.showModal(");
  });

  it("clears stale activity lists immediately and exposes category failures", () => {
    for (const guard of ["pageLoadGuard", "categoryLoadGuard"]) {
      expect(activityList).toContain(`const ${guard} = createTenantLoadGuard()`);
      expect(activityList).toContain(`${guard}.isCurrent(`);
    }
    const reloadTenant = activityList.slice(activityList.indexOf("async function reloadCurrentTenant"), activityList.indexOf("async function handleTenantChanged"));
    expect(reloadTenant.indexOf("pageLoadGuard.invalidate()")).toBeLessThan(reloadTenant.indexOf("await Promise.all"));
    expect(reloadTenant).toContain("rows.value = []");
    expect(activityList).toContain("if (!append) rows.value = []");
    expect(reloadTenant).toContain("Promise.all([loadOperationSetting(), loadCategories(), loadDecoration()])");
    expect(reloadTenant).toContain("await loadFirstPage()");
    expect(activityList).toContain("categoryError.value = err?.message");
    expect(activityList).toContain("function safeList<T>(value: unknown)");
    expect(activityList).toContain("visibleCategories.value.find");
    expect(activityList).toContain("statusTabs.value.find");
    expect(activityList).not.toContain("statusTabs.find(");
    expect(activityList).toContain("categories.value = safeList<PublicCategorySummary>(items)");
    expect(activityList).toContain('import { createTenantLoadGuard, formatShanghaiDateTime } from "../../tenant-load-guard";');
    expect(activityList).toContain('import { groupHomepageActivities } from "../../homepage-order";');
    expect(activityList).toContain("const dateGroups = computed(() => groupHomepageActivities");
    expect(activityList).toContain("formatShanghaiDateTime(item.startTime, '时间待定')");
    expect(activityList).toContain('role="tablist"');
    expect(activityPreviewRow).toContain(':aria-label="`查看活动：${activity.title}`"');
    expect(activityPreviewRow).toContain("organizerLabel?: string");
    expect(activityPreviewRow).toContain("主办：${organizerLabel || '主办方待确认'}");
    expect(activityList).toContain(":organizer-label=\"tenant?.name || '主办方待确认'\"");
    expect(homePage).toContain("<ActivityCard v-for=\"activity in filteredActivities\"");
  });

  it("keeps the activity list failure state on the shared empty-state contract", () => {
    expect(activityList).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(activityList).toContain('variant="error"');
    expect(activityList).toContain('action-text="重新加载"');
    expect(activityList).toContain('@action="loadFirstPage"');
    expect(activityList).not.toContain('class="card state-card" role="alert"');
  });

  it("uses shared loading and error states for the member profile summary", () => {
    expect(userMy).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(userMy).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(userMy).toContain('<LoadingState v-if="loadingProfile && !profile"');
    expect(userMy).toContain('<EmptyState v-else-if="profileError"');
    expect(userMy).toContain('action-text="重新加载"');
    expect(userMy).toContain('@action="loadProfile"');
    expect(userMy).not.toContain('class="profile-state-card" role="status"');
  });

  it("uses shared loading and error states for course order confirmation", () => {
    expect(courseOrderConfirm).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(courseOrderConfirm).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(courseOrderConfirm).toContain('<LoadingState v-if="loading"');
    expect(courseOrderConfirm).toContain('<EmptyState v-else-if="error"');
    expect(courseOrderConfirm).toContain('action-text="重新加载"');
    expect(courseOrderConfirm).toContain('@action="loadCourse"');
    expect(courseOrderConfirm).not.toContain('class="card subtle"');
  });

  it("uses shared loading and error states for the course player", () => {
    expect(coursePlayer).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(coursePlayer).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(coursePlayer).toContain('<LoadingState v-if="loading"');
    expect(coursePlayer).toContain('<EmptyState variant="error"');
    expect(coursePlayer).toContain('action-text="重新加载"');
    expect(coursePlayer).toContain('@action="loadCourse"');
    expect(coursePlayer).toContain('aria-label="返回课程详情"');
    expect(coursePlayer).not.toContain('class="card subtle"');
  });

  it("uses shared loading and error states for course detail", () => {
    expect(courseDetail).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(courseDetail).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(courseDetail).toContain('<LoadingState v-if="loading"');
    expect(courseDetail).toContain('<EmptyState v-else-if="error"');
    expect(courseDetail).toContain('action-text="重新加载"');
    expect(courseDetail).toContain('@action="loadCourse"');
    expect(courseDetail).not.toContain('class="card subtle"');
  });

  it("uses shared loading and error states for publishing activity reflections", () => {
    expect(communityPublish).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(communityPublish).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(communityPublish).toContain('<LoadingState v-if="loading"');
    expect(communityPublish).toContain('<EmptyState v-else-if="loadError"');
    expect(communityPublish).toContain('action-text="重新加载"');
    expect(communityPublish).toContain('@action="loadActivities"');
    expect(communityPublish).toContain('class="state-card warning-state"');
  });

  it("uses one accessible, reduced-motion loading state across the activity funnel", () => {
    expect(loadingState).toContain('role="status"');
    expect(loadingState).toContain('aria-live="polite"');
    expect(loadingState).toContain("prefers-reduced-motion: reduce");
    for (const page of [activityList, activityDetail, activityRegister]) {
      expect(page).toContain('import LoadingState from "../../components/LoadingState.vue";');
      expect(page).toContain("<LoadingState");
    }
    expect(homePage).toContain('v-if="loading" class="state loading"');
  });

  it("keeps tenant switching and forum entry states on the shared loading contract", () => {
    expect(tenantSwitcher).toContain('import LoadingState from "./LoadingState.vue";');
    expect(tenantSwitcher).toContain('import EmptyState from "./EmptyState.vue";');
    expect(tenantSwitcher).toContain('<LoadingState v-if="loading"');
    expect(tenantSwitcher).toContain('<EmptyState v-else-if="loadError"');
    expect(tenantSwitcher).toContain('@action="loadTenantOptions"');
    expect(tenantSwitcher).not.toContain('class="tenant-empty">加载中...</view>');

    expect(forumPublish).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(forumPublish).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(forumPublish).toContain('<LoadingState v-if="categoriesLoading"');
    expect(forumPublish).toContain('<EmptyState v-else-if="categoriesError"');
    expect(forumPublish).not.toContain('class="state-card">版块加载中...</view>');

    expect(forumDetail).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(forumDetail).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(forumDetail).toContain('<LoadingState v-if="loading && !topic"');
    expect(forumDetail).toContain('<EmptyState v-else-if="loadError && !topic"');
    expect(forumDetail).not.toContain('class="state-card" role="status" aria-live="polite">帖子加载中...</view>');
  });

  it("keeps the mall checkout and merchant order entry states on the shared loading contract", () => {
    for (const page of [mallCheckout, merchantApply, mallOrderDetail]) {
      expect(page).toContain('import LoadingState from "../../components/LoadingState.vue";');
      expect(page).toContain('import EmptyState from "../../components/EmptyState.vue";');
    }
    expect(mallCheckout).toContain('<LoadingState v-if="pageLoading"');
    expect(mallCheckout).toContain('<EmptyState v-else-if="loadError"');
    expect(mallCheckout).not.toContain('class="state-card" role="status" aria-live="polite">结算信息加载中...</view>');
    expect(merchantApply).toContain('<LoadingState v-if="pageLoading"');
    expect(merchantApply).toContain('<EmptyState v-else-if="loadError"');
    expect(merchantApply).not.toContain('class="page-state">申请记录加载中...</view>');
    expect(mallOrderDetail).toContain('<LoadingState v-if="pageLoading"');
    expect(mallOrderDetail).not.toContain('class="page-state" role="status" aria-live="polite">订单详情加载中...</view>');
  });

  it("keeps member mall orders and aid application history on the shared state contract", () => {
    for (const page of [mallOrders, aidApply]) {
      expect(page).toContain('import LoadingState from "../../components/LoadingState.vue";');
      expect(page).toContain('import EmptyState from "../../components/EmptyState.vue";');
    }
    expect(mallOrders).toContain('<LoadingState v-if="pageLoading"');
    expect(mallOrders).not.toContain('class="state-card" role="status" aria-live="polite">商城订单加载中...</view>');
    expect(aidApply).toContain('<LoadingState v-if="applicationsLoading"');
    expect(aidApply).toContain('<EmptyState v-else-if="applicationsError"');
    expect(aidApply).not.toContain('class="section state-section">申请记录加载中...</view>');
  });

  it("keeps decoration-backed mobile pages safe when an old client returns a non-array section payload", () => {
    expect(mobileDecoration).toContain("function asDecorationSections(value: unknown)");
    expect(mobileDecoration).toContain("Array.isArray(value)");
    expect(mobileDecoration).toContain('import { sortHomepageSections } from "@activity/shared"');
    expect(mobileDecoration).toContain("return sortHomepageSections(rows)");
    expect(mobileDecoration).toContain("normalizeDecorationSections(payload?.sections)");
    expect(userMy).toContain("function safeList<T>(value: unknown)");
    expect(userMy).toContain("safeList<any>(sections.value).find");
    expect(homePage).toContain("const heroCards = computed(() =>");
    expect(homePage).toContain("const filteredActivities = computed(() =>");
    expect(homePage).toContain("dataSource.value === \"mock\"");
  });

  it("separates guest login prompts from authenticated member-level rejection", () => {
    expect(activityDetail).toContain("function memberLoginRequired()");
    expect(activityDetail).toContain('return "登录后报名"');
    expect(activityDetail).toContain("access.eligible || memberLoginRequired()");
    expect(activityDetail).toContain("memberLoginRequired() || !getUserToken()");
    expect(activityDetail).toContain('return "会员等级不足"');
    expect(activityRegister).toContain("!activity.value.memberAccess.eligible && !memberLoginRequired.value");
    expect(activityRegister).toContain('if (memberLoginRequired.value) return "登录后报名"');
    expect(activityRegister).toContain("if (memberLoginRequired.value) {\n    goLogin();");
    expect(activityRegister).toContain('if (memberBlocked.value) return "会员等级不足"');
  });

  it("recovers an H5 session from removed versioned chunks without a reload loop", () => {
    expect(errorReporting).toContain("isStaleChunkError");
    expect(errorReporting).toContain("failed to fetch dynamically imported module");
    expect(errorReporting).toContain("h5_stale_chunk_reload_at");
    expect(errorReporting).toContain("STALE_CHUNK_RELOAD_WINDOW_MS");
    expect(errorReporting).toContain('url.searchParams.set("__h5_reload"');
    expect(errorReporting).toContain("window.location.replace");
    expect(errorReporting).toContain("event.preventDefault()");
  });

  it("keeps mall home and member collections scoped to the current tenant", () => {
    for (const page of [mallIndex, mallCart, mallFavorites, mallHistory]) {
      expect(page).toContain("createTenantLoadGuard");
      expect(page).toContain("loadGuard.isCurrent(token)");
    }
    expect(mallIndex).toContain('`mall_recent_keywords:${getCurrentTenantCode() || "global"}`');
    expect(mallIndex).toContain("requestedMerchantId");
    expect(mallIndex).toContain("requestedCategoryId");
    expect(mallIndex).toContain("requestedKeyword");
    expect(mallCart.indexOf("confirmingRemoveId.value = item.id")).toBeLessThan(mallCart.indexOf("uni.showModal({", mallCart.indexOf("async function remove")));
    expect(mallCart).toContain("getCurrentTenantCode() === tenantCode");
    expect(mallFavorites).toContain("getCurrentTenantCode() !== tenantCode");
    expect(mallHistory.indexOf("confirmingClear.value = true")).toBeLessThan(mallHistory.indexOf("uni.showModal({", mallHistory.indexOf("async function clearAll")));
  });

  it("keeps checkout reads, address selection and submission tenant-bound", () => {
    for (const guard of ["pageLoadGuard", "addressLoadGuard", "itemLoadGuard", "couponLoadGuard", "quoteLoadGuard", "paymentMethodsLoadGuard", "submitGuard"]) {
      expect(mallCheckout).toContain(`const ${guard} = createTenantLoadGuard()`);
      expect(mallCheckout).toContain(`${guard}.isCurrent(`);
    }
    expect(mallCheckout).toContain('`mall_selected_address_id:${loadToken.tenantCode || "global"}`');
    expect(mallAddresses).toContain('`mall_selected_address_id:${getCurrentTenantCode() || "global"}`');
    const submission = mallCheckout.slice(mallCheckout.indexOf("async function submit()"));
    expect(submission.indexOf("submitting.value = true")).toBeLessThan(submission.indexOf("confirmCrossMerchantCheckout()"));
    expect(submission).toContain("submitGuard.isCurrent(submitToken)");
  });

  it("binds logistics reads and clipboard feedback to one tenant order", () => {
    expect(mallLogistics).toContain("const loadGuard = createTenantLoadGuard()");
    expect(mallLogistics).toContain('const contextKey = `${token.tenantCode}:${requestedOrderId}`');
    expect(mallLogistics).toContain("loadGuard.isCurrent(token)");
    expect(mallLogistics).toContain("orderId.value !== requestedOrderId");
    expect(mallLogistics).toContain('`${getCurrentTenantCode()}:${orderId.value}` === contextKey');
    expect(mallLogistics).toContain('variant="error"');
  });

  it("rejects stale public credential verification responses", () => {
    expect(credentialVerify).toContain("let verifySerial = 0");
    expect(credentialVerify).toContain("const requestedMode = mode.value");
    expect(credentialVerify).toContain("const serial = ++verifySerial");
    expect(credentialVerify).toContain("serial !== verifySerial || mode.value !== requestedMode || code.value.trim() !== value");
    expect(credentialVerify).toContain("function handleCodeInput()");
    expect(credentialVerify).toContain('from "../../tenant-load-guard"');
    expect(credentialVerify).toContain('role="status" aria-live="polite"');
    expect(credentialVerify).toContain('role="alert" aria-live="assertive"');
  });

  it("keeps wallet balances bound to one tenant member session", () => {
    expect(userWallet).toContain("createTenantLoadGuard");
    expect(userWallet).toContain('const contextKey = `${loadToken.tenantCode}:${requestedUserId}`');
    expect(userWallet).toContain("getUserId() === requestedUserId");
    expect(userWallet).toContain("getUserToken() === requestedUserToken");
    expect(userWallet).toContain("if (!isCurrentContext()) return");
    expect(userWallet).toContain("Array.isArray(transactions)");
    expect(userWallet).toContain('from "../../tenant-load-guard"');
    expect(userWallet).toContain('title="余额加载失败"');
    expect(userWallet).toContain('description="请稍候，正在同步余额和流水记录。"');
    expect(userWallet).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(userWallet).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(userWallet).toContain('<LoadingState v-if="loading"');
    expect(userWallet).toContain('action-text="重新加载"');
  });

  it("keeps activity and course orders bound to one member session", () => {
    expect(userOrders).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(userOrders).toContain('variant="error"');
    expect(userOrders).toContain('@action="retryOrders"');
    expect(userOrders).toContain("loadMemberOrderOverview(requestedSession)");
    expect(userOrders).toContain("readMemberOrderSnapshot(session)");
    expect(userOrders).toContain("getUserId() === session.userId");
    expect(userOrders).toContain("getUserToken() === session.userToken");
    expect(userOrders).toContain("if (!isCurrentLoad()) {");
    expect(userOrders).toContain("const serial = ++orderLoadSerial");
    expect(userOrders).toContain("const isActiveLoad = () => serial === orderLoadSerial");
    expect(userOrders).toContain("if (isActiveLoad()) void loadOrders()");
    expect(userOrders).toContain("if (isActiveLoad()) {");
    expect(userOrders).toContain("syncing.value = false");
    expect(userOrders).not.toContain("if (isCurrentLoad()) loading.value = false");
    expect(userOrders).toContain('order?.status === "partially_refunded" ? "部分退款" : "已退款"');
    expect(userOrders).toContain("最近一笔退款已完成");
    expect(userOrders).toContain("order.refundedAmountFen");
    expect(userOrders).toContain("已累计退款");
    expect(userOrders).toContain("assertContext()");
    expect(userOrders).toContain("订单退款状态或金额已变化");
    expect(userOrders).toContain('from "../../tenant-load-guard"');
    expect(userOrders).toContain('role="tablist"');
    expect(userOrders).toContain('type OrderTab = "all" | "pending" | "upcoming" | "after_sale" | "learning" | "completed"');
    expect(userOrders).toContain('{ key: "after_sale", label: "退款售后" }');
    expect(userOrders).toContain('activeTab.value === "after_sale"');
    expect(userOrders).toContain('action-text="重新加载"');
    expect(userOrders).toContain(':aria-disabled="busy"');
    expect(userOrders).toContain("if (busy.value) return");
    expect(userOrders).toContain("if (loadedContextKey.value === contextKey) {");
    expect(userOrders).not.toContain("if (!busy.value) void loadOrders(true)");
    expect(userOrders).toContain("订单同步失败，当前继续展示最近数据");
    expect(userOrders).not.toContain("member-order-cache");
    expect(memberOrderOverview).toContain('request<MemberOrderOverview>("/public/me/orders-overview", options)');
    expect(memberOrderOverview).toContain("responseTenantCode !== session.tenantCode");
    expect(memberOrderOverview).toContain("readMemberOrderSnapshot");
    expect(memberOrderOverview).toContain("部分订单同步失败");
    expect(memberOrderOverview).toContain("订单数据格式异常，请重新加载");
    expect(publicController).toContain('@Get("me/orders-overview")');
    expect(publicController).toContain("this.service.myOrdersOverview(user, this.tenantContext(req, tenantCode))");
    const overviewService = publicService.slice(publicService.indexOf("async myOrdersOverview"), publicService.indexOf("private async myCoursesForTenant"));
    expect(overviewService.match(/resolveTenantContext\(context\)/g)).toHaveLength(1);
    expect(overviewService).toContain("this.myRegistrationsForTenant(userId, scopedTenant)");
    expect(overviewService).toContain("buildMemberOrderOverview(user, tenant");
    expect(serverMemberOrderOverview).toContain("tenantCode: tenant?.code ?? null");
    expect(userOrders).toContain('item.statusClass === "learning"');
    expect(userOrders).not.toContain('class="custom-nav"');
    expect(userOrders).toContain('class="orders-toolbar"');
  });

  it("keeps the member center scoped and aligns asset counts with order filters", () => {
    expect(userMy).toContain("getUserId() === session.userId");
    expect(userMy).toContain("getUserToken() === session.userToken");
    expect(userMy).toContain("loadedContextKey.value !== sessionKey");
    expect(userMy).toContain('request<PublicMemberProfile>("/public/me/profile")');
    expect(userMy).toContain("Promise.allSettled([loadFeatureGates(true), loadDecoration(), loadProfile()])");
    expect(userMy).toContain("正在同步会员资料");
    expect(userMy).toContain("资料同步失败");
    expect(userMy).toContain("登录状态待同步");
    expect(userMy).toContain("会员资料格式异常");
    expect(userMy).toContain("loadMemberOrderOverview(requestedSession)");
    expect(userMy).toContain("orderOverviewResult.value.registrations");
    expect(userMy).toContain("orderOverviewResult.value.failedSources");
    expect(userMy).toContain("applyResult<unknown[]>(4, \"mallOrders\", \"商城订单\", Array.isArray");
    expect(userMy).toContain("learningOnlyCourses()");
    expect(userMy).not.toContain("member-order-cache");
    expect(userMy).toContain('label:"待处理"');
    expect(userMy).toContain('label:"待参与"');
    expect(userMy).toContain('label:"已完成"');
    expect(userMy).toContain("activityOrderIsUpcoming");
    expect(userMy).toContain("查看全部 ›");
    expect(userMy).not.toContain('label:"全部"');
    expect(userMy).toContain("gridTemplateColumns: `repeat(${orderTabs.length}, minmax(0, 1fr))`");
    expect(userMy).not.toContain('pendingRegistrationCount');
    expect(userMy).not.toContain('registrations.value.length + courses.value.length + mallOrders.value.length');
    expect(userMy).toContain("redemptionError.value");
    expect(userMy).toContain("logoutConfirming.value = true");
    expect(userMy).toContain('role="status" aria-live="polite"');
  });

  it("keeps mobile analytics bound to one admin tenant and truthful failure state", () => {
    expect(mobileAdminAnalytics).toContain("getMobileAdminSession");
    expect(mobileAdminAnalytics).toContain("sessionKey(current) === sessionKey(session)");
    expect(mobileAdminAnalytics).toContain("const requestedRangeDays = rangeDays.value");
    expect(mobileAdminAnalytics).toContain("loadedContextKey.value !== contextKey");
    expect(mobileAdminAnalytics).toContain('from "../../tenant-load-guard"');
    expect(mobileAdminAnalytics).toContain("rangeDays.value !== requestedRangeDays");
    expect(mobileAdminAnalytics).toContain("经营统计数据格式异常");
    expect(mobileAdminAnalytics).toContain("趋势数据格式异常");
    expect(mobileAdminAnalytics).toContain("渠道数据格式异常");
    expect(mobileAdminAnalytics).toContain('!pageError && !canViewAnalytics && !loading');
    expect(mobileAdminAnalytics).toContain('aria-label="重新加载经营统计"');
    expect(mobileAdminAnalytics).toContain('aria-label="重新加载趋势数据"');
    expect(mobileAdminAnalytics).toContain('aria-label="重新加载渠道数据"');
    expect(mobileAdminApi).toContain('if (res.statusCode === 401) clearMobileAdminSession()');
    expect(mobileAdminApi).not.toContain('res.statusCode === 401 || res.statusCode === 403');
    expect(mobileAdminHome).not.toContain("err.statusCode === 401 || err.statusCode === 403");
  });

  it("keeps mobile fund-risk data and actions bound to one admin session", () => {
    expect(mobileAdminRiskAlerts).toContain("sessionKey(current) === sessionKey(session)");
    expect(mobileAdminRiskAlerts).toContain("const requestedStatus = status.value");
    expect(mobileAdminRiskAlerts).toContain("loadedContextKey.value !== requestedContextKey");
    expect(mobileAdminRiskAlerts).toContain("资金异常数据格式异常");
    expect(mobileAdminRiskAlerts).toContain('from "../../tenant-load-guard"');
    expect(mobileAdminRiskAlerts).toContain("currentRow.status !== rowSnapshot.status");
    expect(mobileAdminRiskAlerts).toContain("serial !== actionSerial || !isCurrentSession(session)");
    expect(mobileAdminRiskAlerts).toContain('aria-label="重新加载资金异常"');
    expect(mobileAdminRiskAlerts).toContain("@keyup.space.prevent=\"setStatus(item.value)\"");
    expect(mobileAdminRiskAlerts).toContain("!pageError && canView");
    expect(mobileAdminRiskAlerts).not.toContain("String(value).replace(\"T\", \" \").slice(0, 16)");
  });

  it("rejects stale tenant responses across community, forum, charity and mall pages", () => {
    for (const page of [communityIndex, communityDetail, forumIndex, forumDetail, forumPublish, charity, mallDetail]) {
      expect(page).toContain("createTenantLoadGuard");
      expect(page).toContain("isCurrent(");
    }
    expect(communityDetail).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(communityDetail).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(communityDetail).toContain('<LoadingState v-if="loading"');
    expect(communityDetail).toContain('action-text="重新加载"');
    expect(charity).toContain("pageLoadGuard.invalidate()");
    expect(charity).toContain("page.value + 1 !== expectedPage");
    expect(mallDetail).toContain("currentGroupBuy.value?.id === group.id");
  });

  it("refreshes return-sensitive pages when they become visible", () => {
    expect(communityIndex).toContain("onShow(async () =>");
    expect(communityIndex).toContain("void loadActivities()");
    expect(communityIndex).toContain("void loadPosts()");
    expect(communityDetail).toContain("onShow(async () =>");
    expect(communityDetail).toContain("void loadPost()");
    expect(charity).toContain("onShow(() =>");
    expect(mallDetail).toContain("onShow(reload)");
  });

  it("separates fatal product failures from non-blocking promotion failures", () => {
    expect(mallDetail).toContain('v-else-if="loadError"');
    expect(mallDetail).toContain('v-if="promotionWarning"');
    expect(mallDetail).toContain("Promise.allSettled");
    expect(mallDetail).toContain("商品价格与库存仍以结算页为准");
    expect(mallDetail).not.toContain(".catch(() => [])");
  });

  it("locks comment, favorite, report and cart actions before asynchronous work", () => {
    expect(communityDetail).toContain("submitting.value = true");
    expect(communityDetail).toContain("fail: () => { if (actionGuard.isCurrent(actionToken)) submitting.value = false; }");
    expect(mallDetail).toContain('activeAction.value = "favorite"');
    expect(mallDetail).toContain('activeAction.value = "add-cart"');
    expect(mallDetail).toContain("activeAction.value = `report-${item.id}-prompt`");
  });

  it("publishes feature gates after tenant entitlement restrictions are applied", () => {
    expect(publicService).toContain("tenantEntitlementFeatureForGate(key)");
    expect(publicService).toContain("launchConfig.featureGates[key] = false");
    expect(publicService).toContain("tenantFeatureAccess(tenant.settings as any, entitlementFeature).allowed");
    expect(publicService).toContain("const reviewSafeMode = Boolean(tenantConfig.reviewSafeMode ?? platformConfig.reviewSafeMode ?? false)");
    expect(publicService).toContain("featureGates.userContentSharing = false");
    expect(publicService).toContain("featureGates.communityPublish = false");
    expect(publicService).toContain("featureGates.forumPost = false");
    expect(featureGates).toContain('"userContentSharing"');
    expect(featureGates).toContain('featureGatesState.value.userContentSharing !== false');
  });

  it("keeps merchant and order detail failures separate from auxiliary warnings", () => {
    for (const page of [mallMerchant, mallOrderDetail]) {
      expect(page).toContain("createTenantLoadGuard");
      expect(page).toContain('v-else-if="loadError"');
      expect(page).toContain("warning-state");
      expect(page).toContain("isCurrent(token)");
    }
    expect(mallMerchant).toContain("Promise.allSettled");
    expect(mallMerchant).not.toContain(".catch(() => [])");
    expect(mallOrderDetail).toContain("groupLoadWarning");
  });

  it("locks order confirmations and transaction actions before dialogs or requests", () => {
    expect(mallOrderDetail).toContain("activeAction.value = `${key}-prompt`");
    expect(mallOrderDetail).toContain("if (activeAction.value) return");
    expect(mallOrderDetail).toContain('activeAction.value = "review"');
    expect(mallOrderDetail).toContain('activeAction.value = "refund-action"');
    expect(mallOrderDetail).toContain("fail: () => { activeAction.value = \"\"; }");
  });

  it("refreshes review eligibility and partner contact state on show", () => {
    for (const page of [activityReview, partnerPage]) expect(page).toContain("createTenantLoadGuard");
    expect(activityReview).toContain("/public/me/registrations/${registrationId.value}");
    expect(activityReview).toContain("完成现场签到后才能评价这场活动");
    expect(activityReview).toContain("submitted.value = true");
    expect(partnerPage).toContain("合作联系方式加载失败");
    expect(partnerPage).toContain("void refreshTenantScopedPage()");
  });

  it("keeps volunteer task failures separate and locks each write action", () => {
    expect(volunteerPage).toContain("createTenantLoadGuard");
    expect(volunteerPage).toContain('mineLoadError.value = error?.message || "我的志愿服务记录加载失败"');
    expect(volunteerPage).toContain("guardCurrentPageFeature");
    expect(volunteerPage).toContain("await loadFeatureGates(true)");
    for (const action of ["profile", "task:${task.id}", "cancel:${item.id}", "attendance:${item.id}", "service:${item.id}"]) expect(volunteerPage).toContain(action);
    expect(volunteerPage).not.toContain("submitting.value =");
  });

  it("preserves an aid application while retrying only failed materials", () => {
    expect(aidApply).toContain("createTenantLoadGuard");
    expect(aidApply).toContain("pendingApplication.value || await request");
    expect(aidApply).toContain("files.value.splice(0, 1)");
    expect(aidApply).toContain("部分材料待重传");
    expect(aidApply).toContain("guardCurrentPageFeature");
    expect(aidApply).toContain("await loadFeatureGates(true)");
    const supplementUpload = aidApply.slice(aidApply.indexOf("async function chooseSupplementMaterial"), aidApply.indexOf("async function submit()"));
    expect(supplementUpload.indexOf("supplementUploading.value = item.id")).toBeLessThan(supplementUpload.indexOf("const rows = await chooseFiles()"));
  });

  it("refreshes ambassador configuration and exposes submission failures", () => {
    expect(ambassadorApply).toContain("guardCurrentPageFeature");
    expect(ambassadorApply).toContain("await loadFeatureGates(true)");
    expect(ambassadorApply).toContain("submitError.value = error.message || \"提交失败\"");
    expect(ambassadorApply).toContain('v-if="submitError"');
  });

  it("blocks merchant submission until application history is known", () => {
    expect(merchantApply).toContain("createTenantLoadGuard");
    expect(merchantApply).toContain("Promise.allSettled");
    expect(merchantApply).toContain("guardCurrentPageFeature");
    expect(merchantApply).toContain('v-else-if="loadError"');
    expect(merchantApply).toContain("applicationsResult.status === \"rejected\"");
    expect(merchantApply).toContain("if (uploading.value) return");
    expect(merchantApply.indexOf("uploading.value = true")).toBeLessThan(merchantApply.indexOf("const uploaded = await uploadSelectedImage()"));
    expect(merchantApply).not.toContain(".catch(() => [])");
  });

  it("locks assessment submission before confirmation and preserves in-progress answers on show", () => {
    expect(courseAssessment).toContain("createTenantLoadGuard");
    expect(courseAssessment).toContain("confirming.value = true");
    expect(courseAssessment.indexOf("confirming.value = true")).toBeLessThan(courseAssessment.indexOf("uni.showModal({"));
    expect(courseAssessment).toContain("if (submittedAttemptId.value) await loadResult()");
    expect(courseAssessment).toContain("else if (!attempt.value && !result.value) await load()");
    expect(courseAssessment).toContain("guardCurrentPageFeature");
    expect(courseAssessment).toContain('error.value = "当前机构暂未开放课程学习。"');
    expect(courseAssessment).toContain('title="当前考核内容不可用"');
    expect(courseAssessment).toContain('description="请返回课程后重试。"');
    expect(courseAssessment).toContain('action-text="重新加载"');
  });

  it("refreshes community publishing safely and locks image selection before opening it", () => {
    expect(communityPublish).toContain("createTenantLoadGuard");
    expect(communityPublish).toContain("Promise.allSettled");
    expect(communityPublish).toContain("onShow(async () =>");
    expect(communityPublish).toContain("guardCurrentPageFeature");
    const imagePicker = communityPublish.slice(communityPublish.indexOf("async function chooseImages"), communityPublish.indexOf("function removeImage"));
    expect(imagePicker.indexOf("uploading.value = true")).toBeLessThan(imagePicker.indexOf("uni.chooseImage"));
  });

  it("hides disabled community publishing and returns direct visitors to their previous page", () => {
    expect(featureGates).toContain("showFeatureDisabledDialog");
    expect(featureGates).toContain('title: "暂时无法使用"');
    expect(featureGates).toContain('confirmText: "我知道了"');
    expect(featureGates).toContain("if (pages.length > 1) uni.navigateBack()");
    expect(featureGates).not.toContain("setTimeout(() => {\n    uni.reLaunch");
    expect(userRegistrationDetail).toContain("loadFeatureGates(true)");
    expect(userRegistrationDetail).toContain("registrationStatus.value === RegistrationStatus.CheckedIn && endTime > 0 && endTime <= Date.now()");
    expect(userRegistrationDetail).toContain('showFeatureDisabledDialog("/pages/community/publish")');
    expect(userRegistrationDetail).toContain('v-if="canShareActivityPost && communityPublishAvailable"');
    expect(userRegistrationDetail).not.toContain("分享活动心得（暂未开放）");
  });

  it("does not expose activity review before check-in and activity completion", () => {
    expect(userRegistrationDetail).toContain("const canReviewActivity = computed(() =>");
    expect(userRegistrationDetail).toContain("registrationStatus.value === RegistrationStatus.CheckedIn && endTime > 0 && endTime <= currentTime.value");
    expect(userRegistrationDetail).toContain('return canReviewActivity.value ? { label: "评价活动", type: "review" } : { label: "查看活动空间", type: "space" };');
    expect(userRegistrationDetail).toContain('else if (primaryAction.value.type === "space") goActivitySpace();');
    expect(userRegistrationDetail).toContain('v-if="canReviewActivity" class="button secondary" @click="goReview"');
    expect(activityReview).toContain("const activityEnded = computed(() =>");
    expect(activityReview).toContain("活动结束后才能评价这场活动");
  });

  it("does not expose the activity detail publish shortcut before participation is complete", () => {
    expect(activityDetail).toContain('const canShareActivityPost = computed(() =>');
    expect(activityDetail).toContain('status === "checked_in" && endTime > 0 && endTime <= Date.now()');
    expect(activityDetail).toContain("isLinkAllowedByFeature('/pages/community/publish') && canShareActivityPost");
  });

  it("prevents stale address and coupon responses from crossing tenants or filters", () => {
    for (const page of [mallAddresses, mallCoupons]) {
      expect(page).toContain("createTenantLoadGuard");
      expect(page).toContain("guardCurrentPageFeature");
      expect(page).toContain("onShow(async () =>");
    }
    expect(mallAddresses.indexOf("deletingId.value = item.id")).toBeLessThan(mallAddresses.indexOf("uni.showModal({"));
    expect(mallAddresses).toContain("saving.value || deletingId.value || loading.value || loadError.value");
    expect(mallCoupons).toContain("const requestedStatus = status.value");
    expect(mallCoupons).toContain("status.value === requestedStatus && merchantId.value === requestedMerchantId");
    expect(mallCoupons).toContain("getCurrentTenantCode() !== tenantCode");
  });

  it("shows profile load failures and locks the unified avatar upload path", () => {
    expect(userProfile).toContain("createTenantLoadGuard");
    expect(userProfile).toContain('v-else-if="loadError"');
    expect(userProfile).toContain("onShow(() => { void load(); })");
    const localAvatar = userProfile.slice(userProfile.indexOf("async function chooseLocalAvatar"), userProfile.indexOf("async function save()"));
    expect(localAvatar).toContain("uploadingLocalAvatar.value = true");
    expect(localAvatar).toContain("chooseAvatarImage()");
    expect(localAvatar).toContain("uploadMyAvatar(filePath)");
    expect(userProfile).toContain("uploadingLocalAvatar.value || saving.value");
    expect(userProfile).toContain("saveError.value = error.message || \"保存失败\"");
  });

  it("refreshes community learning pages without accepting stale tenant responses", () => {
    for (const page of [communityProgram]) {
      expect(page).toContain("createTenantLoadGuard");
      expect(page).toContain("loadGuard.isCurrent(token)");
      expect(page).toContain("onShow(async () =>");
      expect(page).toContain("await loadFeatureGates(true)");
      expect(page).toContain("guardCurrentPageFeature");
    }
    expect(communityProgram).toContain('aria-live="assertive"');
    expect(communityCheckin).toContain('import { onLoad } from "@dcloudio/uni-app";');
    expect(communityCheckin).toContain('uni.redirectTo({ url: withTenantCode("/pages/checkin/index") });');
    expect(communityProgram).toContain("loadedContextKey.value !== nextContextKey");
    expect(communityProgram).toContain('from "../../tenant-load-guard"');
    expect(communityCheckin).toContain("Keep old deep links usable");
  });

  it("locks program media, location and writes before opening asynchronous controls", () => {
    expect(communityProgram).toContain("const activeAction = ref");
    expect(communityProgram).toContain('activeAction.value = "join"');
    expect(communityProgram).toContain("activeAction.value = `checkin:${task.id}`");
    const imagePicker = communityProgram.slice(communityProgram.indexOf("async function chooseImage"), communityProgram.indexOf("async function chooseLocation"));
    expect(imagePicker.indexOf("activeAction.value = `image:${taskId}`")).toBeLessThan(imagePicker.indexOf("uni.chooseImage"));
    const locationPicker = communityProgram.slice(communityProgram.indexOf("async function chooseLocation"), communityProgram.indexOf("function previewTaskImage"));
    expect(locationPicker.indexOf("activeAction.value = `location:${taskId}`")).toBeLessThan(locationPicker.indexOf("uni.chooseLocation"));
    expect(communityProgram).toContain("getCurrentTenantCode()")
    expect(communityCheckin).toContain("withTenantCode");
  });

  it("keeps activity search state tenant-scoped and exposes loading failures", () => {
    expect(searchPage).toContain("createTenantLoadGuard");
    expect(searchPage).toContain("loadGuard.isCurrent(token)");
    expect(searchPage).toContain('error.value=reviewSafeText(e?.message||"活动搜索失败")');
    expect(searchPage).toContain('request(`/public/activities?${params.join("&")}`)');
    expect(searchPage).toContain("onShow(()=>void load())");
  });

  it("refreshes service settings independently from decoration fallbacks", () => {
    expect(servicePage).toContain("createTenantLoadGuard");
    expect(servicePage).toContain("Promise.allSettled([load(), loadDecoration()])");
    expect(servicePage).toContain('loadError.value = reviewSafeText(error?.message || "服务信息加载失败")');
    expect(servicePage).toContain("setting.value?.[paymentInstructionsField]");
    expect(servicePage).toContain("onShow(async () =>");
  });

  it("does not display failed favorite requests as an empty collection", () => {
    expect(favoriteCourses).toContain("createTenantLoadGuard");
    expect(favoriteCourses).toContain('v-else-if="loadError"');
    expect(favoriteCourses).toContain('loadError.value = reviewSafeText(error?.message || "收藏内容加载失败")');
    expect(favoriteCourses).toContain("onShow(async () =>");
    expect(favoriteCourses).toContain("guardCurrentPageFeature");
  });

  it("sends stable appeal idempotency keys and preserves submission errors", () => {
    expect(contentAppeals).toContain("createTenantLoadGuard");
    expect(contentAppeals).toContain('header: { "x-idempotency-key": key }');
    expect(contentAppeals).toContain("appealKey.value = key");
    expect(contentAppeals).toMatch(/request<[^>]+>\("\/public\/me\/content\/appeals",\s*\{/);
    expect(contentAppeals.indexOf("submitting.value = true")).toBeLessThan(contentAppeals.search(/request<[^>]+>\("\/public\/me\/content\/appeals",\s*\{/));
    expect(contentAppeals).toContain('actionError.value = reviewSafeText(error?.message || "申诉提交失败")');
    expect(contentAppeals).toContain("getCurrentTenantCode() !== tenantCode");
    expect(contentAppeals).toContain('from "../../tenant-load-guard"');
    expect(contentAppeals).toContain('formatShanghaiDateTime');
  });

  it("locks settings dialogs before they open and preserves tenant context on logout", () => {
    expect(userSettings.indexOf('activeAction.value = "logout"')).toBeLessThan(userSettings.indexOf("uni.showModal({", userSettings.indexOf("function logout")));
    expect(userSettings).toContain('if (!r.confirm) { activeAction.value = ""; return; }');
    expect(userSettings).toContain('uni.reLaunch({ url:withTenantCode(mobileTabRoute("me")) })');
    expect(userSettings).toContain('import { mobileTabRoute } from "../../mobile-tab-routes";');
    expect(userSettings).toContain('role="button"');
    expect(userSettings).toContain('request<{ miniprogramVersion?: string | null }>("/public/settings/operation")');
    expect(userSettings).toContain("小程序版本 ${clientVersion.value}");
    expect(publicService).toContain("miniprogramVersion: String(miniprogramRelease?.version || \"\").trim() || null");
  });

  it("refreshes announcements with tenant and schedule-safe presentation state", () => {
    expect(announcementList).toContain("createTenantLoadGuard");
    expect(announcementList).toContain("loadGuard.isCurrent(token)");
    expect(announcementList).toContain("Promise.allSettled([load(), loadDecoration()])");
    expect(announcementList).toContain('from "../../tenant-load-guard"');
    expect(announcementList).toContain('variant="error"');
    expect(announcementList).toContain("onShow(async () =>");
  });

  it("keeps brand configuration defaults visible while exposing retryable failures", () => {
    expect(entryPages).toContain("createTenantLoadGuard");
    expect(entryPages).toContain("loadGuard.isCurrent(token)");
    expect(entryPages).toContain('error.value = loadError?.message || "页面配置加载失败"');
    expect(brandStory).toContain('v-if="configError"');
    expect(brandStory).toContain("refreshTenantScopedPage");
    expect(brandStory).toContain("onShow(async () =>");
  });

  it("rejects stale course catalog responses and applies the course entitlement gate", () => {
    expect(courseCatalog).toContain("createTenantLoadGuard");
    expect(courseCatalog).toContain("loadGuard.isCurrent(token)");
    expect(courseCatalog).toContain("await loadFeatureGates(true)");
    expect(courseCatalog).toContain("guardCurrentPageFeature");
    expect(courseCatalog).toContain("Promise.allSettled([loadCourses(), loadDecoration()])");
    expect(courseCatalog).toContain('variant="error"');
    expect(courseData).toContain('row?.categoryName || tags[0] || "全部"');
  });

  it("refreshes community social assets per tenant and protects notification writes", () => {
    expect(communitySocial).toContain("createTenantLoadGuard");
    expect(communitySocial).toContain("loadGuard.isCurrent(token)");
    expect(communitySocial).toContain("getCurrentTenantCode() !== tenantCode");
    expect(communitySocial).toContain("await loadFeatureGates(true)");
    expect(communitySocial).toContain('from "../../tenant-load-guard"');
    expect(featureGates).toContain('"/pages/user/community-social"');
  });

  it("uses the shared loading and error states for the social profile form", () => {
    expect(socialProfile).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(socialProfile).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(socialProfile).toContain('<LoadingState v-if="loading"');
    expect(socialProfile).toContain('<EmptyState v-else-if="loadError"');
    expect(socialProfile).toContain('action-text="重新加载"');
    expect(socialProfile).toContain('@action="load"');
    expect(socialProfile).not.toContain('class="state"');
  });

  it("persists login errors and throttles repeated verification-code requests", () => {
    expect(userLogin).toContain("const actionError = ref");
    expect(userLogin).toContain("const cooldownSeconds = ref");
    expect(userLogin).toContain("startCooldown(data.cooldownSeconds || 60)");
    expect(userLogin).toContain('role="alert"');
    expect(userLogin).toContain('confirm-type="done"');
    expect(userLogin).toContain("onUnmounted");
  });

  it("keeps search activity dates in the shared Shanghai timezone", () => {
    expect(searchPage).toContain('import { createTenantLoadGuard, formatShanghaiDate, formatShanghaiTime } from "../../tenant-load-guard";');
    expect(searchPage).toContain("formatShanghaiDate(value, \"\")");
    expect(searchPage).toContain("formatShanghaiTime(value, \"时间待定\")");
    expect(searchPage).not.toContain("new Date(value)");
  });

  it("keeps activity-related community and member times on the shared Shanghai clock", () => {
    const home = readPage("home/index.vue");
    const member = readPage("user/my.vue");
    const community = readPage("community/index.vue");
    const program = readPage("community/program.vue");
    const forum = readPage("forum/detail.vue");
    expect(home).toContain("queryActivities");
    expect(member).toContain("formatShanghaiDateTime(value, \"时间待确认\")");
    expect(community).toContain("formatShanghaiDateTime(value, \"\")");
    expect(program).toContain("formatShanghaiDateTime(value, \"未设置\")");
    expect(forum).toContain("formatShanghaiDateTime(value, \"\")");
    for (const source of [home, member, community, program, forum]) expect(source).not.toContain("new Date(value)");
  });

  it("keeps search loading, failure, and no-result states on the shared empty-state contract", () => {
    expect(searchPage).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(searchPage).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(searchPage).toContain('<LoadingState v-if="loading"');
    expect(searchPage).toContain('title="正在搜索活动"');
    expect(searchPage).toContain('variant="error"');
    expect(searchPage).toContain('action-text="重新加载"');
    expect(searchPage).toContain('variant="activity"');
    expect(searchPage).toContain('@action="load"');
  });

  it("keeps service and charity page states on the shared loading and error contract", () => {
    for (const page of [servicePage, charity]) {
      expect(page).toContain('import EmptyState from "../../components/EmptyState.vue";');
      expect(page).toContain('import LoadingState from "../../components/LoadingState.vue";');
      expect(page).toContain('<LoadingState v-if="loading"');
      expect(page).toContain('variant="error"');
      expect(page).toContain('action-text="重新加载"');
    }
    expect(servicePage).toContain('@action="refreshTenantScopedPage"');
    expect(charity).toContain('@action="load"');
  });

  it("keeps partner application entry pages on the shared loading and error contract", () => {
    for (const page of [ambassadorLanding, partnerPage, deanRecruit]) {
      expect(page).toContain('import EmptyState from "../../components/EmptyState.vue";');
      expect(page).toContain('import LoadingState from "../../components/LoadingState.vue";');
      expect(page).toContain('<LoadingState v-if="loading"');
      expect(page).toContain('variant="error"');
      expect(page).toContain('action-text="重新加载"');
    }
    expect(ambassadorLanding).toContain('@action="refreshPage"');
    expect(partnerPage).toContain('@action="load"');
    expect(deanRecruit).toContain('@action="refreshPage"');
  });

  it("keeps mall discovery and product detail states on the shared contract", () => {
    for (const page of [mallIndex, mallDetail]) {
      expect(page).toContain('import EmptyState from "../../components/EmptyState.vue";');
      expect(page).toContain('import LoadingState from "../../components/LoadingState.vue";');
      expect(page).toContain('<LoadingState v-if="loading"');
      expect(page).toContain('variant="error"');
      expect(page).toContain('action-text="重新加载"');
    }
    expect(mallIndex).toContain('@action="load"');
    expect(mallDetail).toContain('@action="reload"');
    expect(mallDetail).toContain("promotionWarning");
  });

  it("keeps mall address, cart and coupon states on the shared contract", () => {
    for (const page of [mallAddresses, mallCart, mallCoupons]) {
      expect(page).toContain('import EmptyState from "../../components/EmptyState.vue";');
      expect(page).toContain('import LoadingState from "../../components/LoadingState.vue";');
      expect(page).toContain('<LoadingState v-if="loading"');
      expect(page).toContain('variant="error"');
      expect(page).toContain('action-text="重新加载"');
    }
    expect(mallAddresses).toContain('@action="load"');
    expect(mallCart).toContain('@action="load"');
    expect(mallCoupons).toContain('@action="load"');
  });

  it("keeps mall favorites, history and logistics states on the shared contract", () => {
    for (const page of [mallFavorites, mallHistory, mallLogistics]) {
      expect(page).toContain('import EmptyState from "../../components/EmptyState.vue";');
      expect(page).toContain('import LoadingState from "../../components/LoadingState.vue";');
      expect(page).toContain('<LoadingState v-if="loading"');
      expect(page).toContain('variant="error"');
      expect(page).toContain('action-text="重新加载"');
    }
    expect(mallFavorites).toContain('@action="load"');
    expect(mallHistory).toContain('@action="load"');
    expect(mallLogistics).toContain('@action="load"');
  });

  it("keeps mall merchant and referral commission states on the shared contract", () => {
    for (const page of [mallMerchant, mallReferralCommissions]) {
      expect(page).toContain('import EmptyState from "../../components/EmptyState.vue";');
      expect(page).toContain('import LoadingState from "../../components/LoadingState.vue";');
      expect(page).toContain('<LoadingState v-if="loading"');
      expect(page).toContain('variant="error"');
      expect(page).toContain('action-text="重新加载"');
    }
    expect(mallMerchant).toContain('@action="load"');
    expect(mallReferralCommissions).toContain('@action="load"');
  });

  it("only exposes the community publish entry when real postable activities exist", () => {
    const communityHome = readPage("community/index.vue");
    expect(communityHome).toContain('import { ensureUser, getUserToken, request, withTenantCode } from "../../api";');
    expect(communityHome).toContain('request<any[]>("/public/me/community/postable-activities")');
    expect(communityHome).toContain("const showPublishEntry = computed");
    expect(communityHome).toContain("publishActivitiesLoaded.value && publishActivities.value.length > 0");
    expect(communityHome).toContain('v-if="showPublishEntry"');
  });

  it("keeps the member community-posts publish actions behind the same eligibility source", () => {
    const communityPosts = readPage("user/community-posts.vue");
    expect(communityPosts).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(communityPosts).toContain('variant="error"');
    expect(communityPosts).toContain('variant="review"');
    expect(communityPosts).toContain('@action="loadPosts"');
    expect(communityPosts).toContain('request<any[]>("/public/me/community/postable-activities")');
    expect(communityPosts).toContain("const canPublish = computed(() => postableActivities.value.length > 0)");
    expect(communityPosts).toContain(":action-text=\"canPublish ? '发布心得' : ''\"");
    expect(communityPosts).toContain('v-if="posts.length && canPublish"');
    expect(communityPosts).toContain('完成活动后才可以发布心得');
  });

  it("keeps the social directory on the shared empty-state contract", () => {
    const social = readPage("community/social.vue");
    expect(social).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(social).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(social).toContain('<LoadingState v-if="loading"');
    expect(social).toContain('variant="error"');
    expect(social).toContain('variant="social"');
    expect(social).toContain('@action="loadProfiles"');
    expect(social).not.toContain('class="retry" aria-label="重新加载拓展伙伴"');
  });

  it("keeps social connection history on the shared loading and empty-state contract", () => {
    expect(socialConnections).toMatch(/import EmptyState from [\"']\.\.\/\.\.\/components\/EmptyState\.vue[\"'];/);
    expect(socialConnections).toMatch(/import LoadingState from [\"']\.\.\/\.\.\/components\/LoadingState\.vue[\"'];/);
    expect(socialConnections).toContain('<LoadingState v-if="loading && !rows.length"');
    expect(socialConnections).toContain('variant="error"');
    expect(socialConnections).toContain('variant="social"');
    expect(socialConnections).toContain('@action="load(true)"');
    expect(socialConnections).not.toContain('class="connection-state error"');
  });

  it("keeps social card loading, private and failure states on the shared contract", () => {
    expect(communityCard).toMatch(/import EmptyState from [\"']\.\.\/\.\.\/components\/EmptyState\.vue[\"'];/);
    expect(communityCard).toMatch(/import LoadingState from [\"']\.\.\/\.\.\/components\/LoadingState\.vue[\"'];/);
    expect(communityCard).toContain('<LoadingState v-if="loading"');
    expect(communityCard).toContain('variant="error"');
    expect(communityCard).toContain('variant="social"');
    expect(communityCard).toContain('@action="load"');
    expect(communityCard).not.toContain('class="state error"');
  });

  it("keeps community home sections on independent shared loading and empty states", () => {
    expect(communityIndex).toMatch(/import LoadingState from [\"']\.\.\/\.\.\/components\/LoadingState\.vue[\"'];/);
    expect(communityIndex).toContain('<LoadingState v-if="activitiesLoading"');
    expect(communityIndex).toContain('<LoadingState v-if="checkinLoading"');
    expect(communityIndex).toContain('<LoadingState v-if="postsLoading"');
    expect(communityIndex).toContain('variant="error"');
    expect(communityIndex).toContain('variant="activity"');
    expect(communityIndex).toContain('variant="social"');
    expect(communityIndex).not.toContain('class="section-state error-state"');
    expect(communityIndex).not.toContain('class="inline-state error-state"');
    expect(communityIndex).not.toContain('class="empty-post-card"');
  });

  it("keeps announcement history on the shared loading and empty-state contract", () => {
    expect(announcementList).toMatch(/import EmptyState from [\"']\.\.\/\.\.\/components\/EmptyState\.vue[\"'];/);
    expect(announcementList).toMatch(/import LoadingState from [\"']\.\.\/\.\.\/components\/LoadingState\.vue[\"'];/);
    expect(announcementList).toContain('<LoadingState v-if="loading"');
    expect(announcementList).toContain('variant="error"');
    expect(announcementList).toContain('variant="default"');
    expect(announcementList).toContain('@action="load"');
    expect(announcementList).not.toContain('class="state-card error-state"');
  });

  it("keeps the twelve slow-pi empty-state illustration variants explicit and portable", () => {
    for (const variant of ["activity", "error", "success", "payment", "waitlist", "ended", "space", "checkin", "review", "social", "order", "service"]) {
      expect(emptyState).toContain(`empty-state-illustration--${variant}`);
    }
    expect(emptyState).toContain("empty-state-art");
    expect(emptyState).not.toContain("document.");
    expect(emptyState).not.toContain("window.");
  });

  it("exposes home activity failures without accepting stale tenant responses", () => {
    expect(homePage).toContain("const loadError = ref(\"\")");
    expect(homePage).toContain("publicActivities.value = []");
    expect(homePage).toContain('activities.value = tenantCode.value === "qiwai-showcase"');
    expect(homePage).toContain("visibleActivitiesForTenant(tenantCode.value, publicActivities.value)");
    expect(homePage).toContain("function retryLoad()");
    expect(homePage).toContain('v-if="loadError" class="state notice"');
    expect(homePage).toContain("<view v-if=\"loading\" class=\"state loading\"");
    expect(homePage).toContain("const demoMode = computed");
    expect(publicService).toContain("const needsHistoricalActivities");
    expect(publicService).toContain("config.showEnded === true");
    expect(publicService).toContain("const currentActivities = payload.latest.filter((item) => item.displayStatus !== \"ended\")");
    expect(publicService).toContain("operationSetting.publicActivityArchiveEnabled && source.some");
    expect(publicService).toContain("payload.publicActivityArchiveEnabled && config.showEnded === true");
    expect(activityList).toContain("const publicActivityArchiveEnabled = ref(false)");
    expect(activityList).toContain('value === "ended" && !publicActivityArchiveEnabled.value');
    expect(mobileDecorationBlocks).toContain('from "../tenant-load-guard"');
    expect(mobileDecorationBlocks).toContain("formatShanghaiDateTime(value)");
    expect(mobileDecorationBlocks).toContain("const match = /^(\\d{4})-(\\d{2})-(\\d{2}) (\\d{2}:\\d{2})$/");
  });

  it("keeps activity sharing attributable and confines group QR recognition to the native image flow", () => {
    expect(activityDetail).toContain('return Number(activity.value?.price || 0) > 0 ? `报名并支付 ${priceText(activity.value.price)}` : "立即报名"');
    expect(activityDetail).toContain("function seatsText()");
    expect(activityDetail).toContain("if (activity.value.remainingSeats === null || activity.value.remainingSeats === undefined)");
    expect(activityDetail).toContain("{{ seatsText() }}");
    expect(activityDetail).toContain("/share-poster");
    expect(activityDetail).toContain("inviteCode.value = String(invite.value?.code || \"\")");
    expect(activityDetail).toContain('open-type="share"');
    expect(activityDetail).toContain("generateMiniProgramPoster");
    expect(activityDetail).toContain("activityPosterCanvas");
    expect(userRegistrationDetail).toContain("长按图片识别群二维码");
    expect(userRegistrationDetail).toContain('show-menu-by-longpress="true"');
    expect(userRegistrationDetail).not.toContain("scanGroupQr");
    expect(appBottomNav).not.toContain("openActivityQuickAction");
    expect(appBottomNav).not.toContain('aria-label="扫码识别平台活动码或签到码"');
    expect(homePage).toContain('placeholder="搜索活动、地点或主理人"');
    expect(mobileScanPage).toContain('onlyFromCamera: source === "camera"');
    expect(mobileScanPage).toContain('scanType: ["qrCode"]');
    expect(mobileScanPage).toContain('from "../../activity-qr"');
    expect(mobileActivityQr).toContain('path !== "/pages/activity/detail"');
    expect(mobileScanPage).toContain("签到码请由签到员在手机管理端扫码核销");
  });

  it("keeps the home tenant switcher outside transformed containers", () => {
    expect(homePage).toContain('<view class="topbar">');
    expect(homePage).toContain('<view class="search">');
  });

  it("lets home activity tabs consume decorated category order before the fallback endpoint", () => {
    expect(homePage).toContain("const categories = [\"推荐\", \"城市漫步\"");
    expect(homePage).toContain("<CategoryScroller :items=\"categories\"");
    expect(homePage).toContain("filterCategory.value = category");
  });

  it("keeps activity list dates on the shared Shanghai time contract", () => {
    expect(activityList).toContain('import { createTenantLoadGuard, formatShanghaiDateTime } from "../../tenant-load-guard";');
    expect(activityList).toContain('import { groupHomepageActivities } from "../../homepage-order";');
    expect(activityList).toContain("const dateGroups = computed(() => groupHomepageActivities");
    expect(activityList).toContain("formatShanghaiDateTime(item.startTime, '时间待定')");
    expect(activityList).not.toContain("const shifted = valid ? new Date(date.getTime() + 8 * 60 * 60 * 1000)");
  });

  it("keeps the member center linked to a tenant-scoped activity review history", () => {
    expect(userMy).toContain('label:"我的评价", page:"activityReviews"');
    expect(userMy).toContain('activityReviews: "/pages/user/activity-reviews"');
    expect(activityReviewsPage).toContain('request<any[]>("/public/me/activity-reviews")');
    expect(activityReviewsPage).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(activityReviewsPage).toContain('variant="error"');
    expect(activityReviewsPage).toContain('@action="loadReviews"');
    expect(activityReviewsPage).toContain("createTenantLoadGuard");
    expect(activityReviewsPage).toContain("onShow(loadReviews)");
    expect(publicController).toContain('Get("me/activity-reviews")');
    expect(publicService).toContain("async myActivityReviews(user: User, context?: PublicTenantContext)");
    expect(publicService).toContain('where("review.userId = :userId", { userId: user.id })');
    expect(publicService).toContain('activity.tenantId = :tenantId OR activity.tenantId IS NULL');
  });

  it("keeps member forum records on the shared empty-state contract", () => {
    const forumPosts = readPage("user/forum-posts.vue");
    expect(forumPosts).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(forumPosts).toContain('variant="error"');
    expect(forumPosts).toContain('@action="load"');
    expect(forumPosts).toContain('variant="default"');
  });

  it("refreshes learning history and course order pages per tenant", () => {
    for (const page of [learningHistory, courseOrderConfirm, coursePaymentResult]) {
      expect(page).toContain("createTenantLoadGuard");
      expect(page).toContain("loadGuard.isCurrent(token)");
      expect(page).toContain("onShow(");
    }
    expect(learningHistory).toContain('from "../../tenant-load-guard"');
    expect(learningHistory).toContain('request<any[]>("/public/me/activity-history")');
    expect(learningHistory).toContain('error?.statusCode === 404');
    expect(learningHistory).toContain('message.includes("Cannot GET /api/public/me/activity-history")');
    expect(learningHistory).toContain("activeTab === 'activities'");
    expect(publicController).toContain('Get("me/activity-history")');
    expect(publicService).toContain("async myActivityHistory(user: User, context?: PublicTenantContext)");
    expect(publicService).toContain('where("viewLog.userId = :userId", { userId: user.id })');
    expect(publicService).toContain("RegistrationStatus.CheckedIn");
    expect(courseOrderConfirm).toContain("clientOrderKey.value = createClientOrderKey()");
    expect(courseOrderConfirm).toContain('const contextKey = `${token.tenantCode}:${id}`');
  });

  it("locks course order closing before confirmation and releases every dialog path", () => {
    const closeOrder = coursePaymentResult.slice(coursePaymentResult.indexOf("function closeOrder"));
    expect(closeOrder.indexOf("closing.value = true")).toBeLessThan(closeOrder.indexOf("uni.showModal({"));
    expect(closeOrder).toContain("fail: () => { closing.value = false; }");
    expect(closeOrder).toContain("if (!res.confirm) { closing.value = false; return; }");
    expect(closeOrder).toContain("getCurrentTenantCode() !== tenantCode");
  });

  it("refreshes account security per tenant and throttles verification codes", () => {
    expect(userSecurity).toContain("createTenantLoadGuard");
    expect(userSecurity).toContain("loadGuard.isCurrent(loadToken)");
    expect(userSecurity).toContain("onShow(load)");
    expect(userSecurity).toContain("startCooldown((result as any).cooldownSeconds || 60)");
    expect(userSecurity).toContain("getCurrentTenantCode() !== tenantCode");
    expect(userSecurity).toContain('role="alert"');
    expect(userSecurity).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(userSecurity).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(userSecurity).toContain('<LoadingState v-if="loading"');
    expect(userSecurity).toContain('action-text="重新加载"');
  });

  it("keeps course playback and auxiliary responses tenant-consistent", () => {
    expect(coursePlayer).toContain("createTenantLoadGuard");
    expect(coursePlayer).toContain("loadGuard.isCurrent(loadToken)");
    expect(coursePlayer).toContain('const contextKey = `${loadToken.tenantCode}:${id}`');
    expect(coursePlayer).toContain('const failedNames = ["考核", "公告", "答疑"]');
    expect(coursePlayer).toContain("getCurrentTenantCode() !== tenantCode");
    expect(coursePlayer).toContain('from "../../tenant-load-guard"');
  });

  it("refreshes mobile management lists and rejects stale dashboard responses", () => {
    for (const page of [mobileAdminHome, mobileAdminActivities, mobileAdminOrders, mobileAdminRegistrations]) {
      expect(page).toContain('from "@dcloudio/uni-app"');
      expect(page).toContain("onShow(load)");
      expect(page).not.toContain("onMounted(load)");
    }
    expect(mobileAdminHome).toContain("const serial = ++loadSerial");
    expect(mobileAdminHome).toContain("if (serial !== loadSerial) return");
    expect(mobileAdminHome).toContain('pageError.value = err.message || "移动管理首页加载失败"');
  });

  it("starts and stops mobile check-in work with page visibility", () => {
    expect(mobileAdminCheckIn).toContain("onShow(async () =>");
    expect(mobileAdminCheckIn).toContain("onHide(() =>");
    expect(mobileAdminCheckIn).toContain("if (pageVisible) startOverviewTimer()");
    expect(mobileAdminCheckIn).toContain("serial !== overviewSerial");
    expect(mobileAdminCheckIn).toContain("serial !== pointsSerial");
    expect(mobileAdminCheckIn).not.toContain("onMounted(async () =>");
  });

  it("preserves activity drafts while refreshing safe mobile edit states", () => {
    expect(mobileActivityEdit).toContain("watch([form, fields, hosts, sections]");
    expect(mobileActivityEdit).toContain("if (uploadingTarget.value || saving.value) return");
    expect(mobileActivityEdit.indexOf("uploadingTarget.value = target")).toBeLessThan(mobileActivityEdit.indexOf("uni.chooseImage"));
    expect(mobileActivityEdit).toContain("if (!initialized || (!dirty.value && !saving.value && !uploadingTarget.value)) void load()");
    expect(mobileActivityPreview).toContain("onShow(load)");
    expect(mobileActivityPreview).toContain("if (serial !== loadSerial) return");
    expect(mobileActivityEdit).toContain("const selectionLocked = computed");
    expect(mobileActivityEdit).toContain(':disabled="selectionLocked"');
    expect(mobileActivityEdit).toContain("if (selectionLocked.value) return");
  });

  it("locks community deletion before confirmation and keeps it tenant-scoped", () => {
    expect(communityPosts).toContain("createTenantLoadGuard");
    expect(communityPosts).toContain("loadGuard.isCurrent(loadToken)");
    const deletion = communityPosts.slice(communityPosts.indexOf("function deletePost"));
    expect(deletion.indexOf("deletingId.value = post.id")).toBeLessThan(deletion.indexOf("uni.showModal({"));
    expect(deletion).toContain("fail: () => { deletingId.value = 0; }");
    expect(deletion).toContain("getCurrentTenantCode() !== tenantCode");
  });

  it("preserves same-tenant volunteer credentials and exposes download failures", () => {
    expect(userCertificates).toContain("const sameTenant = loadedTenantCode.value === loadToken.tenantCode");
    expect(userCertificates).toContain("if (!sameTenant) volunteer.value = { badges: [], proofs: [] }");
    expect(userCertificates).toContain("downloadError.value = reviewSafeText");
    expect(userCertificates).toContain("getCurrentTenantCode() !== tenantCode");
    expect(userCertificates).toContain('from "../../tenant-load-guard"');
    expect(userCertificates).toContain('c.imageUrl || c.previewUrl');
    expect(userCertificates).toContain('mode="aspectFit"');
  });

  it("persists mobile admin login failures and exposes accessible password controls", () => {
    expect(mobileAdminLogin).toContain("const actionError = ref");
    expect(mobileAdminLogin).toContain('role="alert"');
    expect(mobileAdminLogin).toContain('aria-label="后台账号"');
    expect(mobileAdminLogin).toContain(':password="!showPassword"');
    expect(mobileAdminLogin).toContain("onShow(() =>");
    expect(mobileAdminLogin).not.toContain('uni.showToast({ title: err.message || "登录失败"');
  });

  it("refreshes mobile refunds on show and rechecks the admin tenant before review", () => {
    expect(mobileAdminRefunds).toContain("onShow(() => { void load(true); })");
    expect(mobileAdminRefunds).not.toContain("onMounted(load)");
    expect(mobileAdminRefunds).toContain("const actionError = ref");
    expect(mobileAdminRefunds).toContain("currentSession.token !== session.token");
    expect(mobileAdminRefunds).toContain("currentSession.tenantId !== session.tenantId");
    expect(mobileAdminRefunds).toContain('from "../../tenant-load-guard"');
    expect(mobileAdminRefunds).toContain('role="alert"');
    expect(mobileAdminRefunds).toContain('from "../../query"');
    expect(mobileAdminRefunds).not.toContain("URLSearchParams");
    expect(mobileAdminRefunds).toContain("finally {\n        actionId.value = null;\n        await load(true);");
  });

  it("binds registration detail reads and writes to one tenant registration context", () => {
    expect(userRegistrationDetail).toContain("createTenantLoadGuard");
    expect(userRegistrationDetail).toContain('const contextKey = `${loadToken.tenantCode}:${id}`');
    expect(userRegistrationDetail).toContain("loadGuard.isCurrent(loadToken)");
    expect(userRegistrationDetail).toContain("getCurrentTenantCode()");
    expect(userRegistrationDetail).toContain("assertActionContext(context)");
    expect(userRegistrationDetail).toContain("current.registrationId !== context.registrationId");
    expect(userRegistrationDetail).toContain("current.orderId !== context.orderId");
    expect(userRegistrationDetail).toContain("codeRequestSerial");
    expect(userRegistrationDetail).toContain("codeRequestSerial += 1");
    expect(userRegistrationDetail).toContain("const paymentActionGuard = createTenantLoadGuard()");
    expect(userRegistrationDetail).toContain("const paymentActionToken = paymentActionGuard.begin()");
    expect(userRegistrationDetail).toContain("paymentActionGuard.isCurrent(paymentActionToken)");
    expect(userRegistrationDetail).toContain("paymentActionGuard.invalidate()");
    expect(userRegistrationDetail).toContain("const refundActionGuard = createTenantLoadGuard()");
    expect(userRegistrationDetail).toContain("const refundActionToken = refundActionGuard.begin()");
    expect(userRegistrationDetail).toContain("refundActionGuard.isCurrent(refundActionToken)");
    expect(userRegistrationDetail).toContain("refundActionGuard.invalidate()");
    expect(userRegistrationDetail).toContain("onHide");
    expect(userRegistrationDetail).toContain("Promise.allSettled([load(), loadDecoration(), loadFeatureGates(true)])");
    expect(userRegistrationDetail).toContain('role="alert"');
    expect(userRegistrationDetail).toContain('from "../../tenant-load-guard"');
  });

  it("keeps personal course and forum assets tenant-safe and accessible", () => {
    for (const page of [userCourses, userForumPosts]) {
      expect(page).toContain("createTenantLoadGuard");
      expect(page).toContain("loadGuard.isCurrent(loadToken)");
      expect(page).toContain("loadedTenantCode");
      expect(page).toContain("reviewSafeText");
      expect(page).toContain("max-width:760px");
    }
    expect(userCourses).toContain('variant="error"');
    expect(userForumPosts).toContain('variant="error"');
    expect(userForumPosts).toContain("const sameTenant = loadedTenantCode.value === loadToken.tenantCode");
    expect(userForumPosts).toContain("if (!sameTenant) targets[index].value = []");
    expect(userForumPosts).toContain('from "../../tenant-load-guard"');
    expect(userForumPosts).toContain("await loadFeatureGates(true)");
    expect(userForumPosts).toContain("guardCurrentPageFeature()");
    expect(userForumPosts).toContain('<TabBar current="user" />');
    expect(userForumPosts).toContain('aria-label="返回上一页"');
    expect(userForumPosts).toContain(':aria-selected="activeTab === item.key"');
    for (const page of [forumIndex, forumDetail]) {
      expect(page).toContain('<TabBar current="community" />');
      expect(page).toContain("has-custom-nav");
    }
  });

  it("keeps forum publishing feedback bound to the submitting tenant and page lifetime", () => {
    expect(forumPublish).toContain("const submitGuard = createTenantLoadGuard()");
    expect(forumPublish).toContain("const submitToken = submitGuard.begin()");
    expect(forumPublish).toContain("submitGuard.isCurrent(submitToken)");
    expect(forumPublish).toContain("submitGuard.invalidate()");
    expect(forumPublish).toContain("onHide");
  });

  it("keeps forum detail actions bound to one tenant topic and page lifetime", () => {
    expect(forumDetail).toContain("const actionGuard = createTenantLoadGuard()");
    expect(forumDetail).toContain("const actionToken = actionGuard.begin()");
    expect(forumDetail).toContain("actionGuard.isCurrent(actionToken)");
    expect(forumDetail).toContain("const requestedTopicId = topic.value.id");
    expect(forumDetail).toContain("actionGuard.invalidate()");
    expect(forumDetail).toContain("onHide");
  });

  it("keeps community post uploads and submissions bound to the current page", () => {
    expect(communityPublish).toContain("const actionGuard = createTenantLoadGuard()");
    expect(communityPublish).toContain("const actionToken = actionGuard.begin()");
    expect(communityPublish).toContain("actionGuard.isCurrent(actionToken)");
    expect(communityPublish).toContain("actionGuard.invalidate()");
    expect(communityPublish).toContain("onHide");
    expect(communityPublish).toContain("const requestedActivityId = selectedActivityId.value");
  });

  it("keeps community detail interactions bound to one post and page lifetime", () => {
    expect(communityDetail).toContain("const actionGuard = createTenantLoadGuard()");
    expect(communityDetail).toContain("const actionToken = actionGuard.begin()");
    expect(communityDetail).toContain("actionGuard.isCurrent(actionToken)");
    expect(communityDetail).toContain("const requestedPostId = post.value.id");
    expect(communityDetail).toContain("onHide");
    expect(communityDetail).toContain("actionGuard.invalidate()");
  });

  it("keeps community poster generation bound to one post and page lifetime", () => {
    expect(communityDetail).toContain("const posterGuard = createTenantLoadGuard()");
    expect(communityDetail).toContain("const posterToken = posterGuard.begin()");
    expect(communityDetail).toContain("posterGuard.isCurrent(posterToken)");
    expect(communityDetail).toContain("posterGuard.invalidate()");
    expect(communityDetail).toContain("const requestedPostId = post.value.id");
  });

  it("keeps community home likes and comments bound to one post and page lifetime", () => {
    expect(communityIndex).toContain("const interactionGuard = createTenantLoadGuard()");
    expect(communityIndex).toContain("const interactionToken = interactionGuard.begin()");
    expect(communityIndex).toContain("interactionGuard.isCurrent(interactionToken)");
    expect(communityIndex).toContain("const requestedPostId = post.id");
    expect(communityIndex).toContain("interactionGuard.invalidate()");
    expect(communityIndex).toContain("onHide");
  });

  it("keeps activity space questions, reports and invitations bound to the current activity", () => {
    expect(activitySpace).toContain("const actionGuard = createTenantLoadGuard()");
    expect(activitySpace).toContain("const actionToken = actionGuard.begin()");
    expect(activitySpace).toContain("actionGuard.isCurrent(actionToken)");
    expect(activitySpace).toContain("const requestedActivityId = id.value");
    expect(activitySpace).toContain("actionGuard.invalidate()");
    expect(activitySpace).toContain("onHide");
  });

  it("keeps activity space touch actions keyboard and assistive-technology accessible", () => {
    expect(activitySpace).toContain('class="ask app-press" role="button" tabindex="0"');
    expect(activitySpace).toContain('class="report app-press" role="button" tabindex="0"');
    expect(activitySpace).toContain('class="action-cell app-press" role="button" tabindex="0"');
    expect(activitySpace).toContain('@keyup.enter="openComposer"');
    expect(activitySpace).toContain('@keyup.space.prevent="openComposer"');
    expect(activitySpace).toContain('@keyup.enter="reportPost(post)"');
    expect(activitySpace).toContain('@keyup.space.prevent="reportPost(post)"');
  });

  it("keeps mall order list failures and writes visible, locked and tenant-bound", () => {
    expect(mallOrders).toContain("const pageLoading = ref(true)");
    expect(mallOrders).toContain("const loadError = ref");
    expect(mallOrders).toContain("const actionError = ref");
    expect(mallOrders).toContain("if (!loadedTenantCode.value || loadedTenantCode.value !== loadToken.tenantCode) orders.value = []");
    expect(mallOrders).toContain("assertOrderActionContext(context)");
    expect(mallOrders).toContain("activeAction.value = `${actionKey(order, \"cancel-order\")}:prompt`");
    expect(mallOrders).toContain('role="tablist"');
    expect(mallOrders).toContain('role="alert"');
    expect(mallOrders).toContain('from "../../tenant-load-guard"');

    expect(mallOrderDetail).toContain("assertOrderActionContext(context)");
    expect(mallOrderDetail).toContain("const actionError = ref");
    expect(mallOrderDetail).toContain("result.nextAction");
    expect(mallOrderDetail).toContain("groupPaymentTasks");
    expect(mallOrderDetail).toContain("useUnifiedGroupPayment");
    expect(mallOrderDetail).toContain("/public/me/mall/checkout-groups/${detail.checkoutGroup.id}");
    expect(mallOrderDetail).toContain("payCheckoutGroupWechat");
    expect(mallOrderDetail).toContain("closeCheckoutGroupPayment");
    expect(mallOrderDetail).toContain('role="alert"');
    expect(mallOrderDetail).toContain('from "../../tenant-load-guard"');
  });

  it("keeps favorite content on the shared empty-state contract", () => {
    expect(favoriteCourses).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(favoriteCourses).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(favoriteCourses).toContain('<LoadingState v-if="loading"');
    expect(favoriteCourses).toContain('variant="error"');
    expect(favoriteCourses).toContain('variant="default"');
    expect(favoriteCourses).toContain('action-text="去发现内容"');
    expect(favoriteCourses).toContain('@action="goDiscover"');
    expect(favoriteCourses).toContain("createTenantLoadGuard");
    expect(favoriteCourses).toContain("loadGuard.isCurrent(token)");
    expect(favoriteCourses).not.toContain('class="empty-card"');
  });

  it("keeps member learning content on the shared empty-state contract", () => {
    expect(userCourses).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(userCourses).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(userCourses).toContain('<LoadingState v-if="loading"');
    expect(userCourses).toContain('variant="error"');
    expect(userCourses).toContain('variant="default"');
    expect(userCourses).toContain('action-text="去发现内容"');
    expect(userCourses).toContain('@action="goDiscover"');
    expect(userCourses).toContain("createTenantLoadGuard");
    expect(userCourses).toContain("loadGuard.isCurrent(loadToken)");
    expect(userCourses).not.toContain("<empty-state");
  });

  it("keeps profile editing data states on the shared contract", () => {
    expect(userProfile).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(userProfile).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(userProfile).toContain('<LoadingState v-if="loading"');
    expect(userProfile).toContain('variant="error"');
    expect(userProfile).toContain('action-text="重新加载"');
    expect(userProfile).toContain('@action="load"');
    expect(userProfile).toContain("saveError.value");
  });

  it("keeps browsing history loading, failure, and empty states on the shared contract", () => {
    expect(learningHistory).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(learningHistory).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(learningHistory).toContain('<LoadingState v-if="loading"');
    expect(learningHistory).toContain('variant="error"');
    expect(learningHistory).toContain('variant="activity"');
    expect(learningHistory).toContain('@action="loadRecords"');
    expect(learningHistory).not.toContain('class="state-card error-state"');
  });

  it("keeps activity review loading failures on the shared empty-state contract", () => {
    expect(activityReview).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(activityReview).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(activityReview).toContain('<LoadingState v-if="loading"');
    expect(activityReview).toContain('variant="error"');
    expect(activityReview).toContain('action-text="重新加载"');
    expect(activityReview).toContain('@action="load"');
    expect(activityReview).toContain("createTenantLoadGuard");
    expect(activityReview).toContain("loadGuard.isCurrent(token)");
    expect(activityReview).toContain("registrationId.value");
    expect(activityReview).not.toContain('class="state-card"');
  });

  it("keeps mall order page data states separate from order actions", () => {
    expect(mallOrders).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(mallOrders).toContain('variant="error"');
    expect(mallOrders).toContain('variant="order"');
    expect(mallOrders).toContain('action-text="重新加载"');
    expect(mallOrders).toContain('@action="load"');
    expect(mallOrders).toContain('@click="actionError = \'\'"');
    expect(mallOrders).toContain("assertOrderActionContext(context)");
  });

  it("keeps course payment verification on the shared loading and error-state contract", () => {
    expect(coursePaymentResult).toMatch(/import EmptyState from [\"']\.\.\/\.\.\/components\/EmptyState\.vue[\"'];/);
    expect(coursePaymentResult).toMatch(/import LoadingState from [\"']\.\.\/\.\.\/components\/LoadingState\.vue[\"'];/);
    expect(coursePaymentResult).toContain('<LoadingState v-if="loadingOrder"');
    expect(coursePaymentResult).toContain('variant="error"');
    expect(coursePaymentResult).toContain('@action="retryVerification"');
    expect(coursePaymentResult).not.toContain('class="result-card state-card"');
    expect(coursePaymentResult).not.toContain('class="result-card state-card error-state"');
  });

  it("keeps mall order detail data errors separate from payment and refund actions", () => {
    expect(mallOrderDetail).toContain('import EmptyState from "../../components/EmptyState.vue";');
    expect(mallOrderDetail).toContain('variant="error"');
    expect(mallOrderDetail).toContain('action-text="重新加载"');
    expect(mallOrderDetail).toContain('@action="load"');
    expect(mallOrderDetail).toContain("groupLoadWarning");
    expect(mallOrderDetail).toContain("assertOrderActionContext(context)");
    expect(mallOrderDetail).toContain('actionError = \'\'');
  });

  it("keeps mall favorites and browsing history on shared data-state variants", () => {
    for (const page of [mallFavorites, mallHistory]) {
      expect(page).toContain('import EmptyState from "../../components/EmptyState.vue";');
      expect(page).toContain('variant="error"');
      expect(page).toContain('action-text="重新加载"');
      expect(page).toContain('@action="load"');
      expect(page).toContain('variant="default"');
      expect(page).toContain('action-text="去商城逛逛"');
      expect(page).toContain('@action="goDiscover"');
      expect(page).toContain("getCurrentTenantCode()");
    }
  });

  it("keeps course catalog and logistics failures on the shared error-state contract", () => {
    for (const page of [courseCatalog, mallLogistics]) {
      expect(page).toContain('import EmptyState from "../../components/EmptyState.vue";');
      expect(page).toContain('variant="error"');
      expect(page).toContain('action-text="重新加载"');
    }
    expect(courseCatalog).toContain('@action="loadCourses"');
    expect(courseCatalog).toContain('import LoadingState from "../../components/LoadingState.vue";');
    expect(courseCatalog).toContain('<LoadingState v-if="loading"');
    expect(courseCatalog).toContain("guardCurrentPageFeature");
    expect(mallLogistics).toContain('@action="load"');
    expect(mallLogistics).toContain('const contextKey = `${token.tenantCode}:${requestedOrderId}`');
  });

  it("keeps learning program and assessment page data states on the shared contract", () => {
    for (const page of [communityProgram, courseAssessment]) {
      expect(page).toContain('import EmptyState from "../../components/EmptyState.vue";');
      expect(page).toContain('import LoadingState from "../../components/LoadingState.vue";');
      expect(page).toContain('<LoadingState v-if="loading"');
      expect(page).toContain('variant="error"');
      expect(page).toContain('action-text="重新加载"');
    }
    expect(communityProgram).toContain('@action="load"');
    expect(courseAssessment).toContain('@action="load"');
    expect(courseAssessment).toContain('resultLoadError');
  });

  it("keeps mobile admin operational pages on shared data-state components", () => {
    for (const page of [mobileAdminHome, mobileAdminOrders, mobileAdminRefunds, mobileAdminAnalytics, mobileAdminCheckIn, mobileAdminRiskAlerts]) {
      expect(page).toContain('import EmptyState from "../../components/EmptyState.vue";');
      expect(page).toContain('import LoadingState from "../../components/LoadingState.vue";');
      expect(page).toContain("<LoadingState v-if=");
      expect(page).toContain('variant="error"');
      expect(page).toContain('action-text="重新加载"');
    }
    expect(mobileAdminHome).toContain('variant="activity"');
    expect(mobileAdminOrders).toContain('variant="order"');
    expect(mobileAdminRefunds).toContain("退款");
    expect(mobileAdminAnalytics).toContain("统计数据");
    expect(mobileAdminCheckIn).toContain("核销工作台");
    expect(mobileAdminRiskAlerts).toContain("资金异常");
  });

  it("keeps mobile admin activity and registration pages on shared data-state components", () => {
    for (const page of [mobileAdminActivities, mobileAdminRegistrations, mobileActivityEdit, mobileActivityPreview]) {
      expect(page).toMatch(/import EmptyState from ["']\.\.\/(?:\.\.\/)+components\/EmptyState\.vue["'];/);
      expect(page).toMatch(/import LoadingState from ["']\.\.\/(?:\.\.\/)+components\/LoadingState\.vue["'];/);
      expect(page).toContain("<LoadingState v-if=");
      expect(page).toContain('variant="error"');
      expect(page).toContain('action-text="重新加载"');
    }
    expect(mobileAdminActivities).toContain("活动管理");
    expect(mobileAdminRegistrations).toContain("报名");
    expect(mobileActivityEdit).toContain("活动编辑");
    expect(mobileActivityPreview).toContain("活动预览");
  });

  it("uses a real-device-safe Shanghai date formatter across mobile pages", () => {
    expect(mobileDate).toContain("const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000");
    expect(mobileDate).toContain("export function formatShanghaiDateTime");
    expect(mobileDate).toContain("export function formatShanghaiDate");
    expect(mobileDate).not.toContain("Intl");
    expect(mobileDate).not.toContain("toLocale");
    expect(mobileRuntimeCompatibility).toContain('name: "Intl"');
    expect(mobileRuntimeCompatibility).toContain('name: "toLocale*"');
    expect(mobileMpWeixinArtifacts).toContain("mp-weixin artifact dependency check failed");
    for (const page of [credentialVerify, userWallet, userOrders, mobileAdminAnalytics, mobileAdminRiskAlerts, communityProgram, contentAppeals, announcementList, communitySocial, learningHistory, coursePlayer, userCertificates, mobileAdminRefunds, userRegistrationDetail, userForumPosts, mallOrders, mallOrderDetail]) {
      expect(page).toContain('from "../../tenant-load-guard"');
    }
  });
});
