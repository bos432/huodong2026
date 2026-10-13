export function parseJournalId(value: unknown): number | null {
  if (value === undefined) return 0;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
