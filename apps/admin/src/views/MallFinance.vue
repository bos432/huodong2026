<template>
  <div class="mall-finance-page">
    <div class="page-header">
      <div>
        <h2>商城财务总览</h2>
        <p>集中核对商城订单实收、退款、支付流水、佣金和结算风险；本页只读汇总，资金处理请进入售后或结算中心。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家/代理" style="width:220px" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" clearable filterable placeholder="全部授权店铺；可选单店" style="width:280px" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-select v-model="filters.paymentMethod" clearable placeholder="支付方式" style="width:140px" @change="loadFinanceData">
          <el-option label="微信支付" value="wechat" />
          <el-option label="余额支付" value="balance" />
          <el-option label="线下收款" value="offline" />
          <el-option label="支付宝" value="alipay" />
        </el-select>
        <el-button :loading="loadingAny" @click="loadFinanceData">刷新财务</el-button>
      </div>
    </div>

    <el-alert
      v-if="deepLinkWarning"
      class="scope-alert"
      type="error"
      show-icon
      :closable="false"
      title="商城财务店铺链接不可用"
      :description="deepLinkWarning"
    />
    <el-alert
      v-else-if="!selectedMerchant && isPlatformAdmin()"
      class="scope-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前是全局财务监管模式"
      description="平台账号可以不选店铺查看全平台或所选商家下全部商城财务数据；导出时会沿用当前商家、日期、支付方式、结算组和关键词筛选。"
    />
    <el-alert
      v-else-if="!selectedMerchant && merchants.length > 1"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="请选择要核对的店铺"
      description="当前账号可管理多个商城店铺。为避免不同店铺的实收、退款和结算混在一起，请先选择一个店铺。"
    />

    <el-card v-if="selectedMerchant && !deepLinkWarning" shadow="never" class="merchant-card">
      <div>
        <strong>当前财务店铺：{{ selectedMerchant.name || selectedMerchant.code }}</strong>
        <p>{{ selectedMerchant.tenant?.name || selectedMerchant.tenant?.code || "平台店铺" }} · {{ merchantOwnerText(selectedMerchant) }} · {{ selectedMerchant.region || "未设置区域" }}</p>
      </div>
      <div class="merchant-tags">
        <el-tag type="success">商城已开放</el-tag>
        <el-tag type="warning" effect="plain">{{ paymentModeText(selectedMerchant.paymentMode) }}</el-tag>
      </div>
      <div class="merchant-actions">
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-orders')">订单管理</el-button>
        <el-button size="small" type="danger" plain @click="goMerchantAdmin('/mall-refunds')">售后中心</el-button>
        <el-button size="small" type="warning" plain @click="goMerchantAdmin('/mall-payment-logs')">支付日志</el-button>
        <el-button size="small" type="info" plain @click="goMerchantAdmin('/mall-settlements')">商城结算</el-button>
        <el-button size="small" type="success" plain @click="goMerchantAdmin('/mall-statistics')">经营统计</el-button>
        <el-button size="small" @click="copyWorkbenchLink">复制财务链接</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" style="width:250px" @change="handleDateRangeChange" />
        <el-input v-model="filters.keyword" clearable placeholder="订单号/交易号/手机号/失败原因" style="width:280px" @keyup.enter="loadFinanceData" @clear="loadFinanceData" />
        <el-input v-model="filters.checkoutGroupNo" clearable placeholder="跨店结算组号" style="width:190px" @keyup.enter="loadFinanceData" @clear="loadFinanceData" />
      </div>
      <div class="filter-row">
        <el-button @click="exportOrders">导出订单</el-button>
        <el-button @click="exportRefunds">导出售后</el-button>
        <el-button @click="exportPaymentTransactions">导出支付流水</el-button>
        <el-button @click="exportSettlements">导出结算</el-button>
      </div>
      <el-alert
        class="finance-tip"
        type="info"
        :closable="false"
        show-icon
        title="财务口径：实收=已确认收款订单金额，净收=实收-已通过退款；结算以结算中心生成的结算单为准。"
      />
    </el-card>

    <div class="summary-grid">
      <el-card v-for="item in summaryCards" :key="item.label" shadow="never">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
        <span>{{ item.desc }}</span>
      </el-card>
    </div>

    <div class="finance-grid">
      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>支付流水近况</span>
            <small>成功、差异和失败都要能追到订单</small>
          </div>
        </template>
        <el-table v-loading="loading" :data="paymentTransactions" size="small" stripe empty-text="暂无支付流水">
          <el-table-column label="订单/交易号" min-width="220">
            <template #default="{ row }">
              <strong>{{ row.order?.orderNo || "-" }}</strong>
              <small>{{ row.transactionNo || "-" }}</small>
              <small>{{ row.order?.checkoutGroup?.groupNo || "非跨店订单" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="店铺" min-width="130"><template #default="{ row }">{{ row.merchant?.name || row.order?.merchant?.name || "-" }}</template></el-table-column>
          <el-table-column label="渠道" width="100"><template #default="{ row }">{{ paymentText(row.paymentMethod || row.provider) }}</template></el-table-column>
          <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="paymentStatusType(row.status)">{{ paymentStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="说明" min-width="170" show-overflow-tooltip><template #default="{ row }">{{ row.remark || row.discrepancyType || "-" }}</template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button size="small" text type="primary" :disabled="!relatedOrderNo(row)" @click.stop="openRelatedOrder(row)">打开订单</el-button></template></el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>退款日志近况</span>
            <small>失败记录优先进入售后中心处理</small>
          </div>
        </template>
        <el-table v-loading="loading" :data="refundLogs" size="small" stripe empty-text="暂无退款日志">
          <el-table-column label="售后/订单" min-width="220">
            <template #default="{ row }">
              <strong>{{ row.refund?.refundNo || "-" }}</strong>
              <small>{{ row.order?.orderNo || row.providerRefundNo || "-" }}</small>
              <small>{{ row.order?.checkoutGroup?.groupNo || "非跨店订单" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="渠道" width="100"><template #default="{ row }">{{ refundProviderName(row.provider) }}</template></el-table-column>
          <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="refundLogStatusType(row.status)">{{ refundLogStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="说明" min-width="200" show-overflow-tooltip><template #default="{ row }">{{ row.message || "-" }}</template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button size="small" text type="primary" :disabled="!relatedOrderNo(row)" @click.stop="openRelatedOrder(row)">打开订单</el-button></template></el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>结算风险</span>
            <small>草稿、已审核未打款和负向扣回要重点核对</small>
          </div>
        </template>
        <el-table v-loading="loading" :data="mallSettlements" size="small" stripe empty-text="暂无结算单">
          <el-table-column prop="settlementNo" label="结算单号" width="180" />
          <el-table-column label="店铺" min-width="150"><template #default="{ row }">{{ row.merchant?.name || "-" }}</template></el-table-column>
          <el-table-column label="周期" width="180"><template #default="{ row }">{{ row.periodStart }} 至 {{ row.periodEnd }}</template></el-table-column>
          <el-table-column label="应打款/扣回" width="140"><template #default="{ row }">{{ settlementAmountText(row.payableAmount) }}</template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="settlementStatusType(row.status)">{{ settlementStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="90"><template #default><el-button size="small" text type="primary" @click.stop="goMerchantAdmin('/mall-settlements')">结算</el-button></template></el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>佣金摘要</span>
            <small>佣金结算独立核对，不在财务总览直接处理</small>
          </div>
        </template>
        <div class="commission-summary">
          <div v-for="item in commissionSummaryCards" :key="item.label">
            <small>{{ item.label }}</small>
            <strong>{{ item.value }}</strong>
            <span>{{ item.count }}</span>
          </div>
        </div>
        <el-alert type="warning" :closable="false" show-icon title="佣金资金动作请到支付日志或结算中心核对后处理，避免财务总览页扩大写权限。" />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { api, downloadFile } from "../api";
import { copyToClipboard } from "../h5-preview";
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
const orderSummary = ref<any>({});
const paymentTransactions = ref<any[]>([]);
const refundLogs = ref<any[]>([]);
const commissionSummary = ref<any>({});
const mallSettlements = ref<any[]>([]);
const settlementPending = ref<any[]>([]);
const loading = ref(false);
const merchantLoading = ref(false);
const deepLinkWarning = ref("");
const dateRange = ref<string[]>([]);
const filters = reactive({
  tenantId: routeTenantId(),
  merchantId: routeMerchantId(),
  paymentMethod: "",
  keyword: routeKeyword(),
  checkoutGroupNo: "",
  startDate: "",
  endDate: ""
});

const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const loadingAny = computed(() => loading.value || merchantLoading.value);
const summaryCards = computed(() => [
  { label: "订单数", value: orderSummary.value.orderCount || 0, desc: "当前筛选范围" },
  { label: "实收金额", value: `¥${money(orderSummary.value.receivedAmount ?? orderSummary.value.paidAmount)}`, desc: "已确认收款" },
  { label: "净收金额", value: `¥${money(orderSummary.value.netReceivedAmount)}`, desc: "实收减已退" },
  { label: "已退金额", value: `¥${money(orderSummary.value.approvedRefundAmount)}`, desc: "已通过售后" },
  { label: "待处理售后", value: orderSummary.value.pendingRefundCount || 0, desc: "需售后中心处理" },
  { label: "待结算佣金", value: `¥${money(commissionSummary.value.pendingAmount)}`, desc: `${commissionSummary.value.pendingCount || 0} 笔` },
  { label: "待结算店铺", value: settlementPending.value.length, desc: "当前周期未生成" },
  { label: "待打款/扣回", value: settlementAmountText(mallSettlements.value.filter((item) => item.status === "approved").reduce((sum, item) => sum + Number(item.payableAmount || 0), 0)), desc: "已审核未完成" }
]);
const commissionSummaryCards = computed(() => [
  { label: "总佣金", value: `¥${money(commissionSummary.value.totalAmount)}`, count: `${commissionSummary.value.totalCount || 0} 笔` },
  { label: "待结算", value: `¥${money(commissionSummary.value.pendingAmount)}`, count: `${commissionSummary.value.pendingCount || 0} 笔` },
  { label: "已结算", value: `¥${money(commissionSummary.value.settledAmount)}`, count: `${commissionSummary.value.settledCount || 0} 笔` },
  { label: "已作废", value: `¥${money(commissionSummary.value.voidAmount)}`, count: `${commissionSummary.value.voidCount || 0} 笔` }
]);

function routeTenantId() {
  const id = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : 0;
  return isPlatformAdmin() && id ? id : undefined;
}

function routeMerchantId() {
  const id = typeof route.query.merchantId === "string" ? Number(route.query.merchantId) : 0;
  return id || undefined;
}

function routeKeyword() {
  return typeof route.query.keyword === "string" ? route.query.keyword : "";
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
  return `当前链接指定的店铺 #${requestedMerchantId} 对当前账号不可见，或已被商家筛选条件过滤。为避免误读财务数据，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
}

function currentMallParams(extra: Record<string, any> = {}) {
  return {
    tenantId: isPlatformAdmin() ? filters.tenantId || selectedMerchant.value?.tenant?.id : undefined,
    merchantId: filters.merchantId || undefined,
    ...extra
  };
}

function appendBaseFinanceParams(params: URLSearchParams) {
  const tenantId = filters.tenantId || selectedMerchant.value?.tenant?.id;
  if (isPlatformAdmin() && tenantId) params.set("tenantId", String(tenantId));
  if (filters.merchantId) params.set("merchantId", String(filters.merchantId));
  if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
  if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
  if (filters.checkoutGroupNo.trim()) params.set("checkoutGroupNo", filters.checkoutGroupNo.trim());
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
}

function baseFinanceParams(extra: Record<string, any> = {}) {
  return currentMallParams({
    paymentMethod: filters.paymentMethod || undefined,
    keyword: filters.keyword.trim() || undefined,
    checkoutGroupNo: filters.checkoutGroupNo.trim() || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    ...extra
  });
}

async function syncRouteQuery() {
  const query: Record<string, string> = {};
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  if (filters.merchantId) query.merchantId = String(filters.merchantId);
  if (filters.keyword.trim()) query.keyword = filters.keyword.trim();
  await router.replace({ path: route.path, query });
}

function clearFinanceData() {
  orderSummary.value = {};
  paymentTransactions.value = [];
  refundLogs.value = [];
  commissionSummary.value = {};
  mallSettlements.value = [];
  settlementPending.value = [];
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
      clearFinanceData();
      return false;
    } else if (filters.merchantId && !merchants.value.some((merchant) => merchant.id === filters.merchantId)) filters.merchantId = undefined;
    if (!filters.merchantId && !isPlatformAdmin() && merchants.value.length === 1) filters.merchantId = merchants.value[0].id;
    return true;
  } catch (error: any) {
    ElMessage.error(error.message || "加载可核对财务的店铺失败");
    return false;
  } finally {
    merchantLoading.value = false;
  }
}

async function loadFinanceData() {
  if (deepLinkWarning.value) return;
  if (!isPlatformAdmin() && !filters.merchantId) {
    clearFinanceData();
    return;
  }
  loading.value = true;
  try {
    const params = baseFinanceParams();
    const [summary, transactions, refundRows, commissionSummaryRow, settlementResult] = await Promise.all([
      api.get<any, any>("/admin/mall/orders/summary", { params }),
      api.get<any, any[]>("/admin/mall/payment-transactions", { params }),
      api.get<any, any[]>("/admin/mall/refund-logs", { params }),
      api.get<any, any>("/admin/mall/commissions/summary", { params }),
      api.get<any, any>("/admin/mall/settlements", { params })
    ]);
    orderSummary.value = summary || {};
    paymentTransactions.value = transactions || [];
    refundLogs.value = refundRows || [];
    commissionSummary.value = commissionSummaryRow || {};
    mallSettlements.value = settlementResult?.items || [];
    settlementPending.value = settlementResult?.pending || [];
    await syncRouteQuery();
  } catch (error: any) {
    ElMessage.error(error.message || "加载商城财务总览失败");
  } finally {
    loading.value = false;
  }
}

async function handleTenantChange() {
  filters.merchantId = undefined;
  await syncRouteQuery();
  const ok = await loadMerchants();
  if (ok) await loadFinanceData();
}

async function handleMerchantChange() {
  deepLinkWarning.value = "";
  await syncRouteQuery();
  await loadFinanceData();
}

function handleDateRangeChange() {
  filters.startDate = dateRange.value?.[0] || "";
  filters.endDate = dateRange.value?.[1] || "";
  void loadFinanceData();
}

function merchantWorkbenchUrl() {
  if (!selectedMerchant.value) return "";
  const query = new URLSearchParams();
  if (selectedMerchant.value.tenant?.id) query.set("tenantId", String(selectedMerchant.value.tenant.id));
  query.set("merchantId", String(selectedMerchant.value.id));
  return `${window.location.origin}/admin/mall-finance?${query.toString()}`;
}

function goMerchantAdmin(path: string, query: Record<string, any> = {}) {
  if (!selectedMerchant.value && !isPlatformAdmin()) return;
  router.push({
    path,
    query: {
      tenantId: selectedMerchant.value?.tenant?.id || filters.tenantId,
      merchantId: selectedMerchant.value?.id || filters.merchantId,
      ...query
    }
  });
}

async function copyWorkbenchLink() {
  const url = merchantWorkbenchUrl();
  if (!url) return;
  await copyToClipboard(url);
  ElMessage.success("商城财务总览链接已复制，可发给已授权的商家/代理账号。");
}

function relatedOrderNo(row: any) {
  return row?.order?.orderNo || row?.orderNo || "";
}

function openRelatedOrder(row: any) {
  const orderNo = relatedOrderNo(row);
  if (!orderNo) return ElMessage.error("这条记录没有可定位的商城订单号");
  goMerchantAdmin("/mall-orders", { keyword: orderNo });
}

async function exportOrders() {
  await exportFile("/admin/mall/orders/export", "mall-orders.xlsx", "导出商城订单失败");
}

async function exportRefunds() {
  await exportFile("/admin/mall/refunds/export", "mall-refunds.xlsx", "导出商城售后失败");
}

async function exportPaymentTransactions() {
  await exportFile("/admin/mall/payment-transactions/export", "mall-payment-transactions.xlsx", "导出支付流水失败");
}

async function exportSettlements() {
  await exportFile("/admin/mall/settlements/export", "mall-settlements.xlsx", "导出商城结算失败");
}

async function exportFile(path: string, filename: string, message: string) {
  if (deepLinkWarning.value) return ElMessage.error("当前商城财务店铺链接不可用，请先确认店铺授权后再导出。");
  try {
    const clean = new URLSearchParams();
    appendBaseFinanceParams(clean);
    await downloadFile(`${path}?${clean.toString()}`, filename);
  } catch (error: any) {
    ElMessage.error(error.message || message);
  }
}

function money(value: any) {
  return Number(value || 0).toFixed(2);
}

function paymentText(value: string) {
  return ({ wechat: "微信支付", balance: "余额支付", offline: "线下收款", alipay: "支付宝" } as any)[value] || value || "-";
}

function paymentStatusText(value: string) {
  return ({ success: "成功", discrepancy: "差异", failed: "失败" } as any)[value] || value || "-";
}

function paymentStatusType(value: string) {
  return value === "success" ? "success" : value === "discrepancy" ? "warning" : "danger";
}

function refundProviderName(value: string) {
  return ({ wechat: "微信原路", balance: "余额退回", offline: "线下退款", alipay: "支付宝" } as any)[value] || value || "-";
}

function refundLogStatusText(value: string) {
  return ({ success: "成功", submitted: "已提交", failed: "失败" } as any)[value] || value || "-";
}

function refundLogStatusType(value: string) {
  return value === "success" ? "success" : value === "failed" ? "danger" : "warning";
}

function settlementAmountText(value: any) {
  const amount = Number(value || 0);
  return `${amount < 0 ? "应扣回" : "应打款"} ¥${Math.abs(amount).toFixed(2)}`;
}

function settlementStatusText(value: string) {
  return ({ draft: "草稿", approved: "已审核", paid: "已打款", rejected: "已拒绝", cancelled: "已取消" } as any)[value] || value || "-";
}

function settlementStatusType(value: string) {
  return value === "paid" ? "success" : value === "approved" ? "warning" : value === "rejected" || value === "cancelled" ? "danger" : "info";
}

onMounted(async () => {
  await loadTenants();
  const ok = await loadMerchants();
  if (ok) await loadFinanceData();
});

watch(() => [route.query.tenantId, route.query.merchantId, route.query.keyword], async () => {
  const nextTenantId = routeTenantId();
  const nextMerchantId = routeMerchantId();
  const nextKeyword = routeKeyword();
  if (nextKeyword !== filters.keyword) filters.keyword = nextKeyword;
  if (nextTenantId !== filters.tenantId) {
    filters.tenantId = nextTenantId;
    filters.merchantId = nextMerchantId;
    const ok = await loadMerchants();
    if (ok) await loadFinanceData();
    return;
  }
  if (nextMerchantId && nextMerchantId !== filters.merchantId && merchants.value.some((item) => item.id === nextMerchantId)) {
    deepLinkWarning.value = "";
    filters.merchantId = nextMerchantId;
    await loadFinanceData();
  } else if (nextMerchantId && nextMerchantId !== filters.merchantId) {
    filters.merchantId = undefined;
    deepLinkWarning.value = merchantLinkWarning(nextMerchantId);
    clearFinanceData();
  }
});
</script>

<style scoped>
.mall-finance-page { padding: 24px; display: grid; gap: 16px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-header h2 { margin: 0 0 6px; color: #111827; }
.page-header p { margin: 0; color: #64748b; }
.header-actions, .filter-row { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.filter-row { justify-content: flex-start; }
.scope-alert { margin-bottom: 2px; }
.merchant-card { border-color: #c7d2fe; background: linear-gradient(135deg, #eef2ff 0%, #fff 72%); }
.merchant-card :deep(.el-card__body) { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
.merchant-card strong { color: #0f172a; }
.merchant-card p { margin: 4px 0 0; color: #64748b; }
.merchant-tags, .merchant-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.merchant-actions { grid-column: 1 / -1; }
.filter-card :deep(.el-card__body) { display: grid; gap: 10px; }
.finance-tip { margin-top: 2px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.summary-grid :deep(.el-card__body) { display: grid; gap: 4px; }
.summary-grid small, .summary-grid span { color: #64748b; }
.summary-grid strong { color: #0f172a; font-size: 22px; }
.finance-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-header small, .finance-grid small { color: #64748b; }
.finance-grid small { display: block; margin-top: 3px; }
.finance-grid strong { color: #0f172a; }
.commission-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
.commission-summary div { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; background: #f8fafc; display: grid; gap: 3px; }
.commission-summary strong { font-size: 18px; }
@media (max-width: 1200px) {
  .page-header { display: grid; }
  .header-actions { justify-content: flex-start; }
  .summary-grid, .commission-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .finance-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .mall-finance-page { padding: 14px; }
  .summary-grid, .commission-summary { grid-template-columns: 1fr; }
  .merchant-card :deep(.el-card__body) { grid-template-columns: 1fr; }
  .merchant-tags, .merchant-actions { justify-content: flex-start; }
}
</style>
