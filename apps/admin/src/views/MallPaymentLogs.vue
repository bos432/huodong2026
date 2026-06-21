<template>
  <div class="mall-payment-logs-page">
    <div class="page-header">
      <div>
        <h2>商城支付日志</h2>
        <p>核对支付流水、真实支付回调、退款日志和推广佣金；平台可全局追踪，商家/代理只看已授权店铺。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家/代理" style="width:220px" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" clearable filterable placeholder="全部授权店铺；可选单店" style="width:280px" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-input v-model="filters.keyword" clearable placeholder="订单号/交易号/手机号/失败原因" style="width:260px" @keyup.enter="loadPaymentData" @clear="loadPaymentData" />
        <el-button :loading="loadingAny" @click="loadPaymentData">刷新日志</el-button>
      </div>
    </div>

    <el-alert
      v-if="deepLinkWarning"
      class="scope-alert"
      type="error"
      show-icon
      :closable="false"
      title="商城支付日志店铺链接不可用"
      :description="deepLinkWarning"
    />
    <el-alert
      v-else-if="!selectedMerchant && isPlatformAdmin()"
      class="scope-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前是全局支付核对模式"
      description="平台账号可以不选店铺查看全平台或所选商家下全部店铺支付数据；导出时会沿用当前筛选条件，适合上线前真实收钱联调和财务对账。"
    />
    <el-alert
      v-else-if="!selectedMerchant && merchants.length > 1"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="请选择要核对的店铺"
      description="当前账号可管理多个商城店铺。为避免把不同店铺的收款、回调和退款混在一起，请先选择一个店铺。"
    />

    <el-card v-if="selectedMerchant && !deepLinkWarning" shadow="never" class="merchant-card">
      <div>
        <strong>当前核对店铺：{{ selectedMerchant.name || selectedMerchant.code }}</strong>
        <p>{{ selectedMerchant.tenant?.name || selectedMerchant.tenant?.code || "平台店铺" }} · {{ merchantOwnerText(selectedMerchant) }} · {{ selectedMerchant.region || "未设置区域" }}</p>
      </div>
      <div class="merchant-tags">
        <el-tag type="success">商城已开放</el-tag>
        <el-tag type="warning" effect="plain">{{ paymentModeText(selectedMerchant.paymentMode) }}</el-tag>
      </div>
      <div class="merchant-actions">
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-orders')">订单管理</el-button>
        <el-button size="small" type="success" plain @click="goMerchantAdmin('/mall-statistics')">经营统计</el-button>
        <el-button size="small" type="warning" plain @click="goMerchantAdmin('/mall-payments')">收款配置</el-button>
        <el-button size="small" type="info" plain @click="goMerchantAdmin('/mall-settlements')">商城结算</el-button>
        <el-button size="small" @click="openMerchantH5">打开 H5 店铺</el-button>
        <el-button size="small" @click="copyWorkbenchLink">复制支付日志链接</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-select v-model="filters.paymentMethod" clearable placeholder="支付方式" style="width:140px" @change="loadPaymentData">
          <el-option label="微信支付" value="wechat" />
          <el-option label="余额支付" value="balance" />
          <el-option label="线下收款" value="offline" />
          <el-option label="支付宝" value="alipay" />
        </el-select>
        <el-select v-model="filters.paymentStatus" clearable placeholder="流水状态" style="width:140px" @change="loadPaymentData">
          <el-option label="成功" value="success" />
          <el-option label="差异" value="discrepancy" />
          <el-option label="失败" value="failed" />
        </el-select>
        <el-select v-model="filters.callbackStatus" clearable placeholder="回调状态" style="width:150px" @change="loadPaymentData">
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
          <el-option label="幂等" value="idempotent" />
          <el-option label="已接收" value="received" />
        </el-select>
        <el-select v-model="filters.commissionStatus" clearable placeholder="佣金状态" style="width:150px" @change="loadPaymentData">
          <el-option label="待结算" value="pending" />
          <el-option label="已作废" value="void" />
          <el-option label="已结算" value="settled" />
        </el-select>
        <el-input v-model="filters.checkoutGroupNo" clearable placeholder="跨店结算组号" style="width:190px" @keyup.enter="loadPaymentData" @clear="loadPaymentData" />
        <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" style="width:250px" @change="handleDateRangeChange" />
      </div>
      <div class="filter-row">
        <el-button @click="exportPaymentTransactions">导出支付流水</el-button>
        <el-button @click="exportPaymentCallbackLogs">导出支付回调</el-button>
        <el-button @click="exportCommissions">导出佣金明细</el-button>
        <el-button @click="exportCommissionPromoters">导出佣金汇总</el-button>
      </div>
    </el-card>

    <div class="summary-grid">
      <el-card v-for="item in summaryCards" :key="item.label" shadow="never">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
        <span>{{ item.desc }}</span>
      </el-card>
    </div>

    <div class="payment-log-grid">
      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>支付流水</span>
            <small>成功支付必须有流水，差异记录要能导出追踪</small>
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
          <el-table-column label="店铺" min-width="140"><template #default="{ row }">{{ row.merchant?.name || row.order?.merchant?.name || "-" }}</template></el-table-column>
          <el-table-column label="渠道" width="100"><template #default="{ row }">{{ paymentText(row.paymentMethod || row.provider) }}</template></el-table-column>
          <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="paymentStatusType(row.status)">{{ paymentStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="说明" min-width="190" show-overflow-tooltip><template #default="{ row }">{{ row.remark || row.discrepancyType || "-" }}</template></el-table-column>
          <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button size="small" text type="primary" :disabled="!relatedOrderNo(row)" @click.stop="openRelatedOrder(row)">打开订单</el-button></template></el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>支付回调日志</span>
            <small>重复回调应幂等，签名失败要重点排查</small>
          </div>
        </template>
        <el-table v-loading="loading" :data="paymentCallbackLogs" size="small" stripe empty-text="暂无支付回调">
          <el-table-column label="订单/交易号" min-width="220">
            <template #default="{ row }">
              <strong>{{ row.orderNo || row.order?.orderNo || "-" }}</strong>
              <small>{{ row.transactionNo || "-" }}</small>
              <small>{{ row.order?.checkoutGroup?.groupNo || "非跨店订单" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="渠道" width="100"><template #default="{ row }">{{ paymentText(row.provider) }}</template></el-table-column>
          <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="签名" width="90"><template #default="{ row }"><el-tag :type="row.signatureValid === false ? 'danger' : 'success'">{{ row.signatureValid === false ? "失败" : "通过" }}</el-tag></template></el-table-column>
          <el-table-column label="结果" width="100"><template #default="{ row }"><el-tag :type="callbackStatusType(row.resultStatus)">{{ callbackStatusText(row.resultStatus) }}</el-tag></template></el-table-column>
          <el-table-column label="原因" min-width="190" show-overflow-tooltip><template #default="{ row }">{{ row.resultMessage || "-" }}</template></el-table-column>
          <el-table-column label="处理时间" width="170"><template #default="{ row }">{{ formatTime(row.processedAt || row.createdAt) }}</template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button size="small" text type="primary" :disabled="!relatedOrderNo(row)" @click.stop="openRelatedOrder(row)">打开订单</el-button></template></el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>退款日志</span>
            <small>原路退款、余额退回和线下退款都要留痕</small>
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
          <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button size="small" text type="primary" :disabled="!relatedOrderNo(row)" @click.stop="openRelatedOrder(row)">打开订单</el-button></template></el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>推广佣金</span>
            <small>这里只做核对和导出，资金结算在结算中心处理</small>
          </div>
        </template>
        <div class="commission-summary">
          <div v-for="item in commissionSummaryCards" :key="item.label">
            <small>{{ item.label }}</small>
            <strong>{{ item.value }}</strong>
            <span>{{ item.count }}</span>
          </div>
        </div>
        <el-table v-if="commissionPromoterSummary.length" :data="commissionPromoterSummary" size="small" border class="commission-promoter-table">
          <el-table-column label="代理/推广人" min-width="150">
            <template #default="{ row }">
              <strong>{{ row.displayName }}</strong>
              <div class="muted-line">{{ row.type === "agent" ? "代理" : row.type === "promoter" ? "推广用户" : "未绑定" }}</div>
            </template>
          </el-table-column>
          <el-table-column label="订单金额" width="110"><template #default="{ row }">¥{{ money(row.orderAmount) }}</template></el-table-column>
          <el-table-column label="总佣金" width="110"><template #default="{ row }">¥{{ money(row.commissionAmount) }}</template></el-table-column>
          <el-table-column label="待结算" width="130"><template #default="{ row }">¥{{ money(row.pendingAmount) }} / {{ row.pendingCount }} 笔</template></el-table-column>
          <el-table-column label="已结算" width="130"><template #default="{ row }">¥{{ money(row.settledAmount) }} / {{ row.settledCount }} 笔</template></el-table-column>
        </el-table>
        <el-table v-loading="loading" :data="commissions" size="small" stripe empty-text="暂无佣金明细">
          <el-table-column label="订单/推广码" min-width="220">
            <template #default="{ row }">
              <strong>{{ row.order?.orderNo || "-" }}</strong>
              <small>{{ row.code || "-" }}</small>
              <small>{{ row.order?.checkoutGroup?.groupNo || "非跨店订单" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="推广人/代理" min-width="140"><template #default="{ row }">{{ row.promoterUser?.phone || row.agent?.name || "-" }}</template></el-table-column>
          <el-table-column label="订单金额" width="110"><template #default="{ row }">¥{{ money(row.orderAmount) }}</template></el-table-column>
          <el-table-column label="佣金" width="110"><template #default="{ row }">¥{{ money(row.commissionAmount) }}</template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="commissionStatusType(row.status)">{{ commissionStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="结算/说明" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ commissionRemark(row) }}</template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button size="small" text type="primary" :disabled="!relatedOrderNo(row)" @click.stop="openRelatedOrder(row)">打开订单</el-button></template></el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { api, downloadFile } from "../api";
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
const paymentTransactions = ref<any[]>([]);
const paymentCallbackLogs = ref<any[]>([]);
const refundLogs = ref<any[]>([]);
const commissions = ref<any[]>([]);
const commissionSummary = ref<any>({});
const commissionPromoterSummary = ref<any[]>([]);
const loading = ref(false);
const merchantLoading = ref(false);
const deepLinkWarning = ref("");
const dateRange = ref<string[]>([]);
const filters = reactive({
  tenantId: routeTenantId(),
  merchantId: routeMerchantId(),
  paymentMethod: "",
  paymentStatus: "",
  callbackStatus: "",
  commissionStatus: "",
  keyword: "",
  checkoutGroupNo: "",
  startDate: "",
  endDate: ""
});

const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const loadingAny = computed(() => loading.value || merchantLoading.value);
const summaryCards = computed(() => [
  { label: "支付流水", value: paymentTransactions.value.length, desc: `成功 ${paymentTransactions.value.filter((item) => item.status === "success").length} 条` },
  { label: "支付回调", value: paymentCallbackLogs.value.length, desc: `失败 ${paymentCallbackLogs.value.filter((item) => item.resultStatus === "failed").length} 条` },
  { label: "退款日志", value: refundLogs.value.length, desc: `失败 ${refundLogs.value.filter((item) => item.status === "failed").length} 条` },
  { label: "待结算佣金", value: `¥${money(commissionSummary.value.pendingAmount)}`, desc: `${commissionSummary.value.pendingCount || 0} 笔` }
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
  return `当前链接指定的店铺 #${requestedMerchantId} 对当前账号不可见，或已被商家筛选条件过滤。为避免误读支付和退款数据，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
}

function currentMallParams(extra: Record<string, any> = {}) {
  return {
    tenantId: isPlatformAdmin() ? filters.tenantId || selectedMerchant.value?.tenant?.id : undefined,
    merchantId: filters.merchantId || undefined,
    ...extra
  };
}

function appendCurrentMallParams(params: URLSearchParams) {
  const tenantId = filters.tenantId || selectedMerchant.value?.tenant?.id;
  if (isPlatformAdmin() && tenantId) params.set("tenantId", String(tenantId));
  if (filters.merchantId) params.set("merchantId", String(filters.merchantId));
}

function baseLogParams(extra: Record<string, any> = {}) {
  return currentMallParams({
    keyword: filters.keyword.trim() || undefined,
    checkoutGroupNo: filters.checkoutGroupNo.trim() || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    ...extra
  });
}

function appendBaseLogParams(params: URLSearchParams) {
  appendCurrentMallParams(params);
  if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
  if (filters.checkoutGroupNo.trim()) params.set("checkoutGroupNo", filters.checkoutGroupNo.trim());
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
}

async function syncRouteQuery() {
  const query: Record<string, string> = {};
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  if (filters.merchantId) query.merchantId = String(filters.merchantId);
  await router.replace({ path: route.path, query });
}

function clearPaymentData() {
  paymentTransactions.value = [];
  paymentCallbackLogs.value = [];
  refundLogs.value = [];
  commissions.value = [];
  commissionSummary.value = {};
  commissionPromoterSummary.value = [];
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
      clearPaymentData();
      return false;
    } else if (filters.merchantId && !merchants.value.some((merchant) => merchant.id === filters.merchantId)) filters.merchantId = undefined;
    if (!filters.merchantId && !isPlatformAdmin() && merchants.value.length === 1) filters.merchantId = merchants.value[0].id;
    return true;
  } catch (error: any) {
    ElMessage.error(error.message || "加载可核对店铺失败");
    return false;
  } finally {
    merchantLoading.value = false;
  }
}

async function loadPaymentData() {
  if (deepLinkWarning.value) return;
  if (!isPlatformAdmin() && !filters.merchantId) {
    clearPaymentData();
    return;
  }
  loading.value = true;
  try {
    const baseParams = baseLogParams();
    const [transactions, callbackRows, refundRows, commissionRows, commissionSummaryRow, promoterRows] = await Promise.all([
      api.get<any, any[]>("/admin/mall/payment-transactions", { params: { ...baseParams, paymentMethod: filters.paymentMethod || undefined, status: filters.paymentStatus || undefined } }),
      api.get<any, any[]>("/admin/mall/payment-callback-logs", { params: { ...baseParams, status: filters.callbackStatus || undefined } }),
      api.get<any, any[]>("/admin/mall/refund-logs", { params: baseParams }),
      api.get<any, any[]>("/admin/mall/commissions", { params: { ...baseParams, status: filters.commissionStatus || undefined } }),
      api.get<any, any>("/admin/mall/commissions/summary", { params: { ...baseParams, status: filters.commissionStatus || undefined } }),
      api.get<any, any[]>("/admin/mall/commissions/by-promoter", { params: { ...baseParams, status: filters.commissionStatus || undefined } })
    ]);
    paymentTransactions.value = transactions || [];
    paymentCallbackLogs.value = callbackRows || [];
    refundLogs.value = refundRows || [];
    commissions.value = commissionRows || [];
    commissionSummary.value = commissionSummaryRow || {};
    commissionPromoterSummary.value = promoterRows || [];
  } catch (error: any) {
    ElMessage.error(error.message || "加载商城支付日志失败");
  } finally {
    loading.value = false;
  }
}

async function handleTenantChange() {
  filters.merchantId = undefined;
  await syncRouteQuery();
  const ok = await loadMerchants();
  if (ok) await loadPaymentData();
}

async function handleMerchantChange() {
  deepLinkWarning.value = "";
  await syncRouteQuery();
  await loadPaymentData();
}

function handleDateRangeChange() {
  filters.startDate = dateRange.value?.[0] || "";
  filters.endDate = dateRange.value?.[1] || "";
  void loadPaymentData();
}

function merchantWorkbenchUrl() {
  if (!selectedMerchant.value) return "";
  const query = new URLSearchParams();
  if (selectedMerchant.value.tenant?.id) query.set("tenantId", String(selectedMerchant.value.tenant.id));
  query.set("merchantId", String(selectedMerchant.value.id));
  return `${window.location.origin}/admin/mall-payment-logs?${query.toString()}`;
}

function merchantH5Url() {
  if (!selectedMerchant.value) return "";
  return h5RoutePreviewUrl(selectedMerchant.value.tenant?.code || "", `/pages/mall/merchant?id=${selectedMerchant.value.id}`);
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

function openMerchantH5() {
  const url = merchantH5Url();
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

async function copyWorkbenchLink() {
  const url = merchantWorkbenchUrl();
  if (!url) return;
  await copyToClipboard(url);
  ElMessage.success("商城支付日志链接已复制，可发给已授权的商家/代理账号。");
}

function relatedOrderNo(row: any) {
  return row?.order?.orderNo || row?.orderNo || "";
}

function openRelatedOrder(row: any) {
  const orderNo = relatedOrderNo(row);
  if (!orderNo) return ElMessage.error("这条记录没有可定位的商城订单号");
  goMerchantAdmin("/mall-orders", { keyword: orderNo });
}

async function exportPaymentTransactions() {
  try {
    const clean = new URLSearchParams();
    appendBaseLogParams(clean);
    if (filters.paymentMethod) clean.set("paymentMethod", filters.paymentMethod);
    if (filters.paymentStatus) clean.set("status", filters.paymentStatus);
    await downloadFile(`/admin/mall/payment-transactions/export?${clean.toString()}`, "mall-payment-transactions.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出支付流水失败");
  }
}

async function exportPaymentCallbackLogs() {
  try {
    const clean = new URLSearchParams();
    appendBaseLogParams(clean);
    if (filters.callbackStatus) clean.set("status", filters.callbackStatus);
    await downloadFile(`/admin/mall/payment-callback-logs/export?${clean.toString()}`, "mall-payment-callback-logs.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出支付回调失败");
  }
}

async function exportCommissions() {
  try {
    const clean = new URLSearchParams();
    appendBaseLogParams(clean);
    if (filters.commissionStatus) clean.set("status", filters.commissionStatus);
    await downloadFile(`/admin/mall/commissions/export?${clean.toString()}`, "mall-commissions.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出佣金失败");
  }
}

async function exportCommissionPromoters() {
  try {
    const clean = new URLSearchParams();
    appendBaseLogParams(clean);
    if (filters.commissionStatus) clean.set("status", filters.commissionStatus);
    await downloadFile(`/admin/mall/commissions/by-promoter/export?${clean.toString()}`, "mall-commission-promoters.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出佣金汇总失败");
  }
}

function money(value: any) {
  return Number(value || 0).toFixed(2);
}

function formatTime(value: any) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-";
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

function callbackStatusText(value: string) {
  return ({ received: "已接收", success: "成功", failed: "失败", idempotent: "幂等" } as any)[value] || value || "-";
}

function callbackStatusType(value: string) {
  return value === "success" || value === "idempotent" ? "success" : value === "failed" ? "danger" : "warning";
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

function commissionStatusText(value: string) {
  return ({ pending: "待结算", void: "已作废", settled: "已结算" } as any)[value] || value || "-";
}

function commissionStatusType(value: string) {
  return value === "pending" ? "warning" : value === "settled" ? "success" : "info";
}

function commissionRemark(row: any) {
  return row.status === "settled" ? `${row.settledBy || "财务"}：${row.settleRemark || "已结算"}` : row.voidReason || "-";
}

onMounted(async () => {
  await loadTenants();
  const ok = await loadMerchants();
  if (ok) await loadPaymentData();
});

watch(() => [route.query.tenantId, route.query.merchantId], async () => {
  const nextTenantId = routeTenantId();
  const nextMerchantId = routeMerchantId();
  if (nextTenantId !== filters.tenantId) {
    filters.tenantId = nextTenantId;
    filters.merchantId = nextMerchantId;
    const ok = await loadMerchants();
    if (ok) await loadPaymentData();
    return;
  }
  if (nextMerchantId && nextMerchantId !== filters.merchantId && merchants.value.some((item) => item.id === nextMerchantId)) {
    deepLinkWarning.value = "";
    filters.merchantId = nextMerchantId;
    await loadPaymentData();
  } else if (nextMerchantId && nextMerchantId !== filters.merchantId) {
    filters.merchantId = undefined;
    deepLinkWarning.value = merchantLinkWarning(nextMerchantId);
    clearPaymentData();
  }
});
</script>

<style scoped>
.mall-payment-logs-page { padding: 24px; display: grid; gap: 16px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-header h2 { margin: 0 0 6px; color: #111827; }
.page-header p { margin: 0; color: #64748b; }
.header-actions, .filter-row { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.filter-row { justify-content: flex-start; }
.scope-alert { margin-bottom: 2px; }
.merchant-card { border-color: #bfdbfe; background: linear-gradient(135deg, #eff6ff 0%, #fff 72%); }
.merchant-card :deep(.el-card__body) { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
.merchant-card strong { color: #0f172a; }
.merchant-card p { margin: 4px 0 0; color: #64748b; }
.merchant-tags, .merchant-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.merchant-actions { grid-column: 1 / -1; }
.filter-card :deep(.el-card__body) { display: grid; gap: 10px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.summary-grid :deep(.el-card__body) { display: grid; gap: 4px; }
.summary-grid small, .summary-grid span { color: #64748b; }
.summary-grid strong { color: #0f172a; font-size: 24px; }
.payment-log-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-header small, .payment-log-grid small, .muted-line { color: #64748b; }
.payment-log-grid strong { color: #0f172a; }
.payment-log-grid small { display: block; margin-top: 3px; }
.commission-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
.commission-summary div { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; background: #f8fafc; display: grid; gap: 3px; }
.commission-summary strong { font-size: 18px; }
.commission-promoter-table { margin-bottom: 10px; }
@media (max-width: 1200px) {
  .page-header { display: grid; }
  .header-actions { justify-content: flex-start; }
  .summary-grid, .commission-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .payment-log-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .mall-payment-logs-page { padding: 14px; }
  .summary-grid, .commission-summary { grid-template-columns: 1fr; }
  .merchant-card :deep(.el-card__body) { grid-template-columns: 1fr; }
  .merchant-tags, .merchant-actions { justify-content: flex-start; }
}
</style>
