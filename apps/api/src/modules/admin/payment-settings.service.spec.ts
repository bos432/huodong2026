import { describe, expect, it, vi } from "vitest";
import { ForbiddenException, ConflictException, BadRequestException } from "@nestjs/common";
import { PaymentSettingsService } from "./payment-settings.service";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readPrivateCredential } from "../../shared/private-credential";

function repo(initial: any = null) {
  return {
    findOne: vi.fn().mockResolvedValue(initial),
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => value)
  } as any;
}

const platformAdmin = { id: 1, username: "root", role: "super_admin", tenantId: null };
const tenantAdmin = { id: 2, username: "merchant", role: "operator", tenantId: 8 };

function setting(launchConfig: Record<string, unknown> = {}) {
  return { id: 1, tenant: null, launchConfig, offlinePaymentInstructions: "offline", refundInstructions: "refund" } as any;
}

describe("PaymentSettingsService", () => {
  it.each([true, "true", " true "])("rejects direct activation through ordinary save: %s", async (value) => {
    const settings = repo(setting());
    const service = new PaymentSettingsService(settings, repo(), { get: vi.fn() } as any);
    await expect(service.update(platformAdmin, { realPaymentEnabled: value })).rejects.toBeInstanceOf(BadRequestException);
    expect(settings.save).not.toHaveBeenCalled();
  });

  it("checks missing merchant fields before activation even when declaration gates are complete", async () => {
    const settings = repo(setting());
    const config = { get: vi.fn((key: string, fallback?: unknown) => {
      if (key.endsWith("_IMPLEMENTED") || key === "REAL_PAYMENT_PREFLIGHT_PASSED") return "true";
      if (key === "PRIVATE_CREDENTIAL_DIR") return "/app/private-data/payment-credentials";
      return fallback;
    }) };
    const service = new PaymentSettingsService(settings, repo(), config as any);
    const result = await service.validate(platformAdmin);
    expect(result.readiness.status).toBe("blocked");
    expect(result.readiness.checks).toEqual(expect.arrayContaining([expect.objectContaining({ key: "微信支付_CONFIG", status: "error" })]));
    expect(result.readiness.checks).toEqual(expect.arrayContaining([expect.objectContaining({ key: "REAL_PAYMENT_ENABLED", value: "未启用", status: "ok" })]));
    await expect(service.enable(platformAdmin, { confirmation: "ENABLE_REAL_PAYMENT" })).rejects.toBeInstanceOf(ConflictException);
    expect(settings.save).not.toHaveBeenCalled();
  });

  it("allows saving payment data without changing an already enabled switch", async () => {
    const row = setting({ realPaymentEnabled: true, storageProvider: "oss", wechatPayAppId: "wx-existing" });
    const service = new PaymentSettingsService(repo(row), repo(), { get: vi.fn() } as any);
    await service.update(platformAdmin, { wechatPayMchId: "1234567890" });
    expect(row.launchConfig.realPaymentEnabled).toBe(true);
    expect(row.launchConfig.storageProvider).toBe("oss");
    expect(row.launchConfig.wechatPayAppId).toBe("wx-existing");
  });

  it("disables payment while preserving merchant and unrelated settings", async () => {
    const row = setting({ realPaymentEnabled: true, wechatPayEnabled: true, wechatPayMchId: "1234567890", storageProvider: "oss" });
    const service = new PaymentSettingsService(repo(row), repo(), { get: vi.fn() } as any);
    await service.disable(platformAdmin);
    expect(row.launchConfig).toMatchObject({ realPaymentEnabled: false, wechatPayEnabled: false, wechatPayMchId: "1234567890", storageProvider: "oss" });
  });

  it("stores a valid private key encrypted without saving or enabling payment", async () => {
    const directory = mkdtempSync(join(tmpdir(), "payment-upload-test-"));
    const previousDirectory = process.env.PRIVATE_CREDENTIAL_DIR;
    process.env.PRIVATE_CREDENTIAL_DIR = directory;
    try {
      const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
      const buffer = Buffer.from(privateKey);
      const settings = repo(setting());
      const logs = repo();
      const service = new PaymentSettingsService(settings, logs, { get: vi.fn((key: string, fallback?: unknown) => key === "UPLOAD_MALWARE_SCAN_MODE" ? "disabled" : fallback) } as any);
      const result = await service.uploadCredential(platformAdmin, "wechatPayPrivateKeyPath", { originalname: "apiclient_key.pem", buffer, size: buffer.length } as unknown as Express.Multer.File & { buffer: Buffer });
      expect(result.path).toMatch(/^secure-credential:\/\//);
      expect(readPrivateCredential(result.path)).toEqual(buffer);
      expect(readFileSync(join(directory, result.path.replace("secure-credential://", ""))).includes(buffer)).toBe(false);
      expect(settings.save).not.toHaveBeenCalled();
      expect(JSON.stringify(logs.save.mock.calls)).not.toContain(privateKey);
      expect(logs.save.mock.calls[0][0].detail).toEqual({ field: "wechatPayPrivateKeyPath", size: buffer.length });
    } finally {
      if (previousDirectory === undefined) delete process.env.PRIVATE_CREDENTIAL_DIR;
      else process.env.PRIVATE_CREDENTIAL_DIR = previousDirectory;
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("reads implementation gates using their actual environment names", async () => {
    const service = new PaymentSettingsService(repo(setting({ realPaymentSdkImplemented: true, realPaymentPreflightPassed: true })), repo(), { get: vi.fn((key: string, fallback?: unknown) => key === "REAL_REFUND_QUERY_IMPLEMENTED" ? "true" : fallback) } as any);
    const result = await service.get(platformAdmin);
    expect(result.readiness.summary.missingGateKeys).not.toContain("realPaymentSdkImplemented");
    expect(result.readiness.summary.missingGateKeys).not.toContain("realPaymentPreflightPassed");
    expect(result.readiness.summary.missingGateKeys).not.toContain("realRefundQueryImplemented");
    expect(result.readiness.summary.missingGateKeys).toContain("realPaymentCallbackVerificationImplemented");
    expect(result.readiness.status).toBe("blocked");
  });
  it("blocks a declared preflight pass without a readable evidence report", async () => {
    const service = new PaymentSettingsService(repo(setting({ realPaymentPreflightPassed: true, realPaymentPreflightResultFile: "missing-payment-evidence.json" })), repo(), { get: vi.fn((key: string, fallback?: unknown) => fallback) } as any);
    const result = await service.validate(platformAdmin);
    expect(result.readiness.checks).toEqual(expect.arrayContaining([expect.objectContaining({ key: "REAL_PAYMENT_PREFLIGHT_EVIDENCE", status: "error" })]));
  });
  it("rejects unauthorized and malformed credential uploads before storage", async () => {
    const service = new PaymentSettingsService(repo(setting()), repo(), { get: vi.fn() } as any);
    const file = { originalname: "key.pem", buffer: Buffer.from("not a private key"), size: 17 } as unknown as Express.Multer.File & { buffer: Buffer };
    await expect(service.uploadCredential(tenantAdmin, "wechatPayPrivateKeyPath", file)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.uploadCredential(platformAdmin, "unknown", file)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.uploadCredential(platformAdmin, "wechatPayPrivateKeyPath", file)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.uploadCredential(platformAdmin, "wechatPayPlatformCertPath", file)).rejects.toBeInstanceOf(BadRequestException);
  });
  it("returns platform payment configuration with secrets masked", async () => {
    const row = setting({ wechatPayAppId: "wx-app", wechatPayApiV3Key: "enc:v1:secret", wechatPayNotifyUrl: "https://pay.example.test/callback" });
    const service = new PaymentSettingsService(repo(row), repo(), { get: vi.fn((key: string, fallback?: unknown) => fallback) } as any);

    const result = await service.get(platformAdmin);

    expect(result.scope).toBe("platform");
    expect(result.launchConfig.wechatPayApiV3Key).toBe("********");
    expect(result.launchConfig.wechatPayAppId).toBe("wx-app");
    expect(result.secretStatus.wechatPayApiV3Key).toBe(true);
  });

  it("rejects tenant admins before reading or writing platform settings", async () => {
    const operationSettings = repo(setting());
    const service = new PaymentSettingsService(operationSettings, repo(), { get: vi.fn() } as any);

    await expect(service.get(tenantAdmin)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.update(tenantAdmin, { wechatPayAppId: "wx" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(operationSettings.findOne).not.toHaveBeenCalled();
  });

  it("encrypts API v3 keys and rejects non-HTTPS callback URLs", async () => {
    const row = setting();
    const operationSettings = repo(row);
    const service = new PaymentSettingsService(operationSettings, repo(), { get: vi.fn() } as any);

    await expect(service.update(platformAdmin, { wechatPayNotifyUrl: "http://pay.example.test/callback" })).rejects.toBeInstanceOf(BadRequestException);
    expect(operationSettings.save).not.toHaveBeenCalled();

    const result = await service.update(platformAdmin, { wechatPayApiV3Key: "real-api-v3-key", wechatPayNotifyUrl: "https://pay.example.test/callback" });
    expect(String(row.launchConfig.wechatPayApiV3Key)).toMatch(/^enc:v1:/);
    expect(String(row.launchConfig.wechatPayApiV3Key)).not.toContain("real-api-v3-key");
    expect(result.launchConfig.wechatPayApiV3Key).toBe("********");
  });

  it("does not enable real payment before a fresh preflight gate is present", async () => {
    const row = setting({ wechatPayAppId: "wx-app", wechatPayMchId: "mch", wechatPayApiV3Key: "enc:v1:secret", wechatPayPrivateKeyPath: "private-data/payment-credentials/mch.pem", wechatPayCertSerialNo: "serial", wechatPayPlatformCertPath: "private-data/payment-credentials/platform.pem", wechatPayNotifyUrl: "https://pay.example.test/callback" });
    const service = new PaymentSettingsService(repo(row), repo(), { get: vi.fn((key: string, fallback?: unknown) => fallback) } as any);

    await expect(service.enable(platformAdmin, { confirmation: "ENABLE_REAL_PAYMENT" })).rejects.toBeInstanceOf(ConflictException);
  });
});
