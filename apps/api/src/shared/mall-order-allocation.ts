export type MallAllocationInput = { key: string; goodsFen: number; freightFen?: number };
export type MallDiscountAllocationInput = MallAllocationInput & { couponEligibleFen?: number };
export type MallFreightRule = { enabled?: boolean; baseFreightFen?: number; freeThresholdFen?: number };

function nonNegativeInteger(value: unknown) {
  const number = Math.trunc(Number(value || 0));
  return Number.isSafeInteger(number) && number > 0 ? number : 0;
}

export function mallFreightFen(goodsFen: number, rule?: MallFreightRule | null) {
  const goods = nonNegativeInteger(goodsFen);
  if (rule?.enabled === false) return 0;
  const freight = nonNegativeInteger(rule?.baseFreightFen);
  const threshold = nonNegativeInteger(rule?.freeThresholdFen);
  return threshold > 0 && goods >= threshold ? 0 : freight;
}

export function allocateMallAmountFen(totalFen: number, rows: MallAllocationInput[]) {
  const total = nonNegativeInteger(totalFen);
  const normalized = rows.map((row, index) => ({ key: row.key, index, weight: nonNegativeInteger(row.goodsFen) }));
  const totalWeight = normalized.reduce((sum, row) => sum + row.weight, 0);
  if (!normalized.length) return [];
  if (!total || !totalWeight) return normalized.map((row) => ({ key: row.key, amountFen: 0 }));
  const provisional = normalized.map((row) => {
    const exact = total * row.weight / totalWeight;
    const floor = Math.floor(exact);
    return { ...row, amountFen: floor, remainder: exact - floor };
  });
  let remaining = total - provisional.reduce((sum, row) => sum + row.amountFen, 0);
  provisional.sort((a, b) => b.remainder - a.remainder || b.weight - a.weight || a.index - b.index);
  for (let index = 0; index < provisional.length && remaining > 0; index = (index + 1) % provisional.length) {
    provisional[index].amountFen += 1;
    remaining -= 1;
  }
  return provisional.sort((a, b) => a.index - b.index).map((row) => ({ key: row.key, amountFen: row.amountFen }));
}

export function buildMallCheckoutAllocations(rows: MallAllocationInput[], discountFen: number) {
  const discountMap = new Map(allocateMallAmountFen(discountFen, rows).map((row) => [row.key, row.amountFen]));
  return rows.map((row) => {
    const goodsFen = nonNegativeInteger(row.goodsFen);
    const freightFen = nonNegativeInteger(row.freightFen);
    const allocatedDiscountFen = Math.min(discountMap.get(row.key) || 0, goodsFen + freightFen);
    return { key: row.key, goodsFen, freightFen, discountFen: allocatedDiscountFen, payableFen: Math.max(goodsFen + freightFen - allocatedDiscountFen, 0) };
  });
}

export function buildMallCheckoutDiscountAllocations(rows: MallDiscountAllocationInput[], couponDiscountFen: number, pointsDiscountFen: number) {
  const couponWeights = rows.map((row) => ({ key: row.key, goodsFen: Math.min(nonNegativeInteger(row.couponEligibleFen), nonNegativeInteger(row.goodsFen)) }));
  const couponMap = new Map(allocateMallAmountFen(couponDiscountFen, couponWeights).map((row) => [row.key, row.amountFen]));
  const pointsWeights = rows.map((row) => ({ key: row.key, goodsFen: Math.max(nonNegativeInteger(row.goodsFen) - (couponMap.get(row.key) || 0), 0) }));
  const pointsMap = new Map(allocateMallAmountFen(pointsDiscountFen, pointsWeights).map((row) => [row.key, row.amountFen]));
  return rows.map((row) => {
    const goodsFen = nonNegativeInteger(row.goodsFen);
    const freightFen = nonNegativeInteger(row.freightFen);
    const couponFen = Math.min(couponMap.get(row.key) || 0, goodsFen);
    const pointsFen = Math.min(pointsMap.get(row.key) || 0, Math.max(goodsFen - couponFen, 0));
    const discountFen = couponFen + pointsFen;
    return { key: row.key, goodsFen, freightFen, couponDiscountFen: couponFen, pointsDiscountFen: pointsFen, discountFen, payableFen: Math.max(goodsFen + freightFen - discountFen, 0) };
  });
}
