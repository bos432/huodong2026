import { createHmac, timingSafeEqual } from "crypto";

const PREFIX = "ACTCHK1";
const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

export function createCheckInTicket(input: { registrationId: number; activityId: number; expiresAt: Date; nonce: string }, secret: string) {
  const payload = [PREFIX, input.registrationId, input.activityId, Math.floor(input.expiresAt.getTime() / 1000), input.nonce].join(".");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyCheckInTicket(ticket: string, secret: string, now = new Date()) {
  const parts = String(ticket || "").trim().split(".");
  if (parts.length !== 6 || parts[0] !== PREFIX) return { signed: false as const };
  const payload = parts.slice(0, 5).join(".");
  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(parts[5]);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return { signed: true as const, valid: false as const, reason: "invalid_signature" };
  const registrationId = Number(parts[1]);
  const activityId = Number(parts[2]);
  const expiresAt = new Date(Number(parts[3]) * 1000);
  if (!Number.isInteger(registrationId) || !Number.isInteger(activityId) || Number.isNaN(expiresAt.getTime())) return { signed: true as const, valid: false as const, reason: "invalid_payload" };
  if (expiresAt.getTime() < now.getTime()) return { signed: true as const, valid: false as const, reason: "expired", registrationId, activityId, expiresAt };
  return { signed: true as const, valid: true as const, registrationId, activityId, expiresAt, nonce: parts[4] };
}

export function checkInNonce(code: string, secret: string) {
  return createHmac("sha256", secret).update(code).digest("base64url").slice(0, 24);
}
