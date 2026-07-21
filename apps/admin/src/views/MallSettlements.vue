<template>
  <div class="mall-settlements-page">
    <div class="page-header">
      <div>
        <h2>商城结算管理</h2>
        <p>按店铺生成、审核、打款/扣回商城结算单；平台财务处理资金动作，商家/代理按授权范围查看结算状态。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家/代理" style="width:220px" :disabled="Boolean(actionKey) || exporting" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" clearable filterable placeholder="全部授权店铺；可选单店" style="width:280px" :disabled="Boolean(actionKey) || exporting" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-select v-model="filters.status" clearable placeholder="全部结算状态" style="width:150px" :disabled="Boolean(actionKey) || exporting" @change="loadSettlements">
          <el-option label="草稿" value="draft" />
          <el-option label="已审核" value="approved" />
          <el-option label="已打款/扣回" value="paid" />
          <el-option label="已拒绝" value="rejected" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-button :loading="loadingAny" :disabled="Boolean(actionKey) || exporting" @click="loadSettlements">刷新结算</el-button>
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
    <el-alert
      v-if="tenantErrorMessage"
      class="scope-alert"
      type="error"
      show-icon
      :closable="false"
      title="租户范围加载失败"
    >
      <p>{{ tenantErrorMessage }}</p>
      <el-button size="small" :loading="merchantLoading" @click="retryScopeLoading">重试</el-button>
    </el-alert>
    <el-alert
      v-if="merchantErrorMessage"
      class="scope-alert"
      type="error"
      show-icon
      :closable="false"
      title="店铺范围加载失败"
    >
      <p>{{ merchantErrorMessage }}</p>
      <el-button size="small" :loading="merchantLoading" @click="retryScopeLoading">重试</el-button>
    </el-alert>
    <el-alert
      v-if="errorMessage"
      class="scope-alert"
      type="error"
      show-icon
      :closable="false"
      title="商城结算加载失败"
    >
      <p>{{ errorMessage }}</p>
      <el-button size="small" :loading="loading" @click="loadSettlements">重试</el-button>
    </el-alert>

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
        <el-button v-if="canViewOrders" size="small" type="primary" plain @click="goMerchantAdmin('/mall-orders')">订单管理</el-button>
        <el-button v-if="canViewStatistics" size="small" type="success" plain @click="goMerchantAdmin('/mall-statistics')">经营统计</el-button>
        <el-button v-if="canViewFinance" size="small" type="warning" plain @click="goMerchantAdmin('/mall-payment-logs')">支付日志</el-button>
        <el-button size="small" @click="openMerchantH5">打开 H5 店铺</el-button>
        <el-button size="small" @click="copyWorkbenchLink">复制结算后台链接</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="结算开始" end-placeholder="结算结束" style="width:280px" :disabled="Boolean(actionKey) || exporting" @change="handleDateRangeChange" />
        <el-button v-if="canManageMallSettlements" type="primary" plain :loading="actionKey === `generate:${filters.merchantId || 0}`" :disabled="!filters.merchantId || !filters.startDate || !filters.endDate || Boolean(actionKey)" @click="generateSettlement()">
          生成当前店铺结算单
        </el-button>
        <el-button :loading="exporting" :disabled="Boolean(actionKey) || exporting" @click="exportSettlements">导出结算</el-button>
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
        <el-table-column label="佣金" width="120"><template #default="{ row }">¥{{ money(row.commissionAmount) }}</template></el-table-column>
        <el-table-column label="佣金扣回" width="120"><template #default="{ row }">¥{{ money(row.commissionClawbackAmount) }}</template></el-table-column>
        <el-table-column label="风险复核" width="100"><template #default="{ row }"><el-tag v-if="row.riskReviewCount" type="danger">{{ row.riskReviewCount }} 笔</el-tag><span v-else>-</span></template></el-table-column>
        <el-table-column label="应打款/扣回" width="150"><template #default="{ row }">{{ settlementAmountText(row.payableAmount) }}</template></el-table-column>
        <el-table-column v-if="canManageMallSettlements" label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" type="primary" plain :loading="actionKey === `generate:${row.merchant?.id || 0}`" :disabled="!row.merchant?.id || Boolean(actionKey)" @click="generateSettlement(row)">生成结算单</el-button>
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
        <el-table-column label="平台代收" width="120"><template #default="{ row }">¥{{ money(row.platformCollectedAmount) }}</template></el-table-column>
        <el-table-column label="服务费" width="110"><template #default="{ row }">¥{{ money(row.serviceFeeAmount) }}</template></el-table-column>
        <el-table-column label="佣金净额" width="120"><template #default="{ row }">¥{{ money(Number(row.commissionAmount || 0) - Number(row.commissionClawbackAmount || 0)) }}</template></el-table-column>
        <el-table-column label="财务调整" width="110"><template #default="{ row }">¥{{ money(row.adjustmentAmount) }}</template></el-table-column>
        <el-table-column label="应打款/扣回" width="150"><template #default="{ row }">{{ settlementAmountText(row.payableAmount) }}</template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="settlementStatusType(row.status)">{{ settlementStatusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="凭证/备注" min-width="210" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.paidReference || row.remark || "-" }}
            <small>{{ settlementOperatorText(row) }}</small>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="View" :loading="detailLoading && detailTargetId === row.id" @click="openSettlementDetail(row)">明细</el-button>
            <template v-if="canManageMallSettlements">
              <el-button size="small" type="success" plain :loading="actionKey === `approve:${row.id}`" :disabled="row.status !== 'draft' || Boolean(actionKey)" @click="approveSettlement(row)">审核</el-button>
              <el-button size="small" type="danger" plain :loading="actionKey === `reject:${row.id}`" :disabled="row.status !== 'draft' || Boolean(actionKey)" @click="rejectSettlement(row)">拒绝</el-button>
              <el-button size="small" type="primary" plain :loading="actionKey === `paid:${row.id}`" :disabled="row.status !== 'approved' || Boolean(actionKey)" @click="markSettlementPaid(row)">{{ settlementFinishActionText(row) }}</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="detailVisible" title="结算逐笔对账" size="min(980px, 96vw)" destroy-on-close>
      <div v-loading="detailLoading" class="detail-content">
        <el-alert v-if="detailError" type="error" show-icon :closable="false" title="结算逐笔明细加载失败">
          <p>{{ detailError }}</p>
          <el-button size="small" :loading="detailLoading" @click="retrySettlementDetail">重试</el-button>
        </el-alert>
        <template v-if="settlementDetail?.settlement">
          <el-alert
            :type="settlementDetail.consistency?.consistent === false ? 'error' : settlementDetail.consistency?.legacy ? 'warning' : 'success'"
            show-icon
            :closable="false"
            :title="settlementDetail.consistency?.legacy ? '历史结算单使用旧版快照，无法逐笔校验' : settlementDetail.consistency?.consistent === false ? '结算主单与逐笔明细不一致，禁止审核和付款' : '结算主单与逐笔明细金额一致'"
          />
          <el-descriptions :column="4" border size="small">
            <el-descriptions-item label="结算单号">{{ settlementDetail.settlement.settlementNo }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ settlementStatusText(settlementDetail.settlement.status) }}</el-descriptions-item>
            <el-descriptions-item label="周期">{{ settlementDetail.settlement.periodStart }} 至 {{ settlementDetail.settlement.periodEnd }}</el-descriptions-item>
            <el-descriptions-item label="计算版本">{{ settlementDetail.settlement.calculationVersion }}</el-descriptions-item>
            <el-descriptions-item label="净交易额">¥{{ money(settlementDetail.settlement.netAmount) }}</el-descriptions-item>
            <el-descriptions-item label="平台代收">¥{{ money(settlementDetail.settlement.platformCollectedAmount) }}</el-descriptions-item>
            <el-descriptions-item label="商户直收">¥{{ money(settlementDetail.settlement.merchantDirectAmount) }}</el-descriptions-item>
            <el-descriptions-item label="平台服务费">¥{{ money(settlementDetail.settlement.serviceFeeAmount) }}</el-descriptions-item>
            <el-descriptions-item label="佣金成本">¥{{ money(settlementDetail.settlement.commissionAmount) }}</el-descriptions-item>
            <el-descriptions-item label="佣金扣回">¥{{ money(settlementDetail.settlement.commissionClawbackAmount) }}</el-descriptions-item>
            <el-descriptions-item label="财务调整">¥{{ money(settlementDetail.settlement.adjustmentAmount) }}</el-descriptions-item>
            <el-descriptions-item label="应打款/扣回"><strong>{{ settlementAmountText(settlementDetail.settlement.payableAmount) }}</strong></el-descriptions-item>
          </el-descriptions>

          <div v-if="canManageMallSettlements && settlementDetail.settlement.status === 'draft'" class="adjustment-row">
            <el-input-number v-model="adjustmentForm.amount" :precision="2" :step="1" :controls="false" placeholder="调整金额" />
            <el-input v-model="adjustmentForm.reason" maxlength="200" show-word-limit placeholder="填写调整原因，正数增加应付款，负数增加扣回" />
            <el-button type="primary" :icon="Plus" :loading="adjustmentSaving" :disabled="Boolean(actionKey)" @click="addAdjustment">记入调整</el-button>
          </div>

          <div class="detail-section">
            <div class="section-header"><span>逐笔结算明细</span><small>{{ settlementDetail.lines?.length || 0 }} 行</small></div>
            <el-table :data="settlementDetail.lines || []" border size="small" max-height="420" empty-text="历史结算单无逐笔明细">
              <el-table-column label="类型" width="110"><template #default="{ row }">{{ settlementLineTypeText(row.lineType) }}</template></el-table-column>
              <el-table-column prop="businessNo" label="业务编号" min-width="190" />
              <el-table-column label="方向" width="90"><template #default="{ row }"><el-tag :type="row.direction === 'credit' ? 'success' : 'danger'" effect="plain">{{ row.direction === 'credit' ? '入账' : '扣减' }}</el-tag></template></el-table-column>
              <el-table-column label="交易金额" width="120"><template #default="{ row }">¥{{ money(row.grossAmount) }}</template></el-table-column>
              <el-table-column label="费用/佣金" width="130"><template #default="{ row }">¥{{ money(Number(row.feeAmount || 0) + Number(row.commissionAmount || 0)) }}</template></el-table-column>
              <el-table-column label="应结影响" width="130"><template #default="{ row }"><strong :class="Number(row.payableAmount || 0) < 0 ? 'amount-debit' : 'amount-credit'">{{ signedMoney(row.payableAmount) }}</strong></template></el-table-column>
              <el-table-column prop="remark" label="说明" min-width="220" show-overflow-tooltip />
            </el-table>
          </div>

          <div class="detail-section">
            <div class="section-header"><span>状态事件</span><small>生成、调整、复核和付款不可覆盖</small></div>
            <el-timeline>
              <el-timeline-item v-for="event in settlementDetail.events || []" :key="event.id" :timestamp="formatTime(event.createdAt)" placement="top">
                <strong>{{ settlementEventText(event.action) }}</strong>
                <span>{{ event.operator || 'system' }} · {{ event.fromStatus || '无' }} → {{ event.toStatus }}</span>
                <p v-if="event.remark">{{ event.remark }}</p>
              </el-timeline-item>
            </el-timeline>
          </div>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, View } from "@element-plus/icons-vue";
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
const settlementSummary = ref<any>({});
const detailVisible = ref(false);
const detailLoading = ref(false);
const detailError = ref("");
const detailTargetId = ref<number | null>(null);
const settlementDetail = ref<any>(null);
const adjustmentSaving = ref(false);
const adjustmentForm = reactive({ amount: 0, reason: "" });
const loading = ref(false);
const merchantLoading = ref(false);
const errorMessage = ref("");
const tenantErrorMessage = ref("");
const merchantErrorMessage = ref("");
const actionKey = ref("");
const exporting = ref(false);
const deepLinkWarning = ref("");
const dateRange = ref<string[]>([]);
let tenantLoadSequence = 0;
let merchantLoadSequence = 0;
let settlementLoadSequence = 0;
let detailLoadSequence = 0;
const detailTarget = ref<{ id: number; merchantId?: number; settlementNo?: string } | null>(null);
const canManageMallSettlements = computed(() => !currentTenantId() && hasPermission("mall.settlement.manage"));
const canViewOrders = computed(() => hasPermission("mall.order.view"));
const canViewStatistics = computed(() => hasPermission("mall.statistics.view"));
const canViewFinance = computed(() => hasPermission("mall.finance.view"));
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
  { label: "结算单", value: settlementSummary.value.settlementCount || mallSettlements.value.length, desc: `草稿 ${settlementSummary.value.draftCount || 0} · 待付款 ${settlementSummary.value.approvedCount || 0}` },
  { label: "净交易额", value: `¥${money(settlementSummary.value.netAmount)}`, desc: "订单减已通过退款" },
  { label: "平台代收", value: `¥${money(settlementSummary.value.platformCollectedAmount)}`, desc: "不含商户直收净额" },
  { label: "服务费", value: `¥${money(settlementSummary.value.serviceFeeAmount)}`, desc: "按冻结费率整数分计算" },
  { label: "应结金额", value: settlementAmountText(settlementSummary.value.payableAmount), desc: "含佣金、扣回和财务调整" }
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
  settlementLoadSequence += 1;
  loading.value = false;
  mallSettlements.value = [];
  settlementPending.value = [];
  settlementSummary.value = {};
  errorMessage.value = "";
  invalidateSettlementDetail();
}

