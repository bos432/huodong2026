<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";

const props = defineProps<{ canEdit: boolean }>();

const form = reactive({
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
  realPaymentSdkImplemented: false,
  realPaymentCallbackVerificationImplemented: false,
  realRefundQueryImplemented: false,
  realPaymentStatementFetchImplemented: false,
  mallRealWechatPaymentImplemented: false,
  mallMerchantDirectPaymentImplemented: false,
  realPaymentPreflightPassed: false,
  realPaymentPreflightResultFile: "deploy/real-payment-smoke-result.json",
  realPaymentPreflightMaxAgeHours: 168,
  mallMultiMerchantPreflightPassed: false,
  mallMultiMerchantSmokeResultFile: "deploy/mall-multi-merchant-smoke-result.json",
  mallMultiMerchantSmokeMaxAgeHours: 168
});

const configKeys = Object.keys(form) as Array<keyof typeof form>;
const loading = ref(false);
const saving = ref(false);
const checking = ref(false);
const enabling = ref(false);
const disabling = ref(false);
const error = ref("");
const status = ref<any | null>(null);
const realPaymentEnabled = computed(() => Boolean(status.value?.launchConfig?.realPaymentEnabled));
const readinessStatus = computed(() => status.value?.readiness?.status || "unknown");
const readinessChecks = computed(() => status.value?.readiness?.checks || []);

function applyResponse(data: any) {
  const launchConfig = data?.launchConfig || {};
  for (const key of configKeys) {
    if (launchConfig[key] !== undefined) (form as any)[key] = launchConfig[key];
  }
  status.value = data;
}

function payload() {
  const output: Record<string, unknown> = {};
  for (const key of configKeys) {
    const value = (form as any)[key];
    if (key === "wechatPayApiV3Key" && !String(value || "").trim()) continue;
    output[key] = value;
  }
  return output;
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    applyResponse(await api.get<any, any>("/admin/settings/payment"));
  } catch (cause: any) {
    error.value = cause?.message || "加载平台统一支付配置失败";
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!props.canEdit || saving.value) return;
  saving.value = true;
  error.value = "";
  try {
    applyResponse(await api.put<any, any>("/admin/settings/payment", payload()));
    ElMessage.success("平台统一支付资料已保存；保存不会自动开启真实支付");
  } catch (cause: any) {
    error.value = cause?.message || "保存平台统一支付配置失败";
    ElMessage.error(error.value);
  } finally {
    saving.value = false;
  }
}

async function validate() {
  checking.value = true;
  error.value = "";
  try {
    const data = await api.post<any, any>("/admin/settings/payment/validate");
    applyResponse(data);
    ElMessage[data?.readiness?.status === "ok" ? "success" : "warning"](data?.readiness?.status === "ok" ? "支付配置校验通过" : "支付配置仍未通过开启门禁");
  } catch (cause: any) {
    error.value = cause?.message || "校验平台统一支付配置失败";
    ElMessage.error(error.value);
  } finally {
    checking.value = false;
  }
}

async function enable() {
  if (!props.canEdit || enabling.value) return;
  try {
    await ElMessageBox.confirm("这会影响所有使用平台支付的商家。请确认已完成真实支付、退款、对账、预发联调和回滚准备。", "确认开启真实支付", { type: "warning", confirmButtonText: "确认开启", cancelButtonText: "取消" });
  } catch {
    return;
  }
  enabling.value = true;
  error.value = "";
  try {
    applyResponse(await api.post<any, any>("/admin/settings/payment/enable", { confirmation: "ENABLE_REAL_PAYMENT" }));
    ElMessage.success("平台统一真实支付已开启");
  } catch (cause: any) {
    error.value = cause?.message || "真实支付开启失败，请先完成门禁检查";
    ElMessage.error(error.value);
    await load();
  } finally {
    enabling.value = false;
  }
}

