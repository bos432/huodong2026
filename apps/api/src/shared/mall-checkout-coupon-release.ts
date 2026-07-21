export function mallCheckoutCouponReleaseEligible(statuses: string[]) {
  return statuses.length > 0 && statuses.every((status) => status === "closed" || status === "refunded");
}
