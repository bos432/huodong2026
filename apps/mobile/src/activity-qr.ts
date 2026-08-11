export type ActivityQrTarget = {
  activityId: number;
  tenantCode?: string;
};

const TENANT_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

function activityRouteCandidate(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  const hashIndex = value.indexOf("#");
  if (hashIndex >= 0) return value.slice(hashIndex + 1);
  if (/^(https?:)?\/\//i.test(value)) return "";
  return value;
}

// QR content is untrusted. Only an internal activity-detail route becomes navigation.
export function parseActivityQrTarget(raw: unknown): ActivityQrTarget | null {
  const candidate = activityRouteCandidate(String(raw || ""));
  const [rawPath, rawQuery = ""] = candidate.split("?", 2);
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  if (path !== "/pages/activity/detail") return null;

  const query = new URLSearchParams(rawQuery);
  const activityId = Number(query.get("id") || 0);
  if (!Number.isSafeInteger(activityId) || activityId < 1) return null;
  const tenantCode = String(query.get("tenantCode") || "").trim();
  return tenantCode && TENANT_CODE_PATTERN.test(tenantCode)
    ? { activityId, tenantCode }
    : { activityId };
}

export function isCheckInTicket(raw: unknown) {
  return String(raw || "").trim().startsWith("ACTCHK1.");
}
