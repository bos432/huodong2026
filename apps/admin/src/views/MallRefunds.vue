<template>
  <div class="mall-refunds-page">
    <div class="page-header">
      <div>
        <h2>商城售后管理</h2>
        <p>集中处理仅退款、退货退款、微信原路退款、余额退回和线下退款备注；平台可全局监管，商家/代理只看授权店铺。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家/代理" style="width:220px" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" clearable filterable placeholder="全部授权店铺；可选单店" style="width:280px" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-select v-model="filters.status" clearable placeholder="全部售后状态" style="width:150px" @change="loadRefundData">
          <el-option label="待处理" value="pending" />
          <el-option label="处理中" value="processing" />
          <el-option label="已通过" value="approved" />
          <el-option label="退款失败" value="failed" />
          <el-option label="已拒绝" value="rejected" />
        </el-select>
        <el-input v-model="filters.keyword" clearable placeholder="售后单/订单号/手机号/原因" style="width:260px" @keyup.enter="loadRefundData" @clear="loadRefundData" />
        <el-button :loading="loadingAny" @click="loadRefundData">刷新售后</el-button>
      </div>
    </div>

    <el-alert
      v-if="deepLinkWarning"
      class="scope-alert"
      type="error"
      show-icon
      :closable="false"
      title="商城售后店铺链接不可用"
      :description="deepLinkWarning"
    />
    <el-alert
      v-else-if="!selectedMerchant && isPlatformAdmin()"
      class="scope-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前是全局售后监管模式"
      description="平台账号可以不选店铺查看全平台或所选商家下全部售后；通过、拒绝、重试退款前请核对店铺、订单、退款渠道和用户凭证。"
    />
    <el-alert
      v-else-if="!selectedMerchant && merchants.length > 1"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="请选择要处理的店铺"
      description="当前账号可管理多个商城店铺。为避免把不同店铺的退款混在一起，请先选择一个店铺再处理售后。"
    />

    <el-card v-if="selectedMerchant && !deepLinkWarning" shadow="never" class="merchant-card">
      <div>
        <strong>当前售后店铺：{{ selectedMerchant.name || selectedMerchant.code }}</strong>
        <p>{{ selectedMerchant.tenant?.name || selectedMerchant.tenant?.code || "平台店铺" }} · {{ merchantOwnerText(selectedMerchant) }} · {{ selectedMerchant.region || "未设置区域" }}</p>
      </div>
      <div class="merchant-tags">
        <el-tag type="success">商城已开放</el-tag>
        <el-tag type="warning" effect="plain">{{ paymentModeText(selectedMerchant.paymentMode) }}</el-tag>
      </div>
      <div class="merchant-actions">
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-orders')">订单管理</el-button>
        <el-button size="small" type="warning" plain @click="goMerchantAdmin('/mall-payment-logs')">支付日志</el-button>
        <el-button size="small" type="info" plain @click="goMerchantAdmin('/mall-settlements')">商城结算</el-button>
        <el-button size="small" type="success" plain @click="goMerchantAdmin('/mall-statistics')">经营统计</el-button>
        <el-button size="small" @click="openMerchantH5">打开 H5 店铺</el-button>
        <el-button size="small" @click="copyWorkbenchLink">复制售后后台链接</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-select v-model="filters.paymentMethod" clearable placeholder="退款对应支付方式" style="width:170px" @change="loadRefundData">
          <el-option label="微信支付" value="wechat" />
          <el-option label="余额支付" value="balance" />
          <el-option label="线下收款" value="offline" />
        </el-select>
        <el-select v-model="filters.refundLogStatus" clearable placeholder="退款日志状态" style="width:150px" @change="loadRefundData">
          <el-option label="成功" value="success" />
          <el-option label="已提交" value="submitted" />
          <el-option label="失败" value="failed" />
        </el-select>
        <el-input v-model="filters.checkoutGroupNo" clearable placeholder="跨店结算组号" style="width:190px" @keyup.enter="loadRefundData" @clear="loadRefundData" />
        <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="申请开始" end-placeholder="申请结束" style="width:250px" @change="handleDateRangeChange" />
      </div>
      <div class="filter-row">
        <el-button @click="exportRefunds">导出售后</el-button>
        <el-button @click="goPaymentLogs">查看退款日志</el-button>
      </div>
      <el-alert
        class="refund-tip"
        type="info"
        :closable="false"
        show-icon
        :title="canManageRefunds ? '通过售后会触发对应退款通道、库存回补、余额/支付流水和结算扣减；失败退款请先看日志再重试。' : '当前账号可查看售后和退款日志；通过、拒绝和重试退款需要商城售后退款权限。'"
      />
    </el-card>

    <div class="summary-grid">
      <el-card v-for="item in summaryCards" :key="item.label" shadow="never">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
        <span>{{ item.desc }}</span>
      </el-card>
    </div>

    <el-card shadow="never" class="refund-card">
      <template #header>
        <div class="section-header">
          <span>售后申请</span>
          <small>共 {{ refunds.length }} 条，优先处理待处理和退款失败记录</small>
        </div>
      </template>
      <el-table v-loading="loading" :data="refunds" stripe empty-text="暂无售后申请" @row-click="openRefundOrder">
        <el-table-column prop="refundNo" label="售后单号" width="190" />
        <el-table-column label="订单/结算组" width="200">
          <template #default="{ row }">
            <strong>{{ row.order?.orderNo || "-" }}</strong>
            <small>{{ row.order?.checkoutGroup?.groupNo || "非跨店订单" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="店铺" min-width="170">
          <template #default="{ row }">
            <strong>{{ row.merchant?.name || row.order?.merchant?.name || "默认店铺" }}</strong>
            <small>{{ row.tenant?.name || row.tenant?.code || row.order?.tenant?.name || "-" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="用户" width="140"><template #default="{ row }">{{ row.user?.phone || "-" }}</template></el-table-column>
        <el-table-column label="类型" width="100"><template #default="{ row }">{{ refundTypeText(row.type) }}</template></el-table-column>
        <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
        <el-table-column prop="reason" label="原因" min-width="200" show-overflow-tooltip />
        <el-table-column label="凭证" width="150">
          <template #default="{ row }">
            <div v-if="row.images?.length" class="refund-image-list">
              <el-image v-for="image in row.images" :key="image" class="refund-thumb" :src="image" :preview-src-list="row.images" preview-teleported fit="cover" />
            </div>
            <span v-else class="muted-line">无凭证</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="refundStatusType(row.status)">{{ refundText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="退款渠道" min-width="230">
          <template #default="{ row }">
            <strong>{{ refundProviderText(row) }}</strong>
            <small>{{ row.providerRefundFailureReason || row.providerRefundStatus || row.providerRefundNo || "-" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="审核" min-width="220">
          <template #default="{ row }">
            {{ row.reviewedBy || "-" }} {{ formatTime(row.reviewedAt) }}
            <small>{{ row.reviewRemark || "-" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="330" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click.stop="openRefundOrder(row)">订单</el-button>
            <el-button size="small" type="success" :disabled="!canManageRefunds || row.status !== 'pending'" @click.stop="approveRefund(row)">通过</el-button>
            <el-button size="small" type="warning" plain :disabled="!canManageRefunds || !['processing','failed'].includes(row.status)" @click.stop="retryRefund(row)">重试退款</el-button>
            <el-button size="small" type="danger" :disabled="!canManageRefunds || row.status !== 'pending'" @click.stop="rejectRefund(row)">拒绝</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="refund-card">
      <template #header>
        <div class="section-header">
          <span>退款日志</span>
          <small>原路退款、余额退回和线下退款都要留痕；失败原因给财务排查用</small>
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
        <el-table-column label="店铺" min-width="150"><template #default="{ row }">{{ row.merchant?.name || row.order?.merchant?.name || "-" }}</template></el-table-column>
        <el-table-column label="渠道" width="100"><template #default="{ row }">{{ refundProviderName(row.provider) }}</template></el-table-column>
        <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="refundLogStatusType(row.status)">{{ refundLogStatusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="说明" min-width="220" show-overflow-tooltip><template #default="{ row }">{{ row.message || "-" }}</template></el-table-column>
        <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="90"><template #default="{ row }"><el-button size="small" text type="primary" :disabled="!relatedOrderNo(row)" @click.stop="openRelatedOrder(row)">打开订单</el-button></template></el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, downloadFile } from "../api";
import { copyToClipboard, h5RoutePreviewUrl } from "../h5-preview";
import { hasPermission, isPlatformAdmin } from "../permissions";

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
const refunds = ref<any[]>([]);
const refundLogs = ref<any[]>([]);
const loading = ref(false);
const merchantLoading = ref(false);
const deepLinkWarning = ref("");
const dateRange = ref<string[]>([]);
const canManageRefunds = computed(() => hasPermission("mall.refund.manage"));
const filters = reactive({
  tenantId: routeTenantId(),
  merchantId: routeMerchantId(),
  status: "",
  refundLogStatus: "",
  paymentMethod: "",
  keyword: routeKeyword(),
  checkoutGroupNo: "",
  startDate: "",
  endDate: ""
});

const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const loadingAny = computed(() => loading.value || merchantLoading.value);
const summaryCards = computed(() => [
  { label: "售后单数", value: refunds.value.length, desc: "当前筛选范围" },
  { label: "待处理", value: refunds.value.filter((item) => item.status === "pending").length, desc: "需要尽快审核" },
  { label: "退款异常", value: refunds.value.filter((item) => ["processing", "failed"].includes(item.status)).length, desc: "先看日志再重试" },
  { label: "已通过金额", value: `¥${money(refunds.value.filter((item) => item.status === "approved").reduce((sum, item) => sum + Number(item.amount || 0), 0))}`, desc: "会影响结算" },
  { label: "失败日志", value: refundLogs.value.filter((item) => item.status === "failed").length, desc: "需财务排查" }
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
  return `当前链接指定的店铺 #${requestedMerchantId} 对当前账号不可见，或已被商家筛选条件过滤。为避免误处理退款，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
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

function baseRefundParams(extra: Record<string, any> = {}) {
  return currentMallParams({
    keyword: filters.keyword.trim() || undefined,
    checkoutGroupNo: filters.checkoutGroupNo.trim() || undefined,
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

function clearRefundData() {
  refunds.value = [];
  refundLogs.value = [];
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
      clearRefundData();
      return false;
    } else if (filters.merchantId && !merchants.value.some((merchant) => merchant.id === filters.merchantId)) filters.merchantId = undefined;
    if (!filters.merchantId && !isPlatformAdmin() && merchants.value.length === 1) filters.merchantId = merchants.value[0].id;
    return true;
  } catch (error: any) {
    ElMessage.error(error.message || "加载可处理售后的店铺失败");
    return false;
  } finally {
    merchantLoading.value = false;
  }
}

async function loadRefundData() {
  if (deepLinkWarning.value) return;
  if (!isPlatformAdmin() && !filters.merchantId) {
    clearRefundData();
    return;
  }
  loading.value = true;
  try {
    const [refundRows, refundLogRows] = await Promise.all([
      api.get<any, any[]>("/admin/mall/refunds", {
        params: baseRefundParams({
          status: filters.status || undefined,
          paymentMethod: filters.paymentMethod || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined
        })
      }),
      api.get<any, any[]>("/admin/mall/refund-logs", {
        params: baseRefundParams({
          status: filters.refundLogStatus || undefined
        })
      })
    ]);
    refunds.value = refundRows || [];
    refundLogs.value = refundLogRows || [];
    await syncRouteQuery();
  } catch (error: any) {
    ElMessage.error(error.message || "加载商城售后失败");
  } finally {
    loading.value = false;
  }
}

async function handleTenantChange() {
  filters.merchantId = undefined;
  await syncRouteQuery();
  const ok = await loadMerchants();
  if (ok) await loadRefundData();
}

async function handleMerchantChange() {
  deepLinkWarning.value = "";
  await syncRouteQuery();
  await loadRefundData();
}

function handleDateRangeChange() {
  filters.startDate = dateRange.value?.[0] || "";
  filters.endDate = dateRange.value?.[1] || "";
  void loadRefundData();
}

function merchantWorkbenchUrl() {
  if (!selectedMerchant.value) return "";
  const query = new URLSearchParams();
  if (selectedMerchant.value.tenant?.id) query.set("tenantId", String(selectedMerchant.value.tenant.id));
  query.set("merchantId", String(selectedMerchant.value.id));
  return `${window.location.origin}/admin/mall-refunds?${query.toString()}`;
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

function goPaymentLogs() {
  goMerchantAdmin("/mall-payment-logs", { keyword: filters.keyword.trim() || undefined, checkoutGroupNo: filters.checkoutGroupNo.trim() || undefined });
}

function openMerchantH5() {
  const url = merchantH5Url();
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

async function copyWorkbenchLink() {
  const url = merchantWorkbenchUrl();
  if (!url) return;
  await copyToClipboard(url);
  ElMessage.success("商城售后后台链接已复制，可发给已授权的商家/代理账号。");
}

function relatedOrderNo(row: any) {
  return row?.order?.orderNo || row?.orderNo || "";
}

function openRelatedOrder(row: any) {
  const orderNo = relatedOrderNo(row);
  if (!orderNo) return ElMessage.error("这条记录没有可定位的商城订单号");
  goMerchantAdmin("/mall-orders", { keyword: orderNo });
}

function openRefundOrder(row: any) {
  const orderNo = row?.order?.orderNo || "";
  if (!orderNo) return ElMessage.error("未找到对应商城订单，请检查当前店铺权限或筛选范围");
  goMerchantAdmin("/mall-orders", { keyword: orderNo });
}

async function approveRefund(row: any) {
  if (!canManageRefunds.value) return ElMessage.error("通过售后需要商城售后退款权限");
  try {
    await ElMessageBox.confirm(`确认通过售后 ${row.refundNo}？系统会按订单支付方式退款，并同步库存、流水和结算。`, "通过商城售后", { type: "warning", confirmButtonText: "确认通过", cancelButtonText: "取消" });
    await api.post(`/admin/mall/refunds/${row.id}/approve`, { remark: "后台审核通过" });
    ElMessage.success("售后已通过，退款流程已提交");
    await loadRefundData();
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "处理售后失败");
  }
}

async function retryRefund(row: any) {
  if (!canManageRefunds.value) return ElMessage.error("重试退款需要商城售后退款权限");
  try {
    const result = await ElMessageBox.prompt(`确认重试售后 ${row.refundNo} 的退款？请先核对退款日志失败原因，避免重复处理。`, "重试商城退款", { inputValue: "财务核对失败原因后重试退款", confirmButtonText: "确认重试", cancelButtonText: "取消" });
    await api.post(`/admin/mall/refunds/${row.id}/retry`, { remark: result.value || "财务重试退款" });
    ElMessage.success("退款重试已提交，请稍后查看退款日志");
    await loadRefundData();
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "重试退款失败");
  }
}

async function rejectRefund(row: any) {
  if (!canManageRefunds.value) return ElMessage.error("拒绝售后需要商城售后退款权限");
  try {
    const result = await ElMessageBox.prompt("请输入拒绝原因，用户侧会看到可理解的拒绝说明，方便客服回访。", "拒绝商城售后", { inputValue: "后台审核拒绝", confirmButtonText: "确认拒绝", cancelButtonText: "取消", inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写拒绝原因" });
    await api.post(`/admin/mall/refunds/${row.id}/reject`, { remark: result.value || "后台审核拒绝" });
    ElMessage.success("售后已拒绝");
    await loadRefundData();
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "拒绝售后失败");
  }
}

async function exportRefunds() {
  if (deepLinkWarning.value) return ElMessage.error("当前商城售后店铺链接不可用，请先确认店铺授权后再导出。");
  try {
    const clean = new URLSearchParams();
    appendCurrentMallParams(clean);
    if (filters.status) clean.set("status", filters.status);
    if (filters.paymentMethod) clean.set("paymentMethod", filters.paymentMethod);
    if (filters.keyword.trim()) clean.set("keyword", filters.keyword.trim());
    if (filters.checkoutGroupNo.trim()) clean.set("checkoutGroupNo", filters.checkoutGroupNo.trim());
    if (filters.startDate) clean.set("startDate", filters.startDate);
    if (filters.endDate) clean.set("endDate", filters.endDate);
    await downloadFile(`/admin/mall/refunds/export?${clean.toString()}`, "mall-refunds.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出商城售后失败");
  }
}

function money(value: any) {
  return Number(value || 0).toFixed(2);
}

function formatTime(value: any) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-";
}

function refundText(value: string) {
  return ({ pending: "待处理", processing: "处理中", approved: "已通过", rejected: "已拒绝", failed: "失败" } as any)[value] || value || "-";
}

function refundStatusType(value: string) {
  return value === "approved" ? "success" : value === "failed" ? "danger" : value === "pending" || value === "processing" ? "warning" : "info";
}

function refundTypeText(value: string) {
  return ({ refund_only: "仅退款", return_refund: "退货退款" } as any)[value] || value || "-";
}

function refundProviderName(value: string) {
  return ({ wechat: "微信原路", balance: "余额退回", offline: "线下退款", alipay: "支付宝" } as any)[value] || value || "-";
}

function refundProviderText(row: any) {
  const provider = row.order?.paymentMethod || row.providerRefundPayload?.provider || "";
  const mode = row.providerRefundPayload?.mode ? ` / ${row.providerRefundPayload.mode}` : "";
  return `${refundProviderName(provider)}${mode}`;
}

function refundLogStatusText(value: string) {
  return ({ success: "成功", submitted: "已提交", failed: "失败" } as any)[value] || value || "-";
}

function refundLogStatusType(value: string) {
  return value === "success" ? "success" : value === "failed" ? "danger" : "warning";
}

onMounted(async () => {
  await loadTenants();
  const ok = await loadMerchants();
  if (ok) await loadRefundData();
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
    if (ok) await loadRefundData();
    return;
  }
  if (nextMerchantId && nextMerchantId !== filters.merchantId && merchants.value.some((item) => item.id === nextMerchantId)) {
    deepLinkWarning.value = "";
    filters.merchantId = nextMerchantId;
    await loadRefundData();
  } else if (nextMerchantId && nextMerchantId !== filters.merchantId) {
    filters.merchantId = undefined;
    deepLinkWarning.value = merchantLinkWarning(nextMerchantId);
    clearRefundData();
  }
});
</script>

<style scoped>
.mall-refunds-page { padding: 24px; display: grid; gap: 16px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-header h2 { margin: 0 0 6px; color: #111827; }
.page-header p { margin: 0; color: #64748b; }
.header-actions, .filter-row { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.filter-row { justify-content: flex-start; }
.scope-alert { margin-bottom: 2px; }
.merchant-card { border-color: #fed7aa; background: linear-gradient(135deg, #fff7ed 0%, #fff 72%); }
.merchant-card :deep(.el-card__body) { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
.merchant-card strong { color: #0f172a; }
.merchant-card p { margin: 4px 0 0; color: #64748b; }
.merchant-tags, .merchant-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.merchant-actions { grid-column: 1 / -1; }
.filter-card :deep(.el-card__body) { display: grid; gap: 10px; }
.refund-tip { margin-top: 2px; }
.summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.summary-grid :deep(.el-card__body) { display: grid; gap: 4px; }
.summary-grid small, .summary-grid span { color: #64748b; }
.summary-grid strong { color: #0f172a; font-size: 24px; }
.refund-card small, .muted-line { display: block; color: #64748b; margin-top: 3px; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-header small { color: #64748b; }
.refund-image-list { display: flex; flex-wrap: wrap; gap: 6px; }
.refund-thumb { width: 42px; height: 42px; border-radius: 8px; border: 1px solid #e5e7eb; }
@media (max-width: 1200px) {
  .page-header { display: grid; }
  .header-actions { justify-content: flex-start; }
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .mall-refunds-page { padding: 14px; }
  .summary-grid { grid-template-columns: 1fr; }
  .merchant-card :deep(.el-card__body) { grid-template-columns: 1fr; }
  .merchant-tags, .merchant-actions { justify-content: flex-start; }
}
</style>
