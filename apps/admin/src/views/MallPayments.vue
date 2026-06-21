<template>
  <div class="mall-payment-page">
    <div class="page-header">
      <div>
        <h2>商城收款配置</h2>
        <p>商家/代理被平台授权店铺后，可在这里维护自己的微信或支付宝收款资料；平台可统一监管所有店铺配置。</p>
      </div>
      <div class="header-actions">
        <el-input v-model="keyword" clearable placeholder="搜索店铺/编码/地区" style="width:240px" @keyup.enter="loadMerchants" @clear="loadMerchants" />
        <el-button @click="loadMerchants">刷新店铺</el-button>
      </div>
    </div>

    <el-alert
      v-if="deepLinkWarning"
      type="error"
      show-icon
      :closable="false"
      class="deep-link-alert"
      title="店铺工作台链接不可用"
      :description="deepLinkWarning"
    />

    <el-alert
      v-if="!loading && !merchants.length"
      type="warning"
      show-icon
      :closable="false"
      title="当前账号暂无可配置的商城店铺"
      description="请让平台管理员在「店铺管理」里先创建店铺并授权当前后台账号；授权后才能添加商品、处理订单和绑定收款账户。"
    />

    <div v-else class="payment-layout">
      <section class="merchant-panel">
        <div class="panel-title">选择店铺</div>
        <el-select v-model="selectedMerchantId" filterable placeholder="请选择要配置收款的店铺" @change="selectMerchant">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantOptionLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-skeleton v-if="loading" :rows="5" animated />
        <div v-else class="merchant-list">
          <button
            v-for="merchant in merchants"
            :key="merchant.id"
            class="merchant-card"
            :class="{ active: merchant.id === selectedMerchantId }"
            type="button"
            @click="selectMerchant(merchant.id)"
          >
            <strong>{{ merchant.name }}</strong>
            <span>{{ ownerText(merchant.ownerType) }} · {{ merchant.region || "未设地区" }}</span>
            <small>{{ merchant.tenant?.name || merchant.tenant?.code || "商家" }} · {{ paymentModeText(merchant.paymentMode) }}</small>
          </button>
        </div>
      </section>

      <section class="config-panel">
        <template v-if="selectedMerchant">
          <div class="selected-card">
            <div>
              <h3>{{ selectedMerchant.name }}</h3>
              <p>{{ selectedMerchant.notice || "该店铺可独立维护商品、履约、收款配置和后续结算。" }}</p>
              <div class="tag-row">
                <el-tag :type="selectedMerchantOpen ? 'success' : 'info'">{{ selectedMerchantOpen ? "商城已开放" : "商城未开放" }}</el-tag>
                <el-tag type="info">{{ paymentModeText(selectedMerchant.paymentMode) }}</el-tag>
                <el-tag :type="readinessTagType">{{ readinessLabel }}</el-tag>
              </div>
              <p v-if="readinessTip" class="readiness-tip">{{ readinessTip }}</p>
            </div>
            <div class="selected-actions">
              <el-button :loading="readinessLoading" @click="loadReadiness">刷新支付状态</el-button>
              <el-button type="primary" plain @click="goMallPage('/mall-products')">商品管理</el-button>
              <el-button type="primary" plain @click="goMallPage('/mall-orders')">订单管理</el-button>
              <el-button type="warning" plain @click="goMallPage('/mall-refunds')">售后处理</el-button>
              <el-button type="success" plain @click="goMallPage('/mall-marketing')">营销工具</el-button>
              <el-button type="info" plain @click="goMallPage('/mall-statistics')">经营统计</el-button>
              <el-button @click="openMerchantH5">打开 H5 店铺</el-button>
              <el-button @click="copyMerchantH5">复制店铺链接</el-button>
              <el-button @click="copyWorkbenchLink">复制工作台链接</el-button>
            </div>
          </div>
          <el-alert
            v-if="!selectedMerchantOpen"
            class="merchant-disabled-alert"
            type="warning"
            show-icon
            :closable="false"
            title="当前店铺尚未开放商城"
            :description="selectedMerchantDisabledReason"
          />

          <div class="acceptance-panel">
            <div class="acceptance-head">
              <div>
                <h3>支付资料上传与验收</h3>
                <p>商户资料、证书密钥、回调地址、配置检测和真实小额验收统一在这里闭环。</p>
              </div>
              <div class="acceptance-actions">
                <el-button :loading="acceptanceChecking || readinessLoading" @click="runPaymentConfigCheck">配置检测</el-button>
                <el-tooltip :disabled="canRunTestPayment" :content="testPaymentDisabledReason" placement="top">
                  <span><el-button type="success" :disabled="!canRunTestPayment" @click="runTestPayment">测试支付</el-button></span>
                </el-tooltip>
              </div>
            </div>
            <div class="acceptance-grid">
              <div v-for="step in acceptanceSteps" :key="step.key" class="acceptance-item">
                <div class="acceptance-item-head">
                  <strong>{{ step.label }}</strong>
                  <el-tag :type="step.type">{{ step.status }}</el-tag>
                </div>
                <p>{{ step.desc }}</p>
              </div>
            </div>
            <div class="callback-grid">
              <div v-for="row in callbackRows" :key="row.label" class="callback-item">
                <div class="acceptance-item-head">
                  <strong>{{ row.label }}</strong>
                  <el-tag :type="row.type">{{ row.status }}</el-tag>
                </div>
                <small>{{ row.url || row.desc }}</small>
              </div>
            </div>
          </div>

          <div class="section-head">
            <div>
              <h3>收款账户</h3>
              <p>商户直收会优先使用店铺收款账户；平台代收店铺也可以先维护资料，等联调通过后再切换模式。</p>
            </div>
            <el-button type="primary" :disabled="!!deepLinkWarning" @click="resetPaymentForm">新增账户</el-button>
          </div>

          <el-table v-loading="paymentLoading" :data="paymentRows" stripe empty-text="暂无店铺收款账户">
            <el-table-column label="渠道" width="110"><template #default="{ row }">{{ providerLabel(row.provider) }}</template></el-table-column>
            <el-table-column label="商户信息" min-width="220">
              <template #default="{ row }">
                <strong>{{ row.merchantName || "-" }}</strong>
                <small>{{ row.merchantNo || "未填写商户号" }}</small>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
            <el-table-column label="资料完整度" min-width="170">
              <template #default="{ row }">
                <el-tag :type="accountReadiness(row).type">{{ accountReadiness(row).label }}</el-tag>
                <small class="cell-tip">{{ accountReadiness(row).desc }}</small>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }"><el-button size="small" :disabled="!!deepLinkWarning" @click="editPaymentAccount(row)">编辑</el-button></template>
            </el-table-column>
          </el-table>

          <el-card class="payment-form-card" shadow="never">
            <template #header>{{ paymentForm.id ? "编辑收款账户" : "新增收款账户" }}</template>
            <el-form label-width="100px">
              <el-form-item label="支付渠道">
                <el-select v-model="paymentForm.provider" @change="resetPaymentTemplate">
                  <el-option label="微信支付" value="wechat" />
                  <el-option label="支付宝" value="alipay" />
                </el-select>
              </el-form-item>
              <el-form-item label="商户名称"><el-input v-model="paymentForm.merchantName" maxlength="120" placeholder="如：某某书院自营店" /></el-form-item>
              <el-form-item label="商户号"><el-input v-model="paymentForm.merchantNo" maxlength="128" placeholder="微信商户号 / 支付宝商户标识" /></el-form-item>
              <el-form-item label="启用"><el-switch v-model="paymentForm.enabled" /></el-form-item>
              <el-alert class="payment-readiness-alert" :type="paymentFormReadiness.type" show-icon :closable="false" :title="paymentFormReadiness.label" :description="paymentFormReadiness.desc" />
              <el-divider content-position="left">支付资料</el-divider>
              <el-form-item v-for="field in activePaymentConfigFields" :key="field.key" :label="field.label">
                <div class="config-field">
                  <div v-if="field.credential" class="credential-line">
                    <el-input
                      :model-value="paymentConfigValue(field.key)"
                      :placeholder="field.placeholder"
                      @update:model-value="(value: string) => setPaymentConfigValue(field.key, value)"
                    />
                    <el-upload
                      action="/api/admin/mall/merchant-payment-credentials"
                      name="file"
                      :headers="uploadHeaders()"
                      :show-file-list="false"
                      :before-upload="(file: File) => beforePaymentCredentialUpload(field.key, file)"
                      :on-success="(response: any) => handlePaymentCredentialSuccess(field.key, response)"
                      :on-error="handlePaymentCredentialError"
                    >
                      <el-button :icon="UploadFilled" :loading="credentialUploadingKey === field.key">上传</el-button>
                    </el-upload>
                  </div>
                  <el-input
                    v-else
                    :model-value="paymentConfigValue(field.key)"
                    :type="field.secret ? 'password' : 'text'"
                    :show-password="field.secret"
                    :placeholder="field.placeholder"
                    @update:model-value="(value: string) => setPaymentConfigValue(field.key, value)"
                  />
                  <small>{{ field.required ? "必填 · " : "" }}{{ field.help }}</small>
                </div>
              </el-form-item>
              <el-form-item label="高级 JSON">
                <el-input v-model="paymentForm.configText" type="textarea" :rows="10" spellcheck="false" />
              </el-form-item>
              <div class="payment-actions">
                <el-button @click="resetPaymentTemplate">套用模板</el-button>
                <el-button v-if="paymentForm.id" @click="resetPaymentForm">取消编辑</el-button>
                <el-button type="primary" :loading="paymentSaving" :disabled="!!deepLinkWarning" @click="savePaymentAccount">{{ paymentForm.id ? "保存账户" : "新增账户" }}</el-button>
              </div>
            </el-form>
          </el-card>
        </template>
        <el-empty v-else description="请选择一个店铺后再配置收款账户" />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { UploadFilled } from "@element-plus/icons-vue";
