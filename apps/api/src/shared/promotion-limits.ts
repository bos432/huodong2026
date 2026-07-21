export function couponLimitError(input: { usageLimit?: number | null; usedCount?: number; perUserLimit?: number; usedByUser?: number; claimRequired?: boolean; claimedCount?: number; claimUsedCount?: number }) {
  if (input.usageLimit !== null && input.usageLimit !== undefined && (input.usedCount || 0) >= input.usageLimit) return "优惠券已用完";
  if ((input.usedByUser || 0) >= Math.max(input.perUserLimit || 1, 1)) return "已达到该优惠券每人使用上限";
  if (input.claimRequired && (input.claimedCount || 0) <= (input.claimUsedCount || 0)) return "请先领取该优惠券";
  return null;
}

export function redemptionLimitError(input: { usageLimit?: number; usedCount?: number; perUserLimit?: number; usedByUser?: number }) {
  if ((input.usageLimit || 0) > 0 && (input.usedCount || 0) >= Number(input.usageLimit)) return "兑换码已兑完";
  if ((input.usedByUser || 0) >= Math.max(input.perUserLimit || 1, 1)) return "已达到该兑换码每人使用上限";
  return null;
}
