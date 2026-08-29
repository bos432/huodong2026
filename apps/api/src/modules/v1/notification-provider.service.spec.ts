import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationProviderService } from "./notification-provider.service";

function config(values: Record<string, string>) {
  return {
    get(key: string, fallback?: string) {
      return values[key] ?? fallback;
    }
  } as any;
}

function service(values: Record<string, string>, launchConfig?: Record<string, unknown>) {
  const operationSettings = launchConfig ? { findOne: vi.fn().mockResolvedValue({ launchConfig }) } : undefined;
  return new NotificationProviderService(config(values), operationSettings as any);
}

const smsInput = {
  channel: "sms",
  title: "H5 登录验证码",
  content: "验证码 123456，5 分钟内有效。请勿转发给他人。",
  to: { phone: "13900000000" }
};

describe("notification provider service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("allows mock sms outside production without Tencent credentials", async () => {
    const provider = service({ NODE_ENV: "development" });
    const result = await provider.deliver(smsInput, { sms: { enabled: true, provider: "mock-sms" } });
    expect(result).toMatchObject({ status: "sent", provider: "mock-sms" });
  });

  it("marks production mock sms as not ready and rejects fake sends", async () => {
    const provider = service({ NODE_ENV: "production" });
    const status = (await provider.providerStatus({ sms: { enabled: true, provider: "mock-sms" } })).find((item) => item.channel === "sms");
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

  it("marks Luosimao SMS ready without template id or SDK AppID", async () => {
    const provider = service({ NODE_ENV: "production" });
    const status = (await provider.providerStatus({
      sms: {
        enabled: true,
        provider: "luosimao-sms",
        accessKeySecret: "key-test",
        signName: "慢π"
      }
    })).find((item) => item.channel === "sms");

    expect(status).toMatchObject({ ready: true, missing: [] });
  });

  it("uses encrypted platform launch configuration for WeChat provider status", async () => {
    const provider = service({ NODE_ENV: "production" }, {
      wechatMessageEnabled: true,
      wechatMessageProvider: "wechat-subscribe-message",
      wechatAppId: "wx-test",
      wechatAppSecret: "plain:test-secret"
    });

    const status = (await provider.providerStatus()).find((item) => item.channel === "wechat");

    expect(status).toMatchObject({ provider: "wechat-subscribe-message", enabled: true, ready: true, missing: [] });
  });

  it("keeps environment WeChat configuration when launch overrides are absent", async () => {
    const provider = service({
      NODE_ENV: "production",
      WECHAT_MESSAGE_PROVIDER_ENABLED: "true",
      WECHAT_MESSAGE_PROVIDER: "wechat-subscribe-message",
      WECHAT_APP_ID: "wx-env",
      WECHAT_APP_SECRET: "env-secret"
    });

    const status = (await provider.providerStatus()).find((item) => item.channel === "wechat");

    expect(status).toMatchObject({ provider: "wechat-subscribe-message", enabled: true, ready: true, missing: [] });
  });

  it("sends Luosimao SMS with basic auth, form body and trailing signature", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ error: 0, msg: "ok" })
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = service({ NODE_ENV: "production" });

    const result = await provider.deliver(smsInput, {
      sms: {
        enabled: true,
        provider: "luosimao-sms",
        accessKeySecret: "key-test",
        signName: "慢π"
      }
    });

    expect(result).toMatchObject({ status: "sent", provider: "luosimao-sms" });
    expect(fetchMock).toHaveBeenCalledWith("https://sms-api.luosimao.com/v1/send.json", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: `Basic ${Buffer.from("api:key-test").toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      })
    }));
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("mobile")).toBe("13900000000");
    expect(body.get("message")).toBe("验证码 123456，5 分钟内有效。请勿转发给他人。【慢π】");
  });

  it("returns Luosimao provider error message when sending fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ error: -10, msg: "验证信息失败" })
    }));
    const provider = service({ NODE_ENV: "production" });

    const result = await provider.deliver(smsInput, {
      sms: {
        enabled: true,
        provider: "luosimao-sms",
        accessKeySecret: "key-test",
        signName: "慢π"
      }
    });

    expect(result).toMatchObject({ status: "failed", provider: "luosimao-sms", errorMessage: "验证信息失败" });
  });
});
