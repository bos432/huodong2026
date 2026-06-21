<template>
  <div class="mall-settlements-page">
    <div class="page-header">
      <div>
        <h2>商城结算管理</h2>
        <p>按店铺生成、审核、打款/扣回商城结算单；平台财务处理资金动作，商家/代理按授权范围查看结算状态。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家/代理" style="width:220px" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" clearable filterable placeholder="全部授权店铺；可选单店" style="width:280px" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-select v-model="filters.status" clearable placeholder="全部结算状态" style="width:150px" @change="loadSettlements">
          <el-option label="草稿" value="draft" />
          <el-option label="已审核" value="approved" />
          <el-option label="已打款/扣回" value="paid" />
          <el-option label="已拒绝" value="rejected" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-button :loading="loadingAny" @click="loadSettlements">刷新结算</el-button>
      </div>
    </div>

    <el-alert
      v-if="deepLinkWarning"
      class="scope-alert"
      type="error"
      show-icon
      :closable="false"
      title="商城结算店铺链接不可用"
      :description="deepLinkWarning"
    />
    <el-alert
      v-else-if="!selectedMerchant && isPlatformAdmin()"
      class="scope-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前是全局结算监管模式"
      description="平台账号可以不选店铺查看全平台或所选商家下全部结算；生成结算单前建议先选择日期范围，系统只统计已完成订单并扣减已通过售后。"
    />
    <el-alert
      v-else-if="!selectedMerchant && merchants.length > 1"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="请选择要查看的店铺"
      description="当前账号可管理多个商城店铺。为避免把不同店铺的结算金额混在一起，请先选择一个店铺。"
    />

    <el-card v-if="selectedMerchant && !deepLinkWarning" shadow="never" class="merchant-card">
      <div>
        <strong>当前结算店铺：{{ selectedMerchant.name || selectedMerchant.code }}</strong>
        <p>{{ selectedMerchant.tenant?.name || selectedMerchant.tenant?.code || "平台店铺" }} · {{ merchantOwnerText(selectedMerchant) }} · {{ selectedMerchant.region || "未设置区域" }}</p>
      </div>
      <div class="merchant-tags">
        <el-tag type="success">商城已开放</el-tag>
        <el-tag type="warning" effect="plain">{{ paymentModeText(selectedMerchant.paymentMode) }}</el-tag>
      </div>
      <div class="merchant-actions">
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-orders')">订单管理</el-button>
        <el-button size="small" type="success" plain @click="goMerchantAdmin('/mall-statistics')">经营统计</el-button>
        <el-button size="small" type="warning" plain @click="goMerchantAdmin('/mall-payment-logs')">支付日志</el-button>
        <el-button size="small" @click="openMerchantH5">打开 H5 店铺</el-button>
        <el-button size="small" @click="copyWorkbenchLink">复制结算后台链接</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="结算开始" end-placeholder="结算结束" style="width:280px" @change="handleDateRangeChange" />
        <el-button type="primary" plain :disabled="!canManageMallSettlements || !filters.merchantId || !filters.startDate || !filters.endDate" @click="generateSettlement()">
          生成当前店铺结算单
        </el-button>
        <el-button @click="exportSettlements">导出结算</el-button>
      </div>
      <el-alert
        class="settlement-tip"
        type="info"
        :closable="false"
        show-icon
        :title="canManageMallSettlements ? '生成结算单前请先选择日期范围；系统只统计已完成商城订单，并扣减已通过售后。正数为应打款，负数为应扣回/冲抵。' : '当前账号可查看店铺结算状态；生成、审核、打款和扣回由平台财务处理。'"
      />
    </el-card>

    <div class="summary-grid">
      <el-card v-for="item in summaryCards" :key="item.label" shadow="never">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
        <span>{{ item.desc }}</span>
      </el-card>
    </div>

    <el-card shadow="never" class="settlement-card">
      <template #header>
        <div class="section-header">
          <span>待生成结算</span>
          <small>按当前商家/店铺/日期范围统计未生成结算的订单和退款</small>
        </div>
      </template>
      <el-table v-loading="loading" :data="settlementPending" size="small" border empty-text="暂无待生成结算">
        <el-table-column label="店铺" min-width="190">
          <template #default="{ row }">
            <strong>{{ row.merchant?.name || "-" }}</strong>
            <small>{{ row.merchant?.tenant?.name || row.merchant?.tenant?.code || "-" }} · {{ merchantOwnerText(row.merchant) }}</small>
          </template>
        </el-table-column>
        <el-table-column label="收款模式" width="120"><template #default="{ row }">{{ paymentModeText(row.paymentMode) }}</template></el-table-column>
        <el-table-column label="订单" width="90"><template #default="{ row }">{{ row.orderCount || 0 }}</template></el-table-column>
        <el-table-column label="订单金额" width="120"><template #default="{ row }">¥{{ money(row.orderAmount) }}</template></el-table-column>
        <el-table-column label="退款" width="120"><template #default="{ row }">¥{{ money(row.refundAmount) }}</template></el-table-column>
        <el-table-column label="服务费" width="120"><template #default="{ row }">¥{{ money(row.serviceFeeAmount) }}</template></el-table-column>
        <el-table-column label="应打款/扣回" width="150"><template #default="{ row }">{{ settlementAmountText(row.payableAmount) }}</template></el-table-column>
        <el-table-column v-if="canManageMallSettlements" label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" type="primary" plain :disabled="!row.merchant?.id" @click="generateSettlement(row)">生成结算单</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="settlement-card">
      <template #header>
        <div class="section-header">
          <span>结算单列表</span>
          <small>共 {{ mallSettlements.length }} 张</small>
        </div>
      </template>
      <el-table v-loading="loading" :data="mallSettlements" size="small" stripe empty-text="暂无结算单">
        <el-table-column prop="settlementNo" label="结算单号" width="190" />
        <el-table-column label="店铺" min-width="190">
          <template #default="{ row }">
            <strong>{{ row.merchant?.name || "-" }}</strong>
            <small>{{ row.tenant?.name || row.tenant?.code || "-" }} · {{ merchantOwnerText(row.merchant) }}</small>
          </template>
        </el-table-column>
        <el-table-column label="周期" width="190"><template #default="{ row }">{{ row.periodStart }} 至 {{ row.periodEnd }}</template></el-table-column>
        <el-table-column label="收款模式" width="120"><template #default="{ row }">{{ paymentModeText(row.paymentMode) }}</template></el-table-column>
        <el-table-column label="订单/退款" width="130"><template #default="{ row }">{{ row.orderCount }} / ¥{{ money(row.refundAmount) }}</template></el-table-column>
        <el-table-column label="订单金额" width="120"><template #default="{ row }">¥{{ money(row.orderAmount) }}</template></el-table-column>
        <el-table-column label="服务费" width="110"><template #default="{ row }">¥{{ money(row.serviceFeeAmount) }}</template></el-table-column>
        <el-table-column label="应打款/扣回" width="150"><template #default="{ row }">{{ settlementAmountText(row.payableAmount) }}</template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="settlementStatusType(row.status)">{{ settlementStatusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="凭证/备注" min-width="210" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.paidReference || row.remark || "-" }}
            <small>{{ settlementOperatorText(row) }}</small>
          </template>
        </el-table-column>
        <el-table-column v-if="canManageMallSettlements" label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" plain :disabled="row.status !== 'draft'" @click="approveSettlement(row)">审核</el-button>
            <el-button size="small" type="danger" plain :disabled="row.status !== 'draft'" @click="rejectSettlement(row)">拒绝</el-button>
            <el-button size="small" type="primary" plain :disabled="row.status !== 'approved'" @click="markSettlementPaid(row)">{{ settlementFinishActionText(row) }}</el-button>
          </template>
        </el-table-column>
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
import { currentTenantId, hasPermission, isPlatformAdmin } from "../permissions";

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
const mallSettlements = ref<any[]>([]);
const settlementPending = ref<any[]>([]);
const loading = ref(false);
const merchantLoading = ref(false);
const deepLinkWarning = ref("");
const dateRange = ref<string[]>([]);
const canManageMallSettlements = computed(() => !currentTenantId() && hasPermission("mall.settlement.manage"));
const filters = reactive({
  tenantId: routeTenantId(),
  merchantId: routeMerchantId(),
  status: "",
  startDate: "",
  endDate: ""
});