function invalidateSettlementDetail() {
  detailLoadSequence += 1;
  detailVisible.value = false;
  detailLoading.value = false;
  detailError.value = "";
  detailTargetId.value = null;
  detailTarget.value = null;
  settlementDetail.value = null;
}

async function loadTenants() {
  const sequence = ++tenantLoadSequence;
  if (!isPlatformAdmin()) {
    tenants.value = [];
    tenantErrorMessage.value = "";
    return;
  }
  tenantErrorMessage.value = "";
  try {
    const rows = await api.get<any, any[]>("/admin/tenants");
    if (sequence !== tenantLoadSequence) return false;
    tenants.value = Array.isArray(rows) ? rows : [];
    return true;
  } catch (error: any) {
    if (sequence !== tenantLoadSequence) return false;
    tenants.value = [];
    tenantErrorMessage.value = error.message || "加载租户列表失败";
    return false;
  }
}

async function loadMerchants() {
  const sequence = ++merchantLoadSequence;
  const tenantId = filters.tenantId;
  merchantLoading.value = true;
  merchantErrorMessage.value = "";
  merchants.value = [];
  clearSettlements();
  try {
    const rows = await api.get<any, Merchant[]>("/admin/mall/accessible-merchants", { params: { tenantId: isPlatformAdmin() ? tenantId : undefined, enabled: "true" } });
    if (sequence !== merchantLoadSequence || tenantId !== filters.tenantId) return false;
    merchants.value = Array.isArray(rows) ? rows : [];
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
    if (sequence !== merchantLoadSequence || tenantId !== filters.tenantId) return false;
    merchants.value = [];
    merchantErrorMessage.value = error.message || "加载可结算店铺失败";
    return false;
  } finally {
    if (sequence === merchantLoadSequence) merchantLoading.value = false;
  }
}

