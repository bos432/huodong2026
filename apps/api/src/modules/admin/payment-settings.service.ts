import { BadRequestException, ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { AdminOperationLog } from "../../entities/admin-operation-log.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { configWithLaunchOverrides, maskLaunchConfigSecrets, secureLaunchConfigForStorage } from "../../shared/launch-config";
import { inspectRuntimeConfig } from "../../shared/config-validation";

type PaymentAdmin = { id?: number; username?: string; role?: string; tenantId?: number | null; clientIp?: string; userAgent?: string; requestId?: string };
type PaymentSettingsPatch = Record<string, unknown> & { clearSecrets?: string[] };

const PAYMENT_KEYS = new Set([
  "realPaymentEnabled", "wechatPayEnabled", "wechatPayAppId", "wechatPayMchId", "wechatPayApiV3Key", "wechatPayPrivateKeyPath",
  "wechatPayCertSerialNo", "wechatPayPlatformCertPath", "wechatPayNotifyUrl", "mallWechatPayNotifyUrl", "mallWechatPayRefundNotifyUrl",
  "mallWechatPayDirectNotifyUrlTemplate", "mallWechatPayDirectRefundNotifyUrlTemplate", "alipayEnabled", "alipayAppId",
  "alipayPrivateKeyPath", "alipayPublicCertPath", "alipayRootCertPath", "alipayNotifyUrl", "realPaymentSdkImplemented",
  "realPaymentCallbackVerificationImplemented", "realRefundQueryImplemented", "realPaymentStatementFetchImplemented",
  "mallRealWechatPaymentImplemented", "mallMerchantDirectPaymentImplemented", "realPaymentPreflightPassed", "realPaymentPreflightResultFile",
  "realPaymentPreflightMaxAgeHours", "mallMultiMerchantPreflightPassed", "mallMultiMerchantSmokeResultFile", "mallMultiMerchantSmokeMaxAgeHours"
]);
const URL_KEYS = new Set(["wechatPayNotifyUrl", "mallWechatPayNotifyUrl", "mallWechatPayRefundNotifyUrl", "mallWechatPayDirectNotifyUrlTemplate", "mallWechatPayDirectRefundNotifyUrlTemplate", "alipayNotifyUrl"]);
const SECRET_KEYS = new Set(["wechatPayApiV3Key"]);
const REQUIRED_PREFLIGHT_KEYS = ["realPaymentSdkImplemented", "realPaymentCallbackVerificationImplemented", "realRefundQueryImplemented", "realPaymentStatementFetchImplemented", "mallRealWechatPaymentImplemented", "mallMerchantDirectPaymentImplemented", "realPaymentPreflightPassed"];

@Injectable()
export class PaymentSettingsService {
  constructor(
    @InjectRepository(OperationSetting) private readonly operationSettings: Repository<OperationSetting>,
    @InjectRepository(AdminOperationLog) private readonly operationLogs: Repository<AdminOperationLog>,
    private readonly config: ConfigService
  ) {}

  async get(admin?: PaymentAdmin) {
    this.assertPlatformAdmin(admin);
    const setting = await this.platformSetting();
    const source = (setting.launchConfig || {}) as Record<string, unknown>;
    const launchConfig = maskLaunchConfigSecrets(source);
    return { scope: "platform", secretStatus: Object.fromEntries(Array.from(SECRET_KEYS).map((key) => [key, Boolean(source[key])])), launchConfig, readiness: this.readiness(source) };
  }

  async update(admin: PaymentAdmin | undefined, patch: PaymentSettingsPatch) {
    this.assertPlatformAdmin(admin);
    const setting = await this.platformSetting(true);
    const incoming: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch || {})) {
      if (key === "clearSecrets") continue;
      if (!PAYMENT_KEYS.has(key)) throw new BadRequestException(`不允许修改支付配置字段：${key}`);
      if (key === "realPaymentEnabled" && value === true) throw new BadRequestException("保存配置不会自动开启真实支付，请使用确认开启接口");
      if (URL_KEYS.has(key) && value !== undefined && value !== null && String(value).trim()) this.assertHttpsUrl(String(value), key);
      incoming[key] = value;
    }
    setting.launchConfig = secureLaunchConfigForStorage(setting.launchConfig, incoming, Array.isArray(patch?.clearSecrets) ? patch.clearSecrets : []);
    const saved = await this.operationSettings.save(setting);
    await this.log(admin, "settings.payment.update", saved.id, "更新平台统一支付配置", { keys: Object.keys(incoming).filter((key) => !SECRET_KEYS.has(key)) });
    return this.get(admin);
  }

  validate(admin?: PaymentAdmin) { return this.get(admin); }

  async enable(admin: PaymentAdmin | undefined, body: { confirmation?: string }) {
    this.assertPlatformAdmin(admin);
    if (body?.confirmation !== "ENABLE_REAL_PAYMENT") throw new BadRequestException("请输入 ENABLE_REAL_PAYMENT 才能确认开启");
    const setting = await this.platformSetting(true);
    const readiness = this.readiness({ ...(setting.launchConfig || {}), realPaymentEnabled: true, wechatPayEnabled: true });
    if (readiness.status !== "ok") throw new ConflictException("真实支付尚未通过配置和预发联调门禁，不能开启");
    setting.launchConfig = secureLaunchConfigForStorage(setting.launchConfig, { realPaymentEnabled: true, wechatPayEnabled: true });
    const saved = await this.operationSettings.save(setting);
    await this.log(admin, "settings.payment.enable", saved.id, "开启平台统一真实支付", readiness.summary);
    return this.get(admin);
  }

  async disable(admin: PaymentAdmin | undefined) {
    this.assertPlatformAdmin(admin);
    const setting = await this.platformSetting(true);
    setting.launchConfig = secureLaunchConfigForStorage(setting.launchConfig, { realPaymentEnabled: false, wechatPayEnabled: false });
    const saved = await this.operationSettings.save(setting);
    await this.log(admin, "settings.payment.disable", saved.id, "关闭平台统一真实支付", { provider: "wechat" });
    return this.get(admin);
  }

  private assertPlatformAdmin(admin?: PaymentAdmin): asserts admin is PaymentAdmin {
    if (!admin?.id || admin.tenantId != null || !["admin", "super_admin"].includes(String(admin.role || ""))) throw new ForbiddenException("只有平台超级管理员可以维护统一支付配置");
  }

  private async platformSetting(create = false) {
    let setting = await this.operationSettings.findOne({ where: { tenant: IsNull() } });
    if (!setting) setting = await this.operationSettings.findOne({ where: { id: 1 } });
    if (!setting && create) setting = this.operationSettings.create({ id: 1, tenant: null, launchConfig: {} } as Partial<OperationSetting>) as OperationSetting;
    if (!setting) throw new ConflictException("平台设置尚未初始化，请先保存系统设置");
    return setting;
  }

  private assertHttpsUrl(value: string, key: string) {
    let url: URL;
    try { url = new URL(value.replace("{merchantId}", "merchant-placeholder")); } catch { throw new BadRequestException(`${key} 格式无效`); }
    if (url.protocol !== "https:") throw new BadRequestException(`${key} 必须使用 HTTPS`);
  }

  private readiness(launchConfig: Record<string, unknown>) {
    const safeConfig = { get: (key: string, fallback?: unknown) => this.config.get(key, fallback as never) ?? fallback } as ConfigService;
    const runtime = configWithLaunchOverrides(safeConfig, launchConfig);
    const inspection = inspectRuntimeConfig(runtime);
    const checks = inspection.checks.filter((item) => item.key.startsWith("REAL_PAYMENT") || item.key.startsWith("WECHAT_PAY") || item.key.includes("MALL_") || item.key === "PRIVATE_CREDENTIAL_DIR");
    const missingGateKeys = REQUIRED_PREFLIGHT_KEYS.filter((key) => runtime.get(key.toUpperCase().replace(/[A-Z]/g, (letter) => `_${letter}`), "false") !== "true");
    const errors = checks.filter((item) => item.status === "error");
    return { status: errors.length || missingGateKeys.length ? "blocked" : "ok", summary: { errors: errors.length, missingGateKeys }, checks };
  }

  private async log(admin: PaymentAdmin, action: string, targetId: number, summary: string, detail: Record<string, unknown>) {
    await this.operationLogs.save(this.operationLogs.create({ adminId: admin.id, adminUsername: admin.username, tenantId: null, adminRole: admin.role, clientIp: admin.clientIp || null, userAgent: admin.userAgent || null, requestId: admin.requestId || null, action, targetType: "operation_setting", targetId: String(targetId), summary, detail } as any));
  }
}