async function disable() {
  if (!props.canEdit || disabling.value) return;
  try {
    await ElMessageBox.confirm("关闭后新的真实支付订单将不能继续创建，请确认当前没有需要继续收款的活动。", "确认关闭真实支付", { type: "warning", confirmButtonText: "确认关闭", cancelButtonText: "取消" });
  } catch {
    return;
  }
  disabling.value = true;
  error.value = "";
  try {
    applyResponse(await api.post<any, any>("/admin/settings/payment/disable"));
    ElMessage.success("平台统一真实支付已关闭");
  } catch (cause: any) {
    error.value = cause?.message || "真实支付关闭失败";
    ElMessage.error(error.value);
  } finally {
    disabling.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="unified-payment-card" v-loading="loading">
    <div class="card-title-row">
      <div>
        <div class="card-title">平台统一支付配置</div>
        <p class="form-tip">所有商家共用平台支付凭证。商家端只配置可用支付方式，不重复保存商户凭证。</p>
      </div>
      <el-tag :type="realPaymentEnabled ? 'success' : readinessStatus === 'ok' ? 'warning' : 'info'" effect="plain">
        {{ realPaymentEnabled ? "真实支付已开启" : readinessStatus === "ok" ? "已通过校验，待开启" : "真实支付关闭" }}
      </el-tag>
    </div>
    <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" class="panel-alert" />
    <el-alert type="info" title="保存配置不会自动开启真实支付。开启真实支付必须先完成配置校验，并通过后端门禁和二次确认。" show-icon :closable="false" class="panel-alert" />
    <div class="deploy-grid">
      <el-form-item label="微信 AppID"><el-input v-model="form.wechatPayAppId" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="微信商户号"><el-input v-model="form.wechatPayMchId" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="微信 API v3 Key"><el-input v-model="form.wechatPayApiV3Key" type="password" show-password placeholder="未修改时留空" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="微信私钥路径"><el-input v-model="form.wechatPayPrivateKeyPath" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="证书序列号"><el-input v-model="form.wechatPayCertSerialNo" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="平台证书路径"><el-input v-model="form.wechatPayPlatformCertPath" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="微信支付回调 URL"><el-input v-model="form.wechatPayNotifyUrl" placeholder="必须使用 HTTPS" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="微信支付渠道"><el-switch v-model="form.wechatPayEnabled" active-text="纳入统一配置" inactive-text="未配置" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="支付宝 AppID"><el-input v-model="form.alipayAppId" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="支付宝私钥路径"><el-input v-model="form.alipayPrivateKeyPath" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="支付宝公钥证书"><el-input v-model="form.alipayPublicCertPath" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="支付宝回调 URL"><el-input v-model="form.alipayNotifyUrl" placeholder="必须使用 HTTPS" :disabled="!canEdit || saving" /></el-form-item>
    </div>
    <el-divider content-position="left">开启门禁和预发证据</el-divider>
    <div class="deploy-grid">
      <el-form-item label="下单实现"><el-switch v-model="form.realPaymentSdkImplemented" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="回调验签"><el-switch v-model="form.realPaymentCallbackVerificationImplemented" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="退款查询"><el-switch v-model="form.realRefundQueryImplemented" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="账单拉取"><el-switch v-model="form.realPaymentStatementFetchImplemented" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="商城微信支付"><el-switch v-model="form.mallRealWechatPaymentImplemented" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="店铺直收支付"><el-switch v-model="form.mallMerchantDirectPaymentImplemented" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="真实支付预发通过"><el-switch v-model="form.realPaymentPreflightPassed" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="支付验收文件"><el-input v-model="form.realPaymentPreflightResultFile" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="商城预发通过"><el-switch v-model="form.mallMultiMerchantPreflightPassed" :disabled="!canEdit || saving" /></el-form-item>
      <el-form-item label="商城验收文件"><el-input v-model="form.mallMultiMerchantSmokeResultFile" :disabled="!canEdit || saving" /></el-form-item>
    </div>
    <div class="toolbar-actions unified-payment-actions">
      <el-button type="primary" :loading="saving" :disabled="!canEdit" @click="save">保存支付资料</el-button>
      <el-button :loading="checking" @click="validate">校验配置</el-button>
      <el-button v-if="!realPaymentEnabled" type="warning" :loading="enabling" :disabled="readinessStatus !== 'ok'" @click="enable">确认开启真实支付</el-button>
      <el-button v-else type="danger" plain :loading="disabling" @click="disable">关闭真实支付</el-button>
    </div>
    <p class="form-tip">当前门禁状态：{{ readinessStatus === "ok" ? "已通过" : "未通过或尚未校验" }}。完整原因请查看下方检查结果。</p>
    <div v-if="readinessChecks.length" class="payment-check-list">
      <div v-for="check in readinessChecks" :key="check.key" class="payment-check-row">
        <span>{{ check.key }}</span>
        <el-tag :type="check.status === 'ok' ? 'success' : check.status === 'warning' ? 'warning' : 'danger'" effect="plain">{{ check.status }}</el-tag>
        <small>{{ check.message }}</small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.unified-payment-card { margin-bottom: 16px; padding: 18px; border: 1px solid #bae6fd; border-radius: 8px; background: #f8fbff; }
.unified-payment-form { display: grid; gap: 12px; }
.unified-payment-actions { justify-content: flex-start; margin-top: 12px; }
.payment-check-list { display: grid; gap: 6px; margin-top: 12px; padding: 10px; border: 1px solid #dbeafe; border-radius: 8px; background: #fff; }
.payment-check-row { display: grid; grid-template-columns: minmax(180px, 240px) 90px minmax(0, 1fr); gap: 10px; align-items: center; min-height: 30px; }
.payment-check-row span { color: #334155; font: 12px "Cascadia Mono", Consolas, monospace; overflow-wrap: anywhere; }
.payment-check-row small, .form-tip { color: #64748b; line-height: 1.45; overflow-wrap: anywhere; }
.form-tip { margin: 0; font-size: 13px; }
@media (max-width: 1100px) { .payment-check-row { grid-template-columns: 1fr; gap: 4px; } }
</style>
