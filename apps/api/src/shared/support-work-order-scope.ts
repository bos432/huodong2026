export function supportWorkOrderScopeKey(tenantId?: number | null) {
  return tenantId ? `tenant:${tenantId}` : "platform";
}

export function supportWorkOrderBelongsToActor(scopeKey: string, actorTenantId?: number | null) {
  return actorTenantId ? scopeKey === supportWorkOrderScopeKey(actorTenantId) : true;
}
