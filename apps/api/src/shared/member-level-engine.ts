export type GrowthLevel = { id: number; minGrowth: number; validityDays?: number | null; enabled?: boolean };

export type MemberLevelSnapshotSource = GrowthLevel & {
  name: string;
  minPoints?: number;
  discountRate?: string | number;
  priorityBooking?: boolean;
  sortOrder?: number;
  benefits?: Array<{ key: string; name: string; description?: string }> | null;
  tenantScopeKey?: string;
  version?: number;
};

export function memberLevelScopeKey(tenant?: { id?: number | null } | null) {
  return tenant?.id ? `tenant:${tenant.id}` : "platform";
}

export function memberLevelSnapshot(level?: MemberLevelSnapshotSource | null) {
  if (!level) return null;
  return {
    id: level.id,
    name: level.name,
    minPoints: Number(level.minPoints || 0),
    minGrowth: Number(level.minGrowth || 0),
    validityDays: level.validityDays || null,
    discountRate: Number(level.discountRate ?? 1).toFixed(2),
    priorityBooking: Boolean(level.priorityBooking),
    sortOrder: Number(level.sortOrder || 0),
    benefits: Array.isArray(level.benefits) ? level.benefits : [],
    tenantScopeKey: level.tenantScopeKey || "platform",
    version: Number(level.version || 1)
  };
}

export function resolveGrowthLevel(levels: GrowthLevel[], growthValue: number) {
  return [...levels].filter(level => level.enabled !== false).sort((a, b) => b.minGrowth - a.minGrowth).find(level => growthValue >= level.minGrowth) || null;
}

export function levelExpiry(level: GrowthLevel | null, startedAt = new Date()) {
  if (!level?.validityDays) return null;
  return new Date(startedAt.getTime() + Math.max(1, level.validityDays) * 86400000);
}

export function growthFromPointLog(input: { points: number; sourceType: string }) {
  return input.points > 0 && input.sourceType !== "points_return" ? input.points : 0;
}

export function expiredLevelCycle(now = new Date()) {
  return { growthCycleStartedAt: now, growthValue: 0, level: null, levelStartedAt: null, levelExpiresAt: null, levelSource: "expiry_recalculation" };
}

export function manualLevelOverrideActive(levelSource?: string | null, levelExpiresAt?: Date | string | null, now = new Date()) {
  if (levelSource !== "admin_adjustment") return false;
  if (!levelExpiresAt) return true;
  const expiresAt = levelExpiresAt instanceof Date ? levelExpiresAt : new Date(levelExpiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt > now;
}
