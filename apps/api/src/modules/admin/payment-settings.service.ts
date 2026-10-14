import { BadRequestException, ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { AdminOperationLog } from "../../entities/admin-operation-log.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { configWithLaunchOverrides, launchConfigSecretKeys, maskLaunchConfigSecrets, secureLaunchConfigForStorage } from "../../shared/launch-config";
import { inspectRuntimeConfig } from "../../shared/config-validation";
import { createPrivateKey, X509Certificate } from "node:crypto";
import { extname, resolve } from "node:path";
import { closeSync, fstatSync, openSync, readFileSync } from "node:fs";
import { inspectPaymentPreflight } from "../../shared/payment-preflight";
import { storePrivateCredential } from "../../shared/private-credential";
import { assertUploadMalwareSafe, uploadMalwareScanConfig } from "../../shared/upload-malware-scan";

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

const URL_KEYS = new Set([
  "wechatPayNotifyUrl", "mallWechatPayNotifyUrl", "mallWechatPayRefundNotifyUrl", "mallWechatPayDirectNotifyUrlTemplate",
  "mallWechatPayDirectRefundNotifyUrlTemplate", "alipayNotifyUrl"
]);

const SECRET_KEYS = new Set(["wechatPayApiV3Key"]);
const REQUIRED_PREFLIGHT_KEYS = [
  "realPaymentSdkImplemented", "realPaymentCallbackVerificationImplemented", "realRefundQueryImplemented",
  "realPaymentStatementFetchImplemented", "mallRealWechatPaymentImplemented", "mallMerchantDirectPaymentImplemented", "realPaymentPreflightPassed"
];

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
    const launchConfig = maskLaunchConfigSecrets(setting?.launchConfig || {});
    return {
      scope: "platform",
      configured: Object.fromEntries(Array.from(launchConfigSecretKeys).map((key) => [key, Boolean((setting?.launchConfig as any)?.[key])])),
      secretStatus: Object.fromEntries(Array.from(SECRET_KEYS).map((key) => [key, Boolean((setting?.launchConfig as any)?.[key])])),
      launchConfig,
      readiness: this.readiness(setting?.launchConfig || {})
    };
  }

  async update(admin: PaymentAdmin | undefined, patch: PaymentSettingsPatch) {
    this.assertPlatformAdmin(admin);
    const setting = await this.platformSetting(true);
    const incoming: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch || {})) {
      if (key === "clearSecrets") continue;
      if (!PAYMENT_KEYS.has(key)) throw new BadRequestException(`不允许修改支付配置字段：${key}`);
      if (key === "realPaymentEnabled" && value !== false && value !== "false") throw new BadRequestException("开启真实支付必须通过专用启用接口和验收校验");
      if (URL_KEYS.has(key) && value !== undefined && value !== null && String(value).trim()) this.assertHttpsUrl(String(value), key);
      incoming[key] = value;
    }
    setting.launchConfig = secureLaunchConfigForStorage(setting.launchConfig, { ...setting.launchConfig, ...incoming }, Array.isArray(patch?.clearSecrets) ? patch.clearSecrets : []);
    const saved = await this.operationSettings.save(setting);
    await this.log(admin, "settings.payment.update", saved.id, "更新平台统一支付配置", { keys: Object.keys(incoming).filter((key) => !SECRET_KEYS.has(key)), clearedSecrets: Array.isArray(patch?.clearSecrets) ? patch.clearSecrets : [] });
    return this.get(admin);
  }

  async validate(admin?: PaymentAdmin) {
    this.assertPlatformAdmin(admin);
    const setting = await this.platformSetting();
    return this.get(admin);
  }

  async uploadCredential(admin: PaymentAdmin | undefined, field: string, file?: Express.Multer.File & { buffer?: Buffer }) {
    this.assertPlatformAdmin(admin);
    if (!["wechatPayPrivateKeyPath", "wechatPayPlatformCertPath"].includes(field)) throw new BadRequestException("不支持的支付证书类型");
    if (!file?.buffer?.length || file.buffer.length > 2 * 1024 * 1024 || ![".pem", ".key", ".crt", ".cer"].includes(extname(file.originalname || "").toLowerCase())) {
      throw new BadRequestException("请上传不超过 2MB 的 PEM 私钥或证书文件");
    }
    await assertUploadMalwareSafe(file.buffer, uploadMalwareScanConfig(this.config));
    try {
      if (field === "wechatPayPrivateKeyPath") {
        const key = createPrivateKey(file.buffer);
        if (key.asymmetricKeyType !== "rsa" || (key.asymmetricKeyDetails?.modulusLength || 0) < 2048) throw new Error("invalid RSA key");
      } else {
        const cert = new X509Certificate(file.buffer);
        if (file.buffer.toString().includes("PRIVATE KEY") || cert.publicKey.asymmetricKeyType !== "rsa") throw new Error("invalid certificate");
        if (Date.parse(cert.validTo) <= Date.now() || Date.parse(cert.validFrom) > Date.now()) throw new Error("invalid validity");
      }
    } catch {
      throw new BadRequestException(field === "wechatPayPrivateKeyPath" ? "请上传有效的 RSA 商户私钥（至少 2048 位）" : "请上传有效且未过期的微信支付平台证书");
    }
    const path = storePrivateCredential(file as Express.Multer.File & { buffer: Buffer });
    await this.log(admin, "settings.payment.credential.upload", 1, "上传平台支付凭证", { field, size: file.buffer.length });
    return { field, path };
  }

  async enable(admin: PaymentAdmin | undefined, body: { confirmation?: string }) {
    this.assertPlatformAdmin(admin);
    if (body?.confirmation !== "ENABLE_REAL_PAYMENT") throw new BadRequestException("请输入 ENABLE_REAL_PAYMENT 才能确认开启");
    const setting = await this.platformSetting(true);
    const readiness = this.readiness({ ...(setting.launchConfig || {}), realPaymentEnabled: true, wechatPayEnabled: true });
    if (readiness.status !== "ok") throw new ConflictException("真实支付尚未通过配置和预发联调门禁，不能开启");
    setting.launchConfig = secureLaunchConfigForStorage(setting.launchConfig, { ...setting.launchConfig, realPaymentEnabled: true, wechatPayEnabled: true });
    const saved = await this.operationSettings.save(setting);
    await this.log(admin, "settings.payment.enable", saved.id, "开启平台统一真实支付", { provider: "wechat", readiness: readiness.summary });
    return this.get(admin);
  }

  async disable(admin: PaymentAdmin | undefined) {
    this.assertPlatformAdmin(admin);
    const setting = await this.platformSetting(true);
    setting.launchConfig = secureLaunchConfigForStorage(setting.launchConfig, { ...setting.launchConfig, realPaymentEnabled: false, wechatPayEnabled: false });
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
    const safeConfig = {
      get: (key: string, fallback?: unknown) => key === "NODE_ENV" ? "production" : this.config.get(key, fallback as never) ?? fallback
    } as ConfigService;
    // Inspect the proposed enabled state without persisting either switch.
    const runtime = configWithLaunchOverrides(safeConfig, { ...launchConfig, realPaymentEnabled: true, wechatPayEnabled: true });
    const inspection = inspectRuntimeConfig(runtime);
    const currentlyEnabled = configWithLaunchOverrides(safeConfig, launchConfig).get("REAL_PAYMENT_ENABLED", "false") === "true";
    const checks = inspection.checks
      .filter((item) => item.key.startsWith("REAL_PAYMENT") || item.key === "REAL_REFUND_QUERY_IMPLEMENTED" || item.key.startsWith("WECHAT_PAY") || item.key.startsWith("ALIPAY") || item.key === "微信支付_CONFIG" || item.key === "支付宝_CONFIG" || item.key.includes("MALL_") || item.key === "PRIVATE_CREDENTIAL_DIR")
      .map((item) => {
        if (item.key === "REAL_PAYMENT_ENABLED") return { ...item, status: currentlyEnabled ? "warning" as const : "ok" as const, value: currentlyEnabled ? "已启用" : "未启用", message: currentlyEnabled ? "真实支付当前已启用，以下为配置复核结果。" : "真实支付当前关闭，以下按开启要求预检，不会自动开启支付。" };
        if (item.key === "微信支付_CONFIG" || item.key === "支付宝_CONFIG") return { ...item, message: item.message.replace("已启用但缺少配置", "启用前仍缺少配置") };
        return item;
      });
    const missingGateKeys = REQUIRED_PREFLIGHT_KEYS.filter((key) => runtime.get(key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase(), "false") !== "true");
    let evidenceErrors: string[];
    let evidenceFile: number | undefined;
    try {
      const path = resolve(__dirname, "../../../../..", String(runtime.get("REAL_PAYMENT_PREFLIGHT_RESULT_FILE", "deploy/real-payment-smoke-result.json")));
      evidenceFile = openSync(path, "r");
      const stat = fstatSync(evidenceFile);
      if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error("Invalid evidence file");
      const report: unknown = JSON.parse(readFileSync(evidenceFile, "utf8"));
      evidenceErrors = inspectPaymentPreflight(report, {
        maxAgeHours: Number(runtime.get("REAL_PAYMENT_PREFLIGHT_MAX_AGE_HOURS", "168")),
        wechat: true,
        alipay: runtime.get("ALIPAY_ENABLED", "false") === "true"
      });
    } catch {
      evidenceErrors = ["fileMissingOrInvalid"];
    } finally {
      if (evidenceFile !== undefined) closeSync(evidenceFile);
    }
    checks.push({ key: "REAL_PAYMENT_PREFLIGHT_EVIDENCE", label: "真实支付验收文件", status: evidenceErrors.length ? "error" : "ok", message: evidenceErrors.length ? `验收文件缺失、无效、过期或证据不完整：${evidenceErrors.join(", ")}` : "验收文件结构、时效和必需场景检查通过；真实结果仍以外部联调证据为准。" });
    const errors = checks.filter((item) => item.status === "error");
    const status = errors.length || missingGateKeys.length ? "blocked" : "ok";
    return { status, summary: { errors: errors.length, missingGateKeys }, checks };
  }

  private async log(admin: PaymentAdmin, action: string, targetId: number, summary: string, detail: Record<string, unknown>) {
    await this.operationLogs.save(this.operationLogs.create({ adminId: admin.id, adminUsername: admin.username, tenantId: null, adminRole: admin.role, clientIp: admin.clientIp || null, userAgent: admin.userAgent || null, requestId: admin.requestId || null, action, targetType: "operation_setting", targetId: String(targetId), summary, detail } as any));
  }
}
