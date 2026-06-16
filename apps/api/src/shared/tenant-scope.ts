import { NotFoundException } from "@nestjs/common";

export type TenantLike = { id: number; code?: string | null; name?: string | null };
export type TenantScopedActor = { role?: string | null; tenantId?: number | null };
export type TenantOwnedRow = { tenant?: TenantLike | null };

export function normalizeTenantRole(role?: string | null) {
  return role === "admin" ? "super_admin" : role || "";
}

export function isTenantScopedActor(actor?: TenantScopedActor | null) {
  return Boolean(actor?.tenantId);
}

export function tenantRelationForActor<T extends TenantLike>(actor?: TenantScopedActor | null, fallback?: T | null) {
  if (actor?.tenantId) return { id: actor.tenantId } as T;
  return fallback || null;
}

export function applyTenantScopeToQuery(builder: { andWhere: (condition: string, parameters?: Record<string, unknown>) => unknown }, alias: string, actor?: TenantScopedActor | null) {
  if (isTenantScopedActor(actor)) builder.andWhere(`${alias}.tenantId = :tenantId`, { tenantId: actor?.tenantId });
}

export function assertTenantAccessForActor(row: TenantOwnedRow | null | undefined, actor?: TenantScopedActor | null, message = "Resource not found or not in current tenant") {
  if (!row || !isTenantScopedActor(actor)) return;
  if (!row.tenant?.id) return;
  if (row.tenant.id !== actor?.tenantId) throw new NotFoundException(message);
}

export function normalizeTenantCode(code?: string | null) {
  const value = code?.trim();
  return value || null;
}

export function normalizeTenantHost(host?: string | null) {
  const value = host?.split(":")[0]?.trim().toLowerCase();
  return value || null;
}

export function assertTenantOwnedResourceAccess(row: TenantOwnedRow, tenant: TenantLike | null | undefined, message: string) {
  if (tenant && row.tenant?.id !== tenant.id) throw new NotFoundException(message);
}
