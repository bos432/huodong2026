import { sanitizeAuditValue } from "./audit-sanitizer";

export function auditDiff(before: Record<string, unknown> | null, after: Record<string, unknown>) {
  const changed: string[] = [];
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after)]);
  for (const key of keys) if (JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after[key] ?? null)) changed.push(key);
  return { changed, before: before ? sanitizeAuditValue(before) : null, after: sanitizeAuditValue(after) };
}
