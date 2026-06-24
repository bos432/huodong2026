<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { UploadFilled } from "@element-plus/icons-vue";
import { api } from "../api";
import { currentTenantSettings, isPlatformAdmin } from "../permissions";

type CheckStatus = "ok" | "warning" | "error";

type ConfigCheck = {
  key: string;
  label: string;
  status: CheckStatus;
  message: string;
  value?: string;
};

type ConfigInspection = {
  status: CheckStatus;
  environment: string;
  checkedAt: string;
  release?: {
    version: string;
    commit: string;
    buildTime: string;
  };
  summary: {
    okCount: number;
    warningCount: number;
    errorCount: number;
  };
  checks: ConfigCheck[];
};

type NotificationReadiness = {
  key: string;
  label: string;
  enabled: boolean;
  status: "disabled" | "ready" | "missing";
  statusText: string;
  description: string;
  missing: string[];
};

type DomainReadiness = {
  key: string;
  label: string;
  envKey: string;
  value: string;
  status: "ready" | "invalid";
  statusText: string;
  issues: string[];
};

type ReleaseReadiness = {
  key: string;
  label: string;
  envKey: string;
  value: string;
  status: "ready" | "invalid";
  statusText: string;
  issues: string[];
};

type SecurityReadiness = {
  key: string;
  label: string;
  envKey: string;
  status: "ready" | "invalid";
  statusText: string;
  detail: string;
};

type RolloutReadiness = {
  key: string;
  label: string;
  status: "disabled" | "ready" | "missing";
  statusText: string;
  description: string;
  missing: string[];
};

type DomainBatchMode = "single" | "split";

type DomainBatchCheck = {
  key: string;
  label: string;
  target: string;
  status: "idle" | "checking" | "ok" | "warning" | "error";
  message: string;
};

type WechatH5AcceptanceStatus = "not_started" | "pending" | "passed" | "blocked";

const defaultPageTheme = {
  brandName: "慢π",
  brandLogoUrl: "",
  brandSlogan: "和慢π一起，让热爱发光",
  adminTitle: "",
  backgroundColor: "#f4f6f8",
  backgroundImage: "",
  backgroundOverlayColor: "#f4f6f8",
  backgroundOverlayOpacity: 0,
  cardBackgroundColor: "#ffffff",
  cardOpacity: 96,
  cardRadius: 8,
  textColor: "#111827",
  mutedColor: "#667085",
  primaryColor: "#0f766e"
};

const router = useRouter();
const activeTab = ref("operation");
const canManagePlatformSettings = computed(() => isPlatformAdmin());
const tenantSettings = ref(currentTenantSettings());
const paymentSettingsEditable = computed(() => canManagePlatformSettings.value || tenantSettings.value.paymentAccountEditable);
const paymentSettingsReadonlyReason = computed(() =>
  paymentSettingsEditable.value ? "" : "平台超级管理员已关闭本商家的收款配置权限。支付方式、线下付款、退款和发票说明只能查看，修改请联系平台。"
);
const loadingOperation = ref(false);
const savingOperation = ref(false);
const loadingConfig = ref(false);
const report = ref<ConfigInspection | null>(null);
const paymentReadiness = computed(() => [
  { key: "free", label: "免费报名", status: "已可用", type: "success", note: "适合免费活动，后端可直接完成报名。" },
  { key: "balance", label: "余额支付", status: "已可用", type: "success", note: "使用用户余额扣款，适合测试和会员账户场景。" },
  { key: "offline", label: "线下收款 / 人工确认", status: "已可用", type: "success", note: "商家可放个人或机构收款说明，后台/手机端确认收款。" },
  { key: "wechat", label: "微信支付", status: "需服务商配置", type: "warning", note: "真实 SDK、回调验签、退款和对账未完整配置前不建议开启。" },
  { key: "alipay", label: "支付宝", status: "自动化未完成", type: "warning", note: "保留配置入口，生产使用前需要完成真实支付和退款链路。" }
]);

const form = reactive({
  registrationEnabled: true,
  registrationDisabledMessage: "",
  offlinePaymentInstructions: "",
  paymentMethods: {
    free: true,
    wechat: false,
    alipay: false,
    balance: true,
    offline: true
  },
  customerServiceName: "",
  customerServicePhone: "",
  customerServiceWechat: "",
  defaultGroupQrCodeUrl: "",
  pageTheme: { ...defaultPageTheme },
  refundInstructions: "",
  invoiceInstructions: "",
  smsProviderEnabled: false,
  smsProvider: "tencent-cloud-sms",
  smsAccessKeyId: "",
  smsAccessKeySecret: "",
  smsSignName: "",
  smsTemplateId: ""
});

const deployment = reactive({
  appVersion: "0.1.0",
  buildCommit: "",
  h5Origin: "https://h5.example.com",
  adminOrigin: "https://admin.example.com",
  apiOrigin: "https://api.example.com",
  wechatH5AcceptanceTenantCode: "qiwai-showcase",
  wechatH5AcceptanceStatus: "not_started" as WechatH5AcceptanceStatus,
  wechatH5AcceptanceAt: "",
  wechatH5AcceptanceRemark: "",
  mysqlDatabase: "activity_registration",
  mysqlUser: "activity",
  mysqlPassword: "",
  mysqlRootPassword: "",
  jwtSecret: "",
  h5AuthSecret: "",
  dbSynchronize: false,
  trustProxy: true,
  securityHeadersEnabled: true,
  securityHstsEnabled: true,
  validationForbidNonWhitelisted: true,
  accessLogEnabled: true,
  accessLogSkipHealth: true,
  uploadDir: "uploads",
  backupDir: "backups/mysql",
  backupRetentionDays: 30,
  h5AuthMode: "sms",
  smsEnabled: true,
  smsProvider: "tencent-cloud-sms",
  smsAccessKeyId: "",
  smsAccessKeySecret: "",
  smsSignName: "",
  smsTemplateId: "",
  emailEnabled: false,
  emailProvider: "smtp",
  smtpHost: "",
  smtpPort: 465,
  smtpUser: "",
  smtpPassword: "",
  smtpFrom: "",
  wechatMessageEnabled: false,
  wechatMessageProvider: "wechat-subscribe-message",
  wechatAppId: "",
  wechatAppSecret: "",
  paymentSandboxEnabled: false,
  paymentSandboxSecret: "",
  wechatPaySandboxSecret: "",
  alipayPaySandboxSecret: "",
  realPaymentEnabled: false,
  realPaymentSdkImplemented: false,
  realPaymentCallbackVerificationImplemented: false,
  realRefundQueryImplemented: false,
  realPaymentStatementFetchImplemented: false,
  agentRealTransferImplemented: false,
  mallRealWechatPaymentImplemented: false,
  mallMerchantDirectPaymentImplemented: false,
  realPaymentPreflightPassed: false,
  realPaymentPreflightResultFile: "deploy/real-payment-smoke-result.json",
  realPaymentPreflightMaxAgeHours: 168,
  multiTenantEnabled: false,
  multiTenantSchemaImplemented: false,
  multiTenantAccessFilterImplemented: false,
  multiTenantPublicBoundaryImplemented: false,
  multiTenantPreflightPassed: false,
  multiTenantPreflightResultFile: "deploy/tenant-smoke-result.json",
  multiTenantPreflightMaxAgeHours: 168,
  mallMultiMerchantEnabled: false,
  mallMultiMerchantPreflightPassed: false,
  mallMultiMerchantSmokeResultFile: "deploy/mall-multi-merchant-smoke-result.json",
  mallMultiMerchantSmokeMaxAgeHours: 168,
  wechatPayEnabled: false,
  wechatPayAppId: "",
  wechatPayMchId: "",
  wechatPayApiV3Key: "",
  wechatPayPrivateKeyPath: "",
  wechatPayCertSerialNo: "",
  wechatPayPlatformCertPath: "",
  wechatPayNotifyUrl: "",
  mallWechatPayNotifyUrl: "",
  mallWechatPayRefundNotifyUrl: "",
  mallWechatPayDirectNotifyUrlTemplate: "",
  mallWechatPayDirectRefundNotifyUrlTemplate: "",
  alipayEnabled: false,
  alipayAppId: "",
  alipayPrivateKeyPath: "",
  alipayPublicCertPath: "",
  alipayRootCertPath: "",
  alipayNotifyUrl: "",
  offlinePaymentExpireMinutes: 1440,
  orderCloseWorkerEnabled: true,
  orderCloseWorkerIntervalSeconds: 300
});

const domainBatch = reactive({
  mode: "single" as DomainBatchMode,
  primaryDomain: "",
  h5Domain: "",
  adminDomain: "",
  apiDomain: ""
});
const domainCheckLoading = ref(false);
const domainReachabilityChecks = ref<DomainBatchCheck[]>([]);

const statusText: Record<CheckStatus, string> = {
  ok: "正常",
  warning: "待确认",
  error: "需修复"
};

const tagType: Record<CheckStatus, "success" | "warning" | "danger"> = {
  ok: "success",
  warning: "warning",
  error: "danger"
};

const deploymentCorsOrigin = computed(() => uniqueCorsOrigins([deployment.h5Origin, deployment.adminOrigin]));

const generatedEnv = computed(() => {
  const buildTime = new Date().toISOString();
  return [
    "# Generated by system settings. Copy to deploy/.env.production before production deployment.",
    envLine("MYSQL_ROOT_PASSWORD", deployment.mysqlRootPassword),
    envLine("MYSQL_DATABASE", deployment.mysqlDatabase),
    envLine("MYSQL_USER", deployment.mysqlUser),
    envLine("MYSQL_PASSWORD", deployment.mysqlPassword),
    "",
    envLine("NODE_ENV", "production"),
    envLine("APP_VERSION", deployment.appVersion),
    envLine("BUILD_COMMIT", deployment.buildCommit),
    envLine("BUILD_TIME", buildTime),
    envLine("API_PORT", 3000),
    envLine("DB_HOST", "mysql"),
    envLine("DB_PORT", 3306),
    envLine("DB_USERNAME", deployment.mysqlUser),
    envLine("DB_PASSWORD", deployment.mysqlPassword),
    envLine("DB_DATABASE", deployment.mysqlDatabase),
    envLine("DB_SYNCHRONIZE", boolValue(deployment.dbSynchronize)),
    envLine("JWT_SECRET", deployment.jwtSecret),
    envLine("H5_AUTH_SECRET", deployment.h5AuthSecret),
    envLine("CORS_ORIGIN", deploymentCorsOrigin.value),
    envLine("TRUST_PROXY", boolValue(deployment.trustProxy)),
    envLine("SECURITY_HEADERS_ENABLED", boolValue(deployment.securityHeadersEnabled)),
    envLine("SECURITY_HSTS_ENABLED", boolValue(deployment.securityHstsEnabled)),
    envLine("VALIDATION_FORBID_NON_WHITELISTED", boolValue(deployment.validationForbidNonWhitelisted)),
    envLine("ACCESS_LOG_ENABLED", boolValue(deployment.accessLogEnabled)),
    envLine("ACCESS_LOG_SKIP_HEALTH", boolValue(deployment.accessLogSkipHealth)),
    envLine("PUBLIC_H5_ORIGIN", deployment.h5Origin),
    envLine("PUBLIC_ADMIN_ORIGIN", deployment.adminOrigin),
    envLine("PUBLIC_API_ORIGIN", deployment.apiOrigin),
    envLine("UPLOAD_DIR", deployment.uploadDir),
    envLine("H5_AUTH_MODE", deployment.h5AuthMode),
    envLine("EMAIL_PROVIDER_ENABLED", boolValue(deployment.emailEnabled)),
    envLine("EMAIL_PROVIDER", deployment.emailProvider),
    envLine("SMTP_HOST", deployment.smtpHost),
    envLine("SMTP_PORT", deployment.smtpPort),
    envLine("SMTP_USER", deployment.smtpUser),
    envLine("SMTP_PASSWORD", deployment.smtpPassword),
    envLine("SMTP_FROM", deployment.smtpFrom),
    envLine("WECHAT_MESSAGE_PROVIDER_ENABLED", boolValue(deployment.wechatMessageEnabled)),
    envLine("WECHAT_MESSAGE_PROVIDER", deployment.wechatMessageProvider),
    envLine("WECHAT_APP_ID", deployment.wechatAppId),
    envLine("WECHAT_APP_SECRET", deployment.wechatAppSecret),
    envLine("PAYMENT_SANDBOX_ENABLED", boolValue(deployment.paymentSandboxEnabled)),
    envLine("PAYMENT_SANDBOX_SECRET", deployment.paymentSandboxSecret),
    envLine("WECHAT_PAY_SANDBOX_SECRET", deployment.wechatPaySandboxSecret),
    envLine("ALIPAY_PAY_SANDBOX_SECRET", deployment.alipayPaySandboxSecret),
    envLine("REAL_PAYMENT_ENABLED", boolValue(deployment.realPaymentEnabled)),
    envLine("REAL_PAYMENT_SDK_IMPLEMENTED", boolValue(deployment.realPaymentSdkImplemented)),
    envLine("REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED", boolValue(deployment.realPaymentCallbackVerificationImplemented)),
    envLine("REAL_REFUND_QUERY_IMPLEMENTED", boolValue(deployment.realRefundQueryImplemented)),
    envLine("REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED", boolValue(deployment.realPaymentStatementFetchImplemented)),
    envLine("AGENT_REAL_TRANSFER_IMPLEMENTED", boolValue(deployment.agentRealTransferImplemented)),
    envLine("MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED", boolValue(deployment.mallRealWechatPaymentImplemented)),
    envLine("MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED", boolValue(deployment.mallMerchantDirectPaymentImplemented)),
    envLine("REAL_PAYMENT_PREFLIGHT_PASSED", boolValue(deployment.realPaymentPreflightPassed)),
    envLine("REAL_PAYMENT_PREFLIGHT_RESULT_FILE", deployment.realPaymentPreflightResultFile),
    envLine("REAL_PAYMENT_PREFLIGHT_MAX_AGE_HOURS", deployment.realPaymentPreflightMaxAgeHours),
    envLine("MULTI_TENANT_ENABLED", boolValue(deployment.multiTenantEnabled)),
    envLine("MULTI_TENANT_SCHEMA_IMPLEMENTED", boolValue(deployment.multiTenantSchemaImplemented)),
    envLine("MULTI_TENANT_ACCESS_FILTER_IMPLEMENTED", boolValue(deployment.multiTenantAccessFilterImplemented)),
    envLine("MULTI_TENANT_PUBLIC_BOUNDARY_IMPLEMENTED", boolValue(deployment.multiTenantPublicBoundaryImplemented)),
    envLine("MULTI_TENANT_PREFLIGHT_PASSED", boolValue(deployment.multiTenantPreflightPassed)),
    envLine("MULTI_TENANT_PREFLIGHT_RESULT_FILE", deployment.multiTenantPreflightResultFile),
    envLine("MULTI_TENANT_PREFLIGHT_MAX_AGE_HOURS", deployment.multiTenantPreflightMaxAgeHours),
    envLine("MALL_MULTI_MERCHANT_ENABLED", boolValue(deployment.mallMultiMerchantEnabled)),
    envLine("MALL_MULTI_MERCHANT_PREFLIGHT_PASSED", boolValue(deployment.mallMultiMerchantPreflightPassed)),
    envLine("MALL_MULTI_MERCHANT_SMOKE_RESULT_FILE", deployment.mallMultiMerchantSmokeResultFile),
    envLine("MALL_MULTI_MERCHANT_SMOKE_MAX_AGE_HOURS", deployment.mallMultiMerchantSmokeMaxAgeHours),
    envLine("WECHAT_PAY_ENABLED", boolValue(deployment.wechatPayEnabled)),
    envLine("WECHAT_PAY_APP_ID", deployment.wechatPayAppId),
    envLine("WECHAT_PAY_MCH_ID", deployment.wechatPayMchId),
    envLine("WECHAT_PAY_API_V3_KEY", deployment.wechatPayApiV3Key),
    envLine("WECHAT_PAY_PRIVATE_KEY_PATH", deployment.wechatPayPrivateKeyPath),
    envLine("WECHAT_PAY_CERT_SERIAL_NO", deployment.wechatPayCertSerialNo),
    envLine("WECHAT_PAY_PLATFORM_CERT_PATH", deployment.wechatPayPlatformCertPath),
    envLine("WECHAT_PAY_NOTIFY_URL", deployment.wechatPayNotifyUrl),
    envLine("MALL_WECHAT_PAY_NOTIFY_URL", deployment.mallWechatPayNotifyUrl),
    envLine("MALL_WECHAT_PAY_REFUND_NOTIFY_URL", deployment.mallWechatPayRefundNotifyUrl),
    envLine("MALL_WECHAT_PAY_DIRECT_NOTIFY_URL_TEMPLATE", deployment.mallWechatPayDirectNotifyUrlTemplate),
    envLine("MALL_WECHAT_PAY_DIRECT_REFUND_NOTIFY_URL_TEMPLATE", deployment.mallWechatPayDirectRefundNotifyUrlTemplate),
    envLine("ALIPAY_ENABLED", boolValue(deployment.alipayEnabled)),
    envLine("ALIPAY_APP_ID", deployment.alipayAppId),
    envLine("ALIPAY_PRIVATE_KEY_PATH", deployment.alipayPrivateKeyPath),
    envLine("ALIPAY_PUBLIC_CERT_PATH", deployment.alipayPublicCertPath),
    envLine("ALIPAY_ROOT_CERT_PATH", deployment.alipayRootCertPath),
    envLine("ALIPAY_NOTIFY_URL", deployment.alipayNotifyUrl),
    envLine("OFFLINE_PAYMENT_EXPIRE_MINUTES", deployment.offlinePaymentExpireMinutes),
    envLine("ORDER_CLOSE_WORKER_ENABLED", boolValue(deployment.orderCloseWorkerEnabled)),
    envLine("ORDER_CLOSE_WORKER_INTERVAL_SECONDS", deployment.orderCloseWorkerIntervalSeconds),
    envLine("BACKUP_DIR", deployment.backupDir),
    envLine("BACKUP_RETENTION_DAYS", deployment.backupRetentionDays),
    envLine("BACKUP_USE_DOCKER", "true"),
    envLine("MYSQL_CONTAINER", "activity-mysql")
  ].join("\n");
});