import { api } from "../api";
import { copyToClipboard, h5RoutePreviewUrl } from "../h5-preview";

type Tenant = { id: number; name?: string; code?: string };
type Merchant = {
  id: number;
  code: string;
  name: string;
  ownerType: "tenant" | "agent";
  tenant?: Tenant | null;
  paymentMode: "platform_collect" | "merchant_direct";
  status: string;
  mallEnabled: boolean;
  region?: string | null;
  notice?: string | null;
};
type PaymentReadiness = {
  status: string;
  statusText?: string;
  collectionMode?: "platform_collect" | "merchant_direct";
  issues?: string[];
  nextAction?: string;
  real?: { notifyUrl?: string; refundNotifyUrl?: string };
  direct?: { notifyUrl?: string; refundNotifyUrl?: string; account?: { merchantName?: string; merchantNo?: string } | null } | null;
};
type MerchantPaymentAccount = {
  id: number;
  provider: "wechat" | "alipay";
  merchantName?: string | null;
  merchantNo?: string | null;
  enabled: boolean;
  config?: Record<string, unknown> | null;
};
type PaymentConfigField = {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
  credential?: boolean;
  secret?: boolean;
  help: string;
};

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const readinessLoading = ref(false);
const acceptanceChecking = ref(false);
const paymentLoading = ref(false);
const paymentSaving = ref(false);
const credentialUploadingKey = ref("");
const keyword = ref("");
const selectedMerchantId = ref<number>();
const deepLinkWarning = ref("");
const merchants = ref<Merchant[]>([]);
const paymentReadiness = ref<PaymentReadiness | null>(null);
const paymentRows = ref<MerchantPaymentAccount[]>([]);
const paymentForm = reactive({ id: 0, provider: "wechat" as "wechat" | "alipay", merchantName: "", merchantNo: "", enabled: true, configText: "" });

