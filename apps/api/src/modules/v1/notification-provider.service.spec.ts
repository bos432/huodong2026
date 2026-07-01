import { describe, expect, it } from "vitest";
import { NotificationProviderService } from "./notification-provider.service";

function config(values: Record<string, string>) {
  return {
    get(key: string, fallback?: string) {
      return values[key] ?? fallback;
    }
  } as any;
}

function service(values: Record<string, string>) {
  return new NotificationProviderService(config(values));
}

const smsInput = {
  channel: "sms",
  title: "H5 登录验证码",
  content: "验证码 123456，5 分钟内有效。请勿转发给他人。",
  to: { phone: "13900000000" }
};

describe("notification provider service", () => {
  it("allows mock sms outside production without Tencent credentials", async () => {
    const provider = service({ NODE_ENV: "development" });
    const result = await provider.deliver(smsInput, { sms: { enabled: true, provider: "mock-sms" } });
    expect(result).toMatchObject({ status: "sent", provider: "mock-sms" });
  });

  it("marks production mock sms as not ready and rejects fake sends", async () => {
    const provider = service({ NODE_ENV: "production" });
    const status = provider.providerStatus({ sms: { enabled: true, provider: "mock-sms" } }).find((item) => item.channel === "sms");
    expect(status).toMatchObject({ ready: false, missing: ["SMS_PROVIDER"] });

    const result = await provider.deliver(smsInput, { sms: { enabled: true, provider: "mock-sms" } });
    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("生产环境禁止");
  });

  it("requires Tencent SMS SDK AppID for real sends", async () => {
    const provider = service({ NODE_ENV: "production" });
    const result = await provider.deliver(smsInput, {
      sms: {
        enabled: true,
        provider: "tencent-cloud-sms",
        accessKeyId: "secret-id",
        accessKeySecret: "secret-key",
        signName: "activity",
        templateId: "123456"
      }
    });

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("smsSdkAppId");
  });
});
