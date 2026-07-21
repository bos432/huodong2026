import { createHmac, randomBytes } from "crypto";
import { decryptStoredSecret, encryptStoredSecret } from "./secret-storage";

export type AidSensitivePayload = {
  applicantName: string;
  phone: string;
  wechat: string;
  organizationName?: string | null;
  identityNo?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  requestedSupport: string;
  situation: string;
};

export function sealAidPayload(payload: AidSensitivePayload) {
  return encryptStoredSecret(JSON.stringify(payload))!;
}

export function openAidPayload(value: string) {
  const decrypted = decryptStoredSecret(value);
  if (!decrypted) throw new Error("Aid application payload is empty");
  return JSON.parse(decrypted) as AidSensitivePayload;
}

export function aidPhoneLookupHash(phone: string) {
  const key = process.env.AID_LOOKUP_HASH_SECRET || process.env.CONFIG_ENCRYPTION_KEY || process.env.JWT_SECRET || "aid-local-lookup-key";
  return createHmac("sha256", key).update(String(phone || "").trim()).digest("hex");
}

export function nextAidApplicationNo(now = new Date()) {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `AID${date}${randomBytes(5).toString("hex").toUpperCase()}`;
}

export function maskAidName(value: string) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length === 1 ? "*" : `${text.slice(0, 1)}${"*".repeat(Math.min(text.length - 1, 3))}`;
}

export function maskAidIdentity(value?: string | null) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length <= 8 ? `${text.slice(0, 2)}***${text.slice(-2)}` : `${text.slice(0, 4)}********${text.slice(-4)}`;
}