const domainBatchPreview = computed(() => buildDomainBatchPreview());

const domainBatchPreviewRows = computed(() => [
  { key: "h5", label: "H5 域名", envKey: "PUBLIC_H5_ORIGIN", value: domainBatchPreview.value.h5Origin || "-" },
  { key: "admin", label: "后台域名", envKey: "PUBLIC_ADMIN_ORIGIN", value: domainBatchPreview.value.adminOrigin || "-" },
  { key: "api", label: "API 域名", envKey: "PUBLIC_API_ORIGIN", value: domainBatchPreview.value.apiOrigin || "-" },
  { key: "cors", label: "跨域白名单", envKey: "CORS_ORIGIN", value: domainBatchPreview.value.corsOrigin || "-" },
  { key: "wechat", label: "微信回调", envKey: "WECHAT_PAY_NOTIFY_URL", value: domainBatchPreview.value.wechatPayNotifyUrl || "-" },
  { key: "alipay", label: "支付宝回调", envKey: "ALIPAY_NOTIFY_URL", value: domainBatchPreview.value.alipayNotifyUrl || "-" },
  { key: "mallWechat", label: "商城微信回调", envKey: "MALL_WECHAT_PAY_NOTIFY_URL", value: domainBatchPreview.value.mallWechatPayNotifyUrl || "-" },
  { key: "mallRefund", label: "商城退款回调", envKey: "MALL_WECHAT_PAY_REFUND_NOTIFY_URL", value: domainBatchPreview.value.mallWechatPayRefundNotifyUrl || "-" }
]);

const domainConfigChecks = computed<DomainBatchCheck[]>(() => [
  buildLocalDomainCheck("h5Origin", "H5 域名", deployment.h5Origin, "PUBLIC_H5_ORIGIN"),
  buildLocalDomainCheck("adminOrigin", "后台域名", deployment.adminOrigin, "PUBLIC_ADMIN_ORIGIN", true),
  buildLocalDomainCheck("apiOrigin", "API 域名", deployment.apiOrigin, "PUBLIC_API_ORIGIN"),
  buildLocalCorsCheck(),
  buildOptionalCallbackCheck("wechatPayNotifyUrl", "微信回调", deployment.wechatPayNotifyUrl, "WECHAT_PAY_NOTIFY_URL"),
  buildOptionalCallbackCheck("alipayNotifyUrl", "支付宝回调", deployment.alipayNotifyUrl, "ALIPAY_NOTIFY_URL"),
  buildOptionalCallbackCheck("mallWechatPayNotifyUrl", "商城微信回调", deployment.mallWechatPayNotifyUrl, "MALL_WECHAT_PAY_NOTIFY_URL"),
  buildOptionalCallbackCheck("mallWechatPayRefundNotifyUrl", "商城退款回调", deployment.mallWechatPayRefundNotifyUrl, "MALL_WECHAT_PAY_REFUND_NOTIFY_URL")
]);

const domainServerCommands = computed(() => buildDomainServerCommands());
const domainCheckCommands = computed(() => buildDomainCheckCommands());
const wechatH5AcceptanceLinks = computed(() => buildWechatH5AcceptanceLinks());
const wechatH5AcceptanceChecks = computed<DomainBatchCheck[]>(() => buildWechatH5AcceptanceChecks());
const wechatH5AcceptanceTemplate = computed(() => buildWechatH5AcceptanceTemplate());

const configGroups = computed(() => {
  const rows = report.value?.checks || [];
  const groups = [
    { title: "生产安全", keys: ["NODE_ENV", "JWT_SECRET", "DB_PASSWORD", "DB_SYNCHRONIZE", "VALIDATION_FORBID_NON_WHITELISTED", "SECURITY_HEADERS_ENABLED", "SECURITY_HSTS_ENABLED", "TRUST_PROXY", "ACCESS_LOG_ENABLED"] },
    { title: "域名与上传", keys: ["CORS_ORIGIN", "PUBLIC_H5_ORIGIN", "PUBLIC_ADMIN_ORIGIN", "PUBLIC_API_ORIGIN", "UPLOAD_DIR"] },
    { title: "登录与通知", keys: ["H5_AUTH_MODE", "H5_AUTH_SECRET", "SMS_PROVIDER_ENABLED", "EMAIL_PROVIDER_ENABLED", "WECHAT_MESSAGE_PROVIDER_ENABLED"] },
    {
      title: "支付与订单",
      keys: [
        "PAYMENT_SANDBOX_ENABLED",
        "PAYMENT_SANDBOX_SECRET",
        "WECHAT_PAY_SANDBOX_SECRET",
        "ALIPAY_PAY_SANDBOX_SECRET",
        "REAL_PAYMENT_ENABLED",
        "REAL_PAYMENT_SDK_IMPLEMENTED",
        "REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED",
        "REAL_REFUND_QUERY_IMPLEMENTED",
        "REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED",
        "AGENT_REAL_TRANSFER_IMPLEMENTED",
        "MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED",
        "MALL_MERCHANT_DIRECT_PAYMENT_IMPLEMENTED",
        "REAL_PAYMENT_PREFLIGHT_PASSED",
        "MULTI_TENANT_ENABLED",
        "MULTI_TENANT_SCHEMA_IMPLEMENTED",
        "MULTI_TENANT_ACCESS_FILTER_IMPLEMENTED",
        "MULTI_TENANT_PUBLIC_BOUNDARY_IMPLEMENTED",
        "MULTI_TENANT_PREFLIGHT_PASSED",
        "MALL_MULTI_MERCHANT_ENABLED",
        "MALL_MULTI_MERCHANT_PREFLIGHT_PASSED",
        "OFFLINE_PAYMENT_EXPIRE_MINUTES",
        "ORDER_CLOSE_WORKER_ENABLED"
      ]
    }
  ];
  return groups.map((group) => ({ ...group, rows: rows.filter((item) => group.keys.includes(item.key)) })).filter((group) => group.rows.length);
});

const notificationReadiness = computed<NotificationReadiness[]>(() => [
  buildNotificationReadiness("sms", "短信验证码", deployment.smsEnabled, "H5 手机号验证码依赖短信通道，上线前必须确认签名和模板已审核。", [
    ["smsProvider", "SMS_PROVIDER"],
    ["smsAccessKeyId", "SMS_ACCESS_KEY_ID"],
    ["smsAccessKeySecret", "SMS_ACCESS_KEY_SECRET"],
    ["smsSignName", "SMS_SIGN_NAME"],
    ["smsTemplateId", "SMS_TEMPLATE_ID"]
  ]),
  buildNotificationReadiness("email", "邮件通知", deployment.emailEnabled, "用于邮件通知和后续运营触达；不开启时不会阻塞 H5 验证码。", [
    ["emailProvider", "EMAIL_PROVIDER"],
    ["smtpHost", "SMTP_HOST"],
    ["smtpPort", "SMTP_PORT"],
    ["smtpUser", "SMTP_USER"],
    ["smtpPassword", "SMTP_PASSWORD"],
    ["smtpFrom", "SMTP_FROM"]
  ]),
  buildNotificationReadiness("wechat", "微信订阅消息", deployment.wechatMessageEnabled, "用于微信订阅消息触达；开启前确认小程序 AppID、密钥和模板审核状态。", [
    ["wechatMessageProvider", "WECHAT_MESSAGE_PROVIDER"],
    ["wechatAppId", "WECHAT_APP_ID"],
    ["wechatAppSecret", "WECHAT_APP_SECRET"]
  ])
]);

const domainReadiness = computed<DomainReadiness[]>(() => [
  buildDomainReadiness("h5", "H5 域名", "PUBLIC_H5_ORIGIN", deployment.h5Origin),
  buildDomainReadiness("admin", "后台域名", "PUBLIC_ADMIN_ORIGIN", deployment.adminOrigin),
  buildDomainReadiness("api", "API 域名", "PUBLIC_API_ORIGIN", deployment.apiOrigin)
]);

const releaseReadiness = computed<ReleaseReadiness[]>(() => [
  buildReleaseReadiness("version", "版本号", "APP_VERSION", deployment.appVersion),
  buildReleaseReadiness("commit", "发布提交", "BUILD_COMMIT", deployment.buildCommit),
  { key: "buildTime", label: "构建时间", envKey: "BUILD_TIME", value: "生成配置时自动写入", status: "ready", statusText: "自动生成", issues: [] }
]);

const securityReadiness = computed<SecurityReadiness[]>(() => [
  buildSecretReadiness("dbPassword", "数据库密码", "DB_PASSWORD", deployment.mysqlPassword, 12),
  buildSecretReadiness("rootPassword", "Root 密码", "MYSQL_ROOT_PASSWORD", deployment.mysqlRootPassword, 16),
  buildSecretReadiness("jwtSecret", "JWT 密钥", "JWT_SECRET", deployment.jwtSecret, 32),
  buildSecretReadiness("h5AuthSecret", "H5 登录密钥", "H5_AUTH_SECRET", deployment.h5AuthSecret, 32),
  buildBooleanReadiness("dbSynchronize", "数据库同步", "DB_SYNCHRONIZE", !deployment.dbSynchronize, "生产必须保持 false，并通过 migration 发布结构变更。"),
  buildBooleanReadiness("securityHeaders", "安全响应头", "SECURITY_HEADERS_ENABLED", deployment.securityHeadersEnabled, "生产必须开启安全响应头。"),
  buildBooleanReadiness("securityHsts", "HSTS", "SECURITY_HSTS_ENABLED", deployment.securityHstsEnabled, "HTTPS 稳定后必须开启 HSTS。"),
  buildBooleanReadiness("strictValidation", "请求字段白名单", "VALIDATION_FORBID_NON_WHITELISTED", deployment.validationForbidNonWhitelisted, "生产必须拒绝多余请求字段。"),
  buildBooleanReadiness("accessLog", "访问日志", "ACCESS_LOG_ENABLED", deployment.accessLogEnabled, "生产必须开启结构化访问日志。"),
  buildBooleanReadiness("trustProxy", "可信代理", "TRUST_PROXY", deployment.trustProxy, "Nginx 或负载均衡后必须开启真实 IP 识别。")
]);

