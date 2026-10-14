import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { assessReadinessConfiguration } from "./release-readiness-checks";
import { ReleaseReadinessService } from "./release-readiness.service";

function repository(row: any, rows: any[] = []) {
  return {
    find: async () => rows,
    findOne: async () => row,
    create: (value: any) => value,
    save: async (value: any) => value
  } as any;
}

describe("release readiness configuration assessment", () => {
  it("reports payment credentials and callbacks as missing without echoing values", () => {
    expect(assessReadinessConfiguration("payment_config", {})).toMatchObject({
      configured: false,
      blockers: expect.arrayContaining(["缺少微信支付商户配置"])
    });
    expect(assessReadinessConfiguration("payment_callbacks", { paymentNotifyUrl: "https://api.example.test/pay", refundNotifyUrl: "" })).toMatchObject({
      configured: false,
      blockers: expect.arrayContaining(["缺少支付或退款回调地址"])
    });
  });

  it("requires SMS and subscription prerequisites without claiming delivery", () => {
    expect(assessReadinessConfiguration("sms", { smsEnabled: true, smsProvider: "luosimao-sms", smsSecret: "secret", smsSign: "慢π" })).toMatchObject({ configured: true, blockers: [] });
    expect(assessReadinessConfiguration("sms", { smsEnabled: true, smsProvider: "aliyun-sms", smsSecret: "secret", smsSign: "慢π" }).configured).toBe(false);
    expect(assessReadinessConfiguration("wechat_subscription", {
      providerEnabled: true, automaticEnabled: true, provider: "wechat-subscribe-message", wechatAppId: "wx-app", wechatAppSecret: "secret",
      activeTemplateScenes: ["registrationApproved", "paymentSucceeded", "refundSucceeded", "activityReminder", "checkInSucceeded", "reviewInvitation"],
      enabledScenes: ["registrationApproved", "paymentSucceeded", "refundSucceeded", "activityReminder", "checkInSucceeded", "reviewInvitation"]
    })).toMatchObject({ configured: true, blockers: [] });
    expect(assessReadinessConfiguration("wechat_subscription", {
      providerEnabled: true, automaticEnabled: true, provider: "wechat-subscribe-message", wechatAppId: "wx-app", wechatAppSecret: "secret",
      activeTemplateScenes: ["registrationApproved"], enabledScenes: ["registrationApproved"]
    })).toMatchObject({ configured: false, blockers: expect.arrayContaining([
      "缺少已审核模板：paymentSucceeded、refundSucceeded、activityReminder、checkInSucceeded、reviewInvitation",
      "核心通知场景未启用：paymentSucceeded、refundSucceeded、activityReminder、checkInSucceeded、reviewInvitation"
    ]) });
  });

  it("requires both masked test account and order fixtures in ready or passed state", () => {
    expect(assessReadinessConfiguration("test_fixtures", [
      { kind: "test_account", status: "ready" },
      { kind: "test_order", status: "planned" }
    ])).toMatchObject({ configured: false, blockers: expect.arrayContaining(["测试订单尚未准备"] ) });
  });

  it("never treats a successful mini-program upload as device acceptance", () => {
    expect(assessReadinessConfiguration("miniprogram_acceptance", { appId: "wx-app", version: "2.2.44", uploadedVersion: "2.2.44", successfulUpload: true })).toMatchObject({
      configured: true,
      requiresExternalEvidence: true,
      blockers: []
    });
    expect(assessReadinessConfiguration("miniprogram_acceptance", { appId: "wx-app", successfulUpload: true })).toMatchObject({
      configured: false,
      blockers: expect.arrayContaining(["小程序 AppID 或验收版本未配置"])
    });
  });

  it("keeps missing live payment configuration unconfigured after a check", async () => {
    const item = { id: 1, scopeKey: "platform", tenantId: null, itemKey: "payment_config", category: "支付配置", label: "支付配置", status: "unconfigured", evidence: null };
    const service = new ReleaseReadinessService(
      repository(item, [item]), repository(null, []), repository(null), repository(null), repository(null), repository(null), repository(null),
      { get: (_key: string, fallback?: unknown) => fallback } as any
    );

    const result = await service.check({ id: 1, username: "root", tenantId: null }, "payment_config");

    expect(result.status).toBe("unconfigured");
    expect(result.check).toMatchObject({ configured: false, blockers: ["缺少微信支付商户配置"] });
  });

  it("rejects external acceptance while the current configuration is incomplete", async () => {
    const item = { id: 1, scopeKey: "platform", tenantId: null, itemKey: "payment_config", category: "支付配置", label: "支付配置", status: "external_pending", evidence: null };
    const items = repository(item, [item]);
    const events = repository(null);
    const saveItem = vi.spyOn(items, "save");
    const saveEvent = vi.spyOn(events, "save");
    const service = new ReleaseReadinessService(
      items, repository(null, []), events, repository(null), repository(null), repository(null), repository(null),
      { get: (_key: string, fallback?: unknown) => fallback } as any
    );

    await expect(service.verify({ id: 1, username: "root", tenantId: null }, "payment_config", {
      confirmation: "EXTERNAL_ACCEPTANCE_CONFIRMED", evidence: { summary: "已完成" }
    })).rejects.toThrow("当前配置未通过检查");
    expect(saveItem.mock.calls.flatMap(([rows]) => Array.isArray(rows) ? rows : [rows])).not.toContain(item);
    expect(saveEvent).not.toHaveBeenCalled();
  });

  it("requires a non-empty sanitized evidence summary before acceptance", async () => {
    const item = { id: 1, scopeKey: "platform", tenantId: null, itemKey: "miniprogram_acceptance", category: "真机与体验版验收", label: "真机与体验版验收", status: "external_pending", evidence: null };
    const service = new ReleaseReadinessService(
      repository(item, [item]), repository(null, []), repository(null), repository(null), repository({ id: 1, appId: "wx-app", version: "2.2.44" }),
      repository({ action: "upload", status: "success", appId: "wx-app", version: "2.2.44" }), repository(null), { get: (_key: string, fallback?: unknown) => fallback } as any
    );

    await expect(service.verify({ id: 1, username: "root", tenantId: null }, "miniprogram_acceptance", {
      confirmation: "EXTERNAL_ACCEPTANCE_CONFIRMED", evidence: { apiKey: "secret" }
    })).rejects.toThrow("脱敏证据摘要不能为空");
  });

  it("does not count missing payment certificate files as configured", async () => {
    const item = { id: 1, scopeKey: "platform", tenantId: null, itemKey: "payment_config", category: "支付配置", label: "支付配置", status: "unconfigured", evidence: null };
    const values: Record<string, string> = {
      WECHAT_PAY_APP_ID: "wx-app",
      WECHAT_PAY_MCH_ID: "merchant",
      WECHAT_PAY_API_V3_KEY: "not-returned",
      WECHAT_PAY_PRIVATE_KEY_PATH: "C:/definitely-missing/merchant.pem",
      WECHAT_PAY_CERT_SERIAL_NO: "serial",
      WECHAT_PAY_PLATFORM_CERT_PATH: "C:/definitely-missing/platform.pem"
    };
    const service = new ReleaseReadinessService(
      repository(item, [item]), repository(null, []), repository(null), repository(null), repository(null), repository(null), repository(null),
      { get: (key: string, fallback?: unknown) => values[key] ?? fallback } as any
    );

    const result = await service.check({ id: 1, username: "root", tenantId: null }, "payment_config");

    expect(result.status).toBe("unconfigured");
    expect(JSON.stringify(result)).not.toContain("not-returned");
  });

  it("never upgrades a configured mini-program upload to accepted device evidence", async () => {
    const item = { id: 1, scopeKey: "platform", tenantId: null, itemKey: "miniprogram_acceptance", category: "真机与体验版验收", label: "真机与体验版验收", status: "unconfigured", evidence: null };
    const service = new ReleaseReadinessService(
      repository(item, [item]), repository(null, []), repository(null), repository(null), repository({ id: 1, appId: "wx-app", version: "2.2.44" }),
      repository({ action: "upload", status: "success", appId: "wx-app", version: "2.2.44" }), repository(null), { get: (_key: string, fallback?: unknown) => fallback } as any
    );

    const result = await service.check({ id: 1, username: "root", tenantId: null }, "miniprogram_acceptance");

    expect(result.status).toBe("external_pending");
    expect(result.check).toMatchObject({ configured: true, requiresExternalEvidence: true });
    expect(result.blockingReason).toContain("不会自动通过验收");
  });

  it("matches a successful mini-program upload to the configured app and version", async () => {
    const item = { id: 1, scopeKey: "platform", tenantId: null, itemKey: "miniprogram_acceptance", category: "真机与体验版验收", label: "真机与体验版验收", status: "unconfigured", evidence: null };
    const miniLogs = repository({ action: "upload", status: "success", appId: "wx-app", version: "2.2.44" });
    const findOne = vi.spyOn(miniLogs, "findOne");
    const service = new ReleaseReadinessService(
      repository(item, [item]), repository(null, []), repository(null), repository(null), repository({ id: 1, appId: "wx-app", version: "2.2.44" }),
      miniLogs, repository(null), { get: (_key: string, fallback?: unknown) => fallback } as any
    );

    await service.check({ id: 1, username: "root", tenantId: null }, "miniprogram_acceptance");

    expect(findOne).toHaveBeenCalledWith({ where: { action: "upload", status: "success", appId: "wx-app", version: "2.2.44" }, order: { createdAt: "DESC" } });
  });
});
