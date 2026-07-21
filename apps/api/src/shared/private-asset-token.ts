import { createHmac, timingSafeEqual } from "crypto";

export type PrivateAssetTokenPayload = {
  v: 1;
  purpose: "registration_attachment" | "settlement_proof" | "course_resource";
  reference: string;
  tenantId: number | null;
  ownerUserId?: number | null;
  ownerAdminId?: number | null;
  contextId?: number | null;
  expiresAt?: number | null;
  originalName: string;
  mimetype: string;
  size: number;
};

export function createPrivateAssetToken(payload: PrivateAssetTokenPayload, secret: string) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${signature(encoded, secret)}`;
}

export function verifyPrivateAssetToken(token: string, secret: string): PrivateAssetTokenPayload | null {
  const [encoded, supplied, ...extra] = String(token || "").split(".");
  if (extra.length || !encoded || !supplied || encoded.length > 4096) return null;
  const expected = signature(encoded, secret);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (value?.v !== 1 || !["registration_attachment", "settlement_proof", "course_resource"].includes(value.purpose)) return null;
    if (!String(value.reference || "").startsWith("secure-private-document://")) return null;
    if (!Number.isInteger(value.size) || value.size < 1 || value.size > 500 * 1024 * 1024) return null;
    if (typeof value.originalName !== "string" || typeof value.mimetype !== "string") return null;
    if (value.tenantId !== null && !Number.isInteger(value.tenantId)) return null;
    if (value.contextId !== undefined && value.contextId !== null && !Number.isInteger(value.contextId)) return null;
    if (value.expiresAt !== undefined && value.expiresAt !== null && (!Number.isInteger(value.expiresAt) || value.expiresAt < 1)) return null;
    return value as PrivateAssetTokenPayload;
  } catch {
    return null;
  }
}

function signature(encoded: string, secret: string) {
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}
