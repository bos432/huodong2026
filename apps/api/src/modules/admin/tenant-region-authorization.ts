export type TenantRegionAuthorizationLike = {
  enabled: boolean;
  authorizationStatus: string;
  validFrom?: string | null;
  validUntil?: string | null;
};

export function tenantRegionAuthorizationActive(region: TenantRegionAuthorizationLike, today = new Date().toISOString().slice(0, 10)) {
  return region.enabled && region.authorizationStatus === "approved" && (!region.validFrom || region.validFrom <= today) && (!region.validUntil || region.validUntil >= today);
}

export function tenantRegionAuthorizationReminder(region: TenantRegionAuthorizationLike, today = new Date().toISOString().slice(0, 10)) {
  if (region.authorizationStatus === "pending") return { level: "warning", code: "pending", message: "区域授权等待审批" };
  if (region.authorizationStatus === "rejected") return { level: "danger", code: "rejected", message: "区域授权已驳回" };
  if (!region.validUntil) return null;
  const daysRemaining = Math.round((new Date(`${region.validUntil}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000);
  if (daysRemaining < 0) return { level: "danger", code: "expired", daysRemaining, message: `区域授权已过期 ${Math.abs(daysRemaining)} 天` };
  if (daysRemaining <= 30) return { level: daysRemaining <= 7 ? "danger" : "warning", code: "expiring", daysRemaining, message: daysRemaining === 0 ? "区域授权今天到期" : `区域授权将在 ${daysRemaining} 天后到期` };
  return null;
}
