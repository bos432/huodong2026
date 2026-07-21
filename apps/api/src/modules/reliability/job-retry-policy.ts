export function jobRetryDelayMs(attemptCount: number, baseDelayMs = 30_000, maxDelayMs = 60 * 60_000) {
  const exponent = Math.max(0, Math.floor(attemptCount) - 1);
  return Math.min(maxDelayMs, baseDelayMs * 2 ** exponent);
}

export function nextJobFailureState(attemptCount: number, maxAttempts: number, now = new Date()) {
  if (attemptCount >= maxAttempts) return { status: "dead_letter" as const, nextAttemptAt: now, deadLetteredAt: now };
  return { status: "pending" as const, nextAttemptAt: new Date(now.getTime() + jobRetryDelayMs(attemptCount)), deadLetteredAt: null };
}
