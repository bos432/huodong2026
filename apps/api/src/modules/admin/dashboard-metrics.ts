export function boundedPercentage(numerator: number, denominator: number) {
  const safeNumerator = Number.isFinite(numerator) ? Math.max(0, numerator) : 0;
  const safeDenominator = Number.isFinite(denominator) ? Math.max(0, denominator) : 0;
  if (safeDenominator === 0) return 0;
  return Math.min(100, Math.round((safeNumerator / safeDenominator) * 1000) / 10);
}
