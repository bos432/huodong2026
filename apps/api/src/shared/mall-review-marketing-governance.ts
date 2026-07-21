export async function saveWithUniqueReplay<T>(save: () => Promise<T>, findReplay: () => Promise<T | null | undefined>) {
  try {
    return await save();
  } catch (error) {
    const replay = await findReplay();
    if (replay) return replay;
    throw error;
  }
}

export function mallAppendReviewError(input: { reviewStatus: string; appendedAt?: Date | string | null; createdAt: Date | string; now?: Date }) {
  if (input.reviewStatus !== "approved") return "首评审核展示后才能追评";
  if (input.appendedAt) return "该评价已追评，不能重复提交";
  const createdAt = new Date(input.createdAt).getTime();
  const now = (input.now || new Date()).getTime();
  if (!Number.isFinite(createdAt) || now - createdAt > 180 * 24 * 60 * 60 * 1000) return "已超过 180 天追评期限";
  return null;
}

export function publicMallReviewAppend<T>(input: { appendStatus?: string | null; appendContent?: string | null; appendImages?: T[] | null; appendedAt?: Date | string | null }) {
  const visible = input.appendStatus === "approved";
  return {
    appendContent: visible ? input.appendContent || null : null,
    appendImages: visible && Array.isArray(input.appendImages) ? input.appendImages : [],
    appendedAt: visible ? input.appendedAt || null : null
  };
}

export function isSelfPurchasePromotion(promoterUserId?: number | null, buyerUserId?: number | null) {
  return Boolean(promoterUserId && buyerUserId && promoterUserId === buyerUserId);
}

export function mallCouponClaimError(input: { issuanceLimit?: number | null; claimedCount?: number | null; hasClaim: boolean }) {
  const issuanceLimit = Math.max(Math.trunc(Number(input.issuanceLimit || 0)), 0);
  const claimedCount = Math.max(Math.trunc(Number(input.claimedCount || 0)), 0);
  return !input.hasClaim && issuanceLimit > 0 && claimedCount >= issuanceLimit ? "优惠券已领完" : null;
}

export function mallCouponCategoryMatches(input: {
  issuerScope?: "platform" | "merchant" | null;
  scopeCategoryId?: number | null;
  merchantCategoryId?: number | null;
  platformCategoryId?: number | null;
}) {
  const itemCategoryId = input.issuerScope === "platform" ? input.platformCategoryId : input.merchantCategoryId;
  return Number(itemCategoryId || 0) === Number(input.scopeCategoryId || 0);
}

export function shouldReleaseMallCouponAfterRefund(input: {
  policy?: "never" | "full_refund" | string | null;
  orderAmountFen: number;
  approvedRefundFen: number;
}) {
  return input.policy === "full_refund"
    && Math.max(Math.trunc(Number(input.orderAmountFen || 0)), 0) > 0
    && Math.max(Math.trunc(Number(input.approvedRefundFen || 0)), 0) >= Math.max(Math.trunc(Number(input.orderAmountFen || 0)), 0);
}

export function mallPromotionValidityError(input: {
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  now?: Date;
}) {
  const now = (input.now || new Date()).getTime();
  const startsAt = input.startsAt ? new Date(input.startsAt).getTime() : null;
  const endsAt = input.endsAt ? new Date(input.endsAt).getTime() : null;
  if (startsAt !== null && Number.isFinite(startsAt) && startsAt > now) return "推广码尚未生效";
  if (endsAt !== null && Number.isFinite(endsAt) && endsAt < now) return "推广码已失效";
  return null;
}

export function mallPromotionRateLimitError(input: {
  userCount: number;
  deviceCount?: number | null;
  ipCount?: number | null;
  userLimit: number;
  deviceLimit: number;
  ipLimit: number;
  actionLabel?: string;
}) {
  const label = input.actionLabel || "促销下单";
  if (input.userLimit > 0 && input.userCount > input.userLimit) return `${label}过于频繁，请稍后再试`;
  if (input.deviceLimit > 0 && Number(input.deviceCount || 0) > input.deviceLimit) return `当前设备${label}过于频繁，请稍后再试`;
  if (input.ipLimit > 0 && Number(input.ipCount || 0) > input.ipLimit) return `当前网络${label}过于频繁，请稍后再试`;
  return null;
}

export type MallMarketingRiskDecision = {
  outcome: "review" | "blocked";
  ruleCode: string;
  severity: "medium" | "high" | "critical";
  message: string;
};

export function mallCouponIdentityRisk(input: {
  deviceDistinctUsers?: number | null;
  ipDistinctUsers?: number | null;
  deviceAccountLimit: number;
  ipAccountLimit: number;
}): MallMarketingRiskDecision | null {
  if (input.deviceAccountLimit > 0 && Number(input.deviceDistinctUsers || 0) > input.deviceAccountLimit) {
    return { outcome: "blocked", ruleCode: "coupon_device_accounts", severity: "high", message: "当前设备关联的领券账号过多，本次领取已被拦截" };
  }
  if (input.ipAccountLimit > 0 && Number(input.ipDistinctUsers || 0) > input.ipAccountLimit) {
    return { outcome: "blocked", ruleCode: "coupon_ip_accounts", severity: "high", message: "当前网络关联的领券账号过多，本次领取已被拦截" };
  }
  return null;
}

export function mallPromotionAttributionRisk(input: {
  buyerUserId: number;
  promoterUserId?: number | null;
  deviceDistinctBuyers?: number | null;
  ipDistinctBuyers?: number | null;
  deviceBuyerLimit: number;
  ipBuyerReviewLimit: number;
}): MallMarketingRiskDecision | null {
  if (input.promoterUserId && input.promoterUserId === input.buyerUserId) {
    return { outcome: "blocked", ruleCode: "promotion_self_purchase", severity: "critical", message: "推广用户使用本人推广码下单，佣金归因已拦截" };
  }
  if (input.deviceBuyerLimit > 0 && Number(input.deviceDistinctBuyers || 0) > input.deviceBuyerLimit) {
    return { outcome: "blocked", ruleCode: "promotion_device_buyers", severity: "high", message: "同一设备使用该推广码的买家账号过多，佣金归因已拦截" };
  }
  if (input.ipBuyerReviewLimit > 0 && Number(input.ipDistinctBuyers || 0) > input.ipBuyerReviewLimit) {
    return { outcome: "review", ruleCode: "promotion_ip_buyers", severity: "medium", message: "同一网络使用该推广码的买家账号较多，请复核推广真实性" };
  }
  return null;
}

export function mallPromotionOrderError(input: { hasPromotion: boolean; clientOrderKey?: string | null }) {
  return input.hasPromotion && !String(input.clientOrderKey || "").trim() ? "秒杀或拼团下单必须携带 clientOrderKey，避免重复请求占用活动库存" : null;
}

export function mallGroupBuyJoinError(input: { quantity: number; teamStatus?: string | null; userAlreadyJoined: boolean; occupiedPeople: number; minPeople: number }) {
  if (input.quantity !== 1) return "拼团按参团人数成团，每个订单只能购买 1 件拼团商品";
  if (input.teamStatus === "failed") return "该拼团队伍已失败，请重新开团";
  if (input.teamStatus === "success") return "该拼团队伍已成团，请重新开团";
  if (input.userAlreadyJoined) return "你已加入该拼团队伍，请勿重复参团";
  if (input.occupiedPeople >= input.minPeople) return "该拼团队伍名额已满，请重新开团";
  return null;
}
