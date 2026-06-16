<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { api } from "../api";

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

const loading = ref(false);
const report = ref<ConfigInspection | null>(null);

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

const productionRequiredKeys = new Set([
  "NODE_ENV",
  "JWT_SECRET",
  "DB_PASSWORD",
  "DB_SYNCHRONIZE",
  "CORS_ORIGIN",
  "PUBLIC_H5_ORIGIN",
  "PUBLIC_ADMIN_ORIGIN",
  "PUBLIC_API_ORIGIN",
  "SECURITY_HEADERS_ENABLED",
  "SECURITY_HSTS_ENABLED",
  "VALIDATION_FORBID_NON_WHITELISTED",
  "ACCESS_LOG_ENABLED",
  "TRUST_PROXY",
  "PAYMENT_SANDBOX_ENABLED",
  "H5_AUTH_MODE",
  "H5_AUTH_SECRET",
  "H5_SMS_PROVIDER"
]);

const optionalProviderKeys = new Set(["SMS_PROVIDER_ENABLED", "EMAIL_PROVIDER_ENABLED", "WECHAT_MESSAGE_PROVIDER_ENABLED"]);

const overallText = computed(() => {
  if (!report.value) return "正在检查";
  if (report.value.status === "ok") return "配置已通过上线体检";
  if (report.value.status === "warning") return "配置可运行，但上线前仍有待确认项";
  return "存在必须修复的生产配置问题";
});

async function load() {
  loading.value = true;
  try {
    report.value = await api.get<any, ConfigInspection>("/admin/system/config-check");
  } catch (error: any) {
    ElMessage.error(error.message || "加载上线体检失败");
  } finally {
    loading.value = false;
  }
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 19);
}

function statusLabel(row: ConfigCheck) {
  if (row.status !== "warning") return statusText[row.status];
  if (optionalProviderKeys.has(row.key)) return "按需启用";
  if (report.value?.environment !== "production" && productionRequiredKeys.has(row.key)) return "生产必须处理";
  return "本地允许";
}

