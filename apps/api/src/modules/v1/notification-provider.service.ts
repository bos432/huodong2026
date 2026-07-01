import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TencentCloud from "tencentcloud-sdk-nodejs";

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
};

@Injectable()
export class NotificationProviderService {
  constructor(private readonly config: ConfigService) {}

  async deliver(input: NotificationDeliveryInput, overrides?: NotificationProviderOverrides): Promise<NotificationDeliveryResult> {
    const provider = this.providerName(input.channel, overrides);
    if (this.config.get("NOTIFICATION_FORCE_FAIL") === "true" || input.title.includes("[fail]")) {
      return { status: "failed", provider, errorMessage: "Mock provider forced failure" };
    }

    if (input.channel === "site") return this.mockSuccess(provider);
    if (input.channel === "sms") return this.deliverSms(input, provider, overrides?.sms);
    if (input.channel === "email") return this.deliverEmail(input, provider);
    if (input.channel === "wechat") return this.deliverWechat(input, provider);

    return { status: "failed", provider, errorMessage: `Unsupported notification channel: ${input.channel}` };
  }

  providerStatus(overrides?: NotificationProviderOverrides) {
    const smsProvider = this.providerName("sms", overrides);
    return [
      this.statusFor("site", "site", true, []),
      this.statusFor("sms", smsProvider, this.channelEnabled("sms", overrides), this.missingSms(smsProvider, overrides?.sms)),
      this.statusFor("email", this.providerName("email"), this.channelEnabled("email"), this.missing(["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"])),
      this.statusFor("wechat", this.providerName("wechat"), this.channelEnabled("wechat"), this.missing(["WECHAT_APP_ID", "WECHAT_APP_SECRET"]))
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
    if (provider === "aliyun-sms") return this.failed(provider, "当前版本暂未启用阿里云短信适配，请切换腾讯云短信或补充阿里云适配");
    return this.failed(provider, `不支持的短信服务商：${provider}`);
  }

  private deliverEmail(input: NotificationDeliveryInput, provider: string) {
    if (!this.channelEnabled("email")) return this.notConfigured("email", provider);
    if (!input.to?.email) return this.failed(provider, "邮件收件人邮箱为空");
    const missing = this.missing(["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"]);
    if (missing.length) return this.failed(provider, `邮件服务缺少配置：${missing.join(", ")}`);
    return this.mockSuccess(provider);
  }

  private deliverWechat(input: NotificationDeliveryInput, provider: string) {
    if (!this.channelEnabled("wechat")) return this.notConfigured("wechat", provider);
    if (!input.to?.openid) return this.failed(provider, "微信订阅消息 openid 为空");
    const missing = this.missing(["WECHAT_APP_ID", "WECHAT_APP_SECRET"]);
    if (missing.length) return this.failed(provider, `微信订阅消息缺少配置：${missing.join(", ")}`);
    return this.mockSuccess(provider);
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
    if (channel === "wechat") return this.config.get("WECHAT_MESSAGE_PROVIDER", "mock-wechat");
    return "site";
  }

  private channelEnabled(channel: string, overrides?: NotificationProviderOverrides) {
    if (channel === "site") return true;
    if (channel === "sms") {
      if (overrides?.sms) return this.truthy(overrides.sms.enabled);
      return this.config.get("SMS_PROVIDER_ENABLED", "false") === "true";
    }
    if (channel === "email") return this.config.get("EMAIL_PROVIDER_ENABLED", "mock") !== "false";
    if (channel === "wechat") return this.config.get("WECHAT_MESSAGE_PROVIDER_ENABLED", "mock") !== "false";
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

  private canUseMockSms() {
    return this.config.get("NODE_ENV") !== "production" || this.config.get("SMS_MOCK_ALLOWED") === "true" || this.config.get("H5_AUTH_MODE") === "dev";
  }

  private truthy(value: unknown) {
    return value === true || value === 1 || value === "1" || value === "true";
  }
}
