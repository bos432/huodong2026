import { ConfigService } from "@nestjs/config";

type LaunchConfig = Record<string, unknown> | null | undefined;

const launchConfigEnvMap: Array<[string, string]> = [
  ["appVersion", "APP_VERSION"],
  ["buildCommit", "BUILD_COMMIT"],
  ["h5Origin", "PUBLIC_H5_ORIGIN"],
  ["adminOrigin", "PUBLIC_ADMIN_ORIGIN"],
  ["apiOrigin", "PUBLIC_API_ORIGIN"],
  ["mysqlDatabase", "DB_DATABASE"],
  ["mysqlUser", "DB_USERNAME"],
  ["mysqlPassword", "DB_PASSWORD"],
  ["jwtSecret", "JWT_SECRET"],
  ["h5AuthSecret", "H5_AUTH_SECRET"],
  ["dbSynchronize", "DB_SYNCHRONIZE"],
  ["trustProxy", "TRUST_PROXY"],
  ["securityHeadersEnabled", "SECURITY_HEADERS_ENABLED"],
  ["securityHstsEnabled", "SECURITY_HSTS_ENABLED"],
  ["validationForbidNonWhitelisted", "VALIDATION_FORBID_NON_WHITELISTED"],
  ["accessLogEnabled", "ACCESS_LOG_ENABLED"],
  ["accessLogSkipHealth", "ACCESS_LOG_SKIP_HEALTH"],
  ["uploadDir", "UPLOAD_DIR"],
  ["h5AuthMode", "H5_AUTH_MODE"],
  ["smsEnabled", "SMS_PROVIDER_ENABLED"],
  ["smsProvider", "SMS_PROVIDER"],
  ["smsAccessKeyId", "SMS_ACCESS_KEY_ID"],
  ["smsAccessKeySecret", "SMS_ACCESS_KEY_SECRET"],
  ["smsSignName", "SMS_SIGN_NAME"],
  ["smsTemplateId", "SMS_TEMPLATE_ID"],
  ["emailEnabled", "EMAIL_PROVIDER_ENABLED"],
  ["emailProvider", "EMAIL_PROVIDER"],
  ["smtpHost", "SMTP_HOST"],
  ["smtpPort", "SMTP_PORT"],
  ["smtpUser", "SMTP_USER"],
  ["smtpPassword", "SMTP_PASSWORD"],
  ["smtpFrom", "SMTP_FROM"],
  ["wechatMessageEnabled", "WECHAT_MESSAGE_PROVIDER_ENABLED"],
  ["wechatMessageProvider", "WECHAT_MESSAGE_PROVIDER"],
  ["wechatAppId", "WECHAT_APP_ID"],
  ["wechatAppSecret", "WECHAT_APP_SECRET"],
  ["paymentSandboxEnabled", "PAYMENT_SANDBOX_ENABLED"],
  ["paymentSandboxSecret", "PAYMENT_SANDBOX_SECRET"],
  ["wechatPaySandboxSecret", "WECHAT_PAY_SANDBOX_SECRET"],
  ["alipayPaySandboxSecret", "ALIPAY_PAY_SANDBOX_SECRET"],
  ["realPaymentEnabled", "REAL_PAYMENT_ENABLED"],
  ["realPaymentSdkImplemented", "REAL_PAYMENT_SDK_IMPLEMENTED"],
  ["realPaymentCallbackVerificationImplemented", "REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED"],
  ["realRefundQueryImplemented", "REAL_REFUND_QUERY_IMPLEMENTED"],
  ["realPaymentStatementFetchImplemented", "REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED"],
  ["agentRealTransferImplemented", "AGENT_REAL_TRANSFER_IMPLEMENTED"],
  ["mallRealWechatPaymentImplemented", "MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED"],
  ["mallMerchantDirectPaymentImplemented", "MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED"],
  ["realPaymentPreflightPassed", "REAL_PAYMENT_PREFLIGHT_PASSED"],
  ["realPaymentPreflightResultFile", "REAL_PAYMENT_PREFLIGHT_RESULT_FILE"],
  ["realPaymentPreflightMaxAgeHours", "REAL_PAYMENT_PREFLIGHT_MAX_AGE_HOURS"],
  ["multiTenantEnabled", "MULTI_TENANT_ENABLED"],
  ["multiTenantSchemaImplemented", "MULTI_TENANT_SCHEMA_IMPLEMENTED"],
  ["multiTenantAccessFilterImplemented", "MULTI_TENANT_ACCESS_FILTER_IMPLEMENTED"],
  ["multiTenantPublicBoundaryImplemented", "MULTI_TENANT_PUBLIC_BOUNDARY_IMPLEMENTED"],
  ["multiTenantPreflightPassed", "MULTI_TENANT_PREFLIGHT_PASSED"],
  ["multiTenantPreflightResultFile", "MULTI_TENANT_PREFLIGHT_RESULT_FILE"],
  ["multiTenantPreflightMaxAgeHours", "MULTI_TENANT_PREFLIGHT_MAX_AGE_HOURS"],
  ["mallMultiMerchantEnabled", "MALL_MULTI_MERCHANT_ENABLED"],
  ["mallMultiMerchantPreflightPassed", "MALL_MULTI_MERCHANT_PREFLIGHT_PASSED"],
  ["mallMultiMerchantSmokeResultFile", "MALL_MULTI_MERCHANT_SMOKE_RESULT_FILE"],
  ["mallMultiMerchantSmokeMaxAgeHours", "MALL_MULTI_MERCHANT_SMOKE_MAX_AGE_HOURS"],
  ["wechatPayEnabled", "WECHAT_PAY_ENABLED"],
  ["wechatPayAppId", "WECHAT_PAY_APP_ID"],
  ["wechatPayMchId", "WECHAT_PAY_MCH_ID"],
  ["wechatPayApiV3Key", "WECHAT_PAY_API_V3_KEY"],
  ["wechatPayPrivateKeyPath", "WECHAT_PAY_PRIVATE_KEY_PATH"],
  ["wechatPayCertSerialNo", "WECHAT_PAY_CERT_SERIAL_NO"],
  ["wechatPayPlatformCertPath", "WECHAT_PAY_PLATFORM_CERT_PATH"],
  ["wechatPayNotifyUrl", "WECHAT_PAY_NOTIFY_URL"],
  ["mallWechatPayNotifyUrl", "MALL_WECHAT_PAY_NOTIFY_URL"],
  ["mallWechatPayRefundNotifyUrl", "MALL_WECHAT_PAY_REFUND_NOTIFY_URL"],
  ["mallWechatPayDirectNotifyUrlTemplate", "MALL_WECHAT_PAY_DIRECT_NOTIFY_URL_TEMPLATE"],
  ["mallWechatPayDirectRefundNotifyUrlTemplate", "MALL_WECHAT_PAY_DIRECT_REFUND_NOTIFY_URL_TEMPLATE"],
  ["alipayEnabled", "ALIPAY_ENABLED"],
  ["alipayAppId", "ALIPAY_APP_ID"],
  ["alipayPrivateKeyPath", "ALIPAY_PRIVATE_KEY_PATH"],
  ["alipayPublicCertPath", "ALIPAY_PUBLIC_CERT_PATH"],
  ["alipayRootCertPath", "ALIPAY_ROOT_CERT_PATH"],
  ["alipayNotifyUrl", "ALIPAY_NOTIFY_URL"],
  ["offlinePaymentExpireMinutes", "OFFLINE_PAYMENT_EXPIRE_MINUTES"],
  ["orderCloseWorkerEnabled", "ORDER_CLOSE_WORKER_ENABLED"],
  ["orderCloseWorkerIntervalSeconds", "ORDER_CLOSE_WORKER_INTERVAL_SECONDS"],
  ["backupDir", "BACKUP_DIR"],
  ["backupRetentionDays", "BACKUP_RETENTION_DAYS"]
];

