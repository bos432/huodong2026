export type MerchantPermissionRequirement = string | string[] | undefined;

export type MerchantAccessPolicyInput = {
  enabled?: boolean;
  permissions?: string[] | null;
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
};

export function normalizedMerchantFeeBps(value: unknown) {
  const bps = Math.trunc(Number(value || 0));
  return Number.isFinite(bps) && bps >= 0 && bps <= 10000 ? bps : null;
}

export function merchantAccessIsActive(access: MerchantAccessPolicyInput, now = new Date()) {
  if (access.enabled === false) return false;
  const validFrom = access.validFrom ? new Date(access.validFrom) : null;
  const validUntil = access.validUntil ? new Date(access.validUntil) : null;
  if (validFrom && !Number.isNaN(validFrom.getTime()) && validFrom > now) return false;
  if (validUntil && !Number.isNaN(validUntil.getTime()) && validUntil <= now) return false;
  return true;
}

export function merchantAccessAllows(access: MerchantAccessPolicyInput, required: MerchantPermissionRequirement, fallbackPermissions: string[] = []) {
  if (!required) return true;
  const granted = new Set((access.permissions?.length ? access.permissions : fallbackPermissions).map((item) => String(item).trim()).filter(Boolean));
  const candidates = Array.isArray(required) ? required : [required];
  return candidates.some((permission) => granted.has(permission));
}

export function merchantGovernanceTenantScopeId(admin?: { tenantId?: number | null } | null) {
  const tenantId = Number(admin?.tenantId || 0);
  return tenantId > 0 ? tenantId : null;
}
