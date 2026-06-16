export type CharityAccrualInput = {
  paidAmount: number;
  originalAmount?: number;
  manualBasisAmount?: number | null;
  ratePercent: number;
  accrualBasis?: "paid_amount" | "original_amount" | "manual";
};

export function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function charityBasisAmount(input: CharityAccrualInput) {
  if (input.accrualBasis === "original_amount") return Math.max(Number(input.originalAmount || input.paidAmount || 0), 0);
  if (input.accrualBasis === "manual") return Math.max(Number(input.manualBasisAmount || 0), 0);
  return Math.max(Number(input.paidAmount || 0), 0);
}

export function charityAccrualAmount(input: CharityAccrualInput) {
  return roundMoney((charityBasisAmount(input) * Math.max(Number(input.ratePercent || 0), 0)) / 100);
}

export function charityReversalAmount(accrualAmount: number, refundAmount: number, orderAmount: number) {
  const ratio = Math.min(Math.max(Number(refundAmount || 0), 0) / Math.max(Number(orderAmount || 0), 0.01), 1);
  return roundMoney(Math.max(Number(accrualAmount || 0), 0) * ratio);
}
