import { HttpException } from "@nestjs/common";

export function jobRetryDelayMs(attemptCount: number, baseDelayMs = 30_000, maxDelayMs = 60 * 60_000) {
  const exponent = Math.max(0, Math.floor(attemptCount) - 1);
  return Math.min(maxDelayMs, baseDelayMs * 2 ** exponent);
}

export function isRetryableJobError(error: unknown) {
  if (!(error instanceof HttpException)) return true;
  const status = error.getStatus();
  if ([408, 409, 425, 429].includes(status) || status >= 500) return true;
  return status < 400 || status >= 500;
}

export function nextJobFailureState(attemptCount: number, maxAttempts: number, now = new Date(), options: { terminal?: boolean } = {}) {
  if (options.terminal || attemptCount >= maxAttempts) return { status: "dead_letter" as const, nextAttemptAt: now, deadLetteredAt: now };
  return { status: "pending" as const, nextAttemptAt: new Date(now.getTime() + jobRetryDelayMs(attemptCount)), deadLetteredAt: null };
}