function actionText(row: ConfigCheck) {
  const actions: Record<string, string> = {
    NODE_ENV: "生产 .env 设置 NODE_ENV=production，本地开发保持 development。",
    JWT_SECRET: "在生产 .env 替换为至少 32 位随机字符串，修改后重启 API。",
    DB_PASSWORD: "在生产 MySQL 和 .env 同步设置强密码，避免默认示例值。",
    DB_SYNCHRONIZE: "生产 .env 设置 DB_SYNCHRONIZE=false，结构变更改走 migration。",
    CORS_ORIGIN: "配置真实 HTTPS H5/后台域名，多个域名用英文逗号分隔。",
    PUBLIC_H5_ORIGIN: "配置 H5 正式 HTTPS 域名。",
    PUBLIC_ADMIN_ORIGIN: "配置后台正式 HTTPS 域名。",
    PUBLIC_API_ORIGIN: "配置 API 正式 HTTPS 域名或反向代理公开地址。",
    UPLOAD_DIR: "生产建议挂载持久化上传目录，避免容器重建丢图。",
    SECURITY_HEADERS_ENABLED: "生产 .env 设置 SECURITY_HEADERS_ENABLED=true。",
    SECURITY_HSTS_ENABLED: "HTTPS 稳定后设置 SECURITY_HSTS_ENABLED=true。",
    VALIDATION_FORBID_NON_WHITELISTED: "生产 .env 设置 VALIDATION_FORBID_NON_WHITELISTED=true。",
    ACCESS_LOG_ENABLED: "生产建议设置 ACCESS_LOG_ENABLED=true，便于审计和排错。",
    ACCESS_LOG_SKIP_HEALTH: "一般保持 true，避免健康检查刷屏。",
    TRUST_PROXY: "Nginx/负载均衡后部署时启用 TRUST_PROXY=true，保证真实 IP 审计和限流。",
    PAYMENT_SANDBOX_ENABLED: "生产上线前设置 PAYMENT_SANDBOX_ENABLED=false，避免 mock 支付影响真实订单。",
    PAYMENT_SANDBOX_SECRET: "仅沙箱/mock 支付启用时需要替换；真实生产支付关闭沙箱即可。",
    WECHAT_PAY_SANDBOX_SECRET: "仅微信沙箱支付启用时需要替换；真实生产支付关闭沙箱即可。",
    ALIPAY_PAY_SANDBOX_SECRET: "仅支付宝沙箱支付启用时需要替换；真实生产支付关闭沙箱即可。",
    REAL_PAYMENT_ENABLED: "官方下单、回调验签、退款查询、账单拉取和预发验收全部完成后，再打开 REAL_PAYMENT_ENABLED。",
    REAL_PAYMENT_PROVIDER: "至少启用 WECHAT_PAY_ENABLED 或 ALIPAY_ENABLED，并填完整对应商户、证书和回调配置。",
    REAL_PAYMENT_SDK_IMPLEMENTED: "接入微信/支付宝官方 SDK 或官方签名算法，完成真实下单参数生成后再放量。",
    REAL_PAYMENT_CALLBACK_VERIFICATION_IMPLEMENTED: "完成微信资源解密、支付宝回调归一化和官方证书验签，预发验证重复回调与异常金额。",
    REAL_REFUND_QUERY_IMPLEMENTED: "按官方退款查询/退款通知返回结构实现 adapter，确认服务商成功后才完成本地退款。",
    REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED: "接入微信/支付宝官方账单下载接口，解析后落入服务商账单记录和对账差异。",
    AGENT_REAL_TRANSFER_IMPLEMENTED: "确认支付机构转账产品、沙箱账号、回执字段和失败码后，再实现真实自动打款 SDK。",
    MULTI_TENANT_ENABLED: "只有机构表、tenantId 迁移、后台权限过滤、公开端边界和预发验收全部完成后才打开。",
    MULTI_TENANT_SCHEMA_IMPLEMENTED: "先完成机构表、核心业务表 tenantId、唯一索引调整和历史数据回填迁移。",
    MULTI_TENANT_ACCESS_FILTER_IMPLEMENTED: "完成管理员机构归属、列表/详情/导出过滤、写入归属校验和越权测试。",
    MULTI_TENANT_PUBLIC_BOUNDARY_IMPLEMENTED: "明确 H5 入口如何定位机构，确保活动、报名、支付回调和公开查询不会串机构。",
    MULTI_TENANT_PREFLIGHT_PASSED: "在预发环境跑 smoke:tenant:seed 和 smoke:tenant，并保留可供 preflight 校验的验收结果文件。",
    H5_AUTH_MODE: "生产设置 H5_AUTH_MODE=sms，本地演示可以保持 dev。",
    H5_AUTH_SECRET: "生产 .env 替换为至少 32 位随机字符串。",
    H5_SMS_PROVIDER: "生产 H5 短信登录需要启用短信服务，并配置服务商 Key、签名和模板 ID。",
    SMS_PROVIDER_ENABLED: "需要短信通知/验证码时启用并配置短信服务商 Key、签名和模板 ID；不用短信可暂不启用。",
    EMAIL_PROVIDER_ENABLED: "需要邮件通知时启用 SMTP；不用邮件可暂不启用。",
    WECHAT_MESSAGE_PROVIDER_ENABLED: "需要微信订阅消息时配置小程序 AppID/Secret；不用可暂不启用。",
    OFFLINE_PAYMENT_EXPIRE_MINUTES: "按运营规则设置线下付款有效期，建议上线前确认文案一致。",
    ORDER_CLOSE_WORKER_ENABLED: "需要自动关闭超时待付款订单时启用；否则可通过后台手动关单。",
    ORDER_CLOSE_WORKER_INTERVAL_SECONDS: "自动关单启用后设置合理扫描间隔，常用 300 秒。"
  };
  if (actions[row.key]) return actions[row.key];
  if (row.status === "ok") return "无需处理，保持当前配置。";
  if (row.status === "error") return "上线前必须修复该项并重启服务后重新检查。";
  return "本地可继续测试，上线前按说明确认是否需要调整。";
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div>
        <h2>上线体检</h2>
        <p class="subtitle">检查生产域名、密钥、支付、通知和自动任务配置。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="load">重新检查</el-button>
    </div>

    <el-alert v-if="report" :type="tagType[report.status]" :title="overallText" show-icon :closable="false" class="summary-alert" />
    <el-alert class="page-hint" type="info" :closable="false" show-icon title="上线前建议" description="每次修改生产环境变量、支付/通知配置或发布新版本后，都建议重新检查。存在“需修复”项时不要正式接流量。" />

    <div class="summary-grid" v-if="report">
      <div class="summary-card release">
        <span>当前版本</span>
        <strong>{{ report.release?.version || "-" }}</strong>
      </div>
      <div class="summary-card release">
        <span>发布提交</span>
        <strong>{{ report.release?.commit || "-" }}</strong>
      </div>
      <div class="summary-card release">
        <span>构建时间</span>
        <strong>{{ formatTime(report.release?.buildTime) }}</strong>
      </div>
      <div class="summary-card">
        <span>运行环境</span>
        <strong>{{ report.environment }}</strong>
      </div>
      <div class="summary-card ok">
        <span>正常</span>
        <strong>{{ report.summary.okCount }}</strong>
      </div>
      <div class="summary-card warning">
        <span>待确认</span>
        <strong>{{ report.summary.warningCount }}</strong>
      </div>
      <div class="summary-card error">
        <span>需修复</span>
        <strong>{{ report.summary.errorCount }}</strong>
      </div>
      <div class="summary-card">
        <span>检查时间</span>
        <strong>{{ formatTime(report.checkedAt) }}</strong>
      </div>
    </div>

    <div class="table-card">
      <el-empty v-if="!loading && !(report?.checks || []).length" description="暂无体检结果">
        <el-button type="primary" @click="load">开始检查</el-button>
      </el-empty>
      <el-table v-else :data="report?.checks || []" stripe v-loading="loading">
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="tagType[row.status as CheckStatus]">{{ statusLabel(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="label" label="检查项" width="180" />
        <el-table-column prop="key" label="配置键" width="240" />
        <el-table-column prop="value" label="当前状态" width="180" />
        <el-table-column prop="message" label="说明" min-width="320" />
        <el-table-column label="处理方式" min-width="380">
          <template #default="{ row }">
            <span class="action-text">{{ actionText(row) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 16px; }
.subtitle { margin: 6px 0 0; color: #64748b; font-size: 14px; }
.summary-alert { margin-bottom: 16px; }
.page-hint { margin-bottom: 16px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.summary-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.summary-card span { color: #64748b; font-size: 13px; }
.summary-card strong { color: #111827; font-size: 24px; overflow-wrap: anywhere; }
.summary-card.release strong { font-size: 18px; line-height: 1.35; }
.summary-card.ok strong { color: #16a34a; }
.summary-card.warning strong { color: #d97706; }
.summary-card.error strong { color: #dc2626; }
.action-text { color: #475569; line-height: 1.5; }
@media (max-width: 1100px) {
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
