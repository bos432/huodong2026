import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isSelfPurchasePromotion, mallAppendReviewError, mallCouponCategoryMatches, mallCouponClaimError, mallCouponIdentityRisk, mallGroupBuyJoinError, mallPromotionAttributionRisk, mallPromotionOrderError, mallPromotionRateLimitError, mallPromotionValidityError, publicMallReviewAppend, saveWithUniqueReplay, shouldReleaseMallCouponAfterRefund } from "./mall-review-marketing-governance";

describe("mall review and marketing governance", () => {
  it("replays a unique-key conflict to the first persisted record", async () => {
    const rows: Array<{ id: number }> = [];
    let saveCalls = 0;
    const save = async () => {
      saveCalls += 1;
      if (rows.length) throw new Error("duplicate unique key");
      const row = { id: 99 };
      rows.push(row);
      return row;
    };
    const findReplay = async () => rows[0] || null;

    const first = await saveWithUniqueReplay(save, findReplay);
    const replay = await saveWithUniqueReplay(save, findReplay);
    expect(first).toBe(replay);
    expect(rows).toHaveLength(1);
    expect(saveCalls).toBe(2);
  });

  it("allows only one append review during the 180-day window", () => {
    const now = new Date("2026-07-13T00:00:00.000Z");
    expect(mallAppendReviewError({ reviewStatus: "approved", createdAt: "2026-01-15T00:00:00.000Z", now })).toBeNull();
    expect(mallAppendReviewError({ reviewStatus: "approved", appendedAt: now, createdAt: "2026-01-15T00:00:00.000Z", now })).toContain("不能重复提交");
    expect(mallAppendReviewError({ reviewStatus: "approved", createdAt: "2026-01-13T00:00:00.000Z", now })).toContain("超过 180 天");
    expect(mallAppendReviewError({ reviewStatus: "pending", createdAt: now, now })).toContain("首评审核展示后");
  });

  it("publishes append content only after append moderation approval", () => {
    expect(publicMallReviewAppend({ appendStatus: "pending", appendContent: "待审核追评", appendImages: ["a.jpg"], appendedAt: new Date() }))
      .toEqual({ appendContent: null, appendImages: [], appendedAt: null });
    expect(publicMallReviewAppend({ appendStatus: "approved", appendContent: "已通过追评", appendImages: ["a.jpg"], appendedAt: "2026-07-13" }))
      .toEqual({ appendContent: "已通过追评", appendImages: ["a.jpg"], appendedAt: "2026-07-13" });
  });

  it("identifies self-purchase promotion attribution", () => {
    expect(isSelfPurchasePromotion(8, 8)).toBe(true);
    expect(isSelfPurchasePromotion(8, 9)).toBe(false);
    expect(isSelfPurchasePromotion(null, 8)).toBe(false);
  });

  it("separates coupon issuance capacity from redemption capacity", () => {
    expect(mallCouponClaimError({ issuanceLimit: 100, claimedCount: 100, hasClaim: false })).toBe("优惠券已领完");
    expect(mallCouponClaimError({ issuanceLimit: 100, claimedCount: 100, hasClaim: true })).toBeNull();
    expect(mallCouponClaimError({ issuanceLimit: 0, claimedCount: 999, hasClaim: false })).toBeNull();
  });

  it("matches platform categories and store categories against their own catalog", () => {
    expect(mallCouponCategoryMatches({ issuerScope: "platform", scopeCategoryId: 12, platformCategoryId: 12, merchantCategoryId: 31 })).toBe(true);
    expect(mallCouponCategoryMatches({ issuerScope: "platform", scopeCategoryId: 12, platformCategoryId: 13, merchantCategoryId: 12 })).toBe(false);
    expect(mallCouponCategoryMatches({ issuerScope: "merchant", scopeCategoryId: 31, platformCategoryId: 31, merchantCategoryId: 31 })).toBe(true);
  });

  it("releases a coupon only after an aggregate full refund when policy allows it", () => {
    expect(shouldReleaseMallCouponAfterRefund({ policy: "full_refund", orderAmountFen: 10000, approvedRefundFen: 10000 })).toBe(true);
    expect(shouldReleaseMallCouponAfterRefund({ policy: "full_refund", orderAmountFen: 10000, approvedRefundFen: 9999 })).toBe(false);
    expect(shouldReleaseMallCouponAfterRefund({ policy: "never", orderAmountFen: 10000, approvedRefundFen: 10000 })).toBe(false);
  });

  it("rejects promotion codes outside their configured validity window", () => {
    const now = new Date("2026-07-14T08:00:00.000Z");
    expect(mallPromotionValidityError({ startsAt: "2026-07-14T09:00:00.000Z", now })).toBe("推广码尚未生效");
    expect(mallPromotionValidityError({ endsAt: "2026-07-14T07:00:00.000Z", now })).toBe("推广码已失效");
    expect(mallPromotionValidityError({ startsAt: "2026-07-14T07:00:00.000Z", endsAt: "2026-07-14T09:00:00.000Z", now })).toBeNull();
  });

  it("limits promotion attempts independently by user, device and IP", () => {
    const limits = { userLimit: 6, deviceLimit: 10, ipLimit: 20 };
    expect(mallPromotionRateLimitError({ ...limits, userCount: 6, deviceCount: 10, ipCount: 20 })).toBeNull();
    expect(mallPromotionRateLimitError({ ...limits, userCount: 7, deviceCount: 1, ipCount: 1 })).toContain("促销下单过于频繁");
    expect(mallPromotionRateLimitError({ ...limits, userCount: 1, deviceCount: 11, ipCount: 1 })).toContain("当前设备");
    expect(mallPromotionRateLimitError({ ...limits, userCount: 1, deviceCount: 1, ipCount: 21 })).toContain("当前网络");
  });

  it("blocks coupon account clusters and distinguishes promotion attribution review from blocking", () => {
    expect(mallCouponIdentityRisk({ deviceDistinctUsers: 4, ipDistinctUsers: 1, deviceAccountLimit: 3, ipAccountLimit: 12 })?.ruleCode).toBe("coupon_device_accounts");
    expect(mallCouponIdentityRisk({ deviceDistinctUsers: 1, ipDistinctUsers: 13, deviceAccountLimit: 3, ipAccountLimit: 12 })?.ruleCode).toBe("coupon_ip_accounts");
    expect(mallPromotionAttributionRisk({ buyerUserId: 7, promoterUserId: 7, deviceDistinctBuyers: 1, ipDistinctBuyers: 1, deviceBuyerLimit: 3, ipBuyerReviewLimit: 10 })).toMatchObject({ outcome: "blocked", ruleCode: "promotion_self_purchase" });
    expect(mallPromotionAttributionRisk({ buyerUserId: 7, promoterUserId: 8, deviceDistinctBuyers: 1, ipDistinctBuyers: 11, deviceBuyerLimit: 3, ipBuyerReviewLimit: 10 })).toMatchObject({ outcome: "review", ruleCode: "promotion_ip_buyers" });
    expect(mallPromotionAttributionRisk({ buyerUserId: 7, promoterUserId: 8, deviceDistinctBuyers: 1, ipDistinctBuyers: 1, deviceBuyerLimit: 3, ipBuyerReviewLimit: 10 })).toBeNull();
  });

  it("requires idempotency and protects group-buy team seats", () => {
    expect(mallPromotionOrderError({ hasPromotion: true, clientOrderKey: "" })).toContain("clientOrderKey");
    expect(mallPromotionOrderError({ hasPromotion: true, clientOrderKey: "promo-1" })).toBeNull();
    expect(mallGroupBuyJoinError({ quantity: 2, userAlreadyJoined: false, occupiedPeople: 0, minPeople: 2 })).toContain("只能购买 1 件");
    expect(mallGroupBuyJoinError({ quantity: 1, userAlreadyJoined: true, occupiedPeople: 1, minPeople: 2 })).toContain("重复参团");
    expect(mallGroupBuyJoinError({ quantity: 1, userAlreadyJoined: false, occupiedPeople: 2, minPeople: 2 })).toContain("名额已满");
  });

  it("pins report idempotency, tenant scope, merchant authorization and row locks in the service", () => {
    const source = readFileSync(join(__dirname, "../modules/mall/mall.service.ts"), "utf8");
    expect(source).toContain('where: { id, tenant: { id: tenant.id }, status: "approved" }');
    expect(source).toContain("if (exists) return this.publicMallReviewReport(exists);");
    expect(source).toContain("this.assertAdminTenantAccess(report, admin);");
    expect(source).toContain("await this.assertAdminMerchantAccess(merchant, admin");
    expect(source).toContain('report.review.status = "hidden";');
    expect(source).toContain("isSelfPurchasePromotion(promoterUserId, order.user.id)");
    expect(source).toContain("snapshot?.commissionRate ?? promotion?.commissionRate");
    expect(source).toContain("selectMallCommissionRule");
    expect(source).toContain("ruleSnapshot");
    expect(source).toContain("snapshot?.promoterUserId");
    expect(source).toContain("snapshot?.agentId");
    expect(source).toContain('action: "coupon_claim"');
    expect(source).toContain('action: "promotion_attribution"');
    expect(source).toContain('riskDecision: risk?.outcome || "allowed"');
    expect(source).toContain('snapshot?.riskDecision === "blocked"');
    expect(source).toContain("mall_promotion_risk_alerts");
    expect(source.indexOf("const replay = await this.couponClaims.findOne")).toBeLessThan(source.indexOf("await this.consumeCouponClaimRisk"));
    expect(source.match(/lock: \{ mode: "pessimistic_write" \}/g)?.length || 0).toBeGreaterThan(5);
  });
});
