export function memberSegmentScopeMatches(actorTenantId: number | null | undefined, rowTenantId: number | null | undefined, rowScopeKey?: string | null) {
  const actorScope = Number(actorTenantId || 0) || null;
  const rowScope = Number(rowTenantId || 0) || null;
  const expectedScopeKey = actorScope ? `tenant:${actorScope}` : "platform";
  if (rowScopeKey && rowScopeKey !== expectedScopeKey) return false;
  return actorScope === rowScope;
}
