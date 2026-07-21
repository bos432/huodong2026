import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export type VolunteerApplicationStatus = "pending" | "admitted" | "waitlisted" | "rejected" | "cancelled" | "replaced" | "checked_in" | "completed";

export function volunteerBusinessKey(value: unknown, label = "业务键") {
  const key = String(value || "").trim();
  if (!/^[A-Za-z0-9:_-]{8,160}$/.test(key)) throw new Error(`${label}格式不正确`);
  return key;
}

export function nextVolunteerNo(prefix: "VLP" | "VLT" | "VTR", now = new Date()) {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}${date}${randomBytes(5).toString("hex").toUpperCase()}`;
}

export function volunteerPhoneHash(phone: string) {
  const key = process.env.VOLUNTEER_LOOKUP_HASH_SECRET || process.env.ECOSYSTEM_LOOKUP_HASH_SECRET || process.env.CONFIG_ENCRYPTION_KEY || process.env.JWT_SECRET || "volunteer-local-lookup-key";
  return createHmac("sha256", key).update(String(phone || "").trim()).digest("hex");
}

export function canTransitionVolunteerApplication(from: string, to: VolunteerApplicationStatus) {
  const transitions: Record<string, VolunteerApplicationStatus[]> = {
    pending: ["admitted", "waitlisted", "rejected", "cancelled"],
    admitted: ["waitlisted", "cancelled", "replaced", "checked_in"],
    waitlisted: ["admitted", "rejected", "cancelled", "replaced"],
    rejected: [],
    cancelled: [],
    replaced: [],
    checked_in: ["completed", "cancelled"],
    completed: []
  };
  return from === to || Boolean(transitions[from]?.includes(to));
}

export function volunteerQualificationEffective(input: { status?: string | null; expiresAt?: Date | string | null }, now = new Date()) {
  if (input.status !== "qualified") return false;
  if (!input.expiresAt) return true;
  const expiresAt = input.expiresAt instanceof Date ? input.expiresAt : new Date(input.expiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() >= now.getTime();
}

type AttendancePayload = { applicationId: number; action: "check_in" | "check_out"; nonce: string; expiresAt: number };

function attendanceSecret() {
  return process.env.VOLUNTEER_ATTENDANCE_SECRET || process.env.JWT_SECRET || "volunteer-local-attendance-key";
}

export function createVolunteerAttendanceToken(applicationId: number, action: "check_in" | "check_out", ttlSeconds = 900, now = Date.now()) {
  const payload: AttendancePayload = { applicationId, action, nonce: randomBytes(12).toString("hex"), expiresAt: now + Math.max(ttlSeconds, 30) * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", attendanceSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyVolunteerAttendanceToken(token: string, now = Date.now()) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) throw new Error("签到凭证格式不正确");
  const expected = createHmac("sha256", attendanceSecret()).update(body).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("签到凭证签名无效");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AttendancePayload;
  if (!Number.isInteger(payload.applicationId) || !["check_in", "check_out"].includes(payload.action) || !payload.nonce) throw new Error("签到凭证内容无效");
  if (payload.expiresAt < now) throw new Error("签到凭证已过期");
  return payload;
}

export function volunteerHoursFromAttendance(checkInAt: Date, checkOutAt: Date, maximumHours = 24) {
  const milliseconds = checkOutAt.getTime() - checkInAt.getTime();
  if (milliseconds <= 0) throw new Error("签退时间必须晚于签到时间");
  return Math.min(Math.round((milliseconds / 3_600_000) * 100) / 100, maximumHours);
}