const rolloutReadiness = computed<RolloutReadiness[]>(() => [
  buildRolloutReadiness("realPayment", "真实支付总开关", deployment.realPaymentEnabled, "打开后会把订单导向真实服务商；上线前必须完成实现标记、渠道配置和预发证据。", [
    ["realPaymentSdkImplemented", "REAL_PAYMENT_SDK_IMPLEMENTED"],
    ["realPaymentCallbackVerificationImplemented", "REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED"],
    ["realRefundQueryImplemented", "REAL_REFUND_QUERY_IMPLEMENTED"],
    ["realPaymentStatementFetchImplemented", "REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED"],
    ["mallRealWechatPaymentImplemented", "MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED"],
    ["realPaymentPreflightPassed", "REAL_PAYMENT_PREFLIGHT_PASSED"]
  ], deployment.wechatPayEnabled || deployment.alipayEnabled ? [] : ["WECHAT_PAY_ENABLED 或 ALIPAY_ENABLED"]),
  buildRolloutReadiness("wechatPay", "微信支付", deployment.wechatPayEnabled, "用于微信 Native/H5/JSAPI 真实下单、回调验签和退款/账单链路。", [
    ["wechatPayAppId", "WECHAT_PAY_APP_ID"],
    ["wechatPayMchId", "WECHAT_PAY_MCH_ID"],
    ["wechatPayApiV3Key", "WECHAT_PAY_API_V3_KEY"],
    ["wechatPayPrivateKeyPath", "WECHAT_PAY_PRIVATE_KEY_PATH"],
    ["wechatPayCertSerialNo", "WECHAT_PAY_CERT_SERIAL_NO"],
    ["wechatPayPlatformCertPath", "WECHAT_PAY_PLATFORM_CERT_PATH"],
    ["wechatPayNotifyUrl", "WECHAT_PAY_NOTIFY_URL"]
  ]),
  buildRolloutReadiness("alipay", "支付宝", deployment.alipayEnabled, "用于支付宝预创建/WAP/PAGE 真实下单、回调验签和退款/账单链路。", [
    ["alipayAppId", "ALIPAY_APP_ID"],
    ["alipayPrivateKeyPath", "ALIPAY_PRIVATE_KEY_PATH"],
    ["alipayPublicCertPath", "ALIPAY_PUBLIC_CERT_PATH"],
    ["alipayRootCertPath", "ALIPAY_ROOT_CERT_PATH"],
    ["alipayNotifyUrl", "ALIPAY_NOTIFY_URL"]
  ]),
  buildRolloutReadiness("agentTransfer", "代理真实打款", deployment.agentRealTransferImplemented, "打开前必须确认支付机构转账产品、真实请求/查询实现和代理打款预发证据。", [
    ["realPaymentEnabled", "REAL_PAYMENT_ENABLED"],
    ["realPaymentPreflightPassed", "REAL_PAYMENT_PREFLIGHT_PASSED"]
  ]),
  buildRolloutReadiness("mallWechatPay", "商城微信支付", deployment.mallRealWechatPaymentImplemented, "多商户商城使用真实微信支付前，平台代收商城订单的下单、回调、退款和账单必须完成小额预发验收。", [
    ["realPaymentEnabled", "REAL_PAYMENT_ENABLED"],
    ["wechatPayEnabled", "WECHAT_PAY_ENABLED"],
    ["realPaymentPreflightPassed", "REAL_PAYMENT_PREFLIGHT_PASSED"]
  ]),
  buildRolloutReadiness("merchantDirectPay", "店铺直收支付", deployment.mallMerchantDirectPaymentImplemented, "商家/代理店铺使用自己的微信商户号直收前，必须完成独立下单、独立回调、退款回调和店铺隔离验收。", [
    ["mallMultiMerchantPreflightPassed", "MALL_MULTI_MERCHANT_PREFLIGHT_PASSED"],
    ["mallRealWechatPaymentImplemented", "MALL_REAL_WECHAT_PAYMENT_IMPLEMENTED"],
    ["realPaymentPreflightPassed", "REAL_PAYMENT_PREFLIGHT_PASSED"]
  ]),
  buildRolloutReadiness("preflightEvidence", "预发验收结果", deployment.realPaymentPreflightPassed, "真实支付、退款、账单、代理账户路由和代理真实打款都需要留存新鲜通过记录。", [
    ["realPaymentPreflightResultFile", "REAL_PAYMENT_PREFLIGHT_RESULT_FILE"],
    ["realPaymentPreflightMaxAgeHours", "REAL_PAYMENT_PREFLIGHT_MAX_AGE_HOURS"]
  ]),
  buildRolloutReadiness("multiTenant", "多机构隔离", deployment.multiTenantEnabled, "打开后后台、公开端、支付回调和财务动作都会按机构边界运行；上线前必须完成实现标记和 A/B 预发验收。", [
    ["multiTenantSchemaImplemented", "MULTI_TENANT_SCHEMA_IMPLEMENTED"],
    ["multiTenantAccessFilterImplemented", "MULTI_TENANT_ACCESS_FILTER_IMPLEMENTED"],
    ["multiTenantPublicBoundaryImplemented", "MULTI_TENANT_PUBLIC_BOUNDARY_IMPLEMENTED"],
    ["multiTenantPreflightPassed", "MULTI_TENANT_PREFLIGHT_PASSED"]
  ]),
  buildRolloutReadiness("tenantEvidence", "多机构预发验收", deployment.multiTenantPreflightPassed, "启用多机构前必须跑通 A/B 机构后台、公开端、导出、支付边界和结算边界验收。", [
    ["multiTenantPreflightResultFile", "MULTI_TENANT_PREFLIGHT_RESULT_FILE"],
    ["multiTenantPreflightMaxAgeHours", "MULTI_TENANT_PREFLIGHT_MAX_AGE_HOURS"]
  ]),
  buildRolloutReadiness("mallMultiMerchant", "多商户商城", deployment.mallMultiMerchantEnabled, "打开后 H5/小程序会按平台型商城运营；上线前必须完成店铺授权、跨店拆单、支付、履约、结算和导出隔离验收。", [
    ["mallMultiMerchantPreflightPassed", "MALL_MULTI_MERCHANT_PREFLIGHT_PASSED"]
  ]),
  buildRolloutReadiness("mallMultiMerchantEvidence", "商城预发验收", deployment.mallMultiMerchantPreflightPassed, "开放多商户商城前必须在目标 API 执行 smoke:mall-multi-merchant 并保留新鲜通过的结果文件。", [
    ["mallMultiMerchantSmokeResultFile", "MALL_MULTI_MERCHANT_SMOKE_RESULT_FILE"],
    ["mallMultiMerchantSmokeMaxAgeHours", "MALL_MULTI_MERCHANT_SMOKE_MAX_AGE_HOURS"]
  ])
]);

function isRegistrationEnabled(value: unknown) {
  return value !== false && value !== 0 && value !== "0";
}

const uploadHeaders = () => {
  const token = localStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function beforeImageUpload(file: File) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    ElMessage.error("请上传 JPG、PNG、WebP 或 GIF 图片");
    return false;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error("图片不能超过 5MB");
    return false;
  }
  return true;
}

function handleDefaultGroupQrSuccess(response: any) {
  const data = response?.data || response;
  if (!data?.url) return ElMessage.error("上传成功但未返回图片地址");
  form.defaultGroupQrCodeUrl = data.url;
  ElMessage.success("默认入群二维码已上传");
}

function handleThemeBackgroundSuccess(response: any) {
  const data = response?.data || response;
  if (!data?.url) return ElMessage.error("上传成功但未返回图片地址");
  form.pageTheme.backgroundImage = data.url;
  ElMessage.success("H5 页面背景图已上传");
}

function handleBrandLogoSuccess(response: any) {
  const data = response?.data || response;
  if (!data?.url) return ElMessage.error("上传成功但未返回图片地址");
  form.pageTheme.brandLogoUrl = data.url;
  ElMessage.success("品牌 Logo 已上传");
}

function handleUploadError(error: Error) {
  ElMessage.error(error.message || "图片上传失败");
}

function hexToRgb(hex?: string) {
  const normalized = (hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function rgba(hex: string | undefined, opacity: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(Math.max(Number(opacity) || 0, 0), 100) / 100})`;
}

function pageThemePreviewStyle() {
  const theme = form.pageTheme;
  const overlay = rgba(theme.backgroundOverlayColor, Number(theme.backgroundOverlayOpacity || 0));
  return {
    backgroundColor: theme.backgroundColor,
    backgroundImage: theme.backgroundImage ? `linear-gradient(${overlay}, ${overlay}), url(${theme.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    color: theme.textColor
  };
}

function pageThemeCardStyle() {
  const theme = form.pageTheme;
  return {
    backgroundColor: rgba(theme.cardBackgroundColor, Number(theme.cardOpacity || 100)),
    borderRadius: `${Math.max(Number(theme.cardRadius || 0), 0)}px`,
    color: theme.textColor
  };
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 19);
}

function boolValue(value: boolean) {
  return value ? "true" : "false";
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizePublicUrl(value: string, options: { defaultPath?: string; keepInputPath?: boolean } = {}) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    const origin = `${url.protocol}//${url.host}`;
    const inputPath = trimTrailingSlash(url.pathname === "/" ? "" : url.pathname);
    const path = options.keepInputPath && inputPath ? inputPath : options.defaultPath || "";
    return trimTrailingSlash(`${origin}${path}`);
  } catch {
    return trimTrailingSlash(withScheme);
  }
}

function publicOriginOnly(value: string) {
  const normalized = normalizePublicUrl(value, { keepInputPath: true });
  if (!normalized) return "";
  try {
    const url = new URL(normalized);
    return `${url.protocol}//${url.host}`;
  } catch {
    return trimTrailingSlash(normalized);
  }
}

function uniqueCorsOrigins(values: string[]) {
  const origins: string[] = [];
  for (const value of values) {
    const origin = publicOriginOnly(value);
    if (origin && !origins.includes(origin)) origins.push(origin);
  }
  return origins.join(",");
}

function joinUrl(origin: string, path: string) {
  const base = trimTrailingSlash(origin);
  return base ? `${base}${path}` : "";
}

function buildDomainBatchPreview() {
  const singleOrigin = normalizePublicUrl(domainBatch.primaryDomain);
  const h5Origin = domainBatch.mode === "single" ? singleOrigin : normalizePublicUrl(domainBatch.h5Domain);
  const adminOrigin = domainBatch.mode === "single"
    ? normalizePublicUrl(domainBatch.primaryDomain, { defaultPath: "/admin" })
    : normalizePublicUrl(domainBatch.adminDomain, { keepInputPath: true });
  const apiOrigin = domainBatch.mode === "single" ? singleOrigin : normalizePublicUrl(domainBatch.apiDomain);
  return {
    h5Origin,
    adminOrigin,
    apiOrigin,
    corsOrigin: uniqueCorsOrigins([h5Origin, adminOrigin]),
    wechatPayNotifyUrl: joinUrl(apiOrigin, "/payment/wechat/callback"),
    alipayNotifyUrl: joinUrl(apiOrigin, "/payment/alipay/callback"),
    mallWechatPayNotifyUrl: joinUrl(apiOrigin, "/payment/mall/wechat/callback"),
    mallWechatPayRefundNotifyUrl: joinUrl(apiOrigin, "/payment/mall/wechat/refund-callback")
  };
}

function applyDomainBatch() {
  const preview = domainBatchPreview.value;
  if (!preview.h5Origin || !preview.adminOrigin || !preview.apiOrigin) return ElMessage.error("请先填写完整域名");
  deployment.h5Origin = preview.h5Origin;
  deployment.adminOrigin = preview.adminOrigin;
  deployment.apiOrigin = preview.apiOrigin;
  deployment.wechatPayNotifyUrl = preview.wechatPayNotifyUrl;
  deployment.alipayNotifyUrl = preview.alipayNotifyUrl;
  deployment.mallWechatPayNotifyUrl = preview.mallWechatPayNotifyUrl;
  deployment.mallWechatPayRefundNotifyUrl = preview.mallWechatPayRefundNotifyUrl;
  ElMessage.success("已套用到部署配置，请保存设置后生效");
}

function fillDomainBatchFromDeployment() {
  domainBatch.mode = "split";
  domainBatch.primaryDomain = "";
  domainBatch.h5Domain = deployment.h5Origin;
  domainBatch.adminDomain = deployment.adminOrigin;
  domainBatch.apiDomain = deployment.apiOrigin;
  ElMessage.success("已从当前配置回填");
}

function hasUnsafeDomainPlaceholder(value: string) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|example\.com|change-me|replace-with/i.test(value);
}

function buildLocalDomainCheck(key: string, label: string, value: string, envKey: string, allowPath = false): DomainBatchCheck {
  const target = String(value || "").trim();
  const issues: string[] = [];
  if (!target) issues.push("未填写");
  if (target && !target.startsWith("https://")) issues.push("不是 HTTPS");
  if (target && hasUnsafeDomainPlaceholder(target)) issues.push("仍是示例或本地域名");
  if (!allowPath && target) {
    try {
      const url = new URL(target);
      if (url.pathname && url.pathname !== "/") issues.push("应填写域名，不要带路径");
    } catch {
      issues.push("URL 格式不正确");
    }
  }
  return {
    key,
    label,
    target: target || envKey,
    status: issues.length ? "error" : "ok",
    message: issues.length ? issues.join("、") : "已填写真实 HTTPS 地址"
  };
}

function buildOptionalCallbackCheck(key: string, label: string, value: string, envKey: string): DomainBatchCheck {
  const target = String(value || "").trim();
  const issues: string[] = [];
  if (!target) issues.push("未填写，真实支付开启前需要补齐");
  if (target && !target.startsWith("https://")) issues.push("不是 HTTPS");
  if (target && hasUnsafeDomainPlaceholder(target)) issues.push("仍是示例或本地域名");
  return {
    key,
    label,
    target: target || envKey,
    status: !target ? "warning" : issues.length ? "error" : "ok",
    message: issues.length ? issues.join("、") : "回调地址格式正常"
  };
}

