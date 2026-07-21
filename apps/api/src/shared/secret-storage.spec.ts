import { afterEach, describe, expect, it } from "vitest";
import { decryptSecretBuffer, decryptStoredSecret, encryptSecretBuffer, encryptStoredSecret, maskedStoredSecret, mergeStoredSecret, SECRET_MASK } from "./secret-storage";

describe("configuration secret storage", () => {
  const originalKey = process.env.CONFIG_ENCRYPTION_KEY;
  afterEach(() => { process.env.CONFIG_ENCRYPTION_KEY = originalKey; });

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
});
