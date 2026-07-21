<template>
  <div class="mall-reviews-page">
    <div class="page-header">
      <div>
        <h2>商城评价管理</h2>
        <p>集中审核商城商品评价、晒图和商家回复；评价通过后才会展示到 H5/小程序商品详情页。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家/代理" style="width:220px" :disabled="writeLocked" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" clearable filterable placeholder="全部授权店铺；可选单店" style="width:280px" :disabled="writeLocked" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-select v-model="filters.status" clearable placeholder="全部评价状态" style="width:160px" :disabled="writeLocked" @change="loadReviews">
          <el-option label="全部待审核" value="pending" />
          <el-option label="首评待审核" value="review_pending" />
          <el-option label="追评待审核" value="append_pending" />
          <el-option label="已展示" value="approved" />
          <el-option label="已拒绝" value="rejected" />
          <el-option label="已隐藏" value="hidden" />
        </el-select>
        <el-input v-model="filters.keyword" clearable placeholder="商品/订单号/手机号/内容" style="width:260px" :disabled="writeLocked" @keyup.enter="loadReviews" @clear="loadReviews" />
        <el-button :loading="loading || merchantLoading" :disabled="writeLocked" @click="loadReviews">刷新评价</el-button>
      </div>
    </div>

    <el-alert
      v-if="deepLinkWarning"
      class="scope-alert"
      type="error"
      show-icon
      :closable="false"
      title="商城评价店铺链接不可用"
      :description="deepLinkWarning"
    />
    <el-alert v-else-if="scopeError" class="scope-alert" type="error" show-icon :closable="false" title="商城评价管理范围加载失败">
      <p>{{ scopeError }}</p>
      <el-button size="small" :loading="merchantLoading" :disabled="writeLocked" @click="reloadAll">重新加载</el-button>
    </el-alert>
    <el-alert
      v-else-if="!selectedMerchant && isPlatformAdmin()"
      class="scope-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前是全局评价审核模式"
      description="平台账号可以不选店铺查看全平台或所选商家下的商城评价；审核通过后评价会按商品所属店铺展示到前台。"
    />
    <el-alert
      v-else-if="!selectedMerchant && merchants.length > 1"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="请选择要管理评价的店铺"
      description="当前账号可管理多个商城店铺。为避免把不同店铺的评价审核混在一起，请先选择一个店铺。"
    />

    <el-card v-if="selectedMerchant && !deepLinkWarning" shadow="never" class="merchant-card">
      <div>
        <strong>当前评价店铺：{{ selectedMerchant.name || selectedMerchant.code }}</strong>
        <p>{{ selectedMerchant.tenant?.name || selectedMerchant.tenant?.code || "平台店铺" }} · {{ merchantOwnerText(selectedMerchant) }} · {{ selectedMerchant.region || "未设置区域" }}</p>
      </div>
      <div class="merchant-tags">
        <el-tag :type="selectedMerchantOpen ? 'success' : 'info'">{{ selectedMerchantOpen ? "商城已开放" : "商城未开放" }}</el-tag>
        <el-tag type="warning" effect="plain">{{ selectedMerchant.paymentMode === "merchant_direct" ? "商户直收" : "平台代收" }}</el-tag>
      </div>
      <div class="merchant-actions">
        <el-button v-if="canManageProducts" size="small" type="primary" plain @click="goMerchantAdmin('/mall-products')">商品管理</el-button>
        <el-button v-if="canViewOrders" size="small" type="success" plain @click="goMerchantAdmin('/mall-orders')">订单管理</el-button>
        <el-button v-if="canViewStatistics" size="small" type="warning" plain @click="goMerchantAdmin('/mall-statistics')">经营统计</el-button>
        <el-button size="small" @click="openMerchantH5">打开 H5 店铺</el-button>
        <el-button size="small" @click="copyWorkbenchLink">复制评价后台链接</el-button>
      </div>
    </el-card>

    <div class="summary-grid">
      <el-card v-for="item in summaryCards" :key="item.label" shadow="never">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
        <span>{{ item.desc }}</span>
      </el-card>
    </div>

    <el-card shadow="never">
      <template #header>
        <div class="section-header">
          <span>商品评价审核</span>
          <small>当前接口返回最近 100 条评价，运营可按状态、店铺和关键词缩小范围。</small>
        </div>
      </template>
      <el-alert v-if="reviewsError" class="section-error" type="error" show-icon :closable="false" title="评价列表加载失败">
        <p>{{ reviewsError }}</p>
        <el-button size="small" :loading="reviewsLoading" :disabled="writeLocked" @click="loadReviewRows">重试评价列表</el-button>
      </el-alert>
      <el-table v-loading="reviewsLoading" :data="reviews" stripe empty-text="暂无商城评价">
        <el-table-column label="商品/规格" min-width="240">
          <template #default="{ row }">
            <strong>{{ row.product?.title || "-" }}</strong>
            <small>{{ row.sku?.name || "默认规格" }} · {{ row.order?.orderNo || "无订单号" }}</small>
          </template>
        </el-table-column>
        <el-table-column v-if="isPlatformAdmin()" label="商家/店铺" min-width="180">
          <template #default="{ row }">
            {{ row.tenant?.name || row.tenant?.code || "-" }}
            <small>{{ row.merchant?.name || "默认店铺" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="用户" width="150"><template #default="{ row }">{{ displayUser(row.user) }}</template></el-table-column>
        <el-table-column label="评分" width="120">
          <template #default="{ row }">
            <span class="rating-stars">{{ ratingStars(row.rating) }}</span>
            <small>{{ Number(row.rating || 0) }} 分</small>
          </template>
        </el-table-column>
        <el-table-column label="评价内容" min-width="300">
          <template #default="{ row }">
            <div>{{ row.content }}</div>
            <small v-if="row.appendContent">追评：{{ row.appendContent }} <el-tag size="small" :type="appendStatusType(row.appendStatus)">{{ appendStatusText(row.appendStatus) }}</el-tag></small>
          </template>
        </el-table-column>
        <el-table-column label="晒图" min-width="160">
          <template #default="{ row }">
            <div v-if="row.images?.length" class="review-image-list">
              <el-image v-for="image in row.images" :key="image" class="review-thumb" :src="image" :preview-src-list="row.images" preview-teleported fit="cover" />
            </div>
            <span v-else class="muted-line">无晒图</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="reviewStatusType(row.status)">{{ reviewStatusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column prop="reportCount" label="举报" width="80" />
        <el-table-column label="审核/回复" min-width="250">
          <template #default="{ row }">
            <strong>{{ row.reviewRemark || "-" }}</strong>
            <small>商家回复：{{ row.merchantReply || "未填写" }}</small>
            <small v-if="row.reviewedAt">{{ row.reviewedBy || "-" }} {{ formatTime(row.reviewedAt) }}</small>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="310" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" :loading="reviewActionId === row.id" :disabled="row.status === 'approved' || !canManageReviews || reviewActionId !== null || reportActionId !== null" @click.stop="moderateReview(row, 'approved')">通过展示</el-button>
            <el-button size="small" type="danger" plain :disabled="row.status === 'rejected' || !canManageReviews || reviewActionId !== null || reportActionId !== null" @click.stop="moderateReview(row, 'rejected')">拒绝展示</el-button>
            <el-button size="small" type="warning" plain :disabled="row.status === 'hidden' || !canManageReviews || reviewActionId !== null || reportActionId !== null" @click.stop="moderateReview(row, 'hidden')">隐藏</el-button>
            <template v-if="row.appendStatus === 'pending'">
              <el-button size="small" type="success" plain :disabled="!canManageReviews || reviewActionId !== null || reportActionId !== null" @click.stop="moderateReview(row, 'approved', 'append')">通过追评</el-button>
              <el-button size="small" type="danger" plain :disabled="!canManageReviews || reviewActionId !== null || reportActionId !== null" @click.stop="moderateReview(row, 'rejected', 'append')">拒绝追评</el-button>
            </template>
            <el-button v-if="canManageProducts" size="small" text type="primary" @click.stop="openProductManage(row)">商品</el-button>
            <el-button v-if="canViewOrders" size="small" text type="primary" @click.stop="openOrderManage(row)">订单</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header><div class="section-header"><span>评价举报</span><small>处理用户对已展示评价的举报，可维持展示或隐藏违规内容。</small></div></template>
      <el-alert v-if="reportsError" class="section-error" type="error" show-icon :closable="false" title="评价举报加载失败">
        <p>{{ reportsError }}</p>
        <el-button size="small" :loading="reportsLoading" :disabled="writeLocked" @click="loadReportRows">重试举报列表</el-button>
      </el-alert>
      <el-table v-loading="reportsLoading" :data="reviewReports" stripe empty-text="暂无评价举报">
        <el-table-column label="商品/评价" min-width="260"><template #default="{ row }"><strong>{{ row.review?.product?.title || "-" }}</strong><small>{{ row.review?.content || "-" }}</small></template></el-table-column>
        <el-table-column label="举报人" width="150"><template #default="{ row }">{{ displayUser(row.user) }}</template></el-table-column>
        <el-table-column prop="reason" label="举报原因" min-width="240" />
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === 'pending' ? 'warning' : row.status === 'resolved' ? 'success' : 'info'">{{ ({ pending: '待处理', resolved: '已处理', rejected: '不成立' } as any)[row.status] || row.status }}</el-tag></template></el-table-column>
        <el-table-column prop="resolution" label="处理结论" min-width="220" />
        <el-table-column label="操作" width="190"><template #default="{ row }"><el-button size="small" type="danger" plain :loading="reportActionId === row.id" :disabled="row.status !== 'pending' || !canManageReviews || reportActionId !== null || reviewActionId !== null" @click="reviewReport(row, true)">处理并隐藏</el-button><el-button size="small" :disabled="row.status !== 'pending' || !canManageReviews || reportActionId !== null || reviewActionId !== null" @click="reviewReport(row, false)">维持展示</el-button></template></el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";
import { copyToClipboard, h5RoutePreviewUrl } from "../h5-preview";
import { hasPermission, isPlatformAdmin } from "../permissions";

type Merchant = {
  id: number;
  code?: string;
  name?: string;
  ownerType?: string;
  status?: string;
  mallEnabled?: boolean;
  paymentMode?: string;
  region?: string | null;
  tenant?: { id?: number; name?: string; code?: string } | null;
};

const route = useRoute();
const router = useRouter();
const tenants = ref<any[]>([]);
const merchants = ref<Merchant[]>([]);
const reviews = ref<any[]>([]);
const reviewReports = ref<any[]>([]);
const reviewsLoading = ref(false);
const reportsLoading = ref(false);
const merchantLoading = ref(false);
const deepLinkWarning = ref("");
const scopeError = ref("");
const reviewsError = ref("");
const reportsError = ref("");
const reviewActionId = ref<number | null>(null);
const reportActionId = ref<number | null>(null);
let tenantLoadSequence = 0;
let merchantLoadSequence = 0;
let reviewLoadSequence = 0;
let reportLoadSequence = 0;
const filters = reactive({
  tenantId: routeTenantId(),
  merchantId: routeMerchantId(),
  status: routeStatus(),
  keyword: routeKeyword()
});

const canManageReviews = computed(() => hasPermission("mall.review.manage"));
const canManageProducts = computed(() => hasPermission("mall.product.manage"));
const canViewOrders = computed(() => hasPermission("mall.order.view"));
const canViewStatistics = computed(() => hasPermission("mall.statistics.view"));
const loading = computed(() => reviewsLoading.value || reportsLoading.value);
const writeLocked = computed(() => reviewActionId.value !== null || reportActionId.value !== null);
const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const selectedMerchantOpen = computed(() => merchantOperational(selectedMerchant.value));
const summaryCards = computed(() => {
  const pending = reviews.value.filter((row) => row.status === "pending").length;
  const appendPending = reviews.value.filter((row) => row.appendStatus === "pending").length;
  const approved = reviews.value.filter((row) => row.status === "approved").length;
  const rejected = reviews.value.filter((row) => row.status === "rejected").length;
  const withImages = reviews.value.filter((row) => Array.isArray(row.images) && row.images.length).length;
  const avg = reviews.value.length ? (reviews.value.reduce((sum, row) => sum + Number(row.rating || 0), 0) / reviews.value.length).toFixed(1) : "-";
  return [
    { label: "当前评价", value: reviews.value.length, desc: "最近最多 100 条" },
    { label: "首评待审核", value: pending, desc: "需运营处理" },
    { label: "追评待审核", value: appendPending, desc: "独立审核后展示" },
    { label: "已展示", value: approved, desc: "前台可见" },
    { label: "已拒绝", value: rejected, desc: "前台隐藏" },
    { label: "带图评价", value: withImages, desc: `平均评分 ${avg}` }
  ];
});

function routeTenantId() {
  const id = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : 0;
  return isPlatformAdmin() && id ? id : undefined;
}

function routeMerchantId() {
  const id = typeof route.query.merchantId === "string" ? Number(route.query.merchantId) : 0;
  return id || undefined;
}

function routeStatus() {
  const status = typeof route.query.status === "string" ? route.query.status : "pending";
  return ["pending", "review_pending", "append_pending", "approved", "rejected", "hidden"].includes(status) ? status : "pending";
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
  const status = merchant.mallEnabled === false || merchant.status !== "active" ? " · 未开放" : "";
  return `${merchant.name || merchant.code}（${merchantOwnerText(merchant)}${merchant.region ? ` · ${merchant.region}` : ""}${status}）`;
}

function merchantOperational(merchant?: Merchant | null) {
  return !!merchant && merchant.status === "active" && merchant.mallEnabled !== false;
}

function merchantLinkWarning(requestedMerchantId: number) {
  return `当前链接指定的店铺 #${requestedMerchantId} 对当前账号不可见，或已被商家筛选条件过滤。为避免误审核其它店铺评价，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
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
  if (filters.status) query.status = filters.status;
  if (filters.keyword.trim()) query.keyword = filters.keyword.trim();
  await router.replace({ path: route.path, query });
}

function clearReviews() {
  reviewLoadSequence += 1;
  reportLoadSequence += 1;
  reviewsLoading.value = false;
  reportsLoading.value = false;
  reviews.value = [];
  reviewReports.value = [];
  reviewsError.value = "";
  reportsError.value = "";
}

async function loadTenants() {
  const sequence = ++tenantLoadSequence;
  scopeError.value = "";
  try {
    const rows = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
    if (sequence !== tenantLoadSequence) return false;
    tenants.value = Array.isArray(rows) ? rows : [];
    return true;
  } catch (error: any) {
    if (sequence !== tenantLoadSequence) return false;
    tenants.value = [];
    scopeError.value = error.message || "加载商家列表失败";
    return false;
  }
}

async function loadMerchants() {
  const sequence = ++merchantLoadSequence;
  const tenantId = filters.tenantId;
  merchantLoading.value = true;
  scopeError.value = "";
  merchants.value = [];
  clearReviews();
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
      clearReviews();
      return false;
    } else if (filters.merchantId && !merchants.value.some((merchant) => merchant.id === filters.merchantId)) filters.merchantId = undefined;
    if (!filters.merchantId && !isPlatformAdmin() && merchants.value.length === 1) filters.merchantId = merchants.value[0].id;
    return true;
  } catch (error: any) {
    if (sequence !== merchantLoadSequence || tenantId !== filters.tenantId) return false;
    merchants.value = [];
    scopeError.value = error.message || "加载可管理评价的店铺失败";
    return false;
  } finally {
    if (sequence === merchantLoadSequence) merchantLoading.value = false;
  }
}

function currentReviewContext() {
  return { tenantId: filters.tenantId, merchantId: filters.merchantId, keyword: filters.keyword.trim() };
}

function sameReviewContext(context: ReturnType<typeof currentReviewContext>) {
  const current = currentReviewContext();
  return context.tenantId === current.tenantId && context.merchantId === current.merchantId && context.keyword === current.keyword;
}

async function loadReviewRows() {
  const sequence = ++reviewLoadSequence;
  const context = currentReviewContext();
  reviewsLoading.value = true;
  reviewsError.value = "";
  reviews.value = [];
  try {
    const rows = await api.get<any, any[]>("/admin/mall/reviews", { params: { ...currentMallParams({ keyword: context.keyword || undefined }), status: filters.status || undefined } });
    if (sequence !== reviewLoadSequence || !sameReviewContext(context)) return false;
    reviews.value = Array.isArray(rows) ? rows : [];
    return true;
  } catch (error: any) {
    if (sequence !== reviewLoadSequence || !sameReviewContext(context)) return false;
    reviews.value = [];
    reviewsError.value = error.message || "加载商城评价失败";
    return false;
  } finally {
    if (sequence === reviewLoadSequence) reviewsLoading.value = false;
  }
}

async function loadReportRows() {
  const sequence = ++reportLoadSequence;
  const context = currentReviewContext();
  reportsLoading.value = true;
  reportsError.value = "";
  reviewReports.value = [];
  try {
    const rows = await api.get<any, any[]>("/admin/mall/review-reports", { params: currentMallParams({ keyword: context.keyword || undefined }) });
    if (sequence !== reportLoadSequence || !sameReviewContext(context)) return false;
    reviewReports.value = Array.isArray(rows) ? rows : [];
    return true;
  } catch (error: any) {
    if (sequence !== reportLoadSequence || !sameReviewContext(context)) return false;
    reviewReports.value = [];
    reportsError.value = error.message || "加载商城评价举报失败";
    return false;
  } finally {
    if (sequence === reportLoadSequence) reportsLoading.value = false;
  }
}

async function loadReviews() {
  if (deepLinkWarning.value) return;
  if (!isPlatformAdmin() && !filters.merchantId) return clearReviews();
  await Promise.allSettled([loadReviewRows(), loadReportRows()]);
  await syncRouteQuery();
}

async function handleTenantChange() {
  filters.merchantId = undefined;
  await syncRouteQuery();
  const ok = await loadMerchants();
  if (ok) await loadReviews();
}

async function handleMerchantChange() {
  deepLinkWarning.value = "";
  await syncRouteQuery();
  await loadReviews();
}

async function moderateReview(row: any, status: "approved" | "rejected" | "hidden", target: "review" | "append" = "review") {
  if (reviewActionId.value !== null || reportActionId.value !== null) return;
  reviewActionId.value = row.id;
  const sequence = reviewLoadSequence;
  const context = currentReviewContext();
  const targetIdentity = { id: row.id, merchantId: row.merchant?.id, productId: row.product?.id };
  try {
    const appendTarget = target === "append";
    const result = await ElMessageBox.prompt(
      appendTarget ? (status === "approved" ? "通过后追评内容和晒图会展示在商品详情页。" : "拒绝后追评不会在商品详情页展示。") : status === "approved" ? "通过后评价会展示在商品详情页。可填写审核备注；若要展示商家回复，请用“审核备注 || 商家回复”格式填写。" : status === "hidden" ? "请输入隐藏原因，前台将立即停止展示。" : "请输入拒绝原因，方便后续客服回访用户。",
      appendTarget ? (status === "approved" ? "通过商城追评" : "拒绝商城追评") : status === "approved" ? "通过商城评价" : status === "hidden" ? "隐藏商城评价" : "拒绝商城评价",
      { inputValue: appendTarget ? (status === "approved" ? "追评审核通过" : "追评内容不适合展示") : status === "approved" ? "评价审核通过 || 感谢您的认可，我们会继续把好物和服务做好。" : status === "hidden" ? "评价被举报并确认不适合继续展示" : "评价内容不适合展示", confirmButtonText: "确认", cancelButtonText: "取消" }
    );
    const currentRow = reviews.value.find((item) => item.id === targetIdentity.id);
    if (sequence !== reviewLoadSequence || !sameReviewContext(context) || !currentRow || currentRow.merchant?.id !== targetIdentity.merchantId || currentRow.product?.id !== targetIdentity.productId) {
      return ElMessage.error("评价列表或店铺范围已变化，请刷新后重新操作");
    }
    const [reviewRemark, merchantReply] = String(result.value || "").split("||").map((item) => item.trim());
    await api.patch(`/admin/mall/reviews/${row.id}`, { target, status, reviewRemark: reviewRemark || "", merchantReply: !appendTarget && status === "approved" ? merchantReply || "" : "" });
    ElMessage.success(appendTarget ? (status === "approved" ? "追评已展示到前台" : "追评已拒绝") : status === "approved" ? "评价已展示到前台" : status === "hidden" ? "评价已隐藏" : "评价已拒绝并隐藏");
    await loadReviews();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "审核评价失败");
  } finally {
    reviewActionId.value = null;
  }
}

async function reloadAll() {
  if (loading.value || merchantLoading.value) return;
  try {
    await loadTenants();
    const ok = await loadMerchants();
    if (ok) await loadReviews();
  } catch {
    // Individual loaders preserve the actionable error.
  }
}

async function reviewReport(row: any, hideReview: boolean) {
  if (reportActionId.value !== null || reviewActionId.value !== null) return;
  reportActionId.value = row.id;
  const sequence = reportLoadSequence;
  const context = currentReviewContext();
  const targetIdentity = { id: row.id, reviewId: row.review?.id, merchantId: row.review?.merchant?.id || row.merchant?.id };
  try {
    const result = await ElMessageBox.prompt(hideReview ? "请输入违规判定和隐藏原因。" : "请输入举报不成立的处理结论。", hideReview ? "处理评价举报" : "驳回评价举报", { inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写处理结论" });
    const currentRow = reviewReports.value.find((item) => item.id === targetIdentity.id);
    const currentMerchantId = currentRow?.review?.merchant?.id || currentRow?.merchant?.id;
    if (sequence !== reportLoadSequence || !sameReviewContext(context) || !currentRow || currentRow.review?.id !== targetIdentity.reviewId || currentMerchantId !== targetIdentity.merchantId) {
      return ElMessage.error("举报列表或店铺范围已变化，请刷新后重新操作");
    }
    await api.post(`/admin/mall/review-reports/${row.id}/review`, { status: hideReview ? "resolved" : "rejected", resolution: result.value, hideReview });
    ElMessage.success(hideReview ? "举报已处理，评价已隐藏" : "举报已驳回，评价维持展示");
    await loadReviews();
  } catch (error: any) { if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "处理举报失败"); }
  finally { reportActionId.value = null; }
}

function displayUser(user: any) {
  const phone = String(user?.phone || "").trim();
  if (/^1\d{10}$/.test(phone)) return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
  return phone || user?.nickname || "-";
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

function openProductManage(row: any) {
  router.push({ path: "/mall-products", query: { tenantId: row.tenant?.id || filters.tenantId, merchantId: row.merchant?.id || filters.merchantId, keyword: row.product?.title || "" } });
}

function openOrderManage(row: any) {
  router.push({ path: "/mall-orders", query: { tenantId: row.tenant?.id || filters.tenantId, merchantId: row.merchant?.id || filters.merchantId, keyword: row.order?.orderNo || "" } });
}

function merchantWorkbenchUrl() {
  if (!selectedMerchant.value) return `${window.location.origin}/admin/mall-reviews`;
  const query = new URLSearchParams();
  if (selectedMerchant.value.tenant?.id) query.set("tenantId", String(selectedMerchant.value.tenant.id));
  query.set("merchantId", String(selectedMerchant.value.id));
  return `${window.location.origin}/admin/mall-reviews?${query.toString()}`;
}

function merchantH5Url() {
  if (!selectedMerchant.value) return "";
  return h5RoutePreviewUrl(selectedMerchant.value.tenant?.code || "", `/pages/mall/merchant?id=${selectedMerchant.value.id}`);
}

function openMerchantH5() {
  const url = merchantH5Url();
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

async function copyWorkbenchLink() {
  await copyToClipboard(merchantWorkbenchUrl());
  ElMessage.success("商城评价后台链接已复制，可发给已授权的商家/代理账号。");
}

function ratingStars(value: any) {
  const rating = Math.min(Math.max(Math.trunc(Number(value || 0)), 0), 5);
  return "★★★★★".slice(0, rating) || "-";
}

function reviewStatusText(value: string) {
  return ({ pending: "待审核", approved: "已展示", rejected: "已拒绝", hidden: "已隐藏" } as any)[value] || value || "-";
}

function reviewStatusType(value: string) {
  return value === "pending" ? "warning" : value === "approved" ? "success" : "info";
}

function appendStatusText(value: string) {
  return ({ pending: "待审核", approved: "已展示", rejected: "已拒绝" } as any)[value] || "未提交";
}

function appendStatusType(value: string) {
  return value === "pending" ? "warning" : value === "approved" ? "success" : "info";
}

function formatTime(value: any) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-";
}

onMounted(reloadAll);

watch(() => [route.query.tenantId, route.query.merchantId, route.query.status, route.query.keyword], async () => {
  const nextTenantId = routeTenantId();
  const nextMerchantId = routeMerchantId();
  const nextStatus = routeStatus();
  const nextKeyword = routeKeyword();
  const filterChanged = nextStatus !== filters.status || nextKeyword !== filters.keyword;
  filters.status = nextStatus;
  filters.keyword = nextKeyword;
  if (nextTenantId !== filters.tenantId) {
    filters.tenantId = nextTenantId;
    filters.merchantId = nextMerchantId;
    const ok = await loadMerchants();
    if (ok) await loadReviews();
    return;
  }
  if (nextMerchantId && nextMerchantId !== filters.merchantId && merchants.value.some((item) => item.id === nextMerchantId)) {
    deepLinkWarning.value = "";
    filters.merchantId = nextMerchantId;
    await loadReviews();
  } else if (nextMerchantId && nextMerchantId !== filters.merchantId) {
    filters.merchantId = undefined;
    deepLinkWarning.value = merchantLinkWarning(nextMerchantId);
    clearReviews();
  } else if (filterChanged) {
    await loadReviews();
  }
});
</script>

<style scoped>
.mall-reviews-page { padding: 24px; display: grid; gap: 16px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-header h2 { margin: 0 0 6px; color: #111827; }
.page-header p { margin: 0; color: #64748b; }
.header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.scope-alert { margin-bottom: 2px; }
.merchant-card { border-color: #bbf7d0; background: linear-gradient(135deg, #f0fdf4 0%, #fff 72%); }
.merchant-card :deep(.el-card__body) { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
.merchant-card strong { color: #0f172a; }
.merchant-card p { margin: 4px 0 0; color: #64748b; }
.merchant-tags, .merchant-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.merchant-actions { grid-column: 1 / -1; }
.summary-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
.summary-grid :deep(.el-card__body) { display: grid; gap: 4px; }
.summary-grid small, .summary-grid span, .muted-line { color: #64748b; }
.summary-grid strong { color: #0f172a; font-size: 22px; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-header small, .mall-reviews-page :deep(.el-table small) { display: block; color: #64748b; margin-top: 3px; }
.section-error { margin-bottom: 12px; }
.scope-alert p, .section-error p { margin: 0 0 8px; }
.review-image-list { display: flex; gap: 6px; flex-wrap: wrap; }
.review-thumb { width: 42px; height: 42px; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; background: #f8fafc; }
.rating-stars { color: #f59e0b; font-weight: 700; letter-spacing: 1px; }
@media (max-width: 1280px) {
  .page-header { display: grid; }
  .header-actions { justify-content: flex-start; }
  .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .mall-reviews-page { padding: 14px; }
  .summary-grid { grid-template-columns: 1fr; }
  .merchant-card :deep(.el-card__body) { grid-template-columns: 1fr; }
  .merchant-tags, .merchant-actions { justify-content: flex-start; }
}
</style>
