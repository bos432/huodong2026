import { Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as TencentCloud from "tencentcloud-sdk-nodejs";
import nodemailer from "nodemailer";
import { Repository } from "typeorm";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { launchConfigToEnv } from "../../shared/launch-config";

export interface NotificationDeliveryInput {
  channel: string;
  title: string;
  content: string;
  to?: {
    userId?: number;
    phone?: string | null;
    email?: string | null;
    openid?: string | null;
  };
}

export interface NotificationDeliveryResult {
  status: "sent" | "failed";
  provider: string;
  providerMessageId?: string;
  errorMessage?: string;
}

export type SmsProviderSettings = {
  enabled?: boolean | number | string | null;
  provider?: string | null;
  accessKeyId?: string | null;
  accessKeySecret?: string | null;
  signName?: string | null;
  templateId?: string | null;
  appId?: string | null;
  region?: string | null;
};

export type NotificationProviderOverrides = {
  sms?: SmsProviderSettings | null;
  wechat?: {
    enabled?: boolean | number | string | null;
    provider?: string | null;
    appId?: string | null;
    appSecret?: string | null;
    templateId?: string | null;
    page?: string | null;
    data?: Record<string, string> | null;
    miniprogramState?: "developer" | "trial" | "formal" | null;
  } | null;
};

@Injectable()
export class NotificationProviderService {
  private wechatAccessToken: { appId: string; value: string; expiresAt: number } | null = null;
  constructor(
    private readonly config: ConfigService,
    @Optional() @InjectRepository(OperationSetting) private readonly operationSettings?: Repository<OperationSetting>
  ) {}

  async deliver(input: NotificationDeliveryInput, overrides?: NotificationProviderOverrides): Promise<NotificationDeliveryResult> {
    const resolvedOverrides = input.channel === "wechat"
      ? { ...overrides, wechat: { ...await this.platformWechatSettings(), ...overrides?.wechat } }
      : overrides;
    const provider = this.providerName(input.channel, resolvedOverrides);
    if (this.config.get("NOTIFICATION_FORCE_FAIL") === "true" || input.title.includes("[fail]")) {
      return { status: "failed", provider, errorMessage: "Mock provider forced failure" };
    }

    if (input.channel === "site") return this.mockSuccess(provider);
    if (input.channel === "sms") return this.deliverSms(input, provider, resolvedOverrides?.sms);
    if (input.channel === "email") return this.deliverEmail(input, provider);
    if (input.channel === "wechat") return this.deliverWechat(input, provider, resolvedOverrides?.wechat);

    return { status: "failed", provider, errorMessage: `Unsupported notification channel: ${input.channel}` };
  }

  async providerStatus(overrides?: NotificationProviderOverrides) {
    const resolvedOverrides = { ...overrides, wechat: { ...await this.platformWechatSettings(), ...overrides?.wechat } };
    const smsProvider = this.providerName("sms", resolvedOverrides);
    const wechatProvider = this.providerName("wechat", resolvedOverrides);
    return [
      this.statusFor("site", "site", true, []),
      this.statusFor("sms", smsProvider, this.channelEnabled("sms", resolvedOverrides), this.missingSms(smsProvider, resolvedOverrides?.sms)),
      this.statusFor("email", this.providerName("email"), this.channelEnabled("email"), this.missing(["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"])),
      this.statusFor("wechat", wechatProvider, this.channelEnabled("wechat", resolvedOverrides), wechatProvider === "mock-wechat" && this.canUseMockWechat() ? [] : this.missingWechat(resolvedOverrides.wechat))
    ];
  }

  private async deliverSms(input: NotificationDeliveryInput, provider: string, settings?: SmsProviderSettings | null) {
    if (!this.channelEnabled("sms", { sms: settings })) return this.notConfigured("sms", provider);
    if (!input.to?.phone) return this.failed(provider, "短信收件人手机号为空");
    if (provider === "mock-sms") {
      if (this.canUseMockSms()) return this.mockSuccess(provider);
      return this.failed(provider, "生产环境禁止 mock-sms 假发送，请配置腾讯云短信或开启显式测试模式");
    }
    const missing = this.missingSms(provider, settings);
    if (missing.length) return this.failed(provider, `短信服务缺少配置：${missing.join(", ")}`);
    if (provider === "tencent-cloud-sms") return this.deliverTencentSms(input, settings);
    if (provider === "luosimao-sms") return this.deliverLuosimaoSms(input, settings);
    if (provider === "aliyun-sms") return this.failed(provider, "当前版本暂未启用阿里云短信适配，请切换螺丝帽或腾讯云短信");
    return this.failed(provider, `不支持的短信服务商：${provider}`);
  }

  private async deliverEmail(input: NotificationDeliveryInput, provider: string): Promise<NotificationDeliveryResult> {
    if (!this.channelEnabled("email")) return this.notConfigured("email", provider);
    if (!input.to?.email) return this.failed(provider, "邮件收件人邮箱为空");
    const missing = this.missing(["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"]);
    if (missing.length) return this.failed(provider, `邮件服务缺少配置：${missing.join(", ")}`);
    try {
      const transport = nodemailer.createTransport({
        host: this.config.get("SMTP_HOST"),
        port: Number(this.config.get("SMTP_PORT", 465)),
        secure: this.config.get("SMTP_SECURE", "true") === "true",
        auth: { user: this.config.get("SMTP_USER"), pass: this.config.get("SMTP_PASSWORD") }
      });
      const info = await transport.sendMail({ from: this.config.get("SMTP_FROM"), to: input.to.email, subject: input.title, text: input.content });
      return { status: "sent", provider, providerMessageId: info.messageId };
    } catch (error: any) {
      return this.failed(provider, error?.message || "邮件发送失败");
    }
  }

  private async deliverWechat(input: NotificationDeliveryInput, provider: string, settings?: NotificationProviderOverrides["wechat"]): Promise<NotificationDeliveryResult> {
    if (!this.channelEnabled("wechat", { wechat: settings })) return this.notConfigured("wechat", provider);
    if (!input.to?.openid) return this.failed(provider, "微信订阅消息 openid 为空");
    if (provider === "mock-wechat") {
      if (this.canUseMockWechat()) return this.mockSuccess(provider);
      return this.failed(provider, "生产环境禁止 mock-wechat 假发送，请配置真实微信消息服务");
    }
    const missing = this.missingWechat(settings);
    if (!String(settings?.templateId || this.config.get("WECHAT_MESSAGE_TEMPLATE_ID") || "").trim()) missing.push("WECHAT_MESSAGE_TEMPLATE_ID");
    if (missing.length) return this.failed(provider, `微信订阅消息缺少配置：${missing.join(", ")}`);
    if (!["wechat-subscribe-message", "wechat-subscribe"].includes(provider)) return this.failed(provider, `不支持的微信消息服务商：${provider}`);
    try {
      const token = await this.getWechatAccessToken(settings);
      const titleKey = this.config.get("WECHAT_MESSAGE_TITLE_KEY", "thing1");
      const contentKey = this.config.get("WECHAT_MESSAGE_CONTENT_KEY", "thing2");
      const data = settings?.data && Object.keys(settings.data).length
        ? Object.fromEntries(Object.entries(settings.data).map(([key, value]) => [key, { value: String(value).slice(0, 20) }]))
        : { [titleKey]: { value: input.title.slice(0, 20) }, [contentKey]: { value: input.content.slice(0, 20) } };
      const response = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          touser: input.to.openid,
          template_id: settings?.templateId || this.config.get("WECHAT_MESSAGE_TEMPLATE_ID"),
          page: settings?.page || this.config.get("WECHAT_MESSAGE_PAGE", "pages/index/index"),
          miniprogram_state: settings?.miniprogramState || this.config.get("WECHAT_MESSAGE_MINIPROGRAM_STATE", "formal"),
          lang: "zh_CN",
          data
        })
      });
      const payload = await response.json().catch(() => null) as { errcode?: number; errmsg?: string; msgid?: string | number } | null;
      if (!response.ok || Number(payload?.errcode || 0) !== 0) return this.failed(provider, payload?.errmsg || `微信消息请求失败：HTTP ${response.status}`);
      return { status: "sent", provider, providerMessageId: String(payload?.msgid || `wechat_${Date.now()}`) };
    } catch (error: any) {
      return this.failed(provider, error?.message || "微信订阅消息发送失败");
    }
  }

  private async getWechatAccessToken(settings?: NotificationProviderOverrides["wechat"]) {
    const appId = String(settings?.appId || this.config.get("WECHAT_APP_ID") || "");
    const appSecret = String(settings?.appSecret || this.config.get("WECHAT_APP_SECRET") || "");
    if (this.wechatAccessToken?.appId === appId && this.wechatAccessToken.expiresAt > Date.now() + 60000) return this.wechatAccessToken.value;
    const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
    url.searchParams.set("grant_type", "client_credential");
    url.searchParams.set("appid", appId);
    url.searchParams.set("secret", appSecret);
    const response = await fetch(url);
    const payload = await response.json().catch(() => null) as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string } | null;
    if (!response.ok || !payload?.access_token) throw new Error(payload?.errmsg || `微信 access_token 获取失败：HTTP ${response.status}`);
    this.wechatAccessToken = { appId, value: payload.access_token, expiresAt: Date.now() + Math.max(Number(payload.expires_in || 7200) - 120, 60) * 1000 };
    return payload.access_token;
  }

  private mockSuccess(provider: string): NotificationDeliveryResult {
    return {
      status: "sent",
      provider,
      providerMessageId: `${provider}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    };
  }

  private failed(provider: string, errorMessage: string): NotificationDeliveryResult {
    return { status: "failed", provider, errorMessage };
  }

  private notConfigured(channel: string, provider: string) {
    return this.failed(provider, `${channel} provider is not enabled`);
  }

  private providerName(channel: string, overrides?: NotificationProviderOverrides) {
    if (channel === "sms") return String(overrides?.sms?.provider || this.config.get("SMS_PROVIDER", "mock-sms") || "mock-sms").trim();
    if (channel === "email") return this.config.get("EMAIL_PROVIDER", "mock-email");
    if (channel === "wechat") return String(overrides?.wechat?.provider || this.config.get("WECHAT_MESSAGE_PROVIDER", "mock-wechat") || "mock-wechat").trim();
    return "site";
  }

  private channelEnabled(channel: string, overrides?: NotificationProviderOverrides) {
    if (channel === "site") return true;
    if (channel === "sms") {
      if (overrides?.sms) return this.truthy(overrides.sms.enabled);
      return this.config.get("SMS_PROVIDER_ENABLED", "false") === "true";
    }
    if (channel === "email") return this.config.get("EMAIL_PROVIDER_ENABLED", "false") !== "false";
    if (channel === "wechat") {
      if (overrides?.wechat?.enabled !== undefined && overrides.wechat.enabled !== null && overrides.wechat.enabled !== "") {
        return this.truthy(overrides.wechat.enabled);
      }
      return this.config.get("WECHAT_MESSAGE_PROVIDER_ENABLED", "false") !== "false";
    }
    return false;
  }

  private statusFor(channel: string, provider: string, enabled: boolean, missingWhenEnabled: string[]) {
    const missing = enabled ? missingWhenEnabled : [];
    return { channel, provider, enabled, ready: enabled && missing.length === 0, missing };
  }

  private missing(keys: string[]) {
    return keys.filter((key) => !this.config.get<string>(key));
  }

  private missingSms(provider: string, settings?: SmsProviderSettings | null) {
    if (provider === "mock-sms") return this.canUseMockSms() ? [] : ["SMS_PROVIDER"];
    if (provider === "luosimao-sms") {
      const apiKey = this.luosimaoApiKey(settings);
      const signName = settings?.signName || this.config.get("SMS_SIGN_NAME");
      const pairs: Array<[string, unknown]> = [
        ["smsAccessKeySecret", apiKey],
        ["smsSignName", signName]
      ];
      return pairs.filter(([, value]) => !String(value || "").trim()).map(([key]) => key);
    }
    const keys = provider === "tencent-cloud-sms"
      ? ["SMS_ACCESS_KEY_ID", "SMS_ACCESS_KEY_SECRET", "SMS_SIGN_NAME", "SMS_TEMPLATE_ID", "SMS_SDK_APP_ID"]
      : ["SMS_ACCESS_KEY_ID", "SMS_ACCESS_KEY_SECRET", "SMS_SIGN_NAME", "SMS_TEMPLATE_ID"];
    if (!settings) return this.missing(keys);
    const pairs: Array<[string, unknown]> = [
      ["smsAccessKeyId", settings.accessKeyId],
      ["smsAccessKeySecret", settings.accessKeySecret],
      ["smsSignName", settings.signName],
      ["smsTemplateId", settings.templateId]
    ];
    if (provider === "tencent-cloud-sms") pairs.push(["smsSdkAppId", settings.appId || this.config.get("SMS_SDK_APP_ID")]);
    return pairs.filter(([, value]) => !String(value || "").trim()).map(([key]) => key);
  }

  private async deliverTencentSms(input: NotificationDeliveryInput, settings?: SmsProviderSettings | null): Promise<NotificationDeliveryResult> {
    const phone = this.normalizeTencentPhone(input.to?.phone || "");
    const SmsClient = TencentCloud.sms.v20210111.Client;
    const client = new SmsClient({
      credential: {
        secretId: String(settings?.accessKeyId || this.config.get("SMS_ACCESS_KEY_ID") || ""),
        secretKey: String(settings?.accessKeySecret || this.config.get("SMS_ACCESS_KEY_SECRET") || "")
      },
      region: String(settings?.region || this.config.get("SMS_REGION") || "ap-guangzhou"),
      profile: {
        httpProfile: {
          endpoint: "sms.tencentcloudapi.com"
        }
      }
    });
    const templateParams = this.smsTemplateParams(input.content);
    try {
      const response = await client.SendSms({
        SmsSdkAppId: String(settings?.appId || this.config.get("SMS_SDK_APP_ID") || ""),
        SignName: String(settings?.signName || this.config.get("SMS_SIGN_NAME") || ""),
        TemplateId: String(settings?.templateId || this.config.get("SMS_TEMPLATE_ID") || ""),
        TemplateParamSet: templateParams,
        PhoneNumberSet: [phone]
      });
      const status = response.SendStatusSet?.[0];
      if (!status || status.Code !== "Ok") {
        return this.failed("tencent-cloud-sms", status?.Message || status?.Code || "腾讯云短信发送失败");
      }
      return {
        status: "sent",
        provider: "tencent-cloud-sms",
        providerMessageId: status.SerialNo || response.RequestId
      };
    } catch (error: any) {
      return this.failed("tencent-cloud-sms", error?.message || "腾讯云短信发送失败");
    }
  }

  private async deliverLuosimaoSms(input: NotificationDeliveryInput, settings?: SmsProviderSettings | null): Promise<NotificationDeliveryResult> {
    const apiKey = this.luosimaoApiKey(settings);
    const phone = this.normalizeMainlandPhone(input.to?.phone || "");
    const message = this.withChineseSmsSignature(input.content, String(settings?.signName || this.config.get("SMS_SIGN_NAME") || ""));
    const body = new URLSearchParams({ mobile: phone, message });
    try {
      const response = await fetch("https://sms-api.luosimao.com/v1/send.json", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });
      const payload = await response.json().catch(() => null) as { error?: number | string; msg?: string } | null;
      if (!response.ok) return this.failed("luosimao-sms", payload?.msg || `螺丝帽短信请求失败：HTTP ${response.status}`);
      if (Number(payload?.error) !== 0) return this.failed("luosimao-sms", payload?.msg || `螺丝帽短信发送失败：${payload?.error ?? "未知错误"}`);
      return {
        status: "sent",
        provider: "luosimao-sms",
        providerMessageId: `luosimao_${Date.now()}`
      };
    } catch (error: any) {
      return this.failed("luosimao-sms", error?.message || "螺丝帽短信发送失败");
    }
  }

  private smsTemplateParams(content: string) {
    const matches = String(content || "").match(/\d+/g) || [];
    const code = matches.find((item) => item.length === 6) || matches[0] || "";
    const minutes = matches.find((item) => item !== code) || "";
    return [code, minutes].filter(Boolean);
  }

  private normalizeTencentPhone(phone: string) {
    const text = phone.trim();
    if (/^\+\d{8,20}$/.test(text)) return text;
    if (/^1\d{10}$/.test(text)) return `+86${text}`;
    return text;
  }

  private luosimaoApiKey(settings?: SmsProviderSettings | null) {
    return String(settings?.accessKeySecret || settings?.accessKeyId || this.config.get("SMS_ACCESS_KEY_SECRET") || this.config.get("SMS_ACCESS_KEY_ID") || "");
  }

  private normalizeMainlandPhone(phone: string) {
    return phone.trim().replace(/^\+86/, "");
  }

  private withChineseSmsSignature(content: string, signName: string) {
    const text = String(content || "").trim();
    const sign = signName.trim().replace(/^【/, "").replace(/】$/, "");
    if (!sign || /【[^】]+】$/.test(text)) return text;
    return `${text}【${sign}】`;
  }

  private canUseMockSms() {
    return this.config.get("NODE_ENV") !== "production" || this.config.get("SMS_MOCK_ALLOWED") === "true" || this.config.get("H5_AUTH_MODE") === "dev";
  }

  private missingWechat(settings?: NotificationProviderOverrides["wechat"]) {
    const pairs: Array<[string, unknown]> = [
      ["WECHAT_APP_ID", settings?.appId || this.config.get("WECHAT_APP_ID")],
      ["WECHAT_APP_SECRET", settings?.appSecret || this.config.get("WECHAT_APP_SECRET")]
    ];
    return pairs.filter(([, value]) => !String(value || "").trim()).map(([key]) => key);
  }

  private async platformWechatSettings(): Promise<NonNullable<NotificationProviderOverrides["wechat"]>> {
    if (!this.operationSettings) return {};
    const setting = await this.operationSettings.findOne({ where: { id: 1 } });
    const values = launchConfigToEnv(setting?.launchConfig);
    return {
      enabled: values.WECHAT_MESSAGE_PROVIDER_ENABLED,
      provider: values.WECHAT_MESSAGE_PROVIDER,
      appId: values.WECHAT_APP_ID,
      appSecret: values.WECHAT_APP_SECRET
    };
  }

  private canUseMockWechat() {
    return this.config.get("NODE_ENV") !== "production" || this.config.get("WECHAT_MESSAGE_MOCK_ALLOWED") === "true";
  }

  private truthy(value: unknown) {
    return value === true || value === 1 || value === "1" || value === "true";
  }
}
