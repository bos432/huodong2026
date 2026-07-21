export type ContentAudience = {
  mode?: "all" | "guest" | "authenticated" | "member_levels";
  memberLevelIds?: number[];
};

export function normalizeContentAudience(value: unknown): ContentAudience {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const allowed = new Set(["all", "guest", "authenticated", "member_levels"]);
  const mode = allowed.has(String(input.mode || "")) ? String(input.mode) as ContentAudience["mode"] : "all";
  const memberLevelIds = Array.from(new Set((Array.isArray(input.memberLevelIds) ? input.memberLevelIds : []).map(Number).filter((id) => Number.isInteger(id) && id > 0)));
  return { mode, memberLevelIds };
}

export function contentAudienceMatches(audience: ContentAudience | null | undefined, userId?: number | null, memberLevelId?: number | null) {
  const normalized = normalizeContentAudience(audience);
  if (normalized.mode === "guest") return !userId;
  if (normalized.mode === "authenticated") return Boolean(userId);
  if (normalized.mode === "member_levels") return Boolean(userId && memberLevelId && normalized.memberLevelIds?.includes(memberLevelId));
  return true;
}
