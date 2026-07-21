import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "enc:v1:";
export const SECRET_MASK = "********";

function encryptionKey(material = process.env.CONFIG_ENCRYPTION_KEY || process.env.JWT_SECRET || "activity-local-config-key") {
  return createHash("sha256").update(material).digest();
}

function decryptWithConfiguredKeys<T>(decrypt: (key: Buffer) => T) {
  const materials = [
    process.env.CONFIG_ENCRYPTION_KEY || process.env.JWT_SECRET || "activity-local-config-key",
    process.env.CONFIG_ENCRYPTION_LEGACY_KEY
  ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
  let lastError: unknown;
  for (const material of materials) {
    try {
      return decrypt(encryptionKey(material));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function encryptSecretBuffer(value: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
  return Buffer.from(JSON.stringify({ version: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: encrypted.toString("base64") }), "utf8");
}

export function decryptSecretBuffer(value: Buffer) {
  const payload = JSON.parse(value.toString("utf8")) as { version: number; iv: string; tag: string; data: string };
  if (payload.version !== 1) throw new Error("Unsupported encrypted credential version");
  return decryptWithConfiguredKeys((key) => {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(payload.data, "base64")), decipher.final()]);
  });
}

export function encryptStoredSecret(value?: string | null) {
  const plain = String(value || "").trim();
  if (!plain || plain === SECRET_MASK) return plain || null;
  if (plain.startsWith(PREFIX)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptStoredSecret(value?: string | null) {
  const stored = String(value || "");
  if (!stored || !stored.startsWith(PREFIX)) return stored || null;
  const [ivText, tagText, encryptedText] = stored.slice(PREFIX.length).split(".");
  if (!ivText || !tagText || !encryptedText) throw new Error("Invalid encrypted configuration secret");
  return decryptWithConfiguredKeys((key) => {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
  });
}

export function maskedStoredSecret(value?: string | null) {
  return value ? SECRET_MASK : null;
}

export function mergeStoredSecret(existing: string | null | undefined, incoming: string | null | undefined, clear = false) {
  if (clear) return null;
  const value = String(incoming || "").trim();
  if (!value || value === SECRET_MASK) return existing || null;
  return encryptStoredSecret(value);
}