function buildLocalCorsCheck(): DomainBatchCheck {
  const target = deploymentCorsOrigin.value;
  const parts = target.split(",").map((item) => item.trim()).filter(Boolean);
  const issues: string[] = [];
  if (!parts.length) issues.push("未生成 CORS_ORIGIN");
  for (const item of parts) {
    if (!item.startsWith("https://")) issues.push(`${item} 不是 HTTPS`);
    if (hasUnsafeDomainPlaceholder(item)) issues.push(`${item} 仍是示例或本地域名`);
  }
  return {
    key: "corsOrigin",
    label: "跨域白名单",
    target: target || "CORS_ORIGIN",
    status: issues.length ? "error" : "ok",
    message: issues.length ? issues.join("、") : "已包含 H5 与后台域名"
  };
}

function shellValue(value: string) {
  return `"${String(value || "").replace(/(["\\$`])/g, "\\$1")}"`;
}

function domainCommandDraft() {
  const preview = domainBatchPreview.value;
  if (preview.h5Origin && preview.adminOrigin && preview.apiOrigin) return preview;
  return {
    h5Origin: deployment.h5Origin,
    adminOrigin: deployment.adminOrigin,
    apiOrigin: deployment.apiOrigin,
    corsOrigin: deploymentCorsOrigin.value,
    wechatPayNotifyUrl: deployment.wechatPayNotifyUrl || joinUrl(deployment.apiOrigin, "/payment/wechat/callback"),
    alipayNotifyUrl: deployment.alipayNotifyUrl || joinUrl(deployment.apiOrigin, "/payment/alipay/callback"),
    mallWechatPayNotifyUrl: deployment.mallWechatPayNotifyUrl || joinUrl(deployment.apiOrigin, "/payment/mall/wechat/callback"),
    mallWechatPayRefundNotifyUrl: deployment.mallWechatPayRefundNotifyUrl || joinUrl(deployment.apiOrigin, "/payment/mall/wechat/refund-callback")
  };
}

function buildDomainServerCommands() {
  const draft = domainCommandDraft();
  return [
    "cd /www/wwwroot/rd.chaimen666.com",
    "",
    `H5_ORIGIN=${shellValue(draft.h5Origin)}`,
    `ADMIN_ORIGIN=${shellValue(draft.adminOrigin)}`,
    `API_ORIGIN=${shellValue(draft.apiOrigin)}`,
    `CORS_ORIGIN=${shellValue(draft.corsOrigin)}`,
    `WECHAT_NOTIFY_URL=${shellValue(draft.wechatPayNotifyUrl)}`,
    `ALIPAY_NOTIFY_URL=${shellValue(draft.alipayNotifyUrl)}`,
    `MALL_WECHAT_NOTIFY_URL=${shellValue(draft.mallWechatPayNotifyUrl)}`,
    `MALL_WECHAT_REFUND_NOTIFY_URL=${shellValue(draft.mallWechatPayRefundNotifyUrl)}`,
    "COMMIT=$(git rev-parse --short HEAD)",
    "",
    "cp deploy/.env.production \"deploy/.env.production.bak.$(date +%F-%H%M%S)\"",
    "",
    "set_env() {",
    "  KEY=\"$1\"",
    "  VALUE=\"$2\"",
    "  if grep -q \"^${KEY}=\" deploy/.env.production; then",
    "    sed -i \"s|^${KEY}=.*|${KEY}=${VALUE}|\" deploy/.env.production",
    "  else",
    "    printf \"\\n%s=%s\\n\" \"$KEY\" \"$VALUE\" >> deploy/.env.production",
    "  fi",
    "}",
    "",
    "set_env BUILD_COMMIT \"$COMMIT\"",
    "set_env BUILD_TIME \"$(date -Iseconds)\"",
    "set_env CORS_ORIGIN \"$CORS_ORIGIN\"",
    "set_env PUBLIC_H5_ORIGIN \"$H5_ORIGIN\"",
    "set_env PUBLIC_ADMIN_ORIGIN \"$ADMIN_ORIGIN\"",
    "set_env PUBLIC_API_ORIGIN \"$API_ORIGIN\"",
    "set_env WECHAT_PAY_NOTIFY_URL \"$WECHAT_NOTIFY_URL\"",
    "set_env ALIPAY_NOTIFY_URL \"$ALIPAY_NOTIFY_URL\"",
    "set_env MALL_WECHAT_PAY_NOTIFY_URL \"$MALL_WECHAT_NOTIFY_URL\"",
    "set_env MALL_WECHAT_PAY_REFUND_NOTIFY_URL \"$MALL_WECHAT_REFUND_NOTIFY_URL\"",
    "",
    "grep -E \"BUILD_COMMIT|BUILD_TIME|CORS_ORIGIN|PUBLIC_H5_ORIGIN|PUBLIC_ADMIN_ORIGIN|PUBLIC_API_ORIGIN|WECHAT_PAY_NOTIFY_URL|ALIPAY_NOTIFY_URL|MALL_WECHAT_PAY_NOTIFY_URL|MALL_WECHAT_PAY_REFUND_NOTIFY_URL\" deploy/.env.production",
    "",
    "PM2=/www/server/nodejs/v22.22.3/lib/node_modules/pm2/bin/pm2",
    "export NODE_ENV=production",
    "export BUILD_COMMIT=\"$COMMIT\"",
    "export BUILD_TIME=$(date -Iseconds)",
    "export CORS_ORIGIN=\"$CORS_ORIGIN\"",
    "export PUBLIC_H5_ORIGIN=\"$H5_ORIGIN\"",
    "export PUBLIC_ADMIN_ORIGIN=\"$ADMIN_ORIGIN\"",
    "export PUBLIC_API_ORIGIN=\"$API_ORIGIN\"",
    "$PM2 restart activity-api --update-env",
    "$PM2 save",
    "curl http://127.0.0.1:3000/api/health/ready"
  ].join("\n");
}

function buildDomainCheckCommands() {
  const draft = domainCommandDraft();
  const h5Origin = draft.h5Origin || "https://new.example.com";
  const adminOrigin = draft.adminOrigin || "https://new.example.com/admin";
  const apiOrigin = draft.apiOrigin || "https://new.example.com";
  return [
    `curl -I ${shellValue(h5Origin)}`,
    `curl -I ${shellValue(adminOrigin)}`,
    `curl ${shellValue(joinUrl(apiOrigin, "/api/health/ready"))}`,
    `curl ${shellValue(joinUrl(apiOrigin, "/api/public/homepage?tenantCode=qiwai-showcase"))}`
  ].join("\n");
}

function wechatH5TenantCode() {
  return String(deployment.wechatH5AcceptanceTenantCode || "qiwai-showcase").trim() || "qiwai-showcase";
}

function buildWechatH5Link(route: string) {
  const h5Origin = trimTrailingSlash(normalizePublicUrl(deployment.h5Origin, { keepInputPath: true }) || deployment.h5Origin);
  const hashRoute = route.startsWith("/") ? route : `/${route}`;
  return h5Origin ? `${h5Origin}/?tenantCode=${encodeURIComponent(wechatH5TenantCode())}#${hashRoute}` : "";
}

function buildWechatH5AcceptanceLinks() {
  return [
    { key: "home", label: "H5 首页", url: buildWechatH5Link("/"), note: "检查微信内首页、底部导航和装修模块。" },
    { key: "activities", label: "活动列表", url: buildWechatH5Link("/pages/activity/list"), note: "从列表进入活动详情并测试分享。" },
    { key: "community", label: "共修动态", url: buildWechatH5Link("/pages/community/index"), note: "查看已审核心得和动态详情入口。" },
    { key: "publish", label: "发布心得", url: buildWechatH5Link("/pages/community/publish"), note: "登录后选择已参加活动发布心得。" },
    { key: "myPosts", label: "我的心得", url: buildWechatH5Link("/pages/user/community-posts"), note: "查看待审核、已通过和被驳回的心得。" },
    { key: "checkin", label: "今日打卡", url: buildWechatH5Link("/pages/community/checkin"), note: "补测微信内打卡页面和上传入口。" }
  ];
}

function buildWechatH5AcceptanceChecks(): DomainBatchCheck[] {
  const checks: DomainBatchCheck[] = [
    buildLocalDomainCheck("wechatH5Origin", "H5 HTTPS 域名", deployment.h5Origin, "PUBLIC_H5_ORIGIN"),
    buildLocalDomainCheck("wechatApiOrigin", "API HTTPS 域名", deployment.apiOrigin, "PUBLIC_API_ORIGIN"),
    {
      key: "wechatTenantCode",
      label: "验收租户码",
      target: wechatH5TenantCode(),
      status: deployment.wechatH5AcceptanceTenantCode ? "ok" : "warning",
      message: deployment.wechatH5AcceptanceTenantCode ? "已用于生成真机验收链接" : "未填写时默认使用 qiwai-showcase"
    },
    {
      key: "wechatManualStatus",
      label: "真机验收结论",
      target: wechatAcceptanceStatusText(deployment.wechatH5AcceptanceStatus),
      status: deployment.wechatH5AcceptanceStatus === "passed" ? "ok" : deployment.wechatH5AcceptanceStatus === "blocked" ? "error" : "warning",
      message: deployment.wechatH5AcceptanceStatus === "passed" ? "已记录通过，仍需保留截图或验收记录" : "需要在真实 iOS/Android 微信中完成长按保存、朋友圈和扫码回流"
    }
  ];
  return checks;
}

function buildWechatH5AcceptanceTemplate() {
  const links = wechatH5AcceptanceLinks.value.map((item) => `- ${item.label}：${item.url}`).join("\n");
  return [
    "微信分享与海报真机验收结论：",
    `- 验收时间：${deployment.wechatH5AcceptanceAt || ""}`,
    `- 验收环境：${deployment.h5Origin || ""}`,
    `- 验收租户：${wechatH5TenantCode()}`,
    "- iOS 机型/微信版本：",
    "- Android 机型/微信版本：",
    "- 活动标题与 id：",
    "- 心得 post id：",
    "- 登录手机号：",
    "- 活动链接分享：",
    "- 心得发布与审核：",
    "- 心得详情分享：",
    "- 海报生成：",
    "- 长按保存：",
    "- 二维码扫码回流：",
    "- 朋友圈传播：",
    "- 发现问题：",
    "- 是否阻断上线：",
    "- 处理人：",
    "",
    "验收入口：",
    links
  ].join("\n");
}

function copyWechatH5AcceptanceTemplate() {
  copyText(wechatH5AcceptanceTemplate.value, "已复制微信真机验收模板");
}

function wechatAcceptanceStatusText(status: WechatH5AcceptanceStatus) {
  const map: Record<WechatH5AcceptanceStatus, string> = {
    not_started: "未验收",
    pending: "验收中",
    passed: "已通过",
    blocked: "有阻塞"
  };
  return map[status] || "未验收";
}

function wechatAcceptanceType(status: WechatH5AcceptanceStatus) {
  if (status === "passed") return "success";
  if (status === "blocked") return "danger";
  if (status === "pending") return "warning";
  return "info";
}

async function copyText(text: string, successMessage: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      ElMessage.success(successMessage);
      return;
    }
  } catch {
    // HTTP dev environments may reject navigator.clipboard; fall back below.
  }
  if (fallbackCopyText(text)) return ElMessage.success(successMessage);
  ElMessage.error("复制失败，请手动复制");
}

function fallbackCopyText(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
}

function copyDomainServerCommands() {
  copyText(domainServerCommands.value, "已复制服务器修改命令");
}

function copyDomainCheckCommands() {
  copyText(domainCheckCommands.value, "已复制验证命令");
}

function checkType(status: DomainBatchCheck["status"]) {
  if (status === "ok") return "success";
  if (status === "warning" || status === "checking") return "warning";
  if (status === "error") return "danger";
  return "info";
}

async function probeUrl(url: string, options: { label: string; expectJson?: boolean }): Promise<DomainBatchCheck> {
  if (!url) return { key: options.label, label: options.label, target: "-", status: "error", message: "未填写地址" };
  try {
    const response = await fetch(url, { cache: "no-store", mode: "cors" });
    if (options.expectJson) {
      const body = await response.json().catch(() => null);
      const ready = body?.code === 0 && (body?.data?.ready === true || body?.data?.api === "up");
      return {
        key: options.label,
        label: options.label,
        target: url,
        status: response.ok && ready ? "ok" : "warning",
        message: response.ok && ready ? "API ready 已通过" : `已响应但 ready 状态需确认：HTTP ${response.status}`
      };
    }
    return {
      key: options.label,
      label: options.label,
      target: url,
      status: response.ok ? "ok" : "warning",
      message: response.ok ? `HTTP ${response.status} 可访问` : `已响应但状态为 HTTP ${response.status}`
    };
  } catch {
    try {
      await fetch(url, { cache: "no-store", mode: "no-cors" });
      return {
        key: options.label,
        label: options.label,
        target: url,
        status: "warning",
        message: "浏览器因跨域无法读取状态，但请求未被网络层拒绝；请再用 curl 验证"
      };
    } catch {
      return {
        key: options.label,
        label: options.label,
        target: url,
        status: "error",
        message: "浏览器无法访问，请检查 DNS、SSL、Nginx 或防火墙"
      };
    }
  }
}

async function runDomainReachabilityChecks() {
  domainCheckLoading.value = true;
  domainReachabilityChecks.value = [
    { key: "h5", label: "H5 首页", target: deployment.h5Origin, status: "checking", message: "检测中" },
    { key: "admin", label: "后台入口", target: deployment.adminOrigin, status: "checking", message: "检测中" },
    { key: "api", label: "API Ready", target: joinUrl(deployment.apiOrigin, "/api/health/ready"), status: "checking", message: "检测中" }
  ];
  try {
    domainReachabilityChecks.value = await Promise.all([
      probeUrl(deployment.h5Origin, { label: "H5 首页" }),
      probeUrl(deployment.adminOrigin, { label: "后台入口" }),
      probeUrl(joinUrl(deployment.apiOrigin, "/api/health/ready"), { label: "API Ready", expectJson: true })
    ]);
  } finally {
    domainCheckLoading.value = false;
  }
}

