<template>
  <div class="mall-statistics-page">
    <div class="page-header">
      <div>
        <h2>商城统计看板</h2>
        <p>按平台、商家或具体店铺查看近 30 天经营数据；商家/代理账号只统计已授权店铺。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家/代理" style="width:220px" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" clearable filterable placeholder="全部授权店铺；可选单店" style="width:280px" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-button :loading="loadingAny" @click="reload">刷新统计</el-button>
      </div>
    </div>

    <el-alert
      v-if="deepLinkWarning"
      class="scope-alert"
      type="error"
      show-icon
      :closable="false"
      title="商城统计店铺链接不可用"
      :description="deepLinkWarning"
    />
    <el-alert
      v-else-if="!selectedMerchant && isPlatformAdmin()"
      class="scope-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前是全局统计模式"
      description="平台账号可以不选店铺查看全平台或所选商家下全部店铺统计；进入具体店铺后可继续跳转订单、营销、物流和收款配置。"
    />
    <el-alert
      v-else-if="!selectedMerchant && merchants.length > 1"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="请选择要查看的店铺"
      description="当前账号可管理多个商城店铺。为避免经营数据混在一起，请先选择一个店铺查看统计。"
    />

    <el-card v-if="selectedMerchant && !deepLinkWarning" shadow="never" class="merchant-card">
      <div>
        <strong>当前统计店铺：{{ selectedMerchant.name || selectedMerchant.code }}</strong>
        <p>{{ selectedMerchant.tenant?.name || selectedMerchant.tenant?.code || "平台店铺" }} · {{ merchantOwnerText(selectedMerchant) }} · {{ selectedMerchant.region || "未设置区域" }}</p>
      </div>
      <div class="merchant-tags">
        <el-tag type="success">商城已开放</el-tag>
        <el-tag type="warning" effect="plain">{{ paymentModeText(selectedMerchant.paymentMode) }}</el-tag>
      </div>
      <div class="merchant-actions">
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-orders')">订单管理</el-button>
        <el-button size="small" type="success" plain @click="goMerchantAdmin('/mall-marketing')">营销中心</el-button>
        <el-button size="small" type="warning" plain @click="goMerchantAdmin('/mall-payments')">收款配置</el-button>
        <el-button size="small" type="info" plain @click="goMerchantAdmin('/mall-logistics')">物流设置</el-button>
        <el-button size="small" @click="openMerchantH5">打开 H5 店铺</el-button>
        <el-button size="small" @click="copyWorkbenchLink">复制统计后台链接</el-button>
      </div>
    </el-card>

    <div class="summary-grid">
      <el-card v-for="item in analyticsCards" :key="item.label" shadow="never">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
        <span>{{ item.desc }}</span>
      </el-card>
    </div>

    <div class="content-grid">
      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>销售趋势</span>
            <small>近 30 天</small>
          </div>
        </template>
        <el-table v-loading="loading" :data="mallAnalytics.trend || []" size="small" max-height="320" empty-text="暂无销售趋势">
          <el-table-column prop="date" label="日期" width="120" />
          <el-table-column label="订单" width="90"><template #default="{ row }">{{ row.orderCount }}</template></el-table-column>
          <el-table-column label="实收" width="120"><template #default="{ row }">¥{{ money(row.receivedAmount) }}</template></el-table-column>
          <el-table-column label="优惠" width="120"><template #default="{ row }">¥{{ money(row.discountAmount) }}</template></el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>支付方式</span>
            <small>真实收钱渠道</small>
          </div>
        </template>
        <el-table v-loading="loading" :data="mallAnalytics.byPaymentMethod || []" size="small" max-height="320" empty-text="暂无支付数据">
          <el-table-column label="渠道" min-width="120"><template #default="{ row }">{{ paymentText(row.paymentMethod) }}</template></el-table-column>
          <el-table-column label="订单" width="90"><template #default="{ row }">{{ row.orderCount }}</template></el-table-column>
          <el-table-column label="金额" width="130"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>订单状态</span>
            <small>履约健康度</small>
          </div>
        </template>
        <el-table v-loading="loading" :data="mallAnalytics.byStatus || []" size="small" max-height="320" empty-text="暂无订单状态">
          <el-table-column label="状态" min-width="120"><template #default="{ row }"><el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="订单" width="90"><template #default="{ row }">{{ row.orderCount }}</template></el-table-column>
          <el-table-column label="金额" width="130"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>售后状态</span>
            <small>退款风险</small>
          </div>
        </template>
        <el-table v-loading="loading" :data="mallAnalytics.refunds || []" size="small" max-height="320" empty-text="暂无售后数据">
          <el-table-column label="状态" min-width="120"><template #default="{ row }"><el-tag :type="refundTagType(row.status)">{{ refundText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="数量" width="90"><template #default="{ row }">{{ row.refundCount }}</template></el-table-column>
          <el-table-column label="金额" width="130"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>热销商品</span>
            <small>按销量排序</small>
          </div>
        </template>
        <el-table v-loading="loading" :data="mallAnalytics.topProducts || []" size="small" max-height="320" empty-text="暂无热销商品">
          <el-table-column label="商品" min-width="180"><template #default="{ row }">{{ row.productTitle || `商品 #${row.productId}` }}</template></el-table-column>
          <el-table-column label="销量" width="90"><template #default="{ row }">{{ row.quantity }}</template></el-table-column>
          <el-table-column label="销售额" width="130"><template #default="{ row }">¥{{ money(row.grossAmount) }}</template></el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>优惠券转化</span>
            <small>领取与使用</small>
          </div>
        </template>
        <el-table v-loading="loading" :data="mallAnalytics.couponStats || []" size="small" max-height="320" empty-text="暂无优惠券转化">
          <el-table-column label="券" min-width="160"><template #default="{ row }"><strong>{{ row.code }}</strong><small>{{ row.name }}</small></template></el-table-column>
          <el-table-column label="领取" width="80"><template #default="{ row }">{{ row.claimedCount }}</template></el-table-column>
          <el-table-column label="使用" width="80"><template #default="{ row }">{{ row.usedCount }}</template></el-table-column>
          <el-table-column label="使用率" width="90"><template #default="{ row }">{{ row.useRate || "-" }}</template></el-table-column>
          <el-table-column label="让利" width="120"><template #default="{ row }">¥{{ money(row.discountAmount) }}</template></el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { api } from "../api";