const paymentRequirements: Record<MerchantPaymentAccount["provider"], string[]> = {
  wechat: ["WECHAT_PAY_APP_ID", "WECHAT_PAY_MCH_ID", "WECHAT_PAY_API_V3_KEY", "WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_PAY_CERT_SERIAL_NO", "WECHAT_PAY_PLATFORM_CERT_PATH"],
  alipay: ["ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY_PATH", "ALIPAY_PUBLIC_CERT_PATH", "ALIPAY_ROOT_CERT_PATH"]
};
const paymentConfigFields: Record<MerchantPaymentAccount["provider"], PaymentConfigField[]> = {
  wechat: [
    { key: "WECHAT_PAY_APP_ID", label: "微信 AppID", placeholder: "公众号/小程序 AppID", required: true, help: "与当前商户号绑定的公众号、小程序或开放平台 AppID。" },
    { key: "WECHAT_PAY_MCH_ID", label: "微信商户号", placeholder: "如 1900000001", required: true, help: "微信支付商户平台分配的商户号，应与上方商户号一致。" },
    { key: "WECHAT_PAY_API_V3_KEY", label: "API v3 密钥", placeholder: "32 位 API v3 key", required: true, secret: true, help: "用于微信回调资源解密；保存后会脱敏显示。" },
    { key: "WECHAT_PAY_PRIVATE_KEY_PATH", label: "商户私钥", placeholder: "上传 apiclient_key.pem 后自动填入服务器路径", required: true, credential: true, help: "上传商户 API 证书私钥文件，后台保存服务器路径并检测可读取。" },
    { key: "WECHAT_PAY_CERT_SERIAL_NO", label: "证书序列号", placeholder: "商户 API 证书序列号", required: true, help: "微信商户 API 证书序列号，用于请求签名头。" },
    { key: "WECHAT_PAY_PLATFORM_CERT_PATH", label: "平台证书", placeholder: "上传微信支付平台证书后自动填入服务器路径", required: true, credential: true, help: "用于微信响应和回调验签；证书文件需要在服务器本地可读取。" }
  ],
  alipay: [
    { key: "ALIPAY_APP_ID", label: "支付宝 AppID", placeholder: "支付宝开放平台应用 ID", required: true, help: "支付宝开放平台创建应用后获得的 AppID。" },
    { key: "ALIPAY_PRIVATE_KEY_PATH", label: "应用私钥", placeholder: "上传应用私钥 PEM 后自动填入服务器路径", required: true, credential: true, help: "用于支付宝请求签名；保存后只保留脱敏路径。" },
    { key: "ALIPAY_PUBLIC_CERT_PATH", label: "支付宝公钥证书", placeholder: "上传 alipayCertPublicKey_RSA2.crt", required: true, credential: true, help: "用于支付宝网关响应和回调验签。" },
    { key: "ALIPAY_ROOT_CERT_PATH", label: "支付宝根证书", placeholder: "上传 alipayRootCert.crt", required: true, credential: true, help: "用于证书链校验；当前商城支付宝为预留配置，未通过真实验收前不放量。" }
  ]
};

