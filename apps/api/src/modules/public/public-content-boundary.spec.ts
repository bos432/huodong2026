import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public announcement and community asset boundaries", () => {
  const v1Service = readFileSync("src/modules/v1/v1.service.ts", "utf8");
  const v1Controller = readFileSync("src/modules/v1/v1-public.controller.ts", "utf8");
  const coursesController = readFileSync("src/modules/courses/public-courses.controller.ts", "utf8");
  const publicService = readFileSync("src/modules/public/public.service.ts", "utf8");
  const publicController = readFileSync("src/modules/public/public.controller.ts", "utf8");
  const certificateSvg = readFileSync("src/shared/certificate-svg.ts", "utf8");
  const mallService = readFileSync("src/modules/mall/mall.service.ts", "utf8");
  const mobileMallCoupons = readFileSync("../mobile/src/pages/mall/coupons.vue", "utf8");
  const mobileMallCheckout = readFileSync("../mobile/src/pages/mall/checkout.vue", "utf8");

  it("filters announcement schedule, tenant and audience on the server", () => {
    const method = v1Service.slice(v1Service.indexOf("async publicAnnouncements"), v1Service.indexOf("private publicAnnouncement"));
    expect(method).toContain("announcement.publishAt IS NULL OR announcement.publishAt <= :now");
    expect(method).toContain("announcement.endAt IS NULL OR announcement.endAt >= :now");
    expect(method).toContain('else builder.andWhere("announcement.tenantId IS NULL")');
    expect(method).toContain("contentAudienceMatches(row.audience, userId, profile?.level?.id)");
    expect(method).toContain("this.publicAnnouncement(row)");
  });

  it("passes optional authentication to announcement audience evaluation", () => {
    expect(v1Controller).toContain("this.publicAuth.optionalUserIdFromAuthorization(req.headers?.authorization)");
    const view = v1Service.slice(v1Service.indexOf("private publicAnnouncement"), v1Service.indexOf("private async resolveTenantContext"));
    for (const privateField of ["tenant", "audience", "viewCount", "clickCount", "enabled"]) expect(view).not.toContain(`${privateField}: row.${privateField}`);
  });

  it("scopes favorite posts to the exact active tenant and returns a public view", () => {
    const method = coursesController.slice(coursesController.indexOf('@Get("me/community/favorites")'), coursesController.indexOf('@Get("me/community/notifications")'));
    expect(method).toContain("this.resolveTenant(req,tenantCode)");
    expect(method).toContain("this.exactTenantWhere");
    expect(method).toContain("this.postView(post,{liked:false,favorited:true})");
  });

  it("scopes post notifications and verifies tenant ownership before marking read", () => {
    const method = coursesController.slice(coursesController.indexOf('@Get("me/community/notifications")'), coursesController.indexOf('@Get("me/community/follows")'));
    expect(method).toContain("this.communityNotifications.find({where:{userId}");
    expect(method).toContain("this.exactTenantWhere({id:In(postIds),status:\"approved\",visible:true,deletedAt:IsNull()},tenant)");
    expect(method).toContain("return rows.filter");
    expect(method).toContain("visiblePostIds.has(row.postId)");
    expect(method).toContain("this.exactTenantWhere({id:row.postId},tenant)");
    expect(method).toContain("this.publicCommunityNotification");
  });

  it("validates follow targets in the active tenant and hides internal user ids from follow lists", () => {
    const follow = coursesController.slice(coursesController.indexOf('@Post("community/users/:id/follow")'), coursesController.indexOf('@Get("me/community/favorites")'));
    expect(follow).toContain("this.exactTenantWhere");
    expect(follow).toContain("用户在当前机构没有可见内容");
    const list = coursesController.slice(coursesController.indexOf('@Get("me/community/follows")'), coursesController.indexOf('@Get("me/content/sanctions")'));
    expect(list).toContain("followedName");
    expect(list).toContain("this.exactTenantWhere");
    expect(list).toContain("visibleIds.has(row.followedUserId)");
    expect(list).not.toContain("followedUserId:row.followedUserId");
  });

  it("implements course category filtering without leaking tenant-scoped entities", () => {
    const method = coursesController.slice(coursesController.indexOf('@Get("courses")'), coursesController.indexOf('@Get("courses/:id")'));
    expect(method).toContain('else builder.andWhere("course.tenantId IS NULL")');
    expect(method).toContain("JSON_CONTAINS(course.tags, :category) = 1");
    expect(method).toContain("this.publicCourseListView(course)");
    const view = coursesController.slice(coursesController.indexOf("private publicCourseListView"), coursesController.indexOf("private publicCommunityActivity"));
    expect(view).toContain("categoryName: tags[0] || null");
    expect(view).not.toContain("tenant:");
    const tenantWhere = coursesController.slice(coursesController.indexOf("private tenantWhere"), coursesController.indexOf("private exactTenantWhere"));
    expect(tenantWhere).toContain("tenant ? { id: tenant.id } : IsNull()");
  });

  it("returns a field allowlist from every member login flow", () => {
    const response = publicService.slice(publicService.indexOf("private userLoginResponse"), publicService.indexOf("private signUserAccessToken"));
    expect(response).toContain("id: user.id");
    expect(response).toContain("phone: user.phone");
    expect(response).toContain("wechatBound: Boolean(user.openid)");
    for (const field of ["passwordHash", "openid:", "unionid:", "createdAt:", "updatedAt:", "lastLoginAt:"]) expect(response).not.toContain(field);
    for (const method of ["h5Login", "h5PasswordLogin", "wechatLogin"]) {
      const start = publicService.indexOf(`async ${method}`);
      const next = publicService.indexOf("\n  async ", start + 8);
      expect(publicService.slice(start, next > start ? next : undefined)).toContain("this.userLoginResponse");
    }
  });

  it("returns allowlisted activity registration, order and refund views", () => {
    const registrationView = publicService.slice(publicService.indexOf("private publicRegistration"), publicService.indexOf("private publicOrder("));
    for (const field of ["user:", "tenant:", "checkInCode:", "channel:"]) expect(registrationView).not.toContain(field);
    expect(registrationView).not.toContain("...registration");

    const orderView = publicService.slice(publicService.indexOf("private publicOrder("), publicService.indexOf("private publicTicketType"));
    expect(orderView).toContain("this.publicRegistration(order.registration)");
    expect(orderView).toContain("private publicRefund");
    for (const field of ["businessSnapshot:", "paidByAdmin:", "paidRemark:", "tenant:"]) expect(orderView).not.toContain(field);

    const detail = publicService.slice(publicService.indexOf("async registrationDetail"), publicService.indexOf("async requestRegistrationRefund"));
    expect(detail).toContain("refunds.map((refund) => this.publicRefund(refund))");
    const charity = publicService.slice(publicService.indexOf("private async registrationCharityRefundView"), publicService.indexOf("async requireUserFromAuthorization"));
    expect(charity).toContain("pendingRefund: this.publicRefund(activeRefund)");
  });

  it("maps wallet, coupon and payment entities before returning them publicly", () => {
    const wallet = publicService.slice(publicService.indexOf("async myWallet("), publicService.indexOf("private async resolveWalletTenantContext"));
    expect(wallet).toContain("return this.publicWallet(wallet, tenant)");
    expect(wallet).toContain("this.publicWalletTransaction(transaction)");

    const coupons = publicService.slice(publicService.indexOf("async availableActivityCoupons"), publicService.indexOf("async redeemCode"));
    expect(coupons).toContain("...this.publicCoupon(coupon)");
    expect(coupons).toContain("this.publicCouponClaim(await claimRepo.save(claim))");
    expect(coupons).not.toContain("...coupon, claim:");

    const paymentView = publicService.slice(publicService.indexOf("private publicPaymentResult"), publicService.indexOf("private publicCouponClaim"));
    for (const field of ["businessSnapshot:", "reconciliationRemark:", "tenant:", "order: result.transaction.order"]) expect(paymentView).not.toContain(field);
  });

  it("hardens certificate filenames and SVG download response headers", () => {
    const download = publicController.slice(publicController.indexOf('  @Get("me/certificates/:id/download")'), publicController.indexOf('  @Get("coupons/available")'));
    expect(download).toContain("filename*=UTF-8''${encodedFilename}");
    expect(download).toContain('res.setHeader("Cache-Control", "private, no-store")');
    expect(download).toContain('res.setHeader("Content-Security-Policy", "sandbox")');
    expect(download).toContain('res.setHeader("X-Content-Type-Options", "nosniff")');

    const serviceDownload = publicService.slice(publicService.indexOf("async myCertificateDownload"), publicService.indexOf("private publicCertificate"));
    expect(serviceDownload).toContain("ensureCertificateSnapshot(certificate)");
    expect(serviceDownload).toContain("renderCertificateSvg({ certificate, displayName, template: template.config })");
    expect(certificateSvg).toContain(".slice(0, 80)");
    expect(certificateSvg).toContain("filenameBase");
    expect(certificateSvg).toContain("replace(/[\\u0000-\\u001f\\u007f");
  });

  it("hides revoked volunteer proof identity and business details", () => {
    const method = publicService.slice(publicService.indexOf("async verifyVolunteerProof"), publicService.indexOf("async cancelVolunteerTaskApplication"));
    expect(method).toContain("title: active ? proof.title : null");
    expect(method).toContain("hours: active ? proof.hours : null");
    expect(method).toContain("holderName");
    expect(method).toContain("snapshot: active ?");
  });

  it("allowlists course attempts, answers, refunds and learner announcements", () => {
    const assessmentRoutes = coursesController.slice(coursesController.indexOf('@Get("courses/:id/assessments")'), coursesController.indexOf('@Post("community/posts")'));
    expect(assessmentRoutes).toContain("this.publicCourseAssessmentAttempt");
    expect(assessmentRoutes).toContain("this.publicCourseAssessmentAnswer");
    expect(assessmentRoutes).toContain("this.publicCourseRefund");
    expect(assessmentRoutes).toContain("this.publicCourseAnnouncement");
    expect(assessmentRoutes).toContain("this.publicCourseReview");
    expect(assessmentRoutes).toContain("this.publicCourseQa");
    expect(assessmentRoutes).not.toContain("Object.assign(active");
    expect(assessmentRoutes).not.toContain("Object.assign(saved");

    const attemptView = coursesController.slice(coursesController.indexOf("private publicCourseAssessmentAttempt"), coursesController.indexOf("private publicCourseAssessmentAnswer"));
    for (const field of ["userId:", "courseId:", "assessmentId:", "reviewedByAdminId:"]) expect(attemptView).not.toContain(field);
    const refundView = coursesController.slice(coursesController.indexOf("private publicCourseRefund"), coursesController.indexOf("private publicLearning"));
    for (const field of ["order:", "reviewedByAdminId:", "providerRefundNo:"]) expect(refundView).not.toContain(field);
  });

  it("allowlists community comments, reports and newly created forum replies", () => {
    const community = coursesController.slice(coursesController.indexOf('@Post("community/posts/:id/report")'), coursesController.indexOf('@Get("forum/categories")'));
    expect(community).toContain("this.publicCommunityReport");
    expect(community).toContain("this.publicCommunityComment");
    expect(community).not.toContain("return this.communityContentReports.save");
    expect(community).not.toContain("return this.communityPostComments.find");

    const forumCreate = coursesController.slice(coursesController.indexOf("private async createForumReply"), coursesController.indexOf("private async createForumReplyNotifications"));
    expect(forumCreate).toContain("reply: this.forumReplyView(reply)");
  });

  it("does not expand tenant, admin or user entities in forum personal assets", () => {
    const categories = coursesController.slice(coursesController.indexOf('@Get("forum/categories")'), coursesController.indexOf('@Get("forum/topics")'));
    expect(categories).toContain("this.publicForumCategory(row)");
    expect(categories).toContain("moderatorCount");
    expect(categories).not.toContain("username: item.admin.username");

    const replies = coursesController.slice(coursesController.indexOf('@Get("me/forum/replies")'), coursesController.indexOf('@Get("checkin/today")'));
    expect(replies).toContain("this.forumReplyView(reply)");
    expect(replies).toContain("id: row.id, topic: this.forumTopicView");
    expect(replies).not.toContain("({ ...row, topic:");

    const topicView = coursesController.slice(coursesController.indexOf("private forumTopicView"), coursesController.indexOf("private requiredText"));
    expect(topicView).toContain("this.publicDisplayName");
    expect(topicView).not.toContain("nickname: topic.user.nickname || topic.user.phone");
    expect(topicView).not.toContain("userId: reply.userId");
  });

  it("requires content signatures and scoped keys for every member upload family", () => {
    for (const category of ["avatars-t${tenant?.id", "mall-reviews-t${tenant?.id", "mall-refunds-t${tenant?.id"]) expect(publicService).toContain(category);
    expect(publicService.match(/validatedUploadFile\(file/g)?.length).toBeGreaterThanOrEqual(4);
    expect(publicService).toContain('storePrivateDocument(validated, "registration-attachments")');
    expect(publicService).toContain('purpose: "registration_attachment"');
    expect(publicService).toContain("verifyPrivateAssetToken(token, this.privateAssetSecret())");
    expect(coursesController).toContain("validatedUploadFile(file, COMMUNITY_IMAGE_MIMES)");
    expect(coursesController).toContain("community-posts-t${tenant?.id");
  });

  it("enforces tenant ad entitlements on public slots and event counters", () => {
    const adMethods = publicService.slice(publicService.indexOf("async adSlot("), publicService.indexOf("async myWallet("));
    expect(adMethods).toContain('isFeatureGateEnabled(context, "adCenter")');
    expect(adMethods).toContain('campaignQuery.andWhere("campaign.tenantId = :tenantId"');
    expect(adMethods).toContain('campaignQuery.andWhere("campaign.tenantId IS NULL")');
    const route = publicController.slice(publicController.indexOf('@Post("ad-slots/:id/events")'), publicController.indexOf('@Get("charity/summary")'));
    expect(route).toContain("this.tenantContext(req, tenantCode)");
  });

  it("allowlists enhanced activities and removes private eligibility rules", () => {
    const view = v1Service.slice(v1Service.indexOf("private publicActivity(activity"), v1Service.indexOf("private findOperationSetting"));
    expect(view).toContain("tenant: activity.tenant ? { id: activity.tenant.id, code: activity.tenant.code, name: activity.tenant.name, region: activity.tenant.region } : null");
    expect(view).toContain("eligibilityRules: this.publicEligibilityRules(activity.eligibilityRules)");
    expect(view).not.toContain("...publicActivity");
    expect(view).not.toContain("settings:");
    expect(view).not.toContain("contactPhone:");
    expect(view).not.toContain("blacklistPhones:");
  });

  it("returns safe activity review, report and share attribution views", () => {
    const reviews = v1Service.slice(v1Service.indexOf("async activityReviews"), v1Service.indexOf("async adminReviews"));
    expect(reviews).toContain("rows.map((row) => this.publicActivityReview(row))");
    expect(reviews).toContain("return this.publicActivityReview(review)");
    expect(reviews).toContain("this.publicActivityReviewReport(report)");
    const reviewViews = v1Service.slice(v1Service.indexOf("private publicActivityReview(review"), v1Service.indexOf("async adminReviews"));
    for (const field of ["registration:", "passwordHash:", "openid:", "unionid:", "phone:"]) expect(reviewViews).not.toContain(field);

    const sharing = v1Service.slice(v1Service.indexOf("async sharePoster"), v1Service.indexOf("async dashboard"));
    expect(sharing).toContain("activity: { id: activity.id }");
    expect(sharing).toContain("recorded: true");
    expect(sharing).not.toContain("return this.shareVisits.save");

    const trackRoute = v1Controller.slice(v1Controller.indexOf('@Post("activities/:id/track-share")'), v1Controller.indexOf('@Get("activities/:id/reviews")'));
    expect(trackRoute).toContain("userId: this.publicAuth.optionalUserIdFromAuthorization(req.headers?.authorization)");
    expect(trackRoute).not.toContain("trackShare(id, body,");
  });

  it("allowlists member merchant applications and mall review reports", () => {
    const applications = mallService.slice(mallService.indexOf("async submitMerchantApplication"), mallService.indexOf("async adminMerchantApplications"));
    expect(applications).toContain("this.publicMerchantApplication(saved)");
    expect(applications).toContain("rows.map((row) => this.publicMerchantApplication(row))");

    const applicationView = mallService.slice(mallService.indexOf("private publicMerchantApplication"), mallService.indexOf("private publicMallReviewReport"));
    for (const field of ["applicantUserId:", "applicant:", "reviewedByAdminId:", "settings:"]) expect(applicationView).not.toContain(field);

    const report = mallService.slice(mallService.indexOf("async reportReview(id"), mallService.indexOf("async adminReviewReports"));
    expect(report).toContain("this.publicMallReviewReport(exists)");
    expect(report).toContain("this.publicMallReviewReport(saved)");
    const reportView = mallService.slice(mallService.indexOf("private publicMallReviewReport"), mallService.indexOf("private publicMerchantSummary"));
    for (const field of ["tenant:", "review:", "user:", "reviewedBy:"]) expect(reportView).not.toContain(field);

    const productView = mallService.slice(mallService.indexOf("private publicProduct(product"), mallService.indexOf("private publicTenantSummary"));
    for (const field of ["reviewRemark:", "submittedAt:", "reviewedAt:"]) expect(productView).not.toContain(field);
    const ownReviewView = mallService.slice(mallService.indexOf("private publicUserReview"), mallService.indexOf("private publicFavorite"));
    expect(ownReviewView).not.toContain("appendReviewedBy:");
  });

  it("separates public mall marketing views from admin inventory and coupon accounting", () => {
    const couponRoutes = mallService.slice(mallService.indexOf("async publicCoupons"), mallService.indexOf("async adminLogisticsCompanies"));
    expect(couponRoutes).toContain("this.publicCoupon(coupon)");
    expect(couponRoutes).not.toContain("coupon: this.adminCoupon(coupon)");
    expect(couponRoutes).toContain('status === "unavailable"');
    expect(couponRoutes).toContain('["expired", "disabled", "not_started", "claimed_out"]');

    const couponView = mallService.slice(mallService.indexOf("private publicCoupon(coupon"), mallService.indexOf("private publicCouponWithClaim"));
    for (const field of ["usageLimit:", "issuanceLimit:", "claimedCount:", "usedCount:", "refundReleasePolicy:", "enabled:", "createdAt:", "updatedAt:"]) expect(couponView).not.toContain(field);

    const flashView = mallService.slice(mallService.indexOf("private publicFlashSale"), mallService.indexOf("private availableFlashSaleStock"));
    expect(flashView).toContain("includeInternalStock ? { saleStock:");
    const groupView = mallService.slice(mallService.indexOf("private publicGroupBuy"), mallService.indexOf("private availableGroupBuyStock"));
    expect(groupView).toContain("includeInternalStock ? { groupStock:");

    const reviewView = mallService.slice(mallService.indexOf("private publicReview"), mallService.indexOf("private adminCoupon"));
    expect(reviewView).toContain("user: { nickname: displayName }");
    expect(reviewView).not.toContain("phone: displayName");
    expect(reviewView).not.toContain("status: row.status");
  });

  it("exposes the complete inaccessible coupon state with keyboard-operable tabs", () => {
    expect(mobileMallCoupons).toContain('value: "unavailable" as const');
    expect(mobileMallCoupons).toContain('role="tablist"');
    expect(mobileMallCoupons).toContain('role="tab"');
    expect(mobileMallCoupons).toContain(':aria-selected="status === item.value"');
    expect(mobileMallCoupons).toContain('@keyup.enter="selectStatus(item.value)"');
    expect(mobileMallCoupons).toContain('aria-label="重新加载优惠券"');
  });

  it("binds promotion attribution to the signed quote and minimizes public payment routing data", () => {
    const quoting = mallService.slice(mallService.indexOf("async quoteOrder"), mallService.indexOf("private mallOrderQuoteSecret"));
    expect(quoting).toContain("resolvePromotionForQuote");
    expect(quoting).toContain("promotionCode: promotion?.code || null");
    expect(quoting).toContain("commissionEligible: !isSelfPurchasePromotion");

    const realPayment = mallService.slice(mallService.indexOf("private async createWechatRealPayment"), mallService.indexOf("private mallWechatPaymentRoutingSummary"));
    expect(realPayment).toContain("publicMallWechatPayParams");
    const publicResult = realPayment.slice(realPayment.indexOf("    return {"));
    expect(publicResult).not.toContain("routing,");
    expect(publicResult).not.toContain("callbackPath:");

    const sandboxPayment = mallService.slice(mallService.indexOf("private createWechatSandboxPayment"), mallService.indexOf("private parseWechatSandboxCallback"));
    expect(sandboxPayment).not.toContain("tenantId:");
    expect(sandboxPayment).not.toContain("routing:");
    expect(sandboxPayment).not.toContain("mallMerchantScope:");
  });

  it("makes checkout errors, promotion validation and primary actions accessible", () => {
    expect(mobileMallCheckout).toContain('promotionCode: promotionCode.value.trim() || undefined');
    expect(mobileMallCheckout).toContain('function applyPromotion()');
    expect(mobileMallCheckout).toContain('aria-label="推广码"');
    expect(mobileMallCheckout).toContain('aria-live="assertive"');
    expect(mobileMallCheckout).toContain(':aria-disabled="!canSubmitOrder"');
    expect(mobileMallCheckout).toContain('@keyup.enter="submit"');
    expect(mobileMallCheckout).toContain('role="alert"');
  });

  it("allowlists mall payment query and close results and handles partial checkout groups locally", () => {
    const paymentMethods = mallService.slice(mallService.indexOf("async queryMyOrderPayment"), mallService.indexOf("async payOrderWithBalance"));
    expect(paymentMethods).toContain("this.publicMallPaymentQueryResult(result");
    expect(paymentMethods).toContain("this.publicMallPaymentCloseResult(providerResult)");
    expect(paymentMethods).toContain('status: "partial"');
    expect(paymentMethods).toContain("系统不会重复整体入账");
    expect(paymentMethods).toContain("closeCheckoutGroupPendingOrders");
    expect(paymentMethods).toContain("async myCheckoutGroup");
    expect(paymentMethods).not.toContain("return { ...result, localStatus:");
    expect(paymentMethods).not.toContain("return { ...providerResult, order:");

    const queryView = mallService.slice(mallService.indexOf("private publicMallPaymentQueryResult"), mallService.indexOf("async payOrderWithBalance"));
    expect(queryView).not.toContain("raw:");
    expect(queryView).toContain("nextAction:");

    const taskView = mallService.slice(mallService.indexOf("private publicCheckoutPaymentTask"), mallService.indexOf("private async recordMallOrderEvent"));
    expect(taskView).toContain("canCombinePayment:");
    expect(taskView).toContain("requiresSeparatePayment:");
    expect(taskView).not.toContain("readinessIssues:");

    const memberOrders = mallService.slice(mallService.indexOf("async myOrders"), mallService.indexOf("async orderDetailForUser"));
    expect(memberOrders).toContain('leftJoinAndSelect("order.checkoutGroup", "checkoutGroup")');
    expect(memberOrders).toContain('leftJoinAndSelect("order.merchant", "merchant")');
  });

  it("releases checkout coupons only after every child is terminal and exposes worker failures", () => {
    const release = mallService.slice(mallService.indexOf("private async releaseCouponUsage"), mallService.indexOf("private async releaseLockedInventory"));
    expect(release).toContain("mallCheckoutCouponReleaseEligible");
    expect(release).toContain("allocationSnapshot?.couponDiscountFen");
    expect(release).toContain("allocatedOrders.length ? allocatedOrders : checkoutOrders");
    expect(release).toContain("usageOrder.id IN (:...checkoutOrderIds)");
    const expiry = mallService.slice(mallService.indexOf("async closeExpiredPendingOrders"), mallService.indexOf("async failExpiredGroupBuyTeams"));
    expect(expiry).toContain("skippedConcurrentCount");
    expect(expiry).toContain("failedCount: failures.length");
    expect(expiry).toContain("mall.order.auto_close_failed");
    expect(expiry).toContain("MALL_PENDING_ORDER_MAX_BATCHES");
    expect(expiry).toContain("attemptedIds");
    expect(expiry).toContain("hasMore");
  });
});
