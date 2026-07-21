export function offlineCheckInPolicy(input: { configuredHours?: unknown; configuredMaxRows?: unknown }) {
  const hours = Math.min(24, Math.max(1, Number(input.configuredHours || 8) || 8));
  const maxRows = Math.min(10000, Math.max(100, Number(input.configuredMaxRows || 5000) || 5000));
  return { hours, maxRows };
}
