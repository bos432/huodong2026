import { afterEach, describe, expect, it } from "vitest";
import { decryptSecretBuffer, decryptStoredSecret, encryptSecretBuffer, encryptStoredSecret, maskedStoredSecret, mergeStoredSecret, SECRET_MASK } from "./secret-storage";

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("configuration secret storage", () => {
  const originalKey = process.env.CONFIG_ENCRYPTION_KEY;
  const originalLegacyKey = process.env.CONFIG_ENCRYPTION_LEGACY_KEY;
  const originalJwtSecret = process.env.JWT_SECRET;
  afterEach(() => {
    restoreEnv("CONFIG_ENCRYPTION_KEY", originalKey);
    restoreEnv("CONFIG_ENCRYPTION_LEGACY_KEY", originalLegacyKey);
    restoreEnv("JWT_SECRET", originalJwtSecret);
  });

  it("encrypts at rest and decrypts for provider use", () => {
    process.env.CONFIG_ENCRYPTION_KEY = "test-config-key";
    const encrypted = encryptStoredSecret("secret-value")!;
    expect(encrypted).not.toContain("secret-value");
    expect(decryptStoredSecret(encrypted)).toBe("secret-value");
    expect(maskedStoredSecret(encrypted)).toBe(SECRET_MASK);
  });

  it("preserves masked or empty updates and supports explicit clearing", () => {
    const existing = encryptStoredSecret("old-secret")!;
    expect(mergeStoredSecret(existing, SECRET_MASK)).toBe(existing);
    expect(mergeStoredSecret(existing, "")).toBe(existing);
    expect(mergeStoredSecret(existing, null, true)).toBeNull();
  });

  it("encrypts private credential file bytes without writing plaintext", () => {
    const encrypted = encryptSecretBuffer(Buffer.from("PRIVATE KEY DATA"));
    expect(encrypted.toString("utf8")).not.toContain("PRIVATE KEY DATA");
    expect(decryptSecretBuffer(encrypted).toString("utf8")).toBe("PRIVATE KEY DATA");
  });

  it("decrypts stored secrets and files with the explicit legacy rotation key", () => {
    delete process.env.CONFIG_ENCRYPTION_KEY;
    process.env.JWT_SECRET = "legacy-jwt-secret-used-before-key-separation";
    const storedSecret = encryptStoredSecret("legacy-provider-secret")!;
    const storedFile = encryptSecretBuffer(Buffer.from("LEGACY PRIVATE KEY"));

    process.env.CONFIG_ENCRYPTION_KEY = "new-independent-config-encryption-key";
    process.env.CONFIG_ENCRYPTION_LEGACY_KEY = process.env.JWT_SECRET;
    expect(decryptStoredSecret(storedSecret)).toBe("legacy-provider-secret");
    expect(decryptSecretBuffer(storedFile).toString("utf8")).toBe("LEGACY PRIVATE KEY");
  });
});
