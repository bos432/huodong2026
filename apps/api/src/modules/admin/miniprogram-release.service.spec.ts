import { describe, expect, it, vi } from "vitest";
import { MiniprogramReleaseService } from "./miniprogram-release.service";

describe("MiniprogramReleaseService", () => {
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
    const service = new MiniprogramReleaseService({} as any, logs as any, { get: vi.fn() } as any);

    const rows = await service.logsList(Number.NaN) as any[];

    expect(logs.find).toHaveBeenCalledWith({ order: { createdAt: "DESC" }, take: 30 });
    expect(rows[0].detail).toEqual({ accessToken: "********", nested: { privateKey: "********", result: "visible" } });
  });
});
