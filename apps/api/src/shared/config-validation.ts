import { ConfigService } from "@nestjs/config";

export type RuntimeConfigCheckStatus = "ok" | "warning" | "error";

export type RuntimeConfigCheck = {
  key: string;
  label: string;
  status: RuntimeConfigCheckStatus;
  message: string;
  value?: string;
};

export type RuntimeConfigInspection = {
  status: RuntimeConfigCheckStatus;
  environment: string;
  checkedAt: string;
  summary: {
    okCount: number;
    warningCount: number;
    errorCount: number;
  };
  checks: RuntimeConfigCheck[];
};

const unsafeValues = new Set(["", "change-me-in-production", "change-me-long-random-secret", "dev-secret-change-me", "activitypass", "rootpass"]);
const unsafePaymentSecrets = new Set(["", "change-me-payment-sandbox-secret", "change-me-wechat-sandbox-secret", "change-me-alipay-sandbox-secret"]);

export function validateRuntimeConfig(config: ConfigService) {
  const isProduction = config.get("NODE_ENV") === "production";
  if (!isProduction) return;

  const inspection = inspectRuntimeConfig(config);
  const errors = inspection.checks.filter((check) => check.status === "error").map((check) => `${check.label}: ${check.message}`);

  if (errors.length) {
    throw new Error(`Invalid production configuration:\n- ${errors.join("\n- ")}`);
  }
}