const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const loadingAny = computed(() => loading.value || merchantLoading.value);
const summaryCards = computed(() => [
  { label: "待生成店铺", value: settlementPending.value.length, desc: "当前周期未生成结算" },
  { label: "草稿", value: mallSettlements.value.filter((item) => item.status === "draft").length, desc: "待平台财务审核" },
  { label: "已审核", value: mallSettlements.value.filter((item) => item.status === "approved").length, desc: "待打款或扣回" },
  { label: "已完成", value: mallSettlements.value.filter((item) => item.status === "paid").length, desc: "已打款/已扣回" },
  { label: "待打款/扣回", value: settlementAmountText(mallSettlements.value.filter((item) => item.status === "approved").reduce((sum, item) => sum + Number(item.payableAmount || 0), 0)), desc: "已审核未完成" }
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
  return `当前链接指定的店铺 #${requestedMerchantId} 对当前账号不可见，或已被商家筛选条件过滤。为避免误读结算金额，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
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

async function syncRouteQuery() {
  const query: Record<string, string> = {};
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  if (filters.merchantId) query.merchantId = String(filters.merchantId);
  await router.replace({ path: route.path, query });
}

function clearSettlements() {
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
      clearSettlements();
      return false;
    } else if (filters.merchantId && !merchants.value.some((merchant) => merchant.id === filters.merchantId)) filters.merchantId = undefined;
    if (!filters.merchantId && !isPlatformAdmin() && merchants.value.length === 1) filters.merchantId = merchants.value[0].id;
    return true;
  } catch (error: any) {
    ElMessage.error(error.message || "加载可结算店铺失败");
    return false;
  } finally {
    merchantLoading.value = false;
  }
}

async function loadSettlements() {
  if (deepLinkWarning.value) return;
  if (!isPlatformAdmin() && !filters.merchantId) {
    clearSettlements();
    return;
  }
  loading.value = true;
  try {
    const result = await api.get<any, any>("/admin/mall/settlements", {
      params: currentMallParams({
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      })
    });
    mallSettlements.value = result.items || [];
    settlementPending.value = result.pending || [];
  } catch (error: any) {
    ElMessage.error(error.message || "加载商城结算失败");
  } finally {
    loading.value = false;
  }
}

async function handleTenantChange() {
  filters.merchantId = undefined;
  await syncRouteQuery();
  const ok = await loadMerchants();
  if (ok) await loadSettlements();
}

async function handleMerchantChange() {
  deepLinkWarning.value = "";
  await syncRouteQuery();
  await loadSettlements();
}

function handleDateRangeChange() {
  filters.startDate = dateRange.value?.[0] || "";
  filters.endDate = dateRange.value?.[1] || "";
  void loadSettlements();
}

function settlementPayloadMerchant(row?: any) {
  const merchant = row?.merchant || selectedMerchant.value;
  return {
    tenantId: isPlatformAdmin() ? filters.tenantId || merchant?.tenant?.id || selectedMerchant.value?.tenant?.id : undefined,
    merchantId: merchant?.id || filters.merchantId
  };
}

async function generateSettlement(row?: any) {
  if (!canManageMallSettlements.value) return ElMessage.error("商城结算生成、审核和打款由平台财务处理");
  const target = settlementPayloadMerchant(row);
  if (!target.merchantId) return ElMessage.error("请先选择或指定要生成结算单的店铺");
  if (!filters.startDate || !filters.endDate) return ElMessage.error("请先选择结算周期日期范围");
  try {
    await api.post("/admin/mall/settlements/generate", {
      ...target,
      periodStart: filters.startDate,
      periodEnd: filters.endDate,
      remark: "后台商城财务生成结算单"
    });
    ElMessage.success("结算单已生成");
    await loadSettlements();
  } catch (error: any) {
    ElMessage.error(error.message || "生成结算单失败");
  }
}

async function approveSettlement(row: any) {
  if (!canManageMallSettlements.value) return ElMessage.error("商城结算审核由平台财务处理");
  const { value } = await ElMessageBox.prompt(`审核通过结算单 ${row.settlementNo}？${settlementAmountText(row.payableAmount)}`, "审核商城结算", { inputValue: "财务已核对订单、退款和服务费", confirmButtonText: "通过", cancelButtonText: "取消" });
  await api.post(`/admin/mall/settlements/${row.id}/approve`, { remark: value });
  ElMessage.success("结算单已审核");
  await loadSettlements();
}

async function rejectSettlement(row: any) {
  if (!canManageMallSettlements.value) return ElMessage.error("商城结算审核由平台财务处理");
  const { value } = await ElMessageBox.prompt(`拒绝结算单 ${row.settlementNo}？`, "拒绝商城结算", { inputValue: "结算数据需重新核对", confirmButtonText: "拒绝", cancelButtonText: "取消" });
  await api.post(`/admin/mall/settlements/${row.id}/reject`, { remark: value });
  ElMessage.success("结算单已拒绝");
  await loadSettlements();
}

async function markSettlementPaid(row: any) {
  if (!canManageMallSettlements.value) return ElMessage.error("商城结算打款/扣回由平台财务处理");
  const actionText = settlementFinishActionText(row);
  const { value } = await ElMessageBox.prompt(`标记结算单 ${row.settlementNo} 已${actionText}？`, "标记商城结算完成", {
    inputValue: row.paidReference || "",
    inputPlaceholder: actionText === "扣回/冲抵" ? "填写扣回/冲抵凭证号或后续抵扣说明" : "填写打款流水号或线下凭证号",
    confirmButtonText: `确认${actionText}`,
    cancelButtonText: "取消",
    inputValidator: (value) => Boolean(String(value || "").trim()) || `请填写${actionText}凭证号或说明，方便财务对账`
  });
  await api.post(`/admin/mall/settlements/${row.id}/mark-paid`, { paidReference: value, remark: actionText === "扣回/冲抵" ? "财务确认已扣回/冲抵" : "财务确认已打款" });
  ElMessage.success(`结算单已标记${actionText}`);
  await loadSettlements();
}

async function exportSettlements() {
  if (deepLinkWarning.value) return ElMessage.error("当前商城结算店铺链接不可用，请先确认店铺授权后再导出。");
  try {
    const clean = new URLSearchParams();
    appendCurrentMallParams(clean);
    if (filters.status) clean.set("status", filters.status);
    if (filters.startDate) clean.set("startDate", filters.startDate);
    if (filters.endDate) clean.set("endDate", filters.endDate);
    await downloadFile(`/admin/mall/settlements/export?${clean.toString()}`, "mall-settlements.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出商城结算失败");
  }
}

function merchantWorkbenchUrl() {
  if (!selectedMerchant.value) return "";
  const query = new URLSearchParams();
  if (selectedMerchant.value.tenant?.id) query.set("tenantId", String(selectedMerchant.value.tenant.id));
  query.set("merchantId", String(selectedMerchant.value.id));
  return `${window.location.origin}/admin/mall-settlements?${query.toString()}`;
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
  ElMessage.success("商城结算后台链接已复制，可发给已授权的商家/代理账号。");
}

function money(value: any) {
  return Number(value || 0).toFixed(2);
}

function settlementAmountText(value: any) {
  const amount = Number(value || 0);
  return `${amount < 0 ? "应扣回" : "应打款"} ¥${Math.abs(amount).toFixed(2)}`;
}

function settlementFinishActionText(row: any) {
  return Number(row?.payableAmount || 0) < 0 ? "扣回/冲抵" : "打款";
}

function settlementStatusText(value: string) {
  return ({ draft: "草稿", approved: "已审核", paid: "已打款", rejected: "已拒绝", cancelled: "已取消" } as any)[value] || value || "-";
}

function settlementStatusType(value: string) {
  return value === "paid" ? "success" : value === "approved" ? "warning" : value === "rejected" || value === "cancelled" ? "danger" : "info";
}

function formatTime(value: any) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-";
}

function settlementOperatorText(row: any) {
  return [row.generatedBy && `生成：${row.generatedBy}`, row.reviewedBy && `审核：${row.reviewedBy} ${formatTime(row.reviewedAt)}`, row.paidBy && `${settlementFinishActionText(row)}：${row.paidBy} ${formatTime(row.paidAt)}`].filter(Boolean).join("；") || "";
}

onMounted(async () => {
  await loadTenants();
  const ok = await loadMerchants();
  if (ok) await loadSettlements();
});

watch(() => [route.query.tenantId, route.query.merchantId], async () => {
  const nextTenantId = routeTenantId();
  const nextMerchantId = routeMerchantId();
  if (nextTenantId !== filters.tenantId) {
    filters.tenantId = nextTenantId;
    filters.merchantId = nextMerchantId;
    const ok = await loadMerchants();
    if (ok) await loadSettlements();
    return;
  }
  if (nextMerchantId && nextMerchantId !== filters.merchantId && merchants.value.some((item) => item.id === nextMerchantId)) {
    deepLinkWarning.value = "";
    filters.merchantId = nextMerchantId;
    await loadSettlements();
  } else if (nextMerchantId && nextMerchantId !== filters.merchantId) {
    filters.merchantId = undefined;
    deepLinkWarning.value = merchantLinkWarning(nextMerchantId);
    clearSettlements();
  }
});
</script>

<style scoped>
.mall-settlements-page { padding: 24px; display: grid; gap: 16px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-header h2 { margin: 0 0 6px; color: #111827; }
.page-header p { margin: 0; color: #64748b; }
.header-actions, .filter-row { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.filter-row { justify-content: flex-start; }
.scope-alert { margin-bottom: 2px; }
.merchant-card { border-color: #d1fae5; background: linear-gradient(135deg, #ecfdf5 0%, #fff 72%); }
.merchant-card :deep(.el-card__body) { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
.merchant-card strong { color: #0f172a; }
.merchant-card p { margin: 4px 0 0; color: #64748b; }
.merchant-tags, .merchant-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.merchant-actions { grid-column: 1 / -1; }
.filter-card :deep(.el-card__body) { display: grid; gap: 10px; }
.settlement-tip { margin-top: 2px; }
.summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.summary-grid :deep(.el-card__body) { display: grid; gap: 4px; }
.summary-grid small, .summary-grid span { color: #64748b; }
.summary-grid strong { color: #0f172a; font-size: 24px; }
.settlement-card small { display: block; color: #64748b; margin-top: 3px; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-header small { color: #64748b; }
@media (max-width: 1200px) {
  .page-header { display: grid; }
  .header-actions { justify-content: flex-start; }
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .mall-settlements-page { padding: 14px; }
  .summary-grid { grid-template-columns: 1fr; }
  .merchant-card :deep(.el-card__body) { grid-template-columns: 1fr; }
  .merchant-tags, .merchant-actions { justify-content: flex-start; }
}
</style>
