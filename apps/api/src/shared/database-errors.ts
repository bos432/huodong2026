export function isDuplicateEntryError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; errno?: unknown; driverError?: { code?: unknown; errno?: unknown } };
  const code = value.code ?? value.driverError?.code;
  const errno = value.errno ?? value.driverError?.errno;
  return code === "ER_DUP_ENTRY" || Number(errno) === 1062;
}
