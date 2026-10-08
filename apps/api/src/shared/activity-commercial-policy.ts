import { settlementBpsAmountFen } from "./mall-settlement-policy";

export type ActivityCommercialAmountInput = {
  grossCollectedFen: number;
  refundFen: number;
  platformFeeBps: number;
  organizerCommissionBps: number;
};

export type ActivityCommercialAmounts = {
  grossCollectedFen: number;
  refundFen: number;
  netCollectedFen: number;
  platformFeeFen: number;
  organizerCommissionFen: number;
  organizerPayableFen: number;
};

function assertSafeFen(value: number, label: string) {
  if (!Number.isSafeInteger(value)) throw new Error(`${label} must be a safe integer`);
}

export function normalizeCommercialRateToBps(value: unknown, label: string) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw < 0) throw new Error(`${label}必须是 0 到 10000 基点范围内的有效费率`);

  // Accept ratio (0.035), percentage (3.5), or already-normalized basis points (350).
  const bps = raw <= 1 ? Math.round(raw * 10000) : raw <= 100 ? Math.round(raw * 100) : Math.round(raw);
  if (!Number.isInteger(bps) || bps < 0 || bps > 10000) throw new Error(`${label}必须是 0 到 10000 基点范围内的有效费率`);
  return bps;
}

export function calculateActivityCommercialAmounts(input: ActivityCommercialAmountInput): ActivityCommercialAmounts {
  assertSafeFen(input.grossCollectedFen, "grossCollectedFen");
  assertSafeFen(input.refundFen, "refundFen");
  if (!Number.isInteger(input.platformFeeBps) || input.platformFeeBps < 0 || input.platformFeeBps > 10000) throw new Error("platformFeeBps must be between 0 and 10000");
  if (!Number.isInteger(input.organizerCommissionBps) || input.organizerCommissionBps < 0 || input.organizerCommissionBps > 10000) throw new Error("organizerCommissionBps must be between 0 and 10000");

  const netCollectedFen = input.grossCollectedFen - input.refundFen;
  const platformFeeFen = settlementBpsAmountFen(netCollectedFen, input.platformFeeBps);
  const organizerCommissionFen = settlementBpsAmountFen(netCollectedFen, input.organizerCommissionBps);
  const organizerPayableFen = netCollectedFen - platformFeeFen - organizerCommissionFen;
  assertSafeFen(netCollectedFen, "netCollectedFen");
  assertSafeFen(organizerPayableFen, "organizerPayableFen");
  return { ...input, netCollectedFen, platformFeeFen, organizerCommissionFen, organizerPayableFen };
}
