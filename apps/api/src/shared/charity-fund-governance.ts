export function cappedCharityReversalFen(accrualFen: number, reversedFen: number, requestedFen: number) {
  for (const [name, value] of Object.entries({ accrualFen, reversedFen, requestedFen })) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative safe integer`);
  }
  return Math.min(Math.max(accrualFen - reversedFen, 0), requestedFen);
}

export function hasSeparatedCharityActors(requesterId?: number | null, reviewerId?: number | null, payerId?: number | null) {
  const actorIds = [requesterId, reviewerId, payerId].filter((value): value is number => Number.isSafeInteger(value));
  return actorIds.length === 3 && new Set(actorIds).size === 3;
}
