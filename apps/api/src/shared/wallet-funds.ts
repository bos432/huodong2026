export type WalletFundSource = "cash" | "gift" | "mixed";

export function allocateWalletFunds(amountFen: number, cashFen: number, giftFen: number, source: WalletFundSource) {
  if (![amountFen, cashFen, giftFen].every(Number.isSafeInteger) || amountFen <= 0 || cashFen < 0 || giftFen < 0) return null;
  if (source === "cash") return cashFen >= amountFen ? { cashFen: amountFen, giftFen: 0 } : null;
  if (source === "gift") return giftFen >= amountFen ? { cashFen: 0, giftFen: amountFen } : null;
  if (cashFen + giftFen < amountFen) return null;
  const allocatedGiftFen = Math.min(giftFen, amountFen);
  return { cashFen: amountFen - allocatedGiftFen, giftFen: allocatedGiftFen };
}
