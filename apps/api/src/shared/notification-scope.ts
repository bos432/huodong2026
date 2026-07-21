export function notificationTenantScopeMatches(input: { actorTenantId?: number | null; tenantScopeKey?: string | null; activityTenantId?: number | null }) {
  if (!input.actorTenantId) return true;
  if (input.tenantScopeKey) return input.tenantScopeKey === `tenant:${input.actorTenantId}`;
  return input.activityTenantId === input.actorTenantId;
}
