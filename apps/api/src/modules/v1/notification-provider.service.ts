import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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
    return [
      this.statusFor("site", "site", true, []),
      this.statusFor("sms", this.providerName("sms", overrides), this.channelEnabled("sms", overrides), this.missingSms(overrides?.sms)),
      this.statusFor("email", this.providerName("email"), this.channelEnabled("email"), this.missing(["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"])),
      this.statusFor("wechat", this.providerName("wechat"), this.channelEnabled("wechat"), this.missing(["WECHAT_APP_ID", "WECHAT_APP_SECRET"]))
    ];
  }

  private deliverSms(input: NotificationDeliveryInput, provider: string, settings?: SmsProviderSettings | null) {
    if (!this.channelEnabled("sms", { sms: settings })) return this.notConfigured("sms", provider);
    if (!input.to?.phone) return this.failed(provider, "短信收件人手机号为空");
    const missing = this.missingSms(settings);
    if (missing.length) return this.failed(provider, `短信服务缺少配置：${missing.join(", ")}`);
    return this.mockSuccess(provider);
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
    if (channel === "sms") return overrides?.sms?.provider || this.config.get("SMS_PROVIDER", "mock-sms");
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

  private missingSms(settings?: SmsProviderSettings | null) {
    if (!settings) return this.missing(["SMS_ACCESS_KEY_ID", "SMS_ACCESS_KEY_SECRET", "SMS_SIGN_NAME", "SMS_TEMPLATE_ID"]);
    const pairs: Array<[string, unknown]> = [
      ["smsAccessKeyId", settings.accessKeyId],
      ["smsAccessKeySecret", settings.accessKeySecret],
      ["smsSignName", settings.signName],
      ["smsTemplateId", settings.templateId]
    ];
    return pairs.filter(([, value]) => !String(value || "").trim()).map(([key]) => key);
  }

  private truthy(value: unknown) {
    return value === true || value === 1 || value === "1" || value === "true";
  }
}
