import { describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
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

  it("removes multi-identity config in standard wx.login mode", () => {
    const dir = mkdtempSync(join(tmpdir(), "mp-release-standard-"));
    try {
      writeFileSync(join(dir, "app.json"), JSON.stringify({ permission: {}, miniApp: { useAuthorizePage: true } }));
      writeFileSync(join(dir, "app.miniapp.json"), JSON.stringify({ identityServiceConfig: { authorizeMiniprogramType: 1 } }));
      const service = new MiniprogramReleaseService({} as any, {} as any, { get: vi.fn().mockReturnValue(false) } as any);

      const appResult = (service as any).ensureSafeAppJson(dir, (service as any).identityServiceEnabled());
      const authResult = (service as any).ensureMiniappAuthConfig(dir, (service as any).identityServiceEnabled());

      expect(JSON.parse(readFileSync(join(dir, "app.json"), "utf8")).miniApp).toBeUndefined();
      expect(existsSync(join(dir, "app.miniapp.json"))).toBe(false);
      expect(appResult.useAuthorizePage).toBe(false);
      expect(authResult.enabled).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps multi-identity config behind the explicit service switch", () => {
    const dir = mkdtempSync(join(tmpdir(), "mp-release-identity-"));
    try {
      writeFileSync(join(dir, "app.json"), JSON.stringify({ permission: {} }));
      const service = new MiniprogramReleaseService({} as any, {} as any, { get: vi.fn().mockReturnValue("true") } as any);

      const appResult = (service as any).ensureSafeAppJson(dir, (service as any).identityServiceEnabled());
      const authResult = (service as any).ensureMiniappAuthConfig(dir, (service as any).identityServiceEnabled());

      expect(JSON.parse(readFileSync(join(dir, "app.json"), "utf8")).miniApp.useAuthorizePage).toBe(true);
      expect(JSON.parse(readFileSync(join(dir, "app.miniapp.json"), "utf8")).identityServiceConfig.adaptWxLogin).toBe(false);
      expect(appResult.useAuthorizePage).toBe(true);
      expect(authResult.enabled).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