function hasDeploymentValue(field: keyof typeof deployment) {
  const value = deployment[field];
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function hasRolloutValue(field: keyof typeof deployment) {
  const value = deployment[field];
  if (typeof value === "boolean") return value;
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function buildNotificationReadiness(
  key: string,
  label: string,
  enabled: boolean,
  description: string,
  requiredFields: Array<[keyof typeof deployment, string]>
): NotificationReadiness {
  if (!enabled) return { key, label, enabled, status: "disabled", statusText: "已关闭", description, missing: [] };
  const missing = requiredFields.filter(([field]) => !hasDeploymentValue(field)).map(([, envKey]) => envKey);
  return {
    key,
    label,
    enabled,
    status: missing.length ? "missing" : "ready",
    statusText: missing.length ? "缺配置" : "已就绪",
    description,
    missing
  };
}

function readinessType(status: NotificationReadiness["status"] | RolloutReadiness["status"]) {
  if (status === "ready") return "success";
  if (status === "missing") return "danger";
  return "info";
}

function buildRolloutReadiness(
  key: string,
  label: string,
  enabled: boolean,
  description: string,
  requiredFields: Array<[keyof typeof deployment, string]>,
  extraMissing: string[] = []
): RolloutReadiness {
  if (!enabled) return { key, label, status: "disabled", statusText: "已关闭", description, missing: [] };
  const missing = requiredFields.filter(([field]) => !hasRolloutValue(field)).map(([, envKey]) => envKey);
  return {
    key,
    label,
    status: missing.length || extraMissing.length ? "missing" : "ready",
    statusText: missing.length || extraMissing.length ? "缺配置" : "可预发验证",
    description,
    missing: [...missing, ...extraMissing]
  };
}

function buildDomainReadiness(key: string, label: string, envKey: string, value: string): DomainReadiness {
  const text = String(value || "").trim();
  const issues: string[] = [];
  if (!text) issues.push("未填写");
  if (text && !text.startsWith("https://")) issues.push("必须使用 HTTPS");
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0|example\.com/i.test(text)) issues.push("仍是示例或本地域名");
  return {
    key,
    label,
    envKey,
    value: text || "-",
    status: issues.length ? "invalid" : "ready",
    statusText: issues.length ? "需替换" : "真实 HTTPS",
    issues
  };
}

function domainType(status: DomainReadiness["status"]) {
  return status === "ready" ? "success" : "danger";
}

function buildReleaseReadiness(key: string, label: string, envKey: string, value: string): ReleaseReadiness {
  const text = String(value || "").trim();
  const issues: string[] = [];
  if (!text) issues.push("未填写");
  if (/^(local|unknown)$/i.test(text) || /change-me|replace-with/i.test(text)) issues.push("仍是占位值");
  return {
    key,
    label,
    envKey,
    value: text || "-",
    status: issues.length ? "invalid" : "ready",
    statusText: issues.length ? "需替换" : "已填写",
    issues
  };
}

function releaseType(status: ReleaseReadiness["status"]) {
  return status === "ready" ? "success" : "danger";
}

function buildSecretReadiness(key: string, label: string, envKey: string, value: string, minLength: number): SecurityReadiness {
  const length = String(value || "").trim().length;
  const ready = length >= minLength;
  return {
    key,
    label,
    envKey,
    status: ready ? "ready" : "invalid",
    statusText: ready ? "强度足够" : "需生成",
    detail: ready ? `已填写，长度 ${length} 位。` : `至少需要 ${minLength} 位随机值。`
  };
}

function buildBooleanReadiness(key: string, label: string, envKey: string, ready: boolean, detail: string): SecurityReadiness {
  return {
    key,
    label,
    envKey,
    status: ready ? "ready" : "invalid",
    statusText: ready ? "已符合" : "需调整",
    detail
  };
}

function securityType(status: SecurityReadiness["status"]) {
  return status === "ready" ? "success" : "danger";
}

function quoteEnv(value: unknown) {
  const text = String(value ?? "");
  if (!text) return "";
  return /[\s#"'\\]/.test(text) ? JSON.stringify(text) : text;
}

function envLine(key: string, value: unknown) {
  return `${key}=${quoteEnv(value)}`;
}

function randomSecret(length = 48) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function fillSecrets() {
  deployment.mysqlPassword ||= randomSecret(24);
  deployment.mysqlRootPassword ||= randomSecret(28);
  deployment.jwtSecret ||= randomSecret(48);
  deployment.h5AuthSecret ||= randomSecret(48);
  deployment.paymentSandboxSecret ||= randomSecret(40);
  deployment.wechatPaySandboxSecret ||= randomSecret(40);
  deployment.alipayPaySandboxSecret ||= randomSecret(40);
  ElMessage.success("已生成随机密钥，请妥善保存");
}

async function copyGeneratedEnv() {
  try {
    await navigator.clipboard.writeText(generatedEnv.value);
    ElMessage.success("已复制生产环境配置");
  } catch {
    ElMessage.error("复制失败，请手动复制下方内容");
  }
}

function downloadGeneratedEnv() {
  const blob = new Blob([generatedEnv.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = ".env.production";
  link.click();
  URL.revokeObjectURL(url);
}

function applyDeploymentConfig(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const input = value as Record<string, unknown>;
  for (const key of Object.keys(deployment) as Array<keyof typeof deployment>) {
    if (input[key] !== undefined && input[key] !== null) {
      (deployment as Record<string, unknown>)[key] = input[key];
    }
  }
}

function deploymentPayload() {
  const payload: Record<string, unknown> = {};
  for (const key of Object.keys(deployment) as Array<keyof typeof deployment>) {
    payload[key] = deployment[key];
  }
  return payload;
}

async function loadOperation() {
  loadingOperation.value = true;
  try {
    const data = await api.get<any, any>("/admin/settings/operation");
    Object.assign(form, {
      registrationEnabled: isRegistrationEnabled(data.registrationEnabled),
      registrationDisabledMessage: data.registrationDisabledMessage || "报名通道暂时关闭，请稍后再试或联系主办方。",
      offlinePaymentInstructions: data.offlinePaymentInstructions || "",
      paymentMethods: { free: true, wechat: false, alipay: false, balance: true, offline: true, ...(data.paymentMethods || {}) },
      customerServiceName: data.customerServiceName || "",
      customerServicePhone: data.customerServicePhone || "",
      customerServiceWechat: data.customerServiceWechat || "",
      defaultGroupQrCodeUrl: data.defaultGroupQrCodeUrl || "",
      pageTheme: { ...defaultPageTheme, ...(data.pageTheme || {}) },
      refundInstructions: data.refundInstructions || "",
      invoiceInstructions: data.invoiceInstructions || "",
      smsProviderEnabled: Boolean(data.smsProviderEnabled),
      smsProvider: data.smsProvider || "tencent-cloud-sms",
      smsAccessKeyId: data.smsAccessKeyId || "",
      smsAccessKeySecret: data.smsAccessKeySecret || "",
      smsSignName: data.smsSignName || "",
      smsTemplateId: data.smsTemplateId || ""
    });
    if (canManagePlatformSettings.value) {
      applyDeploymentConfig({
        smsEnabled: Boolean(data.smsProviderEnabled),
        smsProvider: data.smsProvider || deployment.smsProvider,
        smsAccessKeyId: data.smsAccessKeyId || "",
        smsAccessKeySecret: data.smsAccessKeySecret || "",
        smsSignName: data.smsSignName || "",
        smsTemplateId: data.smsTemplateId || ""
      });
      applyDeploymentConfig(data.launchConfig || {});
    }
  } finally {
    loadingOperation.value = false;
  }
}

async function saveOperation() {
  if (!form.registrationEnabled && !form.registrationDisabledMessage.trim()) return ElMessage.error("请填写暂停报名提示");
  if (paymentSettingsEditable.value && !form.offlinePaymentInstructions.trim()) return ElMessage.error("请填写线下付款说明");
  if (paymentSettingsEditable.value && !form.refundInstructions.trim()) return ElMessage.error("请填写退款说明");
  savingOperation.value = true;
  try {
    const payload = canManagePlatformSettings.value ? { ...form, launchConfig: deploymentPayload() } : form;
    await api.post("/admin/settings/operation", payload);
    ElMessage.success("系统设置已保存");
    await loadOperation();
    if (canManagePlatformSettings.value) await loadConfig();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    savingOperation.value = false;
  }
}

async function refreshTenantSettings() {
  if (canManagePlatformSettings.value) return;
  try {
    const data = await api.get<any, any>("/admin/mobile/bootstrap");
    const settings = data?.admin?.tenant?.settings;
    if (settings) {
      localStorage.setItem("admin_tenant_settings", JSON.stringify(settings));
      tenantSettings.value = currentTenantSettings();
    }
  } catch {
    tenantSettings.value = currentTenantSettings();
  }
}

async function loadConfig() {
  if (!canManagePlatformSettings.value) return;
  loadingConfig.value = true;
  try {
    report.value = await api.get<any, ConfigInspection>("/admin/system/config-check");
  } catch (error: any) {
    ElMessage.error(error.message || "加载上线体检失败");
  } finally {
    loadingConfig.value = false;
  }
}

function go(path: string) {
  router.push(path);
}

onMounted(async () => {
  await refreshTenantSettings();
  loadOperation();
  if (canManagePlatformSettings.value) loadConfig();
});
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div>
        <h2>{{ canManagePlatformSettings ? "系统设置" : "运营设置" }}</h2>
        <p class="subtitle">
          {{ canManagePlatformSettings ? "集中管理平台运营开关、部署配置、上线体检和关键管理入口。" : "配置本商家的报名开关、收款说明、客服信息、入群二维码和 H5 页面主题。" }}
        </p>
      </div>
      <div class="toolbar-actions">
        <el-button @click="loadOperation">刷新设置</el-button>
        <el-button type="primary" :loading="savingOperation" @click="saveOperation">保存设置</el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="system-tabs">
      <el-tab-pane label="运营设置" name="operation">
        <div class="table-card" v-loading="loadingOperation">
          <el-alert
            type="info"
            title="这里的内容保存后立即影响 H5 和报名流程。入群二维码优先使用活动配置，活动未配置时使用全局默认二维码。"
            show-icon
            :closable="false"
            class="panel-alert"
          />
          <el-alert
            v-if="paymentSettingsReadonlyReason"
            type="warning"
            :title="paymentSettingsReadonlyReason"
            show-icon
            :closable="false"
            class="panel-alert"
          />
          <el-form label-width="128px" class="setting-form">
            <el-form-item label="报名通道">
              <div class="switch-row">
                <el-switch v-model="form.registrationEnabled" active-text="允许新报名" inactive-text="暂停新报名" />
                <el-tag :type="form.registrationEnabled ? 'success' : 'warning'" effect="plain">
                  {{ form.registrationEnabled ? "用户可正常提交报名" : "用户只能浏览活动，不能提交新报名" }}
                </el-tag>
              </div>
            </el-form-item>
            <el-form-item label="暂停提示" :required="!form.registrationEnabled">
              <el-input v-model="form.registrationDisabledMessage" type="textarea" :rows="3" maxlength="300" show-word-limit />
            </el-form-item>
            <el-form-item label="线下付款说明" required>
              <el-input v-model="form.offlinePaymentInstructions" type="textarea" :rows="5" maxlength="1000" show-word-limit :disabled="!paymentSettingsEditable" />
            </el-form-item>
            <el-form-item label="支付方式">
              <div class="payment-methods-block">
                <div class="payment-methods">
                  <el-checkbox v-model="form.paymentMethods.free" :disabled="!paymentSettingsEditable">免费报名</el-checkbox>
                  <el-checkbox v-model="form.paymentMethods.wechat" :disabled="!paymentSettingsEditable">微信支付</el-checkbox>
                  <el-checkbox v-model="form.paymentMethods.alipay" :disabled="!paymentSettingsEditable">支付宝</el-checkbox>
                  <el-checkbox v-model="form.paymentMethods.balance" :disabled="!paymentSettingsEditable">余额支付</el-checkbox>
                  <el-checkbox v-model="form.paymentMethods.offline" :disabled="!paymentSettingsEditable">线下收款 / 人工确认</el-checkbox>
                </div>
                <div class="payment-readiness">
                  <div v-for="item in paymentReadiness" :key="item.key" class="payment-readiness-card">
                    <div>
                      <strong>{{ item.label }}</strong>
                      <span>{{ item.note }}</span>
                    </div>
                    <el-tag :type="item.type as any" effect="plain">{{ item.status }}</el-tag>
                  </div>
                </div>
                <p class="form-tip">关闭某个支付方式后，前端报名页不再展示，后端也会拒绝直接调用该支付方式。</p>
              </div>
            </el-form-item>
            <el-form-item label="客服名称">
              <el-input v-model="form.customerServiceName" maxlength="100" />
            </el-form-item>
            <el-form-item label="客服电话">
              <el-input v-model="form.customerServicePhone" maxlength="40" />
            </el-form-item>
            <el-form-item label="客服微信">
              <el-input v-model="form.customerServiceWechat" maxlength="80" />
            </el-form-item>
            <el-form-item label="默认入群二维码">
              <div class="qr-field">
                <el-input v-model="form.defaultGroupQrCodeUrl" placeholder="活动未配置二维码时使用；不填则报名后不显示入群二维码" />
                <el-upload action="/api/admin/uploads/images" name="file" :headers="uploadHeaders()" :show-file-list="false" :before-upload="beforeImageUpload" :on-success="handleDefaultGroupQrSuccess" :on-error="handleUploadError">
                  <el-button :icon="UploadFilled">上传二维码</el-button>
                </el-upload>
                <img v-if="form.defaultGroupQrCodeUrl" class="qr-preview" :src="form.defaultGroupQrCodeUrl" alt="默认入群二维码预览" />
              </div>
            </el-form-item>
            <el-divider content-position="left">短信验证码服务</el-divider>
            <el-form-item label="短信服务">
              <div class="switch-row">
                <el-switch v-model="form.smsProviderEnabled" active-text="启用" inactive-text="关闭" />
                <el-tag :type="form.smsProviderEnabled ? 'success' : 'info'" effect="plain">
                  {{ form.smsProviderEnabled ? "H5 登录验证码将使用下方服务商配置" : "未启用时，H5 验证码发送会提示先配置短信服务" }}
                </el-tag>
              </div>
            </el-form-item>
            <el-form-item label="短信服务商">
              <el-input v-model="form.smsProvider" placeholder="tencent-cloud-sms / aliyun-sms" maxlength="80" />
            </el-form-item>
            <el-form-item label="AccessKey ID">
              <el-input v-model="form.smsAccessKeyId" maxlength="120" autocomplete="off" />
            </el-form-item>
            <el-form-item label="AccessKey Secret">
              <el-input v-model="form.smsAccessKeySecret" show-password maxlength="200" autocomplete="new-password" />
            </el-form-item>
            <el-form-item label="短信签名">
              <el-input v-model="form.smsSignName" maxlength="100" />
            </el-form-item>
            <el-form-item label="模板 ID">
              <el-input v-model="form.smsTemplateId" maxlength="120" />
            </el-form-item>
            <el-form-item label="H5 页面主题">
              <div class="theme-panel">
                <div class="theme-controls">
                  <div class="brand-setting-card">
                    <div class="brand-setting-head">
                      <strong>品牌名称与 Logo</strong>
                      <span>保存后用于 H5 顶部导航、浏览器标题、首页标题、我的页文案和后台识别。小程序需重新上传审核后生效。</span>
                    </div>
                    <div class="brand-setting-grid">
                      <el-input v-model="form.pageTheme.brandName" placeholder="前台品牌名称，例如：慢π" maxlength="40" />
                      <el-input v-model="form.pageTheme.brandSlogan" placeholder="品牌副标题/口号" maxlength="80" />
                      <el-input v-model="form.pageTheme.adminTitle" placeholder="后台显示名称，留空使用商家/平台名称" maxlength="40" />
                    </div>
                    <div class="theme-upload">
                      <el-input v-model="form.pageTheme.brandLogoUrl" placeholder="Logo 图片地址，建议正方形透明 PNG" />
                      <el-upload action="/api/admin/uploads/images" name="file" :headers="uploadHeaders()" :show-file-list="false" :before-upload="beforeImageUpload" :on-success="handleBrandLogoSuccess" :on-error="handleUploadError">
                        <el-button :icon="UploadFilled">上传 Logo</el-button>
                      </el-upload>
                      <el-button v-if="form.pageTheme.brandLogoUrl" @click="form.pageTheme.brandLogoUrl = ''">移除</el-button>
                    </div>
                    <img v-if="form.pageTheme.brandLogoUrl" class="brand-logo-preview" :src="form.pageTheme.brandLogoUrl" alt="品牌 Logo 预览" />
                  </div>
                  <div class="theme-grid">
                    <label><span>页面底色</span><el-color-picker v-model="form.pageTheme.backgroundColor" /></label>
                    <label><span>文字颜色</span><el-color-picker v-model="form.pageTheme.textColor" /></label>
                    <label><span>辅助文字</span><el-color-picker v-model="form.pageTheme.mutedColor" /></label>
                    <label><span>品牌主色</span><el-color-picker v-model="form.pageTheme.primaryColor" /></label>
                    <label><span>卡片底色</span><el-color-picker v-model="form.pageTheme.cardBackgroundColor" /></label>
                    <label><span>遮罩颜色</span><el-color-picker v-model="form.pageTheme.backgroundOverlayColor" /></label>
                  </div>
                  <div class="theme-upload">
                    <el-input v-model="form.pageTheme.backgroundImage" placeholder="背景图地址，留空则只使用底色" />
                    <el-upload action="/api/admin/uploads/images" name="file" :headers="uploadHeaders()" :show-file-list="false" :before-upload="beforeImageUpload" :on-success="handleThemeBackgroundSuccess" :on-error="handleUploadError">
                      <el-button :icon="UploadFilled">上传背景图</el-button>
                    </el-upload>
                    <el-button v-if="form.pageTheme.backgroundImage" @click="form.pageTheme.backgroundImage = ''">移除</el-button>
                  </div>
                  <div class="theme-sliders">
                    <div>
                      <span>背景遮罩透明度 {{ form.pageTheme.backgroundOverlayOpacity }}%</span>
                      <el-slider v-model="form.pageTheme.backgroundOverlayOpacity" :min="0" :max="90" />
                    </div>
                    <div>
                      <span>卡片透明度 {{ form.pageTheme.cardOpacity }}%</span>
                      <el-slider v-model="form.pageTheme.cardOpacity" :min="40" :max="100" />
                    </div>
                    <div>
                      <span>卡片圆角</span>
                      <el-input-number v-model="form.pageTheme.cardRadius" :min="0" :max="24" controls-position="right" />
                    </div>
                  </div>
                </div>
                <div class="theme-preview" :style="pageThemePreviewStyle()">
                  <div class="theme-phone-card" :style="pageThemeCardStyle()">
                    <img v-if="form.pageTheme.brandLogoUrl" class="theme-logo" :src="form.pageTheme.brandLogoUrl" alt="Logo" />
                    <strong>{{ form.pageTheme.brandName || "慢π" }}</strong>
                    <span>{{ form.pageTheme.brandSlogan || "页面背景、卡片透明度和文字颜色会同步到 H5 主要页面。" }}</span>
                    <button :style="{ background: form.pageTheme.primaryColor }">立即报名</button>
                  </div>
                </div>
              </div>
            </el-form-item>
            <el-form-item label="退款说明" required>
              <el-input v-model="form.refundInstructions" type="textarea" :rows="4" maxlength="1000" show-word-limit :disabled="!paymentSettingsEditable" />
            </el-form-item>
            <el-form-item label="发票说明">
              <el-input v-model="form.invoiceInstructions" type="textarea" :rows="3" maxlength="1000" show-word-limit :disabled="!paymentSettingsEditable" />
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <el-tab-pane v-if="canManagePlatformSettings" label="部署配置" name="deployment">
        <el-alert
          type="info"
          title="部署级资料会保存到后台，用于上线体检和商城支付就绪检查；右侧仍可生成 deploy/.env.production 作为部署兜底。"
          show-icon
          :closable="false"
          class="panel-alert"
        />
        <div class="deploy-layout">
          <div class="deploy-form">
            <div class="table-card deploy-card domain-batch-card">
              <div class="card-title-row">
                <div>
                  <div class="card-title">域名批量修改</div>
                  <p class="form-tip">后台只负责填充配置、生成命令和做可访问性检测；DNS、SSL、Nginx 和 PM2 重启仍需在服务器执行。</p>
                </div>
                <div class="preview-actions">
                  <el-button @click="fillDomainBatchFromDeployment">从当前配置回填</el-button>
                  <el-button type="primary" @click="applyDomainBatch">套用到全站</el-button>
                </div>
              </div>
              <el-alert
                type="warning"
                title="安全提示：这里不会直接修改服务器文件，也不会重启 API，避免错误域名导致后台无法访问。复制命令到服务器确认后再执行。"
                show-icon
                :closable="false"
                class="panel-alert"
              />
              <div class="domain-batch-grid">
                <div class="domain-batch-controls">
                  <el-form label-width="104px">
                    <el-form-item label="部署模式">
                      <el-radio-group v-model="domainBatch.mode">
                        <el-radio-button label="single">同域名部署</el-radio-button>
                        <el-radio-button label="split">拆分域名</el-radio-button>
                      </el-radio-group>
                    </el-form-item>
                    <template v-if="domainBatch.mode === 'single'">
                      <el-form-item label="主域名">
                        <el-input v-model="domainBatch.primaryDomain" placeholder="new.example.com" clearable />
                      </el-form-item>
                      <p class="form-tip">将自动生成 H5 根路径、后台 /admin、API 同域名 /api，以及支付回调地址。</p>
                    </template>
                    <template v-else>
                      <el-form-item label="H5 域名">
                        <el-input v-model="domainBatch.h5Domain" placeholder="h5.example.com" clearable />
                      </el-form-item>
                      <el-form-item label="后台域名">
                        <el-input v-model="domainBatch.adminDomain" placeholder="admin.example.com 或 admin.example.com/admin" clearable />
                      </el-form-item>
                      <el-form-item label="API 域名">
                        <el-input v-model="domainBatch.apiDomain" placeholder="api.example.com" clearable />
                      </el-form-item>
                    </template>
                  </el-form>
                  <div class="domain-command-actions">
                    <el-button type="primary" plain @click="copyDomainServerCommands">复制服务器修改命令</el-button>
                    <el-button plain @click="copyDomainCheckCommands">复制验证命令</el-button>
                    <el-button :loading="domainCheckLoading" @click="runDomainReachabilityChecks">检测当前配置</el-button>
                  </div>
                </div>
                <div class="domain-preview-table">
                  <div class="mini-table-title">将写入的关键配置</div>
                  <div v-for="item in domainBatchPreviewRows" :key="item.key" class="domain-preview-row">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.envKey }}</strong>
                    <code>{{ item.value }}</code>
                  </div>
                </div>
              </div>
              <div class="domain-check-section">
                <div>
                  <div class="mini-table-title">当前配置体检</div>
                  <div class="domain-check-grid">
                    <div v-for="item in domainConfigChecks" :key="item.key" class="domain-check-card">
                      <div class="domain-check-head">
                        <strong>{{ item.label }}</strong>
                        <el-tag :type="checkType(item.status)">{{ item.status === "ok" ? "正常" : item.status === "warning" ? "待确认" : "需处理" }}</el-tag>
                      </div>
                      <code>{{ item.target }}</code>
                      <span>{{ item.message }}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div class="mini-table-title">浏览器可访问性检测</div>
                  <div class="domain-check-grid">
                    <div v-for="item in domainReachabilityChecks" :key="item.label" class="domain-check-card">
                      <div class="domain-check-head">
                        <strong>{{ item.label }}</strong>
                        <el-tag :type="checkType(item.status)">{{ item.status === "checking" ? "检测中" : item.status === "ok" ? "通过" : item.status === "warning" ? "待确认" : "失败" }}</el-tag>
                      </div>
                      <code>{{ item.target }}</code>
                      <span>{{ item.message }}</span>
                    </div>
                    <div v-if="!domainReachabilityChecks.length" class="domain-empty-check">
                      点击“检测当前配置”后，会检查 H5、后台和 API Ready。跨域导致浏览器无法读取状态时，请使用右侧生成的 curl 命令复核。
                    </div>
                  </div>
                </div>
              </div>
              <div class="domain-command-grid">
                <div>
                  <div class="mini-table-title">服务器修改命令</div>
                  <el-input class="env-textarea" type="textarea" :rows="16" :model-value="domainServerCommands" readonly />
                </div>
                <div>
                  <div class="mini-table-title">验证命令</div>
                  <el-input class="env-textarea" type="textarea" :rows="16" :model-value="domainCheckCommands" readonly />
                </div>
              </div>
            </div>

            <div class="table-card deploy-card wechat-acceptance-card">
              <div class="card-title-row">
                <div>
                  <div class="card-title">微信 H5 真机验收</div>
                  <p class="form-tip">用于上线前在真实 iOS/Android 微信里检查活动分享、心得发布、海报长按保存、二维码扫码回流和朋友圈传播。</p>
                </div>
                <div class="preview-actions">
                  <el-tag :type="wechatAcceptanceType(deployment.wechatH5AcceptanceStatus)">{{ wechatAcceptanceStatusText(deployment.wechatH5AcceptanceStatus) }}</el-tag>
                  <el-button type="primary" plain @click="copyWechatH5AcceptanceTemplate">复制验收模板</el-button>
                </div>
              </div>
              <el-alert
                type="warning"
                title="真机微信验收必须使用真实 HTTPS 域名和手机微信；桌面浏览器只能验证页面和海报生成，不能替代长按保存、朋友圈卡片和扫码回流。"
                show-icon
                :closable="false"
                class="panel-alert"
              />
              <div class="domain-check-grid">
                <div v-for="item in wechatH5AcceptanceChecks" :key="item.key" class="domain-check-card">
                  <div class="domain-check-head">
                    <strong>{{ item.label }}</strong>
                    <el-tag :type="checkType(item.status)">{{ item.status === "ok" ? "正常" : item.status === "warning" ? "待确认" : "需处理" }}</el-tag>
                  </div>
                  <code>{{ item.target }}</code>
                  <span>{{ item.message }}</span>
                </div>
              </div>
              <div class="deploy-grid wechat-acceptance-form">
                <el-form-item label="验收租户码"><el-input v-model="deployment.wechatH5AcceptanceTenantCode" placeholder="qiwai-showcase" /></el-form-item>
                <el-form-item label="验收状态">
                  <el-select v-model="deployment.wechatH5AcceptanceStatus">
                    <el-option label="未验收" value="not_started" />
                    <el-option label="验收中" value="pending" />
                    <el-option label="已通过" value="passed" />
                    <el-option label="有阻塞" value="blocked" />
                  </el-select>
                </el-form-item>
                <el-form-item label="验收时间"><el-input v-model="deployment.wechatH5AcceptanceAt" placeholder="例如：2026-06-24 10:30" /></el-form-item>
                <el-form-item label="验收备注" class="wechat-remark-field">
                  <el-input v-model="deployment.wechatH5AcceptanceRemark" type="textarea" :rows="3" maxlength="600" show-word-limit placeholder="记录 iOS/Android 机型、微信版本、发现问题和处理结论" />
                </el-form-item>
              </div>
              <div class="wechat-link-section">
                <div class="mini-table-title">真机验收入口</div>
                <div class="wechat-link-list">
                  <div v-for="item in wechatH5AcceptanceLinks" :key="item.key" class="wechat-link-row">
                    <div>
                      <strong>{{ item.label }}</strong>
                      <span>{{ item.note }}</span>
                    </div>
                    <code>{{ item.url || "-" }}</code>
                    <el-button plain :disabled="!item.url" @click="copyText(item.url, '已复制验收链接')">复制</el-button>
                  </div>
                </div>
              </div>
              <div class="wechat-template-preview">
                <div class="mini-table-title">验收记录模板</div>
                <el-input class="env-textarea" type="textarea" :rows="12" :model-value="wechatH5AcceptanceTemplate" readonly />
              </div>
            </div>

            <div class="table-card deploy-card">
              <div class="card-title">域名与基础信息</div>
              <div class="release-readiness">
                <div v-for="item in releaseReadiness" :key="item.key" class="release-card">
                  <div class="release-head">
                    <strong>{{ item.label }}</strong>
                    <el-tag :type="releaseType(item.status)">{{ item.statusText }}</el-tag>
                  </div>
                  <span>{{ item.envKey }}</span>
                  <p>{{ item.value }}</p>
                  <small v-if="item.issues.length">{{ item.issues.join("、") }}</small>
                  <small v-else>可用于上线体检、健康检查和回滚定位。</small>
                </div>
              </div>
              <div class="domain-readiness">
                <div v-for="item in domainReadiness" :key="item.key" class="domain-card">
                  <div class="domain-head">
                    <strong>{{ item.label }}</strong>
                    <el-tag :type="domainType(item.status)">{{ item.statusText }}</el-tag>
                  </div>
                  <span>{{ item.envKey }}</span>
                  <p>{{ item.value }}</p>
                  <small v-if="item.issues.length">{{ item.issues.join("、") }}</small>
                  <small v-else>可用于生产 CORS、公开入口和回调地址。</small>
                </div>
              </div>
              <div class="deploy-grid">
                <el-form-item label="版本号"><el-input v-model="deployment.appVersion" /></el-form-item>
                <el-form-item label="发布提交"><el-input v-model="deployment.buildCommit" placeholder="Git commit、镜像 digest 或发布流水号" /></el-form-item>
                <el-form-item label="H5 域名"><el-input v-model="deployment.h5Origin" placeholder="https://h5.example.com" /></el-form-item>
                <el-form-item label="后台域名"><el-input v-model="deployment.adminOrigin" placeholder="https://admin.example.com" /></el-form-item>
                <el-form-item label="API 域名"><el-input v-model="deployment.apiOrigin" placeholder="https://api.example.com" /></el-form-item>
                <el-form-item label="上传目录"><el-input v-model="deployment.uploadDir" /></el-form-item>
              </div>
            </div>

            <div class="table-card deploy-card">
              <div class="card-title-row">
                <div class="card-title">数据库与安全密钥</div>
                <el-button type="primary" plain @click="fillSecrets">生成随机密钥</el-button>
              </div>
              <div class="security-readiness">
                <div v-for="item in securityReadiness" :key="item.key" class="security-card">
                  <div class="security-head">
                    <strong>{{ item.label }}</strong>
                    <el-tag :type="securityType(item.status)">{{ item.statusText }}</el-tag>
                  </div>
                  <span>{{ item.envKey }}</span>
                  <p>{{ item.detail }}</p>
                </div>
              </div>
              <div class="deploy-grid">
                <el-form-item label="数据库名"><el-input v-model="deployment.mysqlDatabase" /></el-form-item>
                <el-form-item label="数据库用户"><el-input v-model="deployment.mysqlUser" /></el-form-item>
                <el-form-item label="数据库密码"><el-input v-model="deployment.mysqlPassword" show-password /></el-form-item>
                <el-form-item label="Root 密码"><el-input v-model="deployment.mysqlRootPassword" show-password /></el-form-item>
                <el-form-item label="JWT 密钥"><el-input v-model="deployment.jwtSecret" show-password /></el-form-item>
                <el-form-item label="H5 登录密钥"><el-input v-model="deployment.h5AuthSecret" show-password /></el-form-item>
                <el-form-item label="DB 同步"><el-switch v-model="deployment.dbSynchronize" active-text="开启" inactive-text="关闭" /></el-form-item>
                <el-form-item label="可信代理"><el-switch v-model="deployment.trustProxy" active-text="开启" inactive-text="关闭" /></el-form-item>
                <el-form-item label="安全响应头"><el-switch v-model="deployment.securityHeadersEnabled" active-text="开启" inactive-text="关闭" /></el-form-item>
                <el-form-item label="HSTS"><el-switch v-model="deployment.securityHstsEnabled" active-text="开启" inactive-text="关闭" /></el-form-item>
                <el-form-item label="字段白名单"><el-switch v-model="deployment.validationForbidNonWhitelisted" active-text="开启" inactive-text="关闭" /></el-form-item>
                <el-form-item label="访问日志"><el-switch v-model="deployment.accessLogEnabled" active-text="开启" inactive-text="关闭" /></el-form-item>
              </div>
            </div>

            <div class="table-card deploy-card">
              <div class="card-title">通知、支付与任务</div>
              <div class="notification-readiness">
                <div v-for="item in notificationReadiness" :key="item.key" class="readiness-card">
                  <div class="readiness-head">
                    <strong>{{ item.label }}</strong>
                    <el-tag :type="readinessType(item.status)">{{ item.statusText }}</el-tag>
                  </div>
                  <p>{{ item.description }}</p>
                  <span v-if="item.missing.length">缺少：{{ item.missing.join("、") }}</span>
                  <span v-else>{{ item.enabled ? "生产变量已填写，仍需到服务商后台确认签名/模板审核状态。" : "未启用时不会生成发送通道。" }}</span>
                </div>
              </div>
              <div class="rollout-readiness">
                <div v-for="item in rolloutReadiness" :key="item.key" class="readiness-card">
                  <div class="readiness-head">
                    <strong>{{ item.label }}</strong>
                    <el-tag :type="readinessType(item.status)">{{ item.statusText }}</el-tag>
                  </div>
                  <p>{{ item.description }}</p>
                  <span v-if="item.missing.length">缺少：{{ item.missing.join("、") }}</span>
                  <span v-else>{{ item.status === "disabled" ? "保持关闭时不会放量该能力。" : "可进入预发验证，生产前仍需保留回滚记录。" }}</span>
                </div>
              </div>
              <div class="deploy-grid">
                <el-form-item label="登录模式"><el-input v-model="deployment.h5AuthMode" /></el-form-item>
                <el-form-item label="短信启用"><el-switch v-model="deployment.smsEnabled" /></el-form-item>
                <el-form-item label="短信服务商"><el-input v-model="deployment.smsProvider" /></el-form-item>
                <el-form-item label="短信签名"><el-input v-model="deployment.smsSignName" /></el-form-item>
                <el-form-item label="短信模板 ID"><el-input v-model="deployment.smsTemplateId" /></el-form-item>
                <el-form-item label="短信 Key"><el-input v-model="deployment.smsAccessKeyId" /></el-form-item>
                <el-form-item label="短信 Secret"><el-input v-model="deployment.smsAccessKeySecret" show-password /></el-form-item>
                <el-form-item label="邮件启用"><el-switch v-model="deployment.emailEnabled" /></el-form-item>
                <el-form-item label="邮件服务商"><el-input v-model="deployment.emailProvider" /></el-form-item>
                <el-form-item label="SMTP 主机"><el-input v-model="deployment.smtpHost" /></el-form-item>
                <el-form-item label="SMTP 端口"><el-input-number v-model="deployment.smtpPort" :min="1" /></el-form-item>
                <el-form-item label="SMTP 用户"><el-input v-model="deployment.smtpUser" /></el-form-item>
                <el-form-item label="SMTP 密码"><el-input v-model="deployment.smtpPassword" show-password /></el-form-item>
                <el-form-item label="发件人"><el-input v-model="deployment.smtpFrom" /></el-form-item>
                <el-form-item label="微信通知"><el-switch v-model="deployment.wechatMessageEnabled" /></el-form-item>
                <el-form-item label="微信通知服务商"><el-input v-model="deployment.wechatMessageProvider" /></el-form-item>
                <el-form-item label="微信 AppId"><el-input v-model="deployment.wechatAppId" /></el-form-item>
                <el-form-item label="微信 Secret"><el-input v-model="deployment.wechatAppSecret" show-password /></el-form-item>
                <el-form-item label="支付沙箱"><el-switch v-model="deployment.paymentSandboxEnabled" /></el-form-item>
                <el-form-item label="沙箱密钥"><el-input v-model="deployment.paymentSandboxSecret" show-password /></el-form-item>
                <el-form-item label="微信支付沙箱"><el-input v-model="deployment.wechatPaySandboxSecret" show-password /></el-form-item>
                <el-form-item label="支付宝沙箱"><el-input v-model="deployment.alipayPaySandboxSecret" show-password /></el-form-item>
                <el-form-item label="真实支付"><el-switch v-model="deployment.realPaymentEnabled" active-text="开启" inactive-text="关闭" /></el-form-item>
                <el-form-item label="下单实现"><el-switch v-model="deployment.realPaymentSdkImplemented" active-text="完成" inactive-text="未完成" /></el-form-item>
                <el-form-item label="回调验签"><el-switch v-model="deployment.realPaymentCallbackVerificationImplemented" active-text="完成" inactive-text="未完成" /></el-form-item>
                <el-form-item label="退款查询"><el-switch v-model="deployment.realRefundQueryImplemented" active-text="完成" inactive-text="未完成" /></el-form-item>
                <el-form-item label="账单拉取"><el-switch v-model="deployment.realPaymentStatementFetchImplemented" active-text="完成" inactive-text="未完成" /></el-form-item>
                <el-form-item label="代理打款"><el-switch v-model="deployment.agentRealTransferImplemented" active-text="完成" inactive-text="未完成" /></el-form-item>
                <el-form-item label="商城微信"><el-switch v-model="deployment.mallRealWechatPaymentImplemented" active-text="完成" inactive-text="未完成" /></el-form-item>
                <el-form-item label="店铺直收"><el-switch v-model="deployment.mallMerchantDirectPaymentImplemented" active-text="完成" inactive-text="未完成" /></el-form-item>
                <el-form-item label="预发通过"><el-switch v-model="deployment.realPaymentPreflightPassed" active-text="通过" inactive-text="未通过" /></el-form-item>
                <el-form-item label="验收文件"><el-input v-model="deployment.realPaymentPreflightResultFile" /></el-form-item>
                <el-form-item label="有效期"><el-input-number v-model="deployment.realPaymentPreflightMaxAgeHours" :min="1" /><span class="unit">小时</span></el-form-item>
                <el-form-item label="多机构隔离"><el-switch v-model="deployment.multiTenantEnabled" active-text="开启" inactive-text="关闭" /></el-form-item>
                <el-form-item label="机构模型"><el-switch v-model="deployment.multiTenantSchemaImplemented" active-text="完成" inactive-text="未完成" /></el-form-item>
                <el-form-item label="后台过滤"><el-switch v-model="deployment.multiTenantAccessFilterImplemented" active-text="完成" inactive-text="未完成" /></el-form-item>
                <el-form-item label="公开端边界"><el-switch v-model="deployment.multiTenantPublicBoundaryImplemented" active-text="完成" inactive-text="未完成" /></el-form-item>
                <el-form-item label="机构预发"><el-switch v-model="deployment.multiTenantPreflightPassed" active-text="通过" inactive-text="未通过" /></el-form-item>
                <el-form-item label="机构验收文件"><el-input v-model="deployment.multiTenantPreflightResultFile" /></el-form-item>
                <el-form-item label="机构有效期"><el-input-number v-model="deployment.multiTenantPreflightMaxAgeHours" :min="1" /><span class="unit">小时</span></el-form-item>
                <el-form-item label="多商户商城"><el-switch v-model="deployment.mallMultiMerchantEnabled" active-text="开启" inactive-text="关闭" /></el-form-item>
                <el-form-item label="商城预发"><el-switch v-model="deployment.mallMultiMerchantPreflightPassed" active-text="通过" inactive-text="未通过" /></el-form-item>
                <el-form-item label="商城验收文件"><el-input v-model="deployment.mallMultiMerchantSmokeResultFile" /></el-form-item>
                <el-form-item label="商城有效期"><el-input-number v-model="deployment.mallMultiMerchantSmokeMaxAgeHours" :min="1" /><span class="unit">小时</span></el-form-item>
                <el-form-item label="微信支付"><el-switch v-model="deployment.wechatPayEnabled" active-text="开启" inactive-text="关闭" /></el-form-item>
                <el-form-item label="微信 AppId"><el-input v-model="deployment.wechatPayAppId" /></el-form-item>
                <el-form-item label="微信商户号"><el-input v-model="deployment.wechatPayMchId" /></el-form-item>
                <el-form-item label="微信 APIv3 Key"><el-input v-model="deployment.wechatPayApiV3Key" show-password /></el-form-item>
                <el-form-item label="微信私钥路径"><el-input v-model="deployment.wechatPayPrivateKeyPath" /></el-form-item>
                <el-form-item label="微信证书序列号"><el-input v-model="deployment.wechatPayCertSerialNo" /></el-form-item>
                <el-form-item label="微信平台证书"><el-input v-model="deployment.wechatPayPlatformCertPath" /></el-form-item>
                <el-form-item label="微信回调 URL"><el-input v-model="deployment.wechatPayNotifyUrl" /></el-form-item>
                <el-form-item label="商城微信回调"><el-input v-model="deployment.mallWechatPayNotifyUrl" placeholder="https://api.example.com/payment/mall/wechat/callback" /></el-form-item>
                <el-form-item label="商城退款回调"><el-input v-model="deployment.mallWechatPayRefundNotifyUrl" placeholder="https://api.example.com/payment/mall/wechat/refund-callback" /></el-form-item>
                <el-form-item label="直收回调模板"><el-input v-model="deployment.mallWechatPayDirectNotifyUrlTemplate" placeholder="https://api.example.com/payment/mall/merchants/{merchantId}/wechat/callback" /></el-form-item>
                <el-form-item label="直收退款模板"><el-input v-model="deployment.mallWechatPayDirectRefundNotifyUrlTemplate" placeholder="https://api.example.com/payment/mall/merchants/{merchantId}/wechat/refund-callback" /></el-form-item>
                <el-form-item label="支付宝"><el-switch v-model="deployment.alipayEnabled" active-text="开启" inactive-text="关闭" /></el-form-item>
                <el-form-item label="支付宝 AppId"><el-input v-model="deployment.alipayAppId" /></el-form-item>
                <el-form-item label="支付宝私钥路径"><el-input v-model="deployment.alipayPrivateKeyPath" /></el-form-item>
                <el-form-item label="支付宝公钥证书"><el-input v-model="deployment.alipayPublicCertPath" /></el-form-item>
                <el-form-item label="支付宝根证书"><el-input v-model="deployment.alipayRootCertPath" /></el-form-item>
                <el-form-item label="支付宝回调 URL"><el-input v-model="deployment.alipayNotifyUrl" /></el-form-item>
                <el-form-item label="付款超时"><el-input-number v-model="deployment.offlinePaymentExpireMinutes" :min="1" /><span class="unit">分钟</span></el-form-item>
                <el-form-item label="关单任务"><el-switch v-model="deployment.orderCloseWorkerEnabled" /></el-form-item>
                <el-form-item label="关单间隔"><el-input-number v-model="deployment.orderCloseWorkerIntervalSeconds" :min="30" /><span class="unit">秒</span></el-form-item>
                <el-form-item label="备份目录"><el-input v-model="deployment.backupDir" /></el-form-item>
                <el-form-item label="保留天数"><el-input-number v-model="deployment.backupRetentionDays" :min="1" /></el-form-item>
              </div>
            </div>
          </div>

          <div class="table-card env-preview">
            <div class="card-title-row">
              <div class="card-title">生成的 .env.production</div>
              <div class="preview-actions">
                <el-button @click="copyGeneratedEnv">复制</el-button>
                <el-button type="primary" plain @click="downloadGeneratedEnv">下载</el-button>
              </div>
            </div>
            <el-input class="env-textarea" type="textarea" :rows="32" :model-value="generatedEnv" readonly />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane v-if="canManagePlatformSettings" label="配置体检" name="config">
        <div class="summary-grid" v-if="report">
          <div class="summary-card">
            <span>运行环境</span>
            <strong>{{ report.environment || "-" }}</strong>
          </div>
          <div class="summary-card">
            <span>当前版本</span>
            <strong>{{ report.release?.version || "-" }}</strong>
          </div>
          <div class="summary-card warning">
            <span>待确认</span>
            <strong>{{ report.summary.warningCount }}</strong>
          </div>
          <div class="summary-card error">
            <span>需修复</span>
            <strong>{{ report.summary.errorCount }}</strong>
          </div>
        </div>
        <div class="config-grid" v-loading="loadingConfig">
          <div v-for="group in configGroups" :key="group.title" class="table-card config-card">
            <div class="config-card-head">
              <h3>{{ group.title }}</h3>
              <span>检查时间：{{ formatTime(report?.checkedAt) }}</span>
            </div>
            <el-table :data="group.rows" stripe size="small">
              <el-table-column label="状态" width="96">
                <template #default="{ row }">
                  <el-tag :type="tagType[row.status as CheckStatus]">{{ statusText[row.status as CheckStatus] }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="label" label="项目" width="150" />
              <el-table-column prop="key" label="配置键" width="220" />
              <el-table-column prop="value" label="当前状态" width="160" />
              <el-table-column prop="message" label="说明" min-width="260" />
            </el-table>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="管理入口" name="links">
        <div class="link-grid">
          <div v-if="!canManagePlatformSettings" class="link-card" @click="go('/categories')">
            <strong>分类管理</strong>
            <span>维护活动分类和前台筛选。</span>
          </div>
          <div v-if="!canManagePlatformSettings" class="link-card" @click="go('/homepage-builder')">
            <strong>首页装修</strong>
            <span>配置 H5 首页模块、图片广告和运营内容。</span>
          </div>
          <div v-if="canManagePlatformSettings" class="link-card" @click="go('/tenants')">
            <strong>商家/代理管理</strong>
            <span>开通商家、停用商家和配置审核权限。</span>
          </div>
          <div v-if="canManagePlatformSettings" class="link-card" @click="go('/config-check')">
            <strong>上线体检</strong>
            <span>检查生产配置、真实支付、多租户和发布标识。</span>
          </div>
          <div v-if="canManagePlatformSettings" class="link-card" @click="go('/ops-routine')">
            <strong>运营巡检</strong>
            <span>按日、周、月跟进平台上线后的巡检事项。</span>
          </div>
          <div class="link-card" @click="go('/admins')">
            <strong>{{ canManagePlatformSettings ? "商家账号" : "员工账号" }}</strong>
            <span>{{ canManagePlatformSettings ? "给平台或商家创建后台账号、重置密码、启停账号。" : "创建本商家的运营、财务、签到账号。" }}</span>
          </div>
          <div v-if="canManagePlatformSettings" class="link-card" @click="go('/admin-login-logs')">
            <strong>登录日志</strong>
            <span>查看后台登录成功、失败和限流记录。</span>
          </div>
          <div v-if="canManagePlatformSettings" class="link-card" @click="go('/h5-code-logs')">
            <strong>验证码日志</strong>
            <span>查看 H5 手机号验证码发送和失败记录。</span>
          </div>
          <div class="link-card" @click="go('/operation-logs')">
            <strong>操作日志</strong>
            <span>追踪收款、退款、签到和设置修改。</span>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.toolbar { align-items: flex-start; }
.toolbar-actions, .switch-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.payment-methods-block { display: grid; gap: 6px; }
.payment-methods { display: flex; align-items: center; gap: 12px 22px; flex-wrap: wrap; }
.payment-readiness { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 8px; }
.payment-readiness-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; background: #f8fafc; }
.payment-readiness-card div { display: grid; gap: 5px; min-width: 0; }
.payment-readiness-card strong { color: #111827; font-size: 13px; }
.payment-readiness-card span { color: #64748b; font-size: 12px; line-height: 1.45; }
.form-tip { margin: 0; color: #64748b; font-size: 13px; line-height: 1.5; }
.subtitle { margin: 6px 0 0; color: #64748b; font-size: 14px; }
.system-tabs { margin-top: 12px; }
.panel-alert { margin-bottom: 16px; }
.setting-form { max-width: 980px; }
.qr-field { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: start; }
.qr-preview { grid-column: 1 / -1; width: 180px; aspect-ratio: 1 / 1; object-fit: contain; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; }
.theme-panel { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 14px; align-items: stretch; }
.theme-controls { display: grid; gap: 12px; }
.brand-setting-card { display: grid; gap: 10px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f8fafc; }
.brand-setting-head { display: grid; gap: 4px; }
.brand-setting-head strong { color: #111827; }
.brand-setting-head span { color: #64748b; font-size: 12px; line-height: 1.5; }
.brand-setting-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.brand-logo-preview { width: 64px; height: 64px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; padding: 6px; }
.theme-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px 14px; }
.theme-grid label { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 36px; color: #475569; font-size: 13px; }
.theme-upload { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px; align-items: center; }
.theme-sliders { display: grid; gap: 8px; }
.theme-sliders > div { display: grid; grid-template-columns: 170px minmax(0, 1fr); gap: 12px; align-items: center; color: #475569; font-size: 13px; }
.theme-preview { min-height: 280px; border-radius: 16px; padding: 22px; display: flex; align-items: center; justify-content: center; border: 1px solid #e5e7eb; overflow: hidden; }
.theme-phone-card { width: 150px; min-height: 160px; padding: 18px; display: grid; gap: 12px; align-content: center; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12); }
.theme-logo { width: 42px; height: 42px; object-fit: contain; border-radius: 12px; background: rgba(255,255,255,0.72); }
.theme-phone-card strong { font-size: 18px; line-height: 1.25; }
.theme-phone-card span { color: #64748b; font-size: 12px; line-height: 1.5; }
.theme-phone-card button { height: 34px; border: 0; border-radius: 999px; color: #fff; font-weight: 700; cursor: default; }
.deploy-layout { display: grid; grid-template-columns: minmax(0, 1fr) 520px; gap: 16px; align-items: start; }
.deploy-form { display: grid; gap: 16px; }
.deploy-card { padding: 18px; }
.card-title, .card-title-row .card-title { color: #111827; font-size: 16px; font-weight: 700; }
.card-title { margin-bottom: 16px; }
.card-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.domain-batch-card { border-color: #bae6fd; background: #f8fbff; }
.domain-batch-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; }
.domain-batch-controls { display: grid; gap: 12px; min-width: 0; }
.domain-batch-controls :deep(.el-form-item) { margin-bottom: 14px; }
.domain-command-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.domain-preview-table { border: 1px solid #dbeafe; border-radius: 8px; background: #fff; overflow: hidden; }
.mini-table-title { color: #0f172a; font-size: 13px; font-weight: 800; margin-bottom: 10px; }
.domain-preview-table .mini-table-title { padding: 12px 12px 0; }
.domain-preview-row { display: grid; grid-template-columns: 92px 190px minmax(0, 1fr); gap: 10px; align-items: center; padding: 10px 12px; border-top: 1px solid #eff6ff; }
.domain-preview-row span { color: #475569; font-size: 12px; }
.domain-preview-row strong { color: #0f766e; font-size: 12px; font-family: "Cascadia Mono", Consolas, monospace; }
.domain-preview-row code, .domain-check-card code { color: #111827; font-size: 12px; font-family: "Cascadia Mono", Consolas, monospace; overflow-wrap: anywhere; white-space: normal; }
.domain-check-section { display: grid; gap: 14px; margin-top: 16px; }
.domain-check-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.domain-check-card { display: grid; gap: 7px; padding: 12px; border: 1px solid #dbeafe; border-radius: 8px; background: #fff; min-width: 0; }
.domain-check-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.domain-check-head strong { color: #111827; font-size: 13px; }
.domain-check-card span, .domain-empty-check { color: #64748b; font-size: 12px; line-height: 1.5; }
.domain-empty-check { padding: 12px; border: 1px dashed #bfdbfe; border-radius: 8px; background: #fff; }
.domain-command-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
.wechat-acceptance-card { border-color: #bbf7d0; background: #fbfffd; }
.wechat-acceptance-form { margin-top: 16px; }
.wechat-remark-field { grid-column: 1 / -1; }
.wechat-link-section, .wechat-template-preview { margin-top: 16px; }
.wechat-link-list { display: grid; gap: 10px; }
.wechat-link-row { display: grid; grid-template-columns: 180px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 12px; border: 1px solid #dcfce7; border-radius: 8px; background: #fff; min-width: 0; }
.wechat-link-row div { display: grid; gap: 4px; min-width: 0; }
.wechat-link-row strong { color: #111827; font-size: 13px; }
.wechat-link-row span { color: #64748b; font-size: 12px; line-height: 1.45; }
.wechat-link-row code { color: #0f766e; font-size: 12px; font-family: "Cascadia Mono", Consolas, monospace; overflow-wrap: anywhere; white-space: normal; }
.release-readiness { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.release-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f8fafc; display: grid; gap: 7px; min-width: 0; }
.release-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.release-head strong { color: #111827; font-size: 14px; }
.release-card span { color: #475569; font-size: 12px; font-family: "Cascadia Mono", Consolas, monospace; }
.release-card p { margin: 0; color: #111827; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.release-card small { color: #64748b; font-size: 12px; line-height: 1.5; }
.domain-readiness { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.domain-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f8fafc; display: grid; gap: 7px; min-width: 0; }
.domain-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.domain-head strong { color: #111827; font-size: 14px; }
.domain-card span { color: #475569; font-size: 12px; font-family: "Cascadia Mono", Consolas, monospace; }
.domain-card p { margin: 0; color: #111827; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.domain-card small { color: #64748b; font-size: 12px; line-height: 1.5; }
.security-readiness { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.security-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f8fafc; display: grid; gap: 7px; min-width: 0; }
.security-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.security-head strong { color: #111827; font-size: 14px; }
.security-card span { color: #475569; font-size: 12px; font-family: "Cascadia Mono", Consolas, monospace; }
.security-card p { margin: 0; color: #334155; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.deploy-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
.deploy-grid :deep(.el-form-item) { margin-bottom: 14px; }
.deploy-grid :deep(.el-form-item__label) { color: #475569; font-weight: 600; }
.notification-readiness, .rollout-readiness { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.readiness-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f8fafc; display: grid; gap: 8px; }
.readiness-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.readiness-head strong { color: #111827; font-size: 14px; }
.readiness-card p { margin: 0; color: #64748b; font-size: 12px; line-height: 1.5; }
.readiness-card span { color: #334155; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.unit { margin-left: 8px; color: #64748b; font-size: 13px; }
.env-preview { position: sticky; top: 20px; padding: 18px; }
.preview-actions { display: flex; gap: 8px; }
.env-textarea :deep(textarea) { font-family: "Cascadia Mono", Consolas, monospace; font-size: 12px; line-height: 1.55; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.summary-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; display: grid; gap: 8px; }
.summary-card span { color: #64748b; font-size: 13px; }
.summary-card strong { color: #111827; font-size: 22px; overflow-wrap: anywhere; }
.summary-card.warning strong { color: #d97706; }
.summary-card.error strong { color: #dc2626; }
.config-grid { display: grid; gap: 16px; }
.config-card { padding: 0; overflow: hidden; }
.config-card-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px; border-bottom: 1px solid #edf0f5; }
.config-card-head h3 { margin: 0; font-size: 16px; }
.config-card-head span { color: #64748b; font-size: 13px; }
.link-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.link-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; display: grid; gap: 8px; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; }
.link-card:hover { border-color: #0f766e; box-shadow: 0 8px 24px rgba(15, 118, 110, 0.08); }
.link-card strong { color: #111827; font-size: 16px; }
.link-card span { color: #64748b; line-height: 1.5; }
@media (max-width: 1100px) {
  .summary-grid, .link-grid, .deploy-layout, .deploy-grid, .payment-readiness, .release-readiness, .domain-readiness, .security-readiness, .notification-readiness, .rollout-readiness, .theme-panel, .theme-grid, .theme-upload, .theme-sliders > div, .domain-batch-grid, .domain-check-grid, .domain-command-grid, .domain-preview-row, .wechat-link-row { grid-template-columns: 1fr; }
  .env-preview { position: static; }
}
</style>
