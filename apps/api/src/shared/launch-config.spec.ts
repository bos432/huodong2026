import { afterEach, describe, expect, it } from "vitest";
import { launchConfigToEnv, maskLaunchConfigSecrets, secureLaunchConfigForStorage } from "./launch-config";

describe("launch configuration secret handling", () => {
  const originalKey = process.env.CONFIG_ENCRYPTION_KEY;
  afterEach(() => { process.env.CONFIG_ENCRYPTION_KEY = originalKey; });

  it("encrypts provider secrets, masks admin output and decrypts runtime overrides", () => {
    process.env.CONFIG_ENCRYPTION_KEY = "launch-config-test-key";
    const stored = secureLaunchConfigForStorage({}, { wechatAppId: "wx-app", wechatAppSecret: "wx-secret", wechatPayApiV3Key: "pay-secret", storageAccessKeySecret: "oss-secret" });
    expect(String(stored.wechatAppSecret)).not.toContain("wx-secret");
    expect(maskLaunchConfigSecrets(stored)).toMatchObject({ wechatAppId: "wx-app", wechatAppSecret: "********", wechatPayApiV3Key: "********", storageAccessKeySecret: "********" });
    expect(launchConfigToEnv(stored)).toMatchObject({ WECHAT_APP_ID: "wx-app", WECHAT_APP_SECRET: "wx-secret", WECHAT_PAY_API_V3_KEY: "pay-secret", STORAGE_ACCESS_KEY_SECRET: "oss-secret" });
  });

  it("preserves masked secrets and supports an explicit clear list", () => {
    const stored = secureLaunchConfigForStorage({}, { smtpPassword: "smtp-secret", smtpHost: "mail.example.com" });
    const preserved = secureLaunchConfigForStorage(stored, { smtpPassword: "********", smtpHost: "new.example.com" });
    expect(launchConfigToEnv(preserved).SMTP_PASSWORD).toBe("smtp-secret");
    const cleared = secureLaunchConfigForStorage(preserved, { smtpPassword: "********" }, ["smtpPassword"]);
    expect(launchConfigToEnv(cleared).SMTP_PASSWORD).toBeUndefined();
  });

  it("skips stale encrypted values so config inspection can report them as missing", () => {
    process.env.CONFIG_ENCRYPTION_KEY = "current-key";
    expect(launchConfigToEnv({ wechatAppId: "wx-app", wechatAppSecret: "enc:v1:stale.value" })).toMatchObject({ WECHAT_APP_ID: "wx-app" });
  });
});
