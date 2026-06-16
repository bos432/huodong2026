import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InstallService } from "./install.service";

describe("InstallService", () => {
  const originalCwd = process.cwd();
  const originalInstallerEnabled = process.env.INSTALLER_ENABLED;
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "activity-install-"));
    fs.mkdirSync(path.join(tmp, "apps", "api"), { recursive: true });
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (originalInstallerEnabled === undefined) delete process.env.INSTALLER_ENABLED;
    else process.env.INSTALLER_ENABLED = originalInstallerEnabled;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("issues an installer session token when enabled and unlocked", () => {
    process.env.INSTALLER_ENABLED = "true";
    const service = new InstallService();

    const status = service.status() as any;

    expect(status.enabled).toBe(true);
    expect(status.installed).toBe(false);
    expect(status.installerSessionToken).toEqual(expect.any(String));
    expect(status.checks.runtimeWritable).toBe(true);
  });

  it("rejects writes after install lock exists", () => {
    process.env.INSTALLER_ENABLED = "true";
    fs.mkdirSync(path.join(tmp, "runtime"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "runtime", "install.lock"), "{}\n", "utf8");
    const service = new InstallService();

    expect(service.status().installed).toBe(true);
    expect(service.status()).not.toHaveProperty("installerSessionToken");
    expect(fs.existsSync(path.join(tmp, ".env"))).toBe(false);
    expect(() => service.assertAvailable()).toThrow("系统已安装");
  });

  it("rejects installer writes when disabled", () => {
    process.env.INSTALLER_ENABLED = "false";
    const service = new InstallService();

    expect(service.status().enabled).toBe(false);
    expect(service.status()).not.toHaveProperty("checks");
    expect(fs.existsSync(path.join(tmp, ".env"))).toBe(false);
    expect(() => service.assertAvailable()).toThrow("安装器未启用");
  });
});
