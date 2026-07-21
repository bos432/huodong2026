import { createHmac, randomBytes } from "crypto";
import { AmbassadorLevel } from "../entities/ambassador-profile.entity";

export function ecosystemBusinessKey(value: unknown, label = "业务键") {
  const key = String(value || "").trim();
  if (!/^[A-Za-z0-9:_-]{8,160}$/.test(key)) throw new Error(`${label}格式不正确`);
  return key;
}

export function nextEcosystemNo(prefix: "AMB" | "AMT" | "PCT", now = new Date()) {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}${date}${randomBytes(5).toString("hex").toUpperCase()}`;
}

export function ecosystemPhoneHash(phone: string) {
  const key = process.env.ECOSYSTEM_LOOKUP_HASH_SECRET || process.env.AID_LOOKUP_HASH_SECRET || process.env.CONFIG_ENCRYPTION_KEY || process.env.JWT_SECRET || "ecosystem-local-lookup-key";
  return createHmac("sha256", key).update(String(phone || "").trim()).digest("hex");
}

export function ambassadorLevelForPoints(points: number): AmbassadorLevel {
  const total = Math.max(Math.trunc(Number(points || 0)), 0);
  if (total >= 5000) return "core";
  if (total >= 1500) return "gold";
  if (total >= 500) return "silver";
  if (total >= 100) return "bronze";
  return "starter";
}

export function ambassadorProfileEffectiveStatus(status: string, expiresAt: Date, now = new Date()) {
  return status === "active" && expiresAt.getTime() < now.getTime() ? "expired" : status;
}

export function partnerContractIsEffective(input: { status: string; startsAt: Date; endsAt: Date }, now = new Date()) {
  return input.status === "active" && input.startsAt.getTime() <= now.getTime() && input.endsAt.getTime() >= now.getTime();
}
