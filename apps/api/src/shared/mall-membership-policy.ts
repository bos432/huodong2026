import { fenToYuan, yuanToFen } from "./money";

export type MallMembershipPurchaseLike = {
  status?: string | null;
  expiresAt?: Date | string | null;
};

export function normalizeMallMemberDiscountRate(value: unknown, fallback = 1) {
  const fallbackRate = Number.isFinite(Number(fallback)) ? Math.min(Math.max(Number(fallback), 0.01), 1) : 1;
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0.01 || rate > 1) return fallbackRate;
  return Math.round(rate * 100) / 100;
}

export function mallMemberPriceFen(priceFen: number, discountRate: unknown) {
  const baseFen = Math.max(Math.trunc(Number(priceFen || 0)), 0);
  const rate = normalizeMallMemberDiscountRate(discountRate);
  return Math.min(baseFen, Math.max(Math.round(baseFen * rate), 0));
}

export function mallMemberPrice(value: string | number, discountRate: unknown) {
  return fenToYuan(mallMemberPriceFen(yuanToFen(value), discountRate));
}

export function mallMembershipEffective(purchase: MallMembershipPurchaseLike | null | undefined, now = new Date()) {
  if (!purchase || purchase.status !== "active" || !purchase.expiresAt) return false;
  const expiresAt = new Date(purchase.expiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt > now;
}

export function mallMembershipPurchaseExpiresAt(startsAt: Date, validityDays: number) {
  const expiresAt = new Date(startsAt);
  expiresAt.setDate(expiresAt.getDate() + Math.max(Math.trunc(Number(validityDays || 0)), 1));
  return expiresAt;
}