const allowedLaunchConfigKeys = new Set(launchConfigEnvMap.map(([key]) => key));

export function normalizeLaunchConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!allowedLaunchConfigKeys.has(key)) continue;
    if (raw === undefined || raw === null) continue;
    if (typeof raw === "string") result[key] = raw.trim();
    else if (typeof raw === "boolean") result[key] = raw;
    else if (typeof raw === "number" && Number.isFinite(raw)) result[key] = raw;
  }
  return result;
}

export function launchConfigToEnv(value: LaunchConfig): Record<string, string> {
  const launchConfig = normalizeLaunchConfig(value);
  const env: Record<string, string> = {};
  for (const [field, envKey] of launchConfigEnvMap) {
    const normalized = normalizeLaunchValue(launchConfig[field]);
    if (normalized !== undefined && normalized !== "") env[envKey] = normalized;
  }
  if (!env.CORS_ORIGIN) {
    const origins = [env.PUBLIC_H5_ORIGIN, env.PUBLIC_ADMIN_ORIGIN].filter(Boolean);
    if (origins.length) env.CORS_ORIGIN = origins.join(",");
  }
  return env;
}

export function configWithLaunchOverrides(config: ConfigService, launchConfig: LaunchConfig): ConfigService {
  const overrides = launchConfigToEnv(launchConfig);
  return {
    get: (key: string, defaultValue?: unknown) => {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) return overrides[key];
      return config.get(key, defaultValue as never);
    }
  } as ConfigService;
}

function normalizeLaunchValue(value: unknown) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value.trim();
  return undefined;
}
