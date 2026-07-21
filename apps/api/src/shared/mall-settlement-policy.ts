export type MallSettlementAmountInput = {
  orderFen: number;
  refundFen: number;
  merchantDirectOrderFen: number;
  merchantDirectRefundFen: number;
  serviceFeeBps: number;
  commissionFen?: number;
  commissionClawbackFen?: number;
  adjustmentFen?: number;
};

export type MallSettlementAmounts = {
  netFen: number;
  platformCollectedFen: number;
  merchantDirectFen: number;
  serviceFeeFen: number;
  commissionFen: number;
  commissionClawbackFen: number;
  adjustmentFen: number;
  payableFen: number;
};

function assertSafeFen(value: number, label: string) {
  if (!Number.isSafeInteger(value)) throw new Error(`${label} must be a safe integer`);
}

export function settlementBpsAmountFen(amountFen: number, bps: number) {
  assertSafeFen(amountFen, "amountFen");
  if (!Number.isInteger(bps) || bps < 0 || bps > 10000) throw new Error("serviceFeeBps must be between 0 and 10000");
  const absolute = Math.abs(amountFen);
  const result = Math.floor((absolute * bps + 5000) / 10000);
  if (!Number.isSafeInteger(result)) throw new Error("service fee exceeds safe integer range");
  return amountFen < 0 ? -result : result;
}

export function calculateMallSettlementAmounts(input: MallSettlementAmountInput): MallSettlementAmounts {
  for (const [label, value] of Object.entries(input)) {
    if (label === "serviceFeeBps") continue;
    assertSafeFen(Number(value || 0), label);
  }
  const commissionFen = input.commissionFen || 0;
  const commissionClawbackFen = input.commissionClawbackFen || 0;
  const adjustmentFen = input.adjustmentFen || 0;
  const netFen = input.orderFen - input.refundFen;
  const merchantDirectFen = input.merchantDirectOrderFen - input.merchantDirectRefundFen;
  const platformCollectedFen = netFen - merchantDirectFen;
  const serviceFeeFen = settlementBpsAmountFen(netFen, input.serviceFeeBps);
  const payableFen = platformCollectedFen - serviceFeeFen - commissionFen + commissionClawbackFen + adjustmentFen;
  for (const [label, value] of Object.entries({ netFen, merchantDirectFen, platformCollectedFen, serviceFeeFen, payableFen })) assertSafeFen(value, label);
  return { netFen, platformCollectedFen, merchantDirectFen, serviceFeeFen, commissionFen, commissionClawbackFen, adjustmentFen, payableFen };
}

export function mallSettlementConsistency(input: MallSettlementAmounts, linePayableFen: number) {
  assertSafeFen(linePayableFen, "linePayableFen");
  const netConsistent = input.netFen === input.platformCollectedFen + input.merchantDirectFen;
  const payableConsistent = input.payableFen === input.platformCollectedFen - input.serviceFeeFen - input.commissionFen + input.commissionClawbackFen + input.adjustmentFen;
  const linesConsistent = input.payableFen === linePayableFen;
  return { consistent: netConsistent && payableConsistent && linesConsistent, netConsistent, payableConsistent, linesConsistent, linePayableFen, differenceFen: linePayableFen - input.payableFen };
}
