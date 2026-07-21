export type TicketPricingInput = {
  basePrice: number;
  soldCount: number;
  now: Date;
  isMember: boolean;
  memberPrice?: number | null;
  earlyBirdPrice?: number | null;
  earlyBirdEndsAt?: Date | null;
  tierPrices?: Array<{ minSold: number; price: number }> | null;
};

export function resolveTicketPrice(input: TicketPricingInput) {
  let price = Math.max(0, input.basePrice);
  let rule = "base";
  const tier = [...(input.tierPrices || [])].sort((a, b) => a.minSold - b.minSold).filter((item) => input.soldCount >= item.minSold).pop();
  if (tier) { price = Math.max(0, Number(tier.price)); rule = `tier:${tier.minSold}`; }
  if (input.earlyBirdPrice !== null && input.earlyBirdPrice !== undefined && input.earlyBirdEndsAt && input.now <= input.earlyBirdEndsAt && Number(input.earlyBirdPrice) < price) {
    price = Math.max(0, Number(input.earlyBirdPrice)); rule = "early_bird";
  }
  if (input.isMember && input.memberPrice !== null && input.memberPrice !== undefined && Number(input.memberPrice) < price) {
    price = Math.max(0, Number(input.memberPrice)); rule = "member";
  }
  return { price, rule };
}