import { copyToClipboard, h5RoutePreviewUrl } from "../h5-preview";
import { isPlatformAdmin } from "../permissions";

type Merchant = {
  id: number;
  code?: string;
  name?: string;
  ownerType?: string;
  paymentMode?: string;
  region?: string | null;
  tenant?: { id?: number; name?: string; code?: string } | null;
};

const route = useRoute();
const router = useRouter();
const tenants = ref<any[]>([]);
const merchants = ref<Merchant[]>([]);
const mallAnalytics = ref<any>({});
const loading = ref(false);
const merchantLoading = ref(false);
const deepLinkWarning = ref("");
const filters = reactive({ tenantId: routeTenantId(), merchantId: routeMerchantId() });

const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const loadingAny = computed(() => loading.value || merchantLoading.value);
const analyticsCards = computed(() => [
  { label: "30天订单", value: mallAnalytics.value.summary?.orderCount || 0, desc: "已收款相关订单" },
  { label: "30天实收", value: `¥${money(mallAnalytics.value.summary?.receivedAmount)}`, desc: "含已支付/已发货/已完成" },
  { label: "30天净收", value: `¥${money(mallAnalytics.value.summary?.netReceivedAmount)}`, desc: "实收扣除已通过退款" },
  { label: "优惠让利", value: `¥${money(mallAnalytics.value.summary?.discountAmount)}`, desc: "优惠券等营销成本" },
  { label: "已退金额", value: `¥${money(mallAnalytics.value.summary?.approvedRefundAmount)}`, desc: "已审核通过退款" }
]);

function routeTenantId() {
  const id = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : 0;
  return isPlatformAdmin() && id ? id : undefined;
}

