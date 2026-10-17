import { describe, expect, it, vi } from "vitest";
import { BadRequestException, GoneException } from "@nestjs/common";
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

  it("records an operator-confirmed upload only for the saved AppID and version", async () => {
    const setting = { id: 1, appId: "wx-demo", version: "2.2.45", description: "线上活动优化" };
    const row = { id: 8, createdAt: new Date("2026-10-18T00:00:00Z") };
    const settings = { findOne: vi.fn().mockResolvedValue(setting) };
    const logs = {
      create: vi.fn((value) => ({ ...value, ...row })),
      save: vi.fn(async (value) => value)
    };
    const service = new MiniprogramReleaseService(settings as any, logs as any);

    const result = await service.recordManualUpload({ version: "2.2.45", confirmed: true }, { id: 4, username: "root" });

    expect(logs.save).toHaveBeenCalledWith(expect.objectContaining({
      action: "upload", status: "success", appId: "wx-demo", version: "2.2.45", adminId: 4, adminUsername: "root",
      detail: expect.objectContaining({ source: "manual_wechat_developer_tools", confirmedByOperator: true })
    }));
    expect(result.detail).toMatchObject({ disclaimer: expect.stringContaining("不代表微信接口校验") });
  });

  it("rejects mismatched versions and unconfirmed manual upload records without writing logs", async () => {
    const settings = { findOne: vi.fn().mockResolvedValue({ appId: "wx-demo", version: "2.2.45" }) };
    const logs = { create: vi.fn((value) => value), save: vi.fn(async (value) => value) };
    const service = new MiniprogramReleaseService(settings as any, logs as any);

    await expect(service.recordManualUpload({ version: "2.2.44", confirmed: true }, { id: 4 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.recordManualUpload({ version: "2.2.45", confirmed: false }, { id: 4 })).rejects.toBeInstanceOf(BadRequestException);
    expect(logs.save).not.toHaveBeenCalled();
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