function routeMerchantId() {
  const id = typeof route.query.merchantId === "string" ? Number(route.query.merchantId) : 0;
  return id || undefined;
}

function routeTenantId() {
  const id = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : 0;
  return id || undefined;
}

const selectedMerchant = computed(() => merchants.value.find((item) => item.id === selectedMerchantId.value));
const selectedMerchantOpen = computed(() => merchantOperational(selectedMerchant.value));
const selectedMerchantDisabledReason = computed(() => merchantDisabledReason(selectedMerchant.value));
const readinessLabel = computed(() => {
  const readiness = paymentReadiness.value;
  if (!readiness) return readinessLoading.value ? "检测中" : "未检测";
  if (readiness.collectionMode === "merchant_direct") return readiness.status === "real_ready" ? "直收就绪" : "直收未就绪";
  return readiness.statusText || ({ real_ready: "真实就绪", sandbox_ready: "沙箱可验收", disabled: "未开启", not_ready: "未就绪" } as Record<string, string>)[readiness.status] || readiness.status;
});
const readinessTagType = computed(() => {
  if (paymentReadiness.value?.status === "real_ready") return "success";
  if (paymentReadiness.value?.status === "sandbox_ready") return "warning";
  if (paymentReadiness.value?.status === "disabled") return "info";
  return "danger";
});
const readinessTip = computed(() => {
  const readiness = paymentReadiness.value;
  if (!readiness) return "点击刷新支付状态可查看缺少哪些配置。";
  const issues = readiness.issues?.filter(Boolean) || [];
  if (issues.length) return issues.slice(0, 5).join("；");
  if (readiness.direct?.account) return `商户直收账户：${readiness.direct.account.merchantName || readiness.direct.account.merchantNo || "已配置"}；退款回调：${readiness.direct.refundNotifyUrl || "未返回"}`;
  return readiness.nextAction || `支付回调：${readiness.real?.notifyUrl || "未返回"}；退款回调：${readiness.real?.refundNotifyUrl || "未返回"}`;
});
const paymentFormReadiness = computed(() => {
  const parsed = parsePaymentConfig();
  if (!parsed.ok) return { type: "danger" as const, label: "配置 JSON 有误", desc: parsed.error };
  return accountReadiness({ provider: paymentForm.provider, config: parsed.value });
});
const activePaymentConfigFields = computed(() => paymentConfigFields[paymentForm.provider]);
const callbackRows = computed(() => {
  const readiness = paymentReadiness.value;
  const merchantId = selectedMerchantId.value;
  const directMode = readiness?.collectionMode === "merchant_direct";
  const paymentUrl = directMode ? readiness?.direct?.notifyUrl : readiness?.real?.notifyUrl;
  const refundUrl = directMode ? readiness?.direct?.refundNotifyUrl : readiness?.real?.refundNotifyUrl;
  const paymentPath = directMode && merchantId ? `/payment/mall/merchants/${merchantId}/wechat/callback` : "/payment/mall/wechat/callback";
  const refundPath = directMode && merchantId ? `/payment/mall/merchants/${merchantId}/wechat/refund-callback` : "/payment/mall/wechat/refund-callback";
  return [
    callbackCheck("支付回调 URL", paymentUrl, paymentPath),
    callbackCheck("退款回调 URL", refundUrl, refundPath)
  ];
});
const canRunTestPayment = computed(() => paymentReadiness.value?.status === "real_ready");
const testPaymentDisabledReason = computed(() => {
  const readiness = paymentReadiness.value;
  if (!readiness) return "请先执行配置检测。";
  if (readiness.status === "real_ready") return "";
  const issues = readiness.issues?.filter(Boolean) || [];
  return issues[0] || "真实支付配置尚未达到可测试状态。";
});
const acceptanceSteps = computed(() => {
  const enabledRows = paymentRows.value.filter((row) => row.enabled);
  const completeEnabledRows = enabledRows.filter((row) => accountReadiness(row).type === "success");
  const readiness = paymentReadiness.value;
  const callbacksOk = callbackRows.value.every((row) => row.type === "success");
  const configType = !readiness ? "info" : readiness.status === "real_ready" ? "success" : readiness.status === "sandbox_ready" ? "warning" : readiness.status === "disabled" ? "info" : "danger";
  return [
    {
      key: "materials",
      label: "资料上传",
      status: completeEnabledRows.length ? "资料完整" : paymentRows.value.length ? "待补齐" : "未配置",
      type: completeEnabledRows.length ? "success" as const : paymentRows.value.length ? "warning" as const : "danger" as const,
      desc: completeEnabledRows.length ? `已启用 ${completeEnabledRows.length} 个资料完整账户。` : "请至少保存一个资料完整的启用账户；缺资料可先存为停用草稿。"
    },
    {
      key: "callback",
      label: "回调 URL 校验",
      status: callbacksOk ? "通过" : "待修复",
      type: callbacksOk ? "success" as const : "danger" as const,
      desc: callbacksOk ? "支付与退款回调均为 HTTPS 且指向商城专用路径。" : callbackRows.value.map((row) => row.desc).join("；")
    },
    {
      key: "config",
      label: "配置检测",
      status: readiness?.statusText || "未检测",
      type: configType as "success" | "warning" | "info" | "danger",
      desc: readiness?.nextAction || "点击配置检测读取后端真实 readiness。"
    },
    {
      key: "test",
      label: "测试支付",
      status: canRunTestPayment.value ? "可发起" : "已锁定",
      type: canRunTestPayment.value ? "warning" as const : "info" as const,
      desc: canRunTestPayment.value ? "仅可在预发环境用小额真实订单留存证据；后台不会替你伪造通过记录。" : testPaymentDisabledReason.value
    },
    {
      key: "acceptance",
      label: "验收状态",
      status: readiness?.status === "real_ready" ? "待小额验收" : "未通过",
      type: readiness?.status === "real_ready" ? "warning" as const : "danger" as const,
      desc: readiness?.status === "real_ready" ? "完成真实下单、回调、重复回调、退款、账单和错路由拒绝证据后，再更新真实支付验收文件。" : "未达到配置就绪前，不能开放真实支付或店铺直收。"
    }
  ];
});