function currentSettlementContext() {
  return { tenantId: filters.tenantId, merchantId: filters.merchantId, status: filters.status, startDate: filters.startDate, endDate: filters.endDate };
}

function sameSettlementContext(context: ReturnType<typeof currentSettlementContext>) {
  const current = currentSettlementContext();
  return context.tenantId === current.tenantId && context.merchantId === current.merchantId && context.status === current.status && context.startDate === current.startDate && context.endDate === current.endDate;
}

async function loadSettlements() {
  if (deepLinkWarning.value) return;
  if (!isPlatformAdmin() && !filters.merchantId) {
    clearSettlements();
    return;
  }
  const sequence = ++settlementLoadSequence;
  const context = currentSettlementContext();
  loading.value = true;
  errorMessage.value = "";
  mallSettlements.value = [];
  settlementPending.value = [];
  settlementSummary.value = {};
  invalidateSettlementDetail();
  try {
    const result = await api.get<any, any>("/admin/mall/settlements", {
      params: currentMallParams({
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      })
    });
    if (sequence !== settlementLoadSequence || !sameSettlementContext(context)) return false;
    mallSettlements.value = Array.isArray(result?.items) ? result.items : [];
    settlementPending.value = Array.isArray(result?.pending) ? result.pending : [];
    settlementSummary.value = result?.summary && typeof result.summary === "object" ? result.summary : {};
    return true;
  } catch (error: any) {
    if (sequence !== settlementLoadSequence || !sameSettlementContext(context)) return false;
    mallSettlements.value = [];
    settlementPending.value = [];
    settlementSummary.value = {};
    errorMessage.value = error.message || "加载商城结算失败";
    return false;
  } finally {
    if (sequence === settlementLoadSequence) loading.value = false;
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

function captureSettlementTarget(row: any) {
  return {
    sequence: settlementLoadSequence,
    context: currentSettlementContext(),
    id: row.id,
    settlementNo: row.settlementNo,
    merchantId: row.merchant?.id
  };
}

function assertCurrentSettlementTarget(target: ReturnType<typeof captureSettlementTarget>) {
  const currentRow = mallSettlements.value.find((item) => item.id === target.id);
  if (target.sequence !== settlementLoadSequence || !sameSettlementContext(target.context) || !currentRow || currentRow.settlementNo !== target.settlementNo || currentRow.merchant?.id !== target.merchantId) {
    throw new Error("结算列表或店铺范围已变化，请刷新后重新操作");
  }
}

async function generateSettlement(row?: any) {
  if (!canManageMallSettlements.value) return ElMessage.error("商城结算生成、审核和打款由平台财务处理");
  const target = settlementPayloadMerchant(row);
  if (!target.merchantId) return ElMessage.error("请先选择或指定要生成结算单的店铺");
  if (!filters.startDate || !filters.endDate) return ElMessage.error("请先选择结算周期日期范围");
  const sequence = settlementLoadSequence;
  const context = currentSettlementContext();
  const pendingMerchantId = row?.merchant?.id;
  await runSettlementAction(`generate:${target.merchantId}`, async () => {
    await ElMessageBox.confirm(`确认生成 ${filters.startDate} 至 ${filters.endDate} 的商城结算单？生成后将冻结本周期订单、退款、服务费和佣金快照。`, "生成商城结算单", { type: "warning", confirmButtonText: "确认生成", cancelButtonText: "取消" });
    const pendingStillExists = pendingMerchantId ? settlementPending.value.some((item) => item.merchant?.id === pendingMerchantId) : selectedMerchant.value?.id === target.merchantId;
    if (sequence !== settlementLoadSequence || !sameSettlementContext(context) || !pendingStillExists) throw new Error("待生成结算范围已变化，请刷新后重新操作");
    await api.post("/admin/mall/settlements/generate", {
      ...target,
      periodStart: filters.startDate,
      periodEnd: filters.endDate,
      businessKey: operationKey("generate", target.merchantId),
      remark: "后台商城财务生成结算单"
    });
  }, "结算单已生成");
}

async function retryScopeLoading() {
  await loadTenants();
  const ok = await loadMerchants();
  if (ok) await loadSettlements();
}

async function approveSettlement(row: any) {
  if (!canManageMallSettlements.value) return ElMessage.error("商城结算审核由平台财务处理");
  const target = captureSettlementTarget(row);
  await runSettlementAction(`approve:${row.id}`, async () => {
    const { value } = await ElMessageBox.prompt(`审核通过结算单 ${row.settlementNo}？${settlementAmountText(row.payableAmount)}`, "审核商城结算", { inputValue: "财务已核对订单、退款和服务费", confirmButtonText: "通过", cancelButtonText: "取消", inputValidator: (text) => Boolean(String(text || "").trim()) || "请填写审核意见" });
    assertCurrentSettlementTarget(target);
    await api.post(`/admin/mall/settlements/${row.id}/approve`, { remark: String(value || "").trim(), businessKey: operationKey("approve", row.id) });
  }, "结算单已审核");
}

async function rejectSettlement(row: any) {
  if (!canManageMallSettlements.value) return ElMessage.error("商城结算审核由平台财务处理");
  const target = captureSettlementTarget(row);
  await runSettlementAction(`reject:${row.id}`, async () => {
    const { value } = await ElMessageBox.prompt(`拒绝结算单 ${row.settlementNo}？`, "拒绝商城结算", { inputValue: "结算数据需重新核对", confirmButtonText: "拒绝", cancelButtonText: "取消", inputValidator: (text) => Boolean(String(text || "").trim()) || "请填写拒绝原因" });
    assertCurrentSettlementTarget(target);
    await api.post(`/admin/mall/settlements/${row.id}/reject`, { remark: String(value || "").trim(), businessKey: operationKey("reject", row.id) });
  }, "结算单已拒绝");
}

async function markSettlementPaid(row: any) {
  if (!canManageMallSettlements.value) return ElMessage.error("商城结算打款/扣回由平台财务处理");
  const actionText = settlementFinishActionText(row);
  const target = captureSettlementTarget(row);
  await runSettlementAction(`paid:${row.id}`, async () => {
    const { value } = await ElMessageBox.prompt(`标记结算单 ${row.settlementNo} 已${actionText}？`, "标记商城结算完成", {
      inputValue: row.paidReference || "",
      inputPlaceholder: actionText === "扣回/冲抵" ? "填写扣回/冲抵凭证号或后续抵扣说明" : "填写打款流水号或线下凭证号",
      confirmButtonText: `确认${actionText}`,
      cancelButtonText: "取消",
      inputValidator: (text) => Boolean(String(text || "").trim()) || `请填写${actionText}凭证号或说明，方便财务对账`
    });
    assertCurrentSettlementTarget(target);
    await api.post(`/admin/mall/settlements/${row.id}/mark-paid`, { paidReference: String(value || "").trim(), remark: actionText === "扣回/冲抵" ? "财务确认已扣回/冲抵" : "财务确认已打款", businessKey: operationKey("paid", row.id) });
  }, `结算单已标记${actionText}`);
}

async function exportSettlements() {
  if (exporting.value || actionKey.value) return;
  if (deepLinkWarning.value) return ElMessage.error("当前商城结算店铺链接不可用，请先确认店铺授权后再导出。");
  exporting.value = true;
  try {
    const clean = new URLSearchParams();
    appendCurrentMallParams(clean);
    if (filters.status) clean.set("status", filters.status);
    if (filters.startDate) clean.set("startDate", filters.startDate);
    if (filters.endDate) clean.set("endDate", filters.endDate);
    await downloadFile(`/admin/mall/settlements/export?${clean.toString()}`, "mall-settlements.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出商城结算失败");
  } finally {
    exporting.value = false;
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

function signedMoney(value: any) {
  const amount = Number(value || 0);
  return `${amount >= 0 ? "+" : "-"}¥${Math.abs(amount).toFixed(2)}`;
}

function operationKey(action: string, id?: number) {
  const uuid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `mall-settlement:${action}:${id || 0}:${uuid}`;
}

async function openSettlementDetail(row: any) {
  const sequence = ++detailLoadSequence;
  const target = { id: Number(row.id), merchantId: row.merchant?.id, settlementNo: row.settlementNo };
  detailTarget.value = target;
  detailTargetId.value = row.id;
  detailVisible.value = true;
  detailLoading.value = true;
  detailError.value = "";
  settlementDetail.value = null;
  adjustmentForm.amount = 0;
  adjustmentForm.reason = "";
  try {
    const result = await api.get<any, any>(`/admin/mall/settlements/${row.id}`);
    if (sequence !== detailLoadSequence || detailTarget.value?.id !== target.id) return;
    const detailSettlement = result?.settlement;
    if (Number(detailSettlement?.id || 0) !== target.id || (target.merchantId && detailSettlement?.merchant?.id !== target.merchantId)) {
      settlementDetail.value = null;
      detailError.value = "结算明细归属与打开目标不一致";
      return;
    }
    settlementDetail.value = result;
  } catch (error: any) {
    if (sequence !== detailLoadSequence || detailTarget.value?.id !== target.id) return;
    settlementDetail.value = null;
    detailError.value = error.message || "加载结算逐笔明细失败";
  } finally {
    if (sequence === detailLoadSequence) detailLoading.value = false;
  }
}

async function retrySettlementDetail() {
  if (!detailTarget.value) return;
  await openSettlementDetail(detailTarget.value);
}

async function runSettlementAction(key: string, action: () => Promise<unknown>, successMessage: string) {
  if (actionKey.value) return false;
  actionKey.value = key;
  try {
    await action();
    ElMessage.success(successMessage);
    await loadSettlements();
    return true;
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "商城结算操作失败");
    return false;
  } finally {
    actionKey.value = "";
  }
}

async function addAdjustment() {
  const settlement = settlementDetail.value?.settlement;
  const target = detailTarget.value ? { ...detailTarget.value, sequence: detailLoadSequence } : null;
  const amountFen = Math.round(Number(adjustmentForm.amount || 0) * 100);
  if (!settlement?.id || !amountFen) return ElMessage.error("请输入非零调整金额");
  if (!adjustmentForm.reason.trim()) return ElMessage.error("请填写调整原因");
  if (actionKey.value) return;
  actionKey.value = `adjustment:${settlement.id}`;
  adjustmentSaving.value = true;
  try {
    if (!target || target.sequence !== detailLoadSequence || detailTarget.value?.id !== target.id || Number(settlement?.id || 0) !== target.id || (target.merchantId && settlement?.merchant?.id !== target.merchantId)) {
      throw new Error("结算明细目标已变化，请重新打开后操作");
    }
    settlementDetail.value = await api.post(`/admin/mall/settlements/${settlement.id}/adjustments`, { amountFen, reason: adjustmentForm.reason.trim(), businessKey: operationKey("adjustment", settlement.id) });
    adjustmentForm.amount = 0;
    adjustmentForm.reason = "";
    ElMessage.success("财务调整已记入结算账本");
    await loadSettlements();
  } catch (error: any) {
    ElMessage.error(error.message || "记入财务调整失败");
  } finally {
    adjustmentSaving.value = false;
    actionKey.value = "";
  }
}

function settlementLineTypeText(value: string) {
  return ({ order: "订单", refund: "退款", commission: "佣金", commission_clawback: "佣金扣回", service_fee: "平台费", manual_adjustment: "财务调整" } as any)[value] || value || "-";
}

function settlementEventText(value: string) {
  return ({ generated: "生成结算单", adjusted: "记入财务调整", approved: "复核通过", rejected: "复核拒绝", paid: "付款/扣回完成", cancelled: "取消结算" } as any)[value] || value || "-";
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
.scope-alert p, .detail-content > .el-alert p { margin: 0 0 8px; }
.merchant-card { border-color: #d1fae5; background: linear-gradient(135deg, #ecfdf5 0%, #fff 72%); }
.merchant-card :deep(.el-card__body) { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
.merchant-card strong { color: #0f172a; }
.merchant-card p { margin: 4px 0 0; color: #64748b; }
.merchant-tags, .merchant-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.merchant-actions { grid-column: 1 / -1; }
.filter-card :deep(.el-card__body) { display: grid; gap: 10px; }
.settlement-tip { margin-top: 2px; }
.summary-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
.summary-grid :deep(.el-card__body) { display: grid; gap: 4px; }
.summary-grid small, .summary-grid span { color: #64748b; }
.summary-grid strong { color: #0f172a; font-size: 24px; }
.settlement-card small { display: block; color: #64748b; margin-top: 3px; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-header small { color: #64748b; }
.detail-content { display: grid; gap: 18px; min-height: 220px; }
.detail-section { display: grid; gap: 10px; }
.adjustment-row { display: grid; grid-template-columns: 160px minmax(280px, 1fr) auto; gap: 10px; align-items: center; padding: 12px; border: 1px solid #dbe4ee; background: #f8fafc; }
.amount-credit { color: #047857; }
.amount-debit { color: #b91c1c; }
.detail-section :deep(.el-timeline-item__content) { display: grid; gap: 4px; color: #475569; }
.detail-section :deep(.el-timeline-item__content strong) { color: #0f172a; }
.detail-section :deep(.el-timeline-item__content p) { margin: 0; }
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
  .adjustment-row { grid-template-columns: 1fr; }
}
</style>
