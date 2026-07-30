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
  const charity = readPage("charity/index.vue");
  const mallDetail = readPage("mall/detail.vue");
  const mallMerchant = readPage("mall/merchant.vue");
  const mallOrderDetail = readPage("user/mall-order-detail.vue");
  const mallOrders = readPage("user/mall-orders.vue");
  const activityReview = readPage("user/review.vue");
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
  const userLogin = readPage("user/login.vue");
  const homePage = readPage("index/index.vue");
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
  const userMy = readPage("user/my.vue");
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
    expect(activityDetail).toContain('activeAction.value = "calendar"');

    for (const guard of ["pageLoadGuard", "quoteLoadGuard", "couponLoadGuard"]) {
      expect(activityRegister).toContain(`const ${guard} = createTenantLoadGuard()`);
      expect(activityRegister).toContain(`${guard}.isCurrent(token)`);
    }
    expect(activityRegister.indexOf("confirming.value = true")).toBeLessThan(activityRegister.indexOf("uni.showModal({", activityRegister.indexOf("function submit()")));
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

  it("clears stale activity lists immediately and exposes category failures", () => {
    for (const guard of ["pageLoadGuard", "categoryLoadGuard"]) {
      expect(activityList).toContain(`const ${guard} = createTenantLoadGuard()`);
      expect(activityList).toContain(`${guard}.isCurrent(`);
    }
    const reloadTenant = activityList.slice(activityList.indexOf("async function reloadCurrentTenant"), activityList.indexOf("async function handleTenantChanged"));
    expect(reloadTenant.indexOf("pageLoadGuard.invalidate()")).toBeLessThan(reloadTenant.indexOf("await Promise.all"));
    expect(reloadTenant).toContain("rows.value = []");
    expect(reloadTenant).toContain("Promise.all([loadCategories(), loadDecoration(), loadFirstPage()])");
    expect(activityList).toContain("categoryError.value = err?.message");
    expect(activityList).toContain("date.getTime() + 8 * 60 * 60 * 1000");
    expect(activityList).toContain("shifted.getUTCMonth()");
    expect(activityList).toContain('role="tablist"');
    expect(activityList).toContain(':aria-label="`查看活动：${item.title}`"');
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
    expect(mallLogistics).toContain('role="alert"');
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
    expect(userWallet).toContain('aria-label="重新加载余额信息"');
  });

  it("keeps activity and course orders bound to one member session", () => {
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
    expect(userOrders).toContain('aria-label="重新加载我的订单"');
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
    expect(userMy).toContain('request<any>("/public/me/profile")');
    expect(userMy).toContain("Promise.allSettled([loadFeatureGates(true), loadDecoration(), loadProfile()])");
    expect(userMy).toContain("正在同步会员资料");
    expect(userMy).toContain("资料同步失败");
    expect(userMy).toContain("登录状态待同步");
    expect(userMy).toContain("会员资料格式异常");
    expect(userMy).toContain("loadMemberOrderOverview(requestedSession)");
    expect(userMy).toContain("orderOverviewResult.value.registrations");
    expect(userMy).toContain("orderOverviewResult.value.failedSources");
    expect(userMy).toContain("applyResult<any[]>(5, \"mallOrders\", \"商城订单\", Array.isArray");
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
    expect(communityDetail).toContain("fail: () => { submitting.value = false; }");
    expect(mallDetail).toContain('activeAction.value = "favorite"');
    expect(mallDetail).toContain('activeAction.value = "add-cart"');
    expect(mallDetail).toContain("activeAction.value = `report-${item.id}-prompt`");
  });

  it("publishes feature gates after tenant entitlement restrictions are applied", () => {
    expect(publicService).toContain("tenantEntitlementFeatureForGate(key)");
    expect(publicService).toContain("launchConfig.featureGates[key] = false");
    expect(publicService).toContain("tenantFeatureAccess(tenant.settings as any, entitlementFeature).allowed");
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
    expect(courseAssessment).toContain("当前考核内容不可用，请返回课程后重试。");
    expect(courseAssessment).toContain('aria-label="重新加载课程考核"');
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
    expect(userRegistrationDetail).toContain('showFeatureDisabledDialog("/pages/community/publish")');
    expect(userRegistrationDetail).toContain('v-if="canShareActivityPost && communityPublishAvailable"');
    expect(userRegistrationDetail).not.toContain("分享活动心得（暂未开放）");
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

  it("shows profile load failures and locks both avatar upload paths", () => {
    expect(userProfile).toContain("createTenantLoadGuard");
    expect(userProfile).toContain('v-else-if="loadError"');
    expect(userProfile).toContain("onShow(() => { void load(); })");
    const localAvatar = userProfile.slice(userProfile.indexOf("async function chooseLocalAvatar"), userProfile.indexOf("async function chooseWechatAvatar"));
    expect(localAvatar.indexOf("uploadingLocalAvatar.value = true")).toBeLessThan(localAvatar.indexOf("uni.chooseImage"));
    expect(userProfile).toContain("uploadingWechatAvatar.value || uploadingLocalAvatar.value || saving.value");
    expect(userProfile).toContain("saveError.value = error.message || \"保存失败\"");
  });

  it("refreshes community learning pages without accepting stale tenant responses", () => {
    for (const page of [communityProgram, communityCheckin]) {
      expect(page).toContain("createTenantLoadGuard");
      expect(page).toContain("loadGuard.isCurrent(token)");
      expect(page).toContain("onShow(async () =>");
      expect(page).toContain("await loadFeatureGates(true)");
      expect(page).toContain("guardCurrentPageFeature");
      expect(page).toContain('aria-live="assertive"');
    }
    expect(communityProgram).toContain("loadedContextKey.value !== nextContextKey");
    expect(communityProgram).toContain('from "../../tenant-load-guard"');
    expect(communityCheckin).toContain('loadError.value = reviewSafeText(error?.message || "今日打卡加载失败")');
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
    expect(communityCheckin).toContain("getCurrentTenantCode() !== tenantCode");
  });

  it("keeps search state tenant-scoped and exposes course loading failures", () => {
    expect(searchPage).toContain("createTenantLoadGuard");
    expect(searchPage).toContain("loadGuard.isCurrent(token)");
    expect(searchPage).toContain('loadError.value = reviewSafeText(error?.message || "搜索内容加载失败")');
    expect(searchPage).toContain('`course_search_history:${tenantCode || "global"}`');
    expect(searchPage).toContain("onShow(async () =>");
    expect(searchPage).toContain("guardCurrentPageFeature");
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
    expect(contentAppeals.indexOf("submitting.value = true")).toBeLessThan(contentAppeals.indexOf('request<any>("/public/me/content/appeals"'));
    expect(contentAppeals).toContain('actionError.value = reviewSafeText(error?.message || "申诉提交失败")');
    expect(contentAppeals).toContain("getCurrentTenantCode() !== tenantCode");
    expect(contentAppeals).toContain('from "../../tenant-load-guard"');
    expect(contentAppeals).toContain('formatShanghaiDateTime');
  });

  it("locks settings dialogs before they open and preserves tenant context on logout", () => {
    expect(userSettings.indexOf('activeAction.value = "logout"')).toBeLessThan(userSettings.indexOf("uni.showModal({", userSettings.indexOf("function logout")));
    expect(userSettings).toContain('if (!r.confirm) { activeAction.value = ""; return; }');
    expect(userSettings).toContain('uni.reLaunch({ url:withTenantCode("/pages/user/my") })');
    expect(userSettings).toContain('role="button"');
    expect(userSettings).toContain('request<{ miniprogramVersion?: string | null }>("/public/settings/operation")');
    expect(userSettings).toContain("当前小程序版本 ${clientVersion.value}");
    expect(publicService).toContain("miniprogramVersion: String(miniprogramRelease?.version || \"\").trim() || null");
  });

  it("refreshes announcements with tenant and schedule-safe presentation state", () => {
    expect(announcementList).toContain("createTenantLoadGuard");
    expect(announcementList).toContain("loadGuard.isCurrent(token)");
    expect(announcementList).toContain("Promise.allSettled([load(), loadDecoration()])");
    expect(announcementList).toContain('from "../../tenant-load-guard"');
    expect(announcementList).toContain('aria-live="assertive"');
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
    expect(courseCatalog).toContain('role="alert"');
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

  it("persists login errors and throttles repeated verification-code requests", () => {
    expect(userLogin).toContain("const actionError = ref");
    expect(userLogin).toContain("const cooldownSeconds = ref");
    expect(userLogin).toContain("startCooldown(data.cooldownSeconds || 60)");
    expect(userLogin).toContain('role="alert"');
    expect(userLogin).toContain('confirm-type="done"');
    expect(userLogin).toContain("onUnmounted");
  });

  it("exposes home activity failures without accepting stale tenant responses", () => {
    expect(homePage).toContain("createTenantLoadGuard");
    expect(homePage).toContain("activityLoadGuard.isCurrent(loadToken)");
    expect(homePage).toContain('activitiesError.value = reviewSafeText(error?.message || "近期活动加载失败")');
    expect(homePage).toContain('role="alert"');
    expect(homePage).toContain("Promise.allSettled([loadDecoration(), loadActivities()])");
  });

  it("refreshes learning history and course order pages per tenant", () => {
    for (const page of [learningHistory, courseOrderConfirm, coursePaymentResult]) {
      expect(page).toContain("createTenantLoadGuard");
      expect(page).toContain("loadGuard.isCurrent(token)");
      expect(page).toContain("onShow(");
    }
    expect(learningHistory).toContain('from "../../tenant-load-guard"');
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
      expect(page).toContain('role="alert"');
      expect(page).toContain("max-width:760px");
    }
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
