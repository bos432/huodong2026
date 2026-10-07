import { describe, expect, it, vi } from "vitest";
import { ForbiddenException, ConflictException, BadRequestException } from "@nestjs/common";
import { PaymentSettingsService } from "./payment-settings.service";

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
