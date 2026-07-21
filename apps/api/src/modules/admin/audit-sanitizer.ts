export function sanitizeAuditValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeAuditValue(item, depth + 1));
  if (value instanceof Date) return value.toISOString();
  if (!value || typeof value !== "object") return typeof value === "string" && value.length > 1000 ? `${value.slice(0, 1000)}...` : value;
  const result: Record<string, unknown> = {};
  const sensitive = /password|passwd|secret|token|api.*key|private.*key|credential|authorization|cookie|openid|unionid|id.*card/i;
  for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 120)) result[key] = sensitive.test(key) ? "********" : sanitizeAuditValue(item, depth + 1);
  return result;
}