function routeMerchantId() {
  const id = typeof route.query.merchantId === "string" ? Number(route.query.merchantId) : 0;
  return id || undefined;
}

function tenantLabel(tenant: any) {
  return `${tenant.name || tenant.code}（${tenant.code}）`;
}

function merchantOwnerText(merchant?: Merchant) {
  return merchant?.ownerType === "agent" ? "代理店铺" : "商家店铺";
}

function merchantLabel(merchant: Merchant) {
  return `${merchant.name || merchant.code}（${merchantOwnerText(merchant)}${merchant.region ? ` · ${merchant.region}` : ""}）`;
}

function paymentModeText(value?: string) {
  return value === "merchant_direct" ? "商户直收" : "平台代收";
}

function merchantLinkWarning(requestedMerchantId: number) {
  return `当前链接指定的店铺 #${requestedMerchantId} 对当前账号不可见，或已被商家筛选条件过滤。为避免误读经营数据，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
}

function currentMallParams(extra: Record<string, any> = {}) {
  return {
    tenantId: isPlatformAdmin() ? filters.tenantId || selectedMerchant.value?.tenant?.id : undefined,
    merchantId: filters.merchantId || undefined,
    ...extra
  };
}

async function syncRouteQuery() {
  const query: Record<string, string> = {};
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  if (filters.merchantId) query.merchantId = String(filters.merchantId);
  await router.replace({ path: route.path, query });
}

function clearAnalytics() {
  mallAnalytics.value = {};
}

async function loadTenants() {
  tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
}

async function loadMerchants() {
  merchantLoading.value = true;
  try {
    merchants.value = await api.get<any, Merchant[]>("/admin/mall/accessible-merchants", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, enabled: "true" } });
    const requestedMerchantId = routeMerchantId();
    deepLinkWarning.value = "";
    if (requestedMerchantId && merchants.value.some((merchant) => merchant.id === requestedMerchantId)) filters.merchantId = requestedMerchantId;
    else if (requestedMerchantId) {
      filters.merchantId = undefined;
      deepLinkWarning.value = merchantLinkWarning(requestedMerchantId);
      clearAnalytics();
      return false;
    } else if (filters.merchantId && !merchants.value.some((merchant) => merchant.id === filters.merchantId)) filters.merchantId = undefined;
    if (!filters.merchantId && !isPlatformAdmin() && merchants.value.length === 1) filters.merchantId = merchants.value[0].id;
    return true;
  } catch (error: any) {
    ElMessage.error(error.message || "加载可统计店铺失败");
    return false;
  } finally {
    merchantLoading.value = false;
  }
}

async function loadAnalytics() {
  if (deepLinkWarning.value) return;
  if (!isPlatformAdmin() && !filters.merchantId && merchants.value.length > 1) {
    clearAnalytics();
    return;
  }
  loading.value = true;
  try {
    mallAnalytics.value = await api.get<any, any>("/admin/mall/analytics", { params: currentMallParams() });
  } catch (error: any) {
    ElMessage.error(error.message || "加载商城统计失败");
  } finally {
    loading.value = false;
  }
}

async function reload() {
  await loadAnalytics();
}

async function handleTenantChange() {
  filters.merchantId = undefined;
  await syncRouteQuery();
  const ok = await loadMerchants();
  if (ok) await loadAnalytics();
}

async function handleMerchantChange() {
  deepLinkWarning.value = "";
  await syncRouteQuery();
  await loadAnalytics();
}

function merchantWorkbenchUrl() {
  if (!selectedMerchant.value) return "";
  const query = new URLSearchParams();
  if (selectedMerchant.value.tenant?.id) query.set("tenantId", String(selectedMerchant.value.tenant.id));
  query.set("merchantId", String(selectedMerchant.value.id));
  return `${window.location.origin}/admin/mall-statistics?${query.toString()}`;
}

function merchantH5Url() {
  if (!selectedMerchant.value) return "";
  return h5RoutePreviewUrl(selectedMerchant.value.tenant?.code || "", `/pages/mall/merchant?id=${selectedMerchant.value.id}`);
}

function goMerchantAdmin(path: string) {
  if (!selectedMerchant.value) return;
  router.push({ path, query: { tenantId: selectedMerchant.value.tenant?.id, merchantId: selectedMerchant.value.id } });
}

function openMerchantH5() {
  const url = merchantH5Url();
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

async function copyWorkbenchLink() {
  const url = merchantWorkbenchUrl();
  if (!url) return;
  await copyToClipboard(url);
  ElMessage.success("商城统计后台链接已复制，可发给已授权的商家/代理账号。");
}

function money(value: any) {
  return Number(value || 0).toFixed(2);
}

function paymentText(value: string) {
  return ({ wechat: "微信支付", balance: "余额支付", offline: "线下收款", alipay: "支付宝" } as any)[value] || value || "-";
}

function statusText(value: string) {
  return ({ pending_payment: "待付款", pending_confirm: "待确认", paid: "待发货", shipped: "已发货", completed: "已完成", refund_pending: "售后中", refunded: "已退款", closed: "已关闭" } as any)[value] || value || "-";
}

function refundText(value: string) {
  return ({ pending: "待处理", processing: "处理中", approved: "已通过", rejected: "已拒绝", failed: "失败" } as any)[value] || value || "-";
}

function statusTagType(value: string) {
  return ({ completed: "success", refunded: "info", closed: "info", refund_pending: "warning", pending_payment: "warning", pending_confirm: "warning" } as any)[value] || "primary";
}

function refundTagType(value: string) {
  return ({ approved: "success", rejected: "info", failed: "danger", pending: "warning", processing: "warning" } as any)[value] || "primary";
}

onMounted(async () => {
  await loadTenants();
  const ok = await loadMerchants();
  if (ok) await loadAnalytics();
});

watch(() => [route.query.tenantId, route.query.merchantId], async () => {
  const nextTenantId = routeTenantId();
  const nextMerchantId = routeMerchantId();
  if (nextTenantId !== filters.tenantId) {
    filters.tenantId = nextTenantId;
    filters.merchantId = nextMerchantId;
    const ok = await loadMerchants();
    if (ok) await loadAnalytics();
    return;
  }
  if (nextMerchantId && nextMerchantId !== filters.merchantId && merchants.value.some((item) => item.id === nextMerchantId)) {
    deepLinkWarning.value = "";
    filters.merchantId = nextMerchantId;
    await loadAnalytics();
  } else if (nextMerchantId && nextMerchantId !== filters.merchantId) {
    filters.merchantId = undefined;
    deepLinkWarning.value = merchantLinkWarning(nextMerchantId);
    clearAnalytics();
  }
});
</script>

<style scoped>
.mall-statistics-page { padding: 24px; display: grid; gap: 16px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-header h2 { margin: 0 0 6px; color: #111827; }
.page-header p { margin: 0; color: #64748b; }
.header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.scope-alert { margin-bottom: 2px; }
.merchant-card { border-color: #fed7aa; background: linear-gradient(135deg, #fff7ed 0%, #fff 72%); }
.merchant-card :deep(.el-card__body) { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
.merchant-card strong { color: #0f172a; }
.merchant-card p { margin: 4px 0 0; color: #64748b; }
.merchant-tags, .merchant-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.merchant-actions { grid-column: 1 / -1; }
.summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.summary-grid :deep(.el-card__body) { display: grid; gap: 4px; }
.summary-grid small, .summary-grid span { color: #64748b; }
.summary-grid strong { color: #0f172a; font-size: 24px; }
.content-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-header small, .content-grid small { color: #64748b; }
.content-grid strong { color: #0f172a; }
@media (max-width: 1100px) {
  .page-header { display: grid; }
  .header-actions { justify-content: flex-start; }
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .content-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .mall-statistics-page { padding: 14px; }
  .summary-grid { grid-template-columns: 1fr; }
  .merchant-card :deep(.el-card__body) { grid-template-columns: 1fr; }
  .merchant-tags, .merchant-actions { justify-content: flex-start; }
}
</style>
