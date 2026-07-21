export function adminSessionVersionMatches(tokenVersion: unknown, currentVersion: unknown) {
  const token = Number(tokenVersion);
  const current = Number(currentVersion || 0);
  return Number.isInteger(token) && token >= 0 && token === current;
}