export function inspectRuntimeConfig(config: ConfigService): RuntimeConfigInspection {
  const environment = config.get<string>("NODE_ENV", "development");
  const isProduction = environment === "production";
  const checks: RuntimeConfigCheck[] = [];

  addCheck(checks, "NODE_ENV", "运行环境", "ok", isProduction ? "当前为生产环境，严格配置校验已启用。" : "当前不是生产环境，生产上线前需切换为 production。", environment);
  addReleaseChecks(checks, config, isProduction);
  addSecretCheck(checks, "JWT_SECRET", "JWT 密钥", config.get<string>("JWT_SECRET", ""), 32, isProduction, unsafeValues, "请替换为至少 32 位的随机字符串。");
  addSecretCheck(checks, "DB_PASSWORD", "数据库密码", config.get<string>("DB_PASSWORD", ""), 12, isProduction, unsafeValues, "请替换为强数据库密码，并避免使用默认示例值。");
  addDatabaseSyncCheck(checks, config, isProduction);
  addOriginCheck(checks, "CORS_ORIGIN", "跨域白名单", config.get<string>("CORS_ORIGIN", ""), isProduction);
  addOriginCheck(checks, "PUBLIC_H5_ORIGIN", "H5 公开域名", config.get<string>("PUBLIC_H5_ORIGIN", ""), isProduction);
  addOriginCheck(checks, "PUBLIC_ADMIN_ORIGIN", "后台公开域名", config.get<string>("PUBLIC_ADMIN_ORIGIN", ""), isProduction);
  addOriginCheck(checks, "PUBLIC_API_ORIGIN", "API 公开域名", config.get<string>("PUBLIC_API_ORIGIN", ""), isProduction);
  addUploadDirCheck(checks, config.get<string>("UPLOAD_DIR", "uploads"));
  addSecurityRuntimeChecks(checks, config, isProduction);
  addH5AuthCheck(checks, config, isProduction);
  addH5CodeRateLimitChecks(checks, config);
  addAdminLoginRateLimitChecks(checks, config);
  addPaymentRuntimeChecks(checks, config, isProduction);
  addRealPaymentRuntimeChecks(checks, config, isProduction);
  addMultiTenantRuntimeChecks(checks, config);
  addSmsProviderCheck(checks, config);
  addProviderCheck(checks, config, "EMAIL_PROVIDER_ENABLED", ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"], "邮件服务");
  addProviderCheck(checks, config, "WECHAT_MESSAGE_PROVIDER_ENABLED", ["WECHAT_APP_ID", "WECHAT_APP_SECRET"], "微信订阅消息");
  addNumberCheck(checks, "OFFLINE_PAYMENT_EXPIRE_MINUTES", "线下付款有效期", Number(config.get("OFFLINE_PAYMENT_EXPIRE_MINUTES", 1440)), 5, 43200, "分钟");
  addWorkerCheck(checks, config, isProduction);

  const summary = {
    okCount: checks.filter((check) => check.status === "ok").length,
    warningCount: checks.filter((check) => check.status === "warning").length,
    errorCount: checks.filter((check) => check.status === "error").length
  };
  const status: RuntimeConfigCheckStatus = summary.errorCount > 0 ? "error" : summary.warningCount > 0 ? "warning" : "ok";
  return { status, environment, checkedAt: new Date().toISOString(), summary, checks };
}

function addCheck(checks: RuntimeConfigCheck[], key: string, label: string, status: RuntimeConfigCheckStatus, message: string, value?: string) {
  checks.push({ key, label, status, message, value });
}

function isPlaceholderValue(value?: string) {
  const text = String(value || "");
  return !text || text === "local" || text === "unknown" || text.startsWith("change-me") || text.startsWith("replace-with");
}

function addReleaseChecks(checks: RuntimeConfigCheck[], config: ConfigService, strict: boolean) {
  const appVersion = config.get<string>("APP_VERSION", "");
  const buildCommit = config.get<string>("BUILD_COMMIT", "");
  const buildTime = config.get<string>("BUILD_TIME", "");
  const buildTimeOk = !isPlaceholderValue(buildTime) && Number.isFinite(Date.parse(buildTime || ""));

  addCheck(checks, "APP_VERSION", "发布版本", appVersion ? "ok" : strict ? "error" : "warning", appVersion ? "已配置发布版本。" : "请配置本次发布版本。", appVersion || "未配置");
  addCheck(
    checks,
    "BUILD_COMMIT",
    "发布提交",
    isPlaceholderValue(buildCommit) ? (strict ? "error" : "warning") : "ok",
    isPlaceholderValue(buildCommit) ? "请替换为本次发布的代码提交、镜像摘要或制品版本。" : "已配置发布提交或镜像摘要。",
    buildCommit || "未配置"
  );
  addCheck(
    checks,
    "BUILD_TIME",
    "构建时间",
    buildTimeOk ? "ok" : strict ? "error" : "warning",
    buildTimeOk ? "已配置有效的构建时间。" : "请配置有效的 ISO 构建时间。",
    buildTime || "未配置"
  );
}

function addSecretCheck(checks: RuntimeConfigCheck[], key: string, label: string, value: string, minLength: number, strict: boolean, unsafe: Set<string>, advice: string) {
  const status = unsafe.has(value) || value.startsWith("change-me") || value.length < minLength ? (strict ? "error" : "warning") : "ok";
  const message = status === "ok" ? `已配置，长度 ${value.length} 位。` : advice;
  addCheck(checks, key, label, status, message, value ? `已配置，长度 ${value.length}` : "未配置");
}

function addDatabaseSyncCheck(checks: RuntimeConfigCheck[], config: ConfigService, strict: boolean) {
  const fallback = strict ? "false" : "true";
  const enabled = config.get<string>("DB_SYNCHRONIZE", fallback) === "true";
  addCheck(
    checks,
    "DB_SYNCHRONIZE",
    "数据库自动同步",
    enabled ? (strict ? "error" : "warning") : "ok",
    enabled ? "TypeORM synchronize 仅适合本地开发；生产环境必须关闭并使用 migration。" : "已关闭自动同步，数据库结构变更应通过 migration 执行。",
    enabled ? "已启用" : "已关闭"
  );
}

function addOriginCheck(checks: RuntimeConfigCheck[], key: string, label: string, value: string, strict: boolean) {
  if (!value) return addCheck(checks, key, label, strict ? "error" : "warning", "请配置真实可访问域名。", "未配置");
  const local = /localhost|127\.0\.0\.1|0\.0\.0\.0|example\.com/.test(value);
  const https = value.split(",").every((item) => item.trim().startsWith("https://") || item.trim().startsWith("http://localhost") || item.trim().startsWith("http://127.0.0.1"));
  const status: RuntimeConfigCheckStatus = local || !https ? (strict ? "error" : "warning") : "ok";
  const message = status === "ok" ? "已配置真实域名。" : "生产环境应使用 HTTPS 真实域名，不能继续使用 localhost 或 example.com。";
  addCheck(checks, key, label, status, message, maskOrigins(value));
}

function addPaymentSecretCheck(checks: RuntimeConfigCheck[], key: string, label: string, value: string, strict: boolean) {
  const unsafe = unsafePaymentSecrets.has(value) || value.startsWith("change-me");
  const status: RuntimeConfigCheckStatus = unsafe ? (strict ? "error" : "warning") : "ok";
  const message = status === "ok" ? `已配置，长度 ${value.length} 位。` : "请替换默认沙箱密钥；接真实支付前还需配置商户号、证书和回调域名。";
  addCheck(checks, key, label, status, message, value ? `已配置，长度 ${value.length}` : "未配置");
}

function addPaymentRuntimeChecks(checks: RuntimeConfigCheck[], config: ConfigService, strict: boolean) {
  const sandboxEnabled = config.get<string>("PAYMENT_SANDBOX_ENABLED", strict ? "false" : "true") === "true";
  addCheck(
    checks,
    "PAYMENT_SANDBOX_ENABLED",
    "支付沙箱端点",
    sandboxEnabled ? (strict ? "error" : "warning") : "ok",
    sandboxEnabled ? "沙箱/mock 支付仅适合本地或预发联调，生产流量必须关闭并接入真实支付服务商。" : "沙箱/mock 支付端点已关闭，生产订单不会被测试支付接口改状态。",
    sandboxEnabled ? "已启用" : "已关闭"
  );
  if (!sandboxEnabled) {
    addCheck(checks, "PAYMENT_SANDBOX_SECRET", "通用沙箱支付密钥", "ok", "沙箱支付已关闭，无需配置沙箱密钥。", "未启用");
    addCheck(checks, "WECHAT_PAY_SANDBOX_SECRET", "微信支付沙箱密钥", "ok", "沙箱支付已关闭，无需配置沙箱密钥。", "未启用");
    addCheck(checks, "ALIPAY_PAY_SANDBOX_SECRET", "支付宝沙箱密钥", "ok", "沙箱支付已关闭，无需配置沙箱密钥。", "未启用");
    return;
  }
  addPaymentSecretCheck(checks, "PAYMENT_SANDBOX_SECRET", "通用沙箱支付密钥", config.get<string>("PAYMENT_SANDBOX_SECRET", ""), strict);
  addPaymentSecretCheck(checks, "WECHAT_PAY_SANDBOX_SECRET", "微信支付沙箱密钥", config.get<string>("WECHAT_PAY_SANDBOX_SECRET", ""), strict);
  addPaymentSecretCheck(checks, "ALIPAY_PAY_SANDBOX_SECRET", "支付宝沙箱密钥", config.get<string>("ALIPAY_PAY_SANDBOX_SECRET", ""), strict);
}

function addRealPaymentRuntimeChecks(checks: RuntimeConfigCheck[], config: ConfigService, strict: boolean) {
  const realPaymentEnabled = config.get<string>("REAL_PAYMENT_ENABLED", "false") === "true";
  const wechatEnabled = config.get<string>("WECHAT_PAY_ENABLED", "false") === "true";
  const alipayEnabled = config.get<string>("ALIPAY_ENABLED", "false") === "true";
  addCheck(
    checks,
    "REAL_PAYMENT_ENABLED",
    "真实支付总开关",
    realPaymentEnabled ? "warning" : "ok",
    realPaymentEnabled ? "真实支付配置已声明启用，但官方 SDK、证书验签、退款查询、账单自动拉取和真实自动打款仍需逐项确认。" : "当前仍以线下收款为主，真实支付未启用。",
    realPaymentEnabled ? "已启用" : "未启用"
  );
  if (!realPaymentEnabled) return;
  addRealPaymentImplementationWarnings(checks, config);
  if (!wechatEnabled && !alipayEnabled) {
    addCheck(checks, "REAL_PAYMENT_PROVIDER", "真实支付渠道", strict ? "error" : "warning", "启用真实支付时至少需要启用微信支付或支付宝。", "未启用渠道");
  }
  if (wechatEnabled) {
    addRequiredPaymentFields(checks, config, "微信支付", ["WECHAT_PAY_APP_ID", "WECHAT_PAY_MCH_ID", "WECHAT_PAY_API_V3_KEY", "WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_PAY_CERT_SERIAL_NO", "WECHAT_PAY_PLATFORM_CERT_PATH", "WECHAT_PAY_NOTIFY_URL"], strict);
    addHttpsCallbackCheck(checks, "WECHAT_PAY_NOTIFY_URL", "微信支付回调地址", config.get<string>("WECHAT_PAY_NOTIFY_URL", ""), strict);
  }
  if (alipayEnabled) {
    addRequiredPaymentFields(checks, config, "支付宝", ["ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY_PATH", "ALIPAY_PUBLIC_CERT_PATH", "ALIPAY_ROOT_CERT_PATH", "ALIPAY_NOTIFY_URL"], strict);
    addHttpsCallbackCheck(checks, "ALIPAY_NOTIFY_URL", "支付宝回调地址", config.get<string>("ALIPAY_NOTIFY_URL", ""), strict);
  }
}

function addRealPaymentImplementationWarnings(checks: RuntimeConfigCheck[], config: ConfigService) {
  addImplementationCheck(checks, config, "REAL_PAYMENT_SDK_IMPLEMENTED", "真实支付 SDK 实现", "微信 Native/H5/JSAPI 下单和支付宝预创建/WAP/PAGE 下单的签名请求、HTTP 执行、响应验签和返回归一化底座已完成；打开标记前仍需真实商户预发样例、多场景支付验收和回滚方案。");
  addImplementationCheck(checks, config, "REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED", "真实回调验签实现", "微信平台证书验签、API v3 资源解密、支付宝证书验签和回调归一化已接入；打开标记前仍需预发验证重复回调、异常金额、证书轮换和代理收款账户场景。");
  addImplementationCheck(checks, config, "REAL_REFUND_QUERY_IMPLEMENTED", "退款查询补偿实现", "退款请求/查询合同、财务扫描入口、签名请求草稿、HTTP 执行底座、响应验签底座、退款通知解析底座、退款通知公网入口第一版和本地退款完成共享服务已完成；打开标记前仍需完成真实商户预发样例和回滚方案。");
  addImplementationCheck(checks, config, "REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED", "真实账单自动拉取", "微信/支付宝账单下载地址签名请求、下载执行和 CSV 文本解析底座已完成；打开标记前仍需真实商户账单样例、压缩包/大文件格式验证和回滚方案。");
  addImplementationCheck(checks, config, "AGENT_REAL_TRANSFER_IMPLEMENTED", "代理真实自动打款", "代理结算、打款能力评估、沙箱打款和真实转账合同已完成，但支付机构真实转账 SDK 未实现，后台不应开放真实打款按钮。");
  addImplementationCheck(checks, config, "REAL_PAYMENT_PREFLIGHT_PASSED", "真实支付预发验收", "真实支付或代理真实打款上线前必须保留新鲜的预发验收结果文件，并覆盖多场景支付、回调、退款、账单、代理账户路由、代理真实打款和回滚记录。");
}

function addImplementationCheck(checks: RuntimeConfigCheck[], config: ConfigService, key: string, label: string, warning: string) {
  const implemented = config.get<string>(key, "false") === "true";
  addCheck(checks, key, label, implemented ? "ok" : "warning", implemented ? "已声明完成，请确保预发验收记录和回滚方案齐全。" : warning, implemented ? "已完成" : "未完成");
}

function addMultiTenantRuntimeChecks(checks: RuntimeConfigCheck[], config: ConfigService) {
  const enabled = config.get<string>("MULTI_TENANT_ENABLED", "false") === "true";
  addCheck(
    checks,
    "MULTI_TENANT_ENABLED",
    "多机构隔离开关",
    enabled ? "warning" : "ok",
    enabled ? "多机构隔离已声明启用；必须确认 tenant 字段、数据迁移、后台权限过滤和公开接口边界全部完成。" : "多机构隔离未启用，当前仍按单机构平台模式运行。",
    enabled ? "已启用" : "未启用"
  );
  if (!enabled) return;
  addImplementationCheck(checks, config, "MULTI_TENANT_SCHEMA_IMPLEMENTED", "多机构数据模型", "机构表、tenantId 字段、唯一索引调整和历史数据回填迁移尚未声明完成。");
  addImplementationCheck(checks, config, "MULTI_TENANT_ACCESS_FILTER_IMPLEMENTED", "多机构权限过滤", "后台管理员机构归属、查询过滤、写入归属校验和导出过滤尚未声明完成。");
  addImplementationCheck(checks, config, "MULTI_TENANT_PUBLIC_BOUNDARY_IMPLEMENTED", "多机构公开端边界", "H5 活动列表、报名、支付回调和公开查询的机构定位规则尚未声明完成。");
  addImplementationCheck(checks, config, "MULTI_TENANT_PREFLIGHT_PASSED", "多机构预发验收", "预发环境尚未跑通 smoke:tenant:seed 和 smoke:tenant，或未保留可供 preflight 校验的验收结果文件。");
}

function addRequiredPaymentFields(checks: RuntimeConfigCheck[], config: ConfigService, label: string, keys: string[], strict: boolean) {
  const missing = keys.filter((key) => !config.get<string>(key));
  addCheck(
    checks,
    `${label}_CONFIG`,
    `${label}配置`,
    missing.length ? (strict ? "error" : "warning") : "ok",
    missing.length ? `${label}已启用但缺少配置：${missing.join(", ")}。` : `${label}商户参数字段已填写。`,
    missing.length ? "配置不完整" : "字段完整"
  );
}

function addHttpsCallbackCheck(checks: RuntimeConfigCheck[], key: string, label: string, value: string, strict: boolean) {
  const ok = Boolean(value && value.startsWith("https://"));
  addCheck(checks, key, label, ok ? "ok" : strict ? "error" : "warning", ok ? "已配置 HTTPS 回调地址。" : "真实支付回调必须使用可公网访问的 HTTPS 地址。", value || "未配置");
}

function addSecurityRuntimeChecks(checks: RuntimeConfigCheck[], config: ConfigService, strict: boolean) {
  addBooleanCheck(checks, "SECURITY_HEADERS_ENABLED", "API 安全响应头", config.get<string>("SECURITY_HEADERS_ENABLED", "true"), true, strict);
  addBooleanCheck(checks, "SECURITY_HSTS_ENABLED", "生产 HSTS", config.get<string>("SECURITY_HSTS_ENABLED", strict ? "true" : "false"), true, strict);
  addBooleanCheck(checks, "VALIDATION_FORBID_NON_WHITELISTED", "拒绝多余请求字段", config.get<string>("VALIDATION_FORBID_NON_WHITELISTED", strict ? "true" : "false"), true, strict);
  addBooleanCheck(checks, "ACCESS_LOG_ENABLED", "结构化访问日志", config.get<string>("ACCESS_LOG_ENABLED", "true"), true, strict);
  addBooleanCheck(checks, "ACCESS_LOG_SKIP_HEALTH", "访问日志跳过健康检查", config.get<string>("ACCESS_LOG_SKIP_HEALTH", "true"), true, false);
  const trustProxy = config.get<string>("TRUST_PROXY", strict ? "true" : "false");
  const ok = Boolean(trustProxy && trustProxy !== "false");
  addCheck(checks, "TRUST_PROXY", "反向代理真实 IP", ok ? "ok" : strict ? "error" : "warning", ok ? "已启用可信代理配置。" : "生产环境建议启用，确保限流和审计记录真实客户端 IP。", trustProxy);
}

function addBooleanCheck(checks: RuntimeConfigCheck[], key: string, label: string, value: string, expected: boolean, strict: boolean) {
  const normalized = String(value).toLowerCase();
  const ok = normalized === String(expected);
  addCheck(checks, key, label, ok ? "ok" : strict ? "error" : "warning", ok ? "已启用。" : "生产环境建议启用。", normalized);
}

function addProviderCheck(checks: RuntimeConfigCheck[], config: ConfigService, enabledKey: string, keys: string[], label: string) {
  const enabled = config.get(enabledKey) === "true";
  if (!enabled) return addCheck(checks, enabledKey, label, "warning", `${label}未启用，上线后对应渠道不会发送。`, "未启用");
  const missing = keys.filter((key) => !config.get<string>(key));
  if (missing.length) return addCheck(checks, enabledKey, label, "error", `${label}已启用但缺少配置：${missing.join(", ")}。`, "配置不完整");
  addCheck(checks, enabledKey, label, "ok", `${label}已启用且凭证字段完整。`, "已启用");
}

function addNumberCheck(checks: RuntimeConfigCheck[], key: string, label: string, value: number, min: number, max: number, unit: string) {
  const ok = Number.isFinite(value) && value >= min && value <= max;
  addCheck(checks, key, label, ok ? "ok" : "warning", ok ? `当前为 ${value} ${unit}。` : `建议设置在 ${min}-${max} ${unit}之间。`, Number.isFinite(value) ? `${value} ${unit}` : "无效");
}

function addWorkerCheck(checks: RuntimeConfigCheck[], config: ConfigService, strict: boolean) {
  const enabled = config.get("ORDER_CLOSE_WORKER_ENABLED", "false") === "true";
  const interval = Number(config.get("ORDER_CLOSE_WORKER_INTERVAL_SECONDS", 300));
  if (!enabled) addCheck(checks, "ORDER_CLOSE_WORKER_ENABLED", "自动关单任务", "warning", "自动关单任务未启用，待付款订单不会自动关闭。", "未启用");
  else addNumberCheck(checks, "ORDER_CLOSE_WORKER_INTERVAL_SECONDS", "自动关单间隔", interval, 30, 3600, "秒");

  const forceFail = config.get<string>("NOTIFICATION_FORCE_FAIL", "false") === "true";
  addCheck(
    checks,
    "NOTIFICATION_FORCE_FAIL",
    "通知强制失败开关",
    forceFail ? (strict ? "error" : "warning") : "ok",
    forceFail ? "生产环境必须保持 NOTIFICATION_FORCE_FAIL=false，避免所有通知被强制失败。" : "通知强制失败开关已关闭。",
    forceFail ? "已启用" : "已关闭"
  );

  const notificationWorkerEnabled = config.get<string>("NOTIFICATION_SCHEDULE_WORKER_ENABLED", "false") === "true";
  if (notificationWorkerEnabled) {
    addNumberCheck(checks, "NOTIFICATION_SCHEDULE_WORKER_INTERVAL_SECONDS", "通知调度间隔", Number(config.get("NOTIFICATION_SCHEDULE_WORKER_INTERVAL_SECONDS", 60)), 30, 3600, "秒");
  } else {
    addCheck(checks, "NOTIFICATION_SCHEDULE_WORKER_ENABLED", "通知调度任务", "warning", "通知调度任务未启用，定时通知不会自动发送。", "未启用");
  }
}

function addUploadDirCheck(checks: RuntimeConfigCheck[], value: string) {
  const ok = Boolean(value?.trim());
  addCheck(checks, "UPLOAD_DIR", "上传目录", ok ? "ok" : "warning", ok ? "已配置本地上传目录，生产建议挂载持久化卷。" : "请配置上传目录并挂载持久化存储。", ok ? value : "未配置");
}

function addH5AuthCheck(checks: RuntimeConfigCheck[], config: ConfigService, strict: boolean) {
  const mode = config.get<string>("H5_AUTH_MODE", "dev");
  const secret = config.get<string>("H5_AUTH_SECRET", "");
  if (strict && mode === "dev") {
    addCheck(checks, "H5_AUTH_MODE", "H5 登录模式", "error", "生产环境不能继续使用开发登录模式。", mode);
  } else {
    addCheck(checks, "H5_AUTH_MODE", "H5 登录模式", mode === "dev" ? "warning" : "ok", mode === "dev" ? "开发登录模式仅适合本地演示。" : "H5 验证码登录模式已启用。", mode);
  }
  addSecretCheck(checks, "H5_AUTH_SECRET", "H5 验证签名密钥", secret, 32, strict, unsafeValues, "请替换为至少 32 位的 H5 验证签名密钥。");
  if (mode !== "dev") {
    addCheck(checks, "H5_SMS_PROVIDER", "H5 短信验证码", "warning", "短信服务商参数在后台系统设置中维护；未配置前 H5 验证码发送会返回明确提示，但不会阻止 API 启动。", "后台配置");
  }
}

function addSmsProviderCheck(checks: RuntimeConfigCheck[], config: ConfigService) {
  const envEnabled = config.get("SMS_PROVIDER_ENABLED") === "true";
  const missing = ["SMS_ACCESS_KEY_ID", "SMS_ACCESS_KEY_SECRET", "SMS_SIGN_NAME", "SMS_TEMPLATE_ID"].filter((key) => !config.get<string>(key));
  if (!envEnabled) {
    addCheck(checks, "SMS_PROVIDER_ENABLED", "短信服务", "warning", "短信服务商参数已改为后台系统设置维护；首次部署可先启动后台再配置。", "后台配置");
    return;
  }
  addCheck(
    checks,
    "SMS_PROVIDER_ENABLED",
    "短信服务",
    missing.length ? "warning" : "ok",
    missing.length ? `环境变量短信配置不完整：${missing.join(", ")}。建议改到后台系统设置维护，不再作为启动阻断项。` : "环境变量短信配置完整；也可在后台系统设置中维护。",
    missing.length ? "环境变量不完整" : "已配置"
  );
}

function addH5CodeRateLimitChecks(checks: RuntimeConfigCheck[], config: ConfigService) {
  addNumberCheck(checks, "H5_CODE_EXPIRE_MINUTES", "H5 验证码有效期", Number(config.get("H5_CODE_EXPIRE_MINUTES", 10)), 1, 30, "分钟");
  addNumberCheck(checks, "H5_CODE_COOLDOWN_SECONDS", "H5 验证码发送冷却", Number(config.get("H5_CODE_COOLDOWN_SECONDS", 60)), 0, 600, "秒");
  addNumberCheck(checks, "H5_CODE_PHONE_HOURLY_LIMIT", "H5 手机号小时限额", Number(config.get("H5_CODE_PHONE_HOURLY_LIMIT", 6)), 1, 200, "次");
  addNumberCheck(checks, "H5_CODE_PHONE_DAILY_LIMIT", "H5 手机号每日限额", Number(config.get("H5_CODE_PHONE_DAILY_LIMIT", 20)), 1, 1000, "次");
  addNumberCheck(checks, "H5_CODE_IP_HOURLY_LIMIT", "H5 IP 小时限额", Number(config.get("H5_CODE_IP_HOURLY_LIMIT", 60)), 1, 5000, "次");
}

function addAdminLoginRateLimitChecks(checks: RuntimeConfigCheck[], config: ConfigService) {
  addNumberCheck(checks, "ADMIN_LOGIN_WINDOW_MINUTES", "后台登录失败统计窗口", Number(config.get("ADMIN_LOGIN_WINDOW_MINUTES", 10)), 1, 1440, "分钟");
  addNumberCheck(checks, "ADMIN_LOGIN_MAX_FAILURES", "后台登录失败上限", Number(config.get("ADMIN_LOGIN_MAX_FAILURES", 5)), 1, 100, "次");
  addNumberCheck(checks, "ADMIN_LOGIN_LOCK_MINUTES", "后台登录限流时长", Number(config.get("ADMIN_LOGIN_LOCK_MINUTES", 10)), 1, 1440, "分钟");
}


function addSmsDbConfigCheck(checks: RuntimeConfigCheck[], config: ConfigService) {
  const enabled = config.get("SMS_PROVIDER_ENABLED") === "true";
  if (enabled) {
    const missing = ["SMS_ACCESS_KEY_ID", "SMS_ACCESS_KEY_SECRET", "SMS_SIGN_NAME", "SMS_TEMPLATE_ID"].filter((key) => !config.get<string>(key));
    if (missing.length) return addCheck(checks, "SMS_PROVIDER_ENABLED", "短信服务", "warning", "短信服务商参数已改为后台系统设置维护；首次部署可先启动后台再配置。", "后台配置");
    addCheck(checks, "SMS_PROVIDER_ENABLED", "短信服务", "ok", "短信服务在 .env 中已声明启用，实际使用后台系统设置中的密钥。", "环境变量已声明");
  } else {
    addCheck(checks, "SMS_PROVIDER_ENABLED", "短信服务", "warning", "短信服务商参数已改为后台系统设置维护；可在部署后登录后台配置。", "未启用/后台配置");
  }
}
function maskOrigins(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean).join(', ');
}
