export type PointMutationPolicy = "reject" | "debt";

export function applyPointMutation(input: { balance: number; debt: number; requestedPoints: number; negativePolicy?: PointMutationPolicy }) {
  const balance = Math.max(Math.trunc(input.balance || 0), 0);
  const debt = Math.max(Math.trunc(input.debt || 0), 0);
  const requestedPoints = Math.trunc(input.requestedPoints || 0);
  if (!requestedPoints) throw new Error("point mutation cannot be zero");

  let appliedPoints = requestedPoints;
  let debtAdded = 0;
  if (requestedPoints < 0 && balance + requestedPoints < 0) {
    if ((input.negativePolicy || "reject") === "reject") return { allowed: false as const, balance, debt, requestedPoints, appliedPoints: 0, debtAdded: 0, debtRecovery: 0, balanceAfter: balance, debtAfter: debt };
    appliedPoints = -balance;
    debtAdded = Math.abs(requestedPoints) - balance;
  }

  const primaryBalance = balance + appliedPoints;
  const debtBeforeRecovery = debt + debtAdded;
  const debtRecovery = appliedPoints > 0 ? Math.min(appliedPoints, debtBeforeRecovery) : 0;
  return {
    allowed: true as const,
    balance,
    debt,
    requestedPoints,
    appliedPoints,
    debtAdded,
    debtRecovery,
    balanceAfter: Math.max(primaryBalance - debtRecovery, 0),
    debtAfter: debtBeforeRecovery - debtRecovery
  };
}

export function cumulativePointClawbackTarget(input: { earnedPoints: number; paidAmountFen: number; refundedAmountFen: number }) {
  const earnedPoints = Math.max(Math.trunc(input.earnedPoints || 0), 0);
  const paidAmountFen = Math.max(Math.trunc(input.paidAmountFen || 0), 0);
  const refundedAmountFen = Math.min(Math.max(Math.trunc(input.refundedAmountFen || 0), 0), paidAmountFen);
  if (!earnedPoints || !paidAmountFen || !refundedAmountFen) return 0;
  if (refundedAmountFen >= paidAmountFen) return earnedPoints;
  return Math.min(Math.floor((earnedPoints * refundedAmountFen) / paidAmountFen), earnedPoints);
}

export type PointReplayEntry = {
  id: number;
  points: number;
  sourceType: string;
  expiresAt?: Date | string | null;
  reversedAt?: Date | string | null;
  createdAt: Date | string;
};

export function calculatePointRuleAward(rule: { enabled: boolean; calculationMode: "fixed" | "amount_ratio"; fixedPoints: number; amountFenPerPoint: number; growthMode: "same_as_points" | "fixed" | "none"; fixedGrowth: number }, amountFen = 0) {
  if (!rule.enabled) return { points: 0, growthValue: 0 };
  const unitPoints = Math.max(Math.trunc(rule.fixedPoints || 0), 0);
  const points = rule.calculationMode === "amount_ratio"
    ? Math.floor(Math.max(Math.trunc(amountFen || 0), 0) / Math.max(Math.trunc(rule.amountFenPerPoint || 0), 1)) * unitPoints
    : unitPoints;
  const growthValue = rule.growthMode === "same_as_points" ? points : rule.growthMode === "fixed" ? Math.max(Math.trunc(rule.fixedGrowth || 0), 0) : 0;
  return { points, growthValue };
}

const ACCOUNTING_ONLY_POINT_SOURCES = new Set(["points_balance_repair", "points_expiry_reconciliation"]);

export function replayPointAvailability(entries: PointReplayEntry[], now = new Date()) {
  const lots: Array<{ id: number; remaining: number; expiresAt: number; createdAt: number }> = [];
  let expiredPoints = 0;

  const expireLots = (time: number) => {
    for (const lot of lots) {
      if (lot.remaining > 0 && lot.expiresAt <= time) {
        expiredPoints += lot.remaining;
        lot.remaining = 0;
      }
    }
  };

  for (const entry of [...entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id - b.id)) {
    if (entry.reversedAt || ACCOUNTING_ONLY_POINT_SOURCES.has(entry.sourceType)) continue;
    const createdAt = new Date(entry.createdAt).getTime();
    expireLots(createdAt);
    const points = Math.trunc(Number(entry.points || 0));
    if (points > 0) {
      const expiresAt = entry.expiresAt ? new Date(entry.expiresAt).getTime() : Number.POSITIVE_INFINITY;
      lots.push({ id: entry.id, remaining: points, expiresAt: Number.isFinite(expiresAt) ? expiresAt : Number.POSITIVE_INFINITY, createdAt });
      continue;
    }
    let deduction = Math.abs(points);
    for (const lot of lots.filter((item) => item.remaining > 0).sort((a, b) => a.expiresAt - b.expiresAt || a.createdAt - b.createdAt || a.id - b.id)) {
      if (!deduction) break;
      const consumed = Math.min(lot.remaining, deduction);
      lot.remaining -= consumed;
      deduction -= consumed;
    }
  }

  expireLots(now.getTime());
  return { availablePoints: lots.reduce((sum, lot) => sum + lot.remaining, 0), expiredPoints };
}