function ownerText(value: string) {
  return value === "agent" ? "代理店铺" : "商家店铺";
}

function paymentModeText(value: string) {
  return value === "merchant_direct" ? "商户直收" : "平台代收";
}

function merchantOperational(merchant?: Merchant) {
  return !!merchant && merchant.status === "active" && merchant.mallEnabled !== false;
}

function merchantDisabledReason(merchant?: Merchant) {
  if (!merchant) return "请先选择要配置收款账户的商城店铺。";
  if (merchant.status !== "active") return "当前店铺尚未启用，开通前可以先维护收款账户和查看支付就绪状态；商品、营销、订单、发货等运营操作仍不可用。";
  if (merchant.mallEnabled === false) return "当前店铺尚未开放商城，开通前可以先维护收款账户和查看支付就绪状态；商品、营销、订单、发货等运营操作仍不可用。";
  return "";
}

function requireSelectedMerchant() {
  if (deepLinkWarning.value) {
    ElMessage.error("当前店铺链接不可用，请先确认店铺授权后再操作。");
    return false;
  }
  if (!selectedMerchantId.value || !selectedMerchant.value) {
    ElMessage.warning("请先选择要配置收款账户的商城店铺");
    return false;
  }
  return true;
}

function providerLabel(value: string) {
  return value === "alipay" ? "支付宝" : "微信支付";
}

function merchantOptionLabel(merchant: Merchant) {
  const status = merchantOperational(merchant) ? "" : " · 未开放";
  return `${merchant.name}（${ownerText(merchant.ownerType)} · ${paymentModeText(merchant.paymentMode)}${status}）`;
}

function paymentConfigTemplate(provider: "wechat" | "alipay") {
  const template =
    provider === "wechat"
      ? {
          WECHAT_PAY_APP_ID: "",
          WECHAT_PAY_MCH_ID: "",
          WECHAT_PAY_API_V3_KEY: "",
          WECHAT_PAY_PRIVATE_KEY_PATH: "",
          WECHAT_PAY_CERT_SERIAL_NO: "",
          WECHAT_PAY_PLATFORM_CERT_PATH: ""
        }
      : {
          ALIPAY_APP_ID: "",
          ALIPAY_PRIVATE_KEY_PATH: "",
          ALIPAY_PUBLIC_CERT_PATH: "",
          ALIPAY_ROOT_CERT_PATH: ""
        };
  return JSON.stringify(template, null, 2);
}

