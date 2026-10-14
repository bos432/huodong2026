import { describe, expect, it, vi } from "vitest";
import { GoneException } from "@nestjs/common";
import { MiniprogramReleaseService } from "./miniprogram-release.service";

describe("MiniprogramReleaseService", () => {
  it("rejects server-side upload without touching settings or logs", async () => {
    const settings = { findOne: vi.fn(() => { throw new Error("settings must not be queried"); }) };
    const logs = { save: vi.fn(() => { throw new Error("logs must not be written"); }) };
    const service = new MiniprogramReleaseService(settings as any, logs as any);

    const error = await service.uploadTrial({ version: "1.2.3" } as any).catch((value) => value);

    expect(error).toBeInstanceOf(GoneException);
    expect(error.getStatus()).toBe(410);
    expect(error.message).toContain("微信开发者工具");
    expect(settings.findOne).not.toHaveBeenCalled();
    expect(logs.save).not.toHaveBeenCalled();
  });

  it("preserves the runtime login secret while clearing the obsolete upload key", async () => {
    const row = { id: 1, appId: "wx-old", appSecret: "old-secret", privateKey: "old-private-key", version: null, description: null, projectPath: null, auditItem: null };
    const settings = { findOne: vi.fn().mockResolvedValue(row), save: vi.fn(async (value) => value) };
    const logs = { create: vi.fn((value) => value), save: vi.fn(async (value) => value) };
    const service = new MiniprogramReleaseService(settings as any, logs as any);

    const saved = await service.saveSetting({ appId: "wx-demo", appSecret: "new-secret", privateKey: "new-private-key" } as any, { id: 4, username: "operator", role: "super_admin", tenantId: null });

    expect(row.appSecret).toBe("old-secret");
    expect(row.privateKey).toBeNull();
    expect(saved).not.toHaveProperty("hasAppSecret");
    expect(saved).not.toHaveProperty("hasPrivateKey");
  });

  it("bounds log limits and removes sensitive diagnostic fields", async () => {
    const logs = {
      find: vi.fn().mockResolvedValue([
        {
          id: 1,
          action: "submit_audit",
          status: "failed",
          appId: "wx-demo",
          version: "1.0.1",
          description: "release",
          qrCodeUrl: null,
          auditId: null,
          errorMessage: "failed",
          adminId: 2,
          adminUsername: "operator",
          createdAt: new Date("2026-07-18T00:00:00Z"),
          detail: { stack: "internal stack", accessToken: "token-value", nested: { privateKey: "key-value", result: "visible" } }
        }
      ])
    };
    const service = new MiniprogramReleaseService({} as any, logs as any);

    const rows = await service.logsList(Number.NaN) as any[];

    expect(logs.find).toHaveBeenCalledWith({ order: { createdAt: "DESC" }, take: 30 });
    expect(rows[0].detail).toEqual({ accessToken: "********", nested: { privateKey: "********", result: "visible" } });
  });

});