function parsePaymentConfig(text = paymentForm.configText) {
  try {
    const value = JSON.parse(text || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("配置必须是 JSON 对象");
    return { ok: true as const, value: value as Record<string, unknown>, error: "" };
  } catch (error: any) {
    return { ok: false as const, value: null, error: error.message || "JSON 格式不正确" };
  }
}

function paymentConfigValue(key: string) {
  const parsed = parsePaymentConfig();
  if (!parsed.ok) return "";
  const value = parsed.value[key];
  return value === undefined || value === null ? "" : String(value);
}

function setPaymentConfigValue(key: string, value: string | number) {
  const parsed = parsePaymentConfig();
  const next = parsed.ok ? { ...parsed.value } : {};
  const text = String(value ?? "").trim();
  if (text) next[key] = text;
  else delete next[key];
  paymentForm.configText = JSON.stringify(next, null, 2);
}

function callbackCheck(label: string, url: string | undefined, expectedPath: string) {
  const value = String(url || "").trim();
  if (!value) return { label, url: "", type: "danger" as const, status: "未生成", desc: `${label} 未生成，请先配置商城支付回调域名。` };
  if (!/^https:\/\//i.test(value)) return { label, url: value, type: "danger" as const, status: "非 HTTPS", desc: `${label} 必须使用 HTTPS。` };
  if (!value.includes(expectedPath)) return { label, url: value, type: "danger" as const, status: "路径不匹配", desc: `${label} 必须指向 ${expectedPath}。` };
  return { label, url: value, type: "success" as const, status: "通过", desc: `${label} 已指向商城专用回调路径。` };
}

function accountReadiness(row: Pick<MerchantPaymentAccount, "provider" | "config">) {
  const config = row.config || {};
  const missing = paymentRequirements[row.provider].filter((key) => !String(config[key] || "").trim());
  if (!row.config) return { type: "danger" as const, label: "未配置", desc: "请先填写支付机构商户参数。" };
  if (missing.length) return { type: "warning" as const, label: `缺 ${missing.length} 项`, desc: `缺少：${missing.join("、")}` };
  return { type: "success" as const, label: "资料完整", desc: "可进入小额真实支付联调；回调地址由商城按店铺自动生成。" };
}

function uploadHeaders() {
  const token = localStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function beforePaymentCredentialUpload(key: string, file: File) {
  const allowed = [".pem", ".key", ".crt", ".cer", ".p12", ".pfx"];
  const lowerName = file.name.toLowerCase();
  if (!allowed.some((suffix) => lowerName.endsWith(suffix))) {
    ElMessage.error("仅支持 .pem/.key/.crt/.cer/.p12/.pfx 支付证书或密钥文件");
    return false;
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error("支付证书或密钥文件不能超过 2MB");
    return false;
  }
  credentialUploadingKey.value = key;
  return true;
}

function handlePaymentCredentialSuccess(key: string, response: any) {
  const payload = response?.data || response || {};
  const filePath = String(payload.path || "").trim();
  credentialUploadingKey.value = "";
  if (!filePath) {
    ElMessage.error("支付资料上传成功但未返回服务器路径");
    return;
  }
  setPaymentConfigValue(key, filePath);
  ElMessage.success("支付资料已上传，并已填入服务器路径");
}

function handlePaymentCredentialError(error: any) {
  credentialUploadingKey.value = "";
  ElMessage.error(error?.message || "支付资料上传失败");
}

async function loadMerchants() {
  loading.value = true;
  try {
    const tenantId = routeTenantId() || Number(localStorage.getItem("admin_selected_tenant_id") || 0) || undefined;
    merchants.value = await api.get<any, Merchant[]>("/admin/mall/payment-merchants", { params: { tenantId, keyword: keyword.value.trim() || undefined } });
    const requestedMerchantId = routeMerchantId();
    deepLinkWarning.value = "";
    if (requestedMerchantId && merchants.value.some((item) => item.id === requestedMerchantId)) {
      selectedMerchantId.value = requestedMerchantId;
    } else if (requestedMerchantId) {
      selectedMerchantId.value = undefined;
      deepLinkWarning.value = `当前链接指定的店铺 #${requestedMerchantId} 对当前账号不可见，或已被商家/关键词筛选条件过滤。为避免误操作，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
    } else if (!selectedMerchantId.value || !merchants.value.some((item) => item.id === selectedMerchantId.value)) {
      selectedMerchantId.value = merchants.value[0]?.id;
    }
    await loadSelectedMerchantData();
  } catch (error: any) {
    ElMessage.error(error.message || "加载商城店铺失败");
  } finally {
    loading.value = false;
  }
}

async function selectMerchant(id: number) {
  deepLinkWarning.value = "";
  selectedMerchantId.value = id;
  syncMerchantRouteQuery();
  await loadSelectedMerchantData();
}

function syncMerchantRouteQuery() {
  const merchant = selectedMerchant.value;
  const query = { ...route.query };
  if (selectedMerchantId.value) query.merchantId = String(selectedMerchantId.value);
  else delete query.merchantId;
  if (merchant?.tenant?.id) query.tenantId = String(merchant.tenant.id);
  else delete query.tenantId;
  router.replace({ path: route.path, query });
}

async function loadSelectedMerchantData() {
  paymentReadiness.value = null;
  paymentRows.value = [];
  resetPaymentForm();
  if (!selectedMerchantId.value) return;
  await Promise.all([loadReadiness(), loadPaymentAccounts()]);
}

async function loadReadiness() {
  if (!selectedMerchantId.value) return;
  readinessLoading.value = true;
  try {
    paymentReadiness.value = await api.get<any, PaymentReadiness>("/admin/mall/payment-readiness", { params: { merchantId: selectedMerchantId.value } });
  } catch (error: any) {
    paymentReadiness.value = { status: "not_ready", statusText: "读取失败", collectionMode: selectedMerchant.value?.paymentMode, issues: [error.message || "支付状态读取失败，请确认当前账号有商城支付配置权限"] };
  } finally {
    readinessLoading.value = false;
  }
}

async function runPaymentConfigCheck() {
  if (!requireSelectedMerchant()) return;
  acceptanceChecking.value = true;
  try {
    await Promise.all([loadReadiness(), loadPaymentAccounts()]);
    const issues = paymentReadiness.value?.issues?.filter(Boolean) || [];
    if (issues.length) ElMessage.warning(`配置检测未通过：${issues[0]}`);
    else ElMessage.success("配置检测通过，仍需小额真实支付验收后才能上线放量");
  } finally {
    acceptanceChecking.value = false;
  }
}

function runTestPayment() {
  if (!requireSelectedMerchant()) return;
  if (!canRunTestPayment.value) {
    ElMessage.warning(testPaymentDisabledReason.value);
    return;
  }
  ElMessage.warning("请在预发环境创建小额真实订单完成支付，并把下单、回调、退款、账单和错路由拒绝证据写入真实支付验收结果。");
  openMerchantH5();
}

async function loadPaymentAccounts() {
  if (!selectedMerchantId.value) return;
  paymentLoading.value = true;
  try {
    paymentRows.value = await api.get<any, MerchantPaymentAccount[]>("/admin/mall/merchant-payment-accounts", { params: { merchantId: selectedMerchantId.value } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载店铺收款账户失败");
  } finally {
    paymentLoading.value = false;
  }
}

function resetPaymentTemplate() {
  paymentForm.configText = paymentConfigTemplate(paymentForm.provider);
}

function resetPaymentForm() {
  Object.assign(paymentForm, { id: 0, provider: "wechat", merchantName: "", merchantNo: "", enabled: true, configText: paymentConfigTemplate("wechat") });
}

function editPaymentAccount(row: MerchantPaymentAccount) {
  if (!requireSelectedMerchant()) return;
  Object.assign(paymentForm, {
    id: row.id,
    provider: row.provider,
    merchantName: row.merchantName || "",
    merchantNo: row.merchantNo || "",
    enabled: row.enabled !== false,
    configText: JSON.stringify(row.config || {}, null, 2)
  });
}

async function savePaymentAccount() {
  if (!requireSelectedMerchant()) return;
  const parsed = parsePaymentConfig();
  if (!parsed.ok) {
    ElMessage.error(parsed.error);
    return;
  }
  paymentSaving.value = true;
  try {
    const payload = {
      merchantId: selectedMerchantId.value,
      provider: paymentForm.provider,
      merchantName: paymentForm.merchantName.trim() || undefined,
      merchantNo: paymentForm.merchantNo.trim() || undefined,
      enabled: paymentForm.enabled,
      config: parsed.value
    };
    if (paymentForm.id) await api.patch(`/admin/mall/merchant-payment-accounts/${paymentForm.id}`, payload);
    else await api.post("/admin/mall/merchant-payment-accounts", payload);
    ElMessage.success("店铺收款账户已保存");
    await Promise.all([loadPaymentAccounts(), loadReadiness()]);
    resetPaymentForm();
  } catch (error: any) {
    ElMessage.error(error.message || "保存店铺收款账户失败");
  } finally {
    paymentSaving.value = false;
  }
}

function merchantH5Url() {
  if (!selectedMerchant.value) return "";
  return h5RoutePreviewUrl(selectedMerchant.value.tenant?.code || "", `/pages/mall/merchant?id=${selectedMerchant.value.id}`);
}

function merchantWorkbenchUrl() {
  if (!selectedMerchant.value) return "";
  const query = new URLSearchParams();
  if (selectedMerchant.value.tenant?.id) query.set("tenantId", String(selectedMerchant.value.tenant.id));
  query.set("merchantId", String(selectedMerchant.value.id));
  return `${window.location.origin}/admin/mall-payments?${query.toString()}`;
}

function openMerchantH5() {
  const url = merchantH5Url();
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

function goMallPage(path: string) {
  if (!selectedMerchant.value) return;
  router.push({ path, query: { tenantId: selectedMerchant.value.tenant?.id, merchantId: selectedMerchant.value.id } });
}

async function copyMerchantH5() {
  const url = merchantH5Url();
  if (!url) return;
  await copyToClipboard(url);
  ElMessage.success("店铺 H5 链接已复制，可发给用户或商家运营。");
}

async function copyWorkbenchLink() {
  const url = merchantWorkbenchUrl();
  if (!url) return;
  await copyToClipboard(url);
  ElMessage.success("店铺后台工作台链接已复制，可发给已授权的商家/代理账号。");
}

onMounted(loadMerchants);
watch(() => [route.query.tenantId, route.query.merchantId], async () => {
  if (routeTenantId() && routeTenantId() !== selectedMerchant.value?.tenant?.id) {
    await loadMerchants();
    return;
  }
  const nextId = routeMerchantId();
  if (nextId && nextId !== selectedMerchantId.value && merchants.value.some((item) => item.id === nextId)) {
    deepLinkWarning.value = "";
    selectedMerchantId.value = nextId;
    await loadSelectedMerchantData();
  } else if (nextId && nextId !== selectedMerchantId.value) {
    selectedMerchantId.value = undefined;
    deepLinkWarning.value = `当前链接指定的店铺 #${nextId} 对当前账号不可见，或已被商家/关键词筛选条件过滤。为避免误操作，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
    await loadSelectedMerchantData();
  }
});
</script>

<style scoped>
.mall-payment-page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.page-header h2 { margin: 0 0 6px; }
.page-header p { margin: 0; color: #667085; }
.header-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.deep-link-alert { margin-bottom: 16px; }
.merchant-disabled-alert { margin-bottom: 16px; }
.payment-layout { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 18px; }
.merchant-panel, .config-panel { background: #fff; border: 1px solid #edf0f5; border-radius: 16px; padding: 16px; }
.panel-title { font-weight: 700; margin-bottom: 12px; }
.merchant-list { display: grid; gap: 10px; margin-top: 14px; max-height: calc(100vh - 260px); overflow: auto; }
.merchant-card { text-align: left; border: 1px solid #edf0f5; background: #fbfcff; border-radius: 14px; padding: 12px; cursor: pointer; }
.merchant-card.active { border-color: #2f80ed; background: #eef6ff; box-shadow: 0 8px 24px rgba(47, 128, 237, 0.12); }
.merchant-card strong, .merchant-card span, .merchant-card small { display: block; }
.merchant-card span { margin-top: 6px; color: #475467; }
.merchant-card small { margin-top: 4px; color: #98a2b3; }
.selected-card { display: flex; justify-content: space-between; gap: 16px; border: 1px solid #edf0f5; border-radius: 16px; padding: 16px; background: linear-gradient(135deg, #f7fbff, #fffaf3); margin-bottom: 18px; }
.selected-card h3, .section-head h3 { margin: 0 0 6px; }
.selected-card p, .section-head p { margin: 0; color: #667085; }
.selected-actions { display: flex; gap: 8px; flex-wrap: wrap; align-content: flex-start; justify-content: flex-end; }
.tag-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.readiness-tip { margin-top: 10px !important; color: #b54708 !important; }
.acceptance-panel { border: 1px solid #e4e7ed; border-radius: 8px; padding: 14px; margin-bottom: 18px; background: #fff; }
.acceptance-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 12px; }
.acceptance-head h3 { margin: 0 0 6px; }
.acceptance-head p { margin: 0; color: #667085; }
.acceptance-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.acceptance-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.acceptance-item, .callback-item { border: 1px solid #edf0f5; border-radius: 8px; padding: 10px; background: #fbfcff; min-width: 0; }
.acceptance-item-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.acceptance-item-head strong { color: #1f2937; font-size: 13px; }
.acceptance-item p { margin: 8px 0 0; color: #667085; font-size: 12px; line-height: 1.45; }
.callback-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
.callback-item small { display: block; color: #667085; margin-top: 8px; line-height: 1.45; overflow-wrap: anywhere; }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.cell-tip { display: block; color: #98a2b3; margin-top: 4px; }
.payment-form-card { margin-top: 16px; }
.payment-readiness-alert { margin-bottom: 18px; }
.config-field { width: 100%; display: grid; gap: 6px; }
.config-field small { color: #667085; line-height: 1.45; }
.credential-line { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; }
.payment-actions { display: flex; gap: 10px; justify-content: flex-end; }
@media (max-width: 980px) {
  .page-header, .selected-card, .section-head { display: block; }
  .header-actions, .selected-actions { margin-top: 12px; justify-content: flex-start; }
  .payment-layout, .acceptance-grid, .callback-grid, .credential-line { grid-template-columns: 1fr; }
  .acceptance-head { display: block; }
  .acceptance-actions { margin-top: 12px; justify-content: flex-start; }
}
</style>
