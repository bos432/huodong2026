<template>
  <div class="mall-product-audits-page">
    <div class="page-header">
      <div>
        <h2>商城商品审核</h2>
        <p>平台审核商家/代理店铺提交的商品。通过后前台展示，驳回后退回草稿，店铺可修改后重新提交。</p>
      </div>
      <div class="header-actions">
        <el-select v-model="filters.tenantId" clearable filterable placeholder="全部商家/代理" style="width:220px" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" clearable filterable placeholder="全部店铺" style="width:260px" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-input v-model="filters.keyword" clearable placeholder="商品名/品牌名" style="width:220px" @keyup.enter="loadAudits" @clear="loadAudits" />
        <el-button :loading="loadingAny" @click="loadAudits">刷新审核</el-button>
      </div>
    </div>

    <el-alert
      v-if="deepLinkWarning"
      class="scope-alert"
      type="error"
      show-icon
      :closable="false"
      title="商品审核店铺链接不可用"
      :description="deepLinkWarning"
    />
    <el-alert
      v-else-if="!selectedMerchant"
      class="scope-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前是全局商品审核模式"
      description="平台可以不选店铺审核全部待审核商品；选择商家或店铺后，会收窄到对应店铺，适合批量处理某个商家/代理的上架申请。"
    />

    <el-card v-if="selectedMerchant && !deepLinkWarning" shadow="never" class="merchant-card">
      <div>
        <strong>当前审核店铺：{{ selectedMerchant.name || selectedMerchant.code }}</strong>
        <p>{{ selectedMerchant.tenant?.name || selectedMerchant.tenant?.code || "平台店铺" }} · {{ merchantOwnerText(selectedMerchant) }} · {{ selectedMerchant.region || "未设置区域" }}</p>
      </div>
      <div class="merchant-tags">
        <el-tag :type="selectedMerchant.mallEnabled === false || selectedMerchant.status !== 'active' ? 'info' : 'success'">
          {{ selectedMerchant.mallEnabled === false || selectedMerchant.status !== "active" ? "商城未开放" : "商城已开放" }}
        </el-tag>
        <el-tag type="warning" effect="plain">{{ selectedMerchant.productAuditRequired === false ? "免审核店铺" : "商品需审核" }}</el-tag>
      </div>
      <div class="merchant-actions">
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-products')">商品管理</el-button>
        <el-button size="small" type="success" plain @click="goMerchantAdmin('/mall-statistics')">经营统计</el-button>
        <el-button size="small" type="warning" plain @click="goMerchantAdmin('/mall-marketing')">营销中心</el-button>
        <el-button size="small" @click="openMerchantH5">打开 H5 店铺</el-button>
        <el-button size="small" @click="copyWorkbenchLink">复制审核链接</el-button>
      </div>
    </el-card>

    <div class="summary-grid">
      <el-card v-for="item in summaryCards" :key="item.label" shadow="never">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
        <span>{{ item.desc }}</span>
      </el-card>
    </div>

    <el-card shadow="never" class="audit-card">
      <template #header>
        <div class="section-header">
          <span>待审核商品</span>
          <small>共 {{ total }} 条；审核时重点看商品描述、价格、规格、库存、配送和售后说明</small>
        </div>
      </template>
      <el-table v-loading="loading" :data="products" stripe empty-text="暂无待审核商品">
        <el-table-column label="商品" min-width="300">
          <template #default="{ row }">
            <div class="product-cell">
              <img v-if="row.coverUrl" :src="row.coverUrl" alt="" />
              <div v-else class="cover-placeholder">商</div>
              <div>
                <strong>{{ row.title }}</strong>
                <small>{{ row.brandName || "未设品牌" }} · {{ row.category?.name || "未分类" }}</small>
                <small>{{ row.description || "未填写商品介绍" }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="商家/店铺" min-width="210">
          <template #default="{ row }">
            <strong>{{ row.tenant?.name || row.tenant?.code || "-" }}</strong>
            <small>{{ row.merchant?.name || "默认店铺" }} · {{ merchantOwnerText(row.merchant) }}</small>
          </template>
        </el-table-column>
        <el-table-column label="价格/库存" width="150">
          <template #default="{ row }">
            <strong>¥{{ money(row.price) }}</strong>
            <small>库存 {{ row.stock || 0 }}，已售 {{ row.salesStats?.salesCount || 0 }}</small>
          </template>
        </el-table-column>
        <el-table-column label="规格" min-width="220">
          <template #default="{ row }">
            <div v-if="row.skus?.length" class="sku-list">
              <span v-for="sku in row.skus" :key="sku.id || sku.name">
                {{ sku.name || "默认规格" }}：¥{{ money(sku.price) }} / 库存 {{ sku.stock || 0 }} / {{ sku.enabled ? "启用" : "停用" }}
              </span>
            </div>
            <span v-else class="muted-line">暂无规格</span>
          </template>
        </el-table-column>
        <el-table-column label="配送/售后" min-width="230">
          <template #default="{ row }">
            <small>配送：{{ row.deliveryNote || "未填写" }}</small>
            <small>售后：{{ row.afterSaleNote || "未填写" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="170"><template #default="{ row }">{{ formatTime(row.updatedAt || row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" @click.stop="approveProduct(row)">通过</el-button>
            <el-button size="small" type="danger" plain @click.stop="rejectProduct(row)">驳回</el-button>
            <el-button size="small" @click.stop="openProductManage(row)">商品管理</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager-row">
        <el-pagination v-model:current-page="filters.page" :page-size="filters.pageSize" layout="prev, pager, next, total" :total="total" @current-change="loadAudits" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";
import { copyToClipboard, h5RoutePreviewUrl } from "../h5-preview";

type Merchant = {
  id: number;
  code?: string;
  name?: string;
  ownerType?: string;
  status?: string;
  mallEnabled?: boolean;
  productAuditRequired?: boolean;
  region?: string | null;
  tenant?: { id?: number; name?: string; code?: string } | null;
};

const route = useRoute();
const router = useRouter();
const tenants = ref<any[]>([]);
const merchants = ref<Merchant[]>([]);
const products = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const merchantLoading = ref(false);
const deepLinkWarning = ref("");
const filters = reactive({
  tenantId: routeTenantId(),
  merchantId: routeMerchantId(),
  keyword: routeKeyword(),
  page: 1,
  pageSize: 50
});

const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const loadingAny = computed(() => loading.value || merchantLoading.value);
const summaryCards = computed(() => [
  { label: "待审核商品", value: total.value, desc: "当前筛选范围" },
  { label: "涉及店铺", value: new Set(products.value.map((item) => item.merchant?.id || "default")).size, desc: "当前页" },
  { label: "缺少介绍", value: products.value.filter((item) => !item.description).length, desc: "当前页需重点看" },
  { label: "无启用规格", value: products.value.filter((item) => !item.skus?.some((sku: any) => sku.enabled)).length, desc: "通过前建议处理" }
]);

function routeTenantId() {
  const id = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : 0;
  return id || undefined;
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
  const status = merchant.mallEnabled === false || merchant.status !== "active" ? " · 未开放" : "";
  return `${merchant.name || merchant.code}（${merchantOwnerText(merchant)}${merchant.region ? ` · ${merchant.region}` : ""}${status}）`;
}

function merchantLinkWarning(requestedMerchantId: number) {
  return `当前链接指定的店铺 #${requestedMerchantId} 不存在，或已被商家筛选条件过滤。为避免误审商品，系统不会自动切换到其它店铺；请确认店铺归属，或清空筛选后重试。`;
}

function currentMallParams(extra: Record<string, any> = {}) {
  return {
    tenantId: filters.tenantId || selectedMerchant.value?.tenant?.id || undefined,
    merchantId: filters.merchantId || undefined,
    ...extra
  };
}

async function syncRouteQuery() {
  const query: Record<string, string> = {};
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  if (filters.merchantId) query.merchantId = String(filters.merchantId);
  if (filters.keyword.trim()) query.keyword = filters.keyword.trim();
  await router.replace({ path: route.path, query });
}

function clearAudits() {
  products.value = [];
  total.value = 0;
}

async function loadTenants() {
  tenants.value = await api.get<any, any[]>("/admin/tenants");
}

async function loadMerchants() {
  merchantLoading.value = true;
  try {
    merchants.value = await api.get<any, Merchant[]>("/admin/mall/accessible-merchants", { params: { tenantId: filters.tenantId || undefined, enabled: "true" } });
    const requestedMerchantId = routeMerchantId();
    deepLinkWarning.value = "";
    if (requestedMerchantId && merchants.value.some((merchant) => merchant.id === requestedMerchantId)) filters.merchantId = requestedMerchantId;
    else if (requestedMerchantId) {
      filters.merchantId = undefined;
      deepLinkWarning.value = merchantLinkWarning(requestedMerchantId);
      clearAudits();
      return false;
    } else if (filters.merchantId && !merchants.value.some((merchant) => merchant.id === filters.merchantId)) filters.merchantId = undefined;
    return true;
  } catch (error: any) {
    ElMessage.error(error.message || "加载可审核店铺失败");
    return false;
  } finally {
    merchantLoading.value = false;
  }
}

async function loadAudits() {
  if (deepLinkWarning.value) return;
  loading.value = true;
  try {
    const result = await api.get<any, any>("/admin/mall/product-audits", {
      params: currentMallParams({
        keyword: filters.keyword.trim() || undefined,
        page: filters.page,
        pageSize: filters.pageSize
      })
    });
    products.value = result.items || [];
    total.value = result.total || 0;
    await syncRouteQuery();
  } catch (error: any) {
    ElMessage.error(error.message || "加载商城商品审核失败");
  } finally {
    loading.value = false;
  }
}

async function handleTenantChange() {
  filters.merchantId = undefined;
  filters.page = 1;
  await syncRouteQuery();
  const ok = await loadMerchants();
  if (ok) await loadAudits();
}

async function handleMerchantChange() {
  deepLinkWarning.value = "";
  filters.page = 1;
  await syncRouteQuery();
  await loadAudits();
}

function merchantWorkbenchUrl() {
  if (!selectedMerchant.value) return `${window.location.origin}/admin/mall-product-audits`;
  const query = new URLSearchParams();
  if (selectedMerchant.value.tenant?.id) query.set("tenantId", String(selectedMerchant.value.tenant.id));
  query.set("merchantId", String(selectedMerchant.value.id));
  return `${window.location.origin}/admin/mall-product-audits?${query.toString()}`;
}

function merchantH5Url() {
  if (!selectedMerchant.value) return "";
  return h5RoutePreviewUrl(selectedMerchant.value.tenant?.code || "", `/pages/mall/merchant?id=${selectedMerchant.value.id}`);
}

function goMerchantAdmin(path: string, query: Record<string, any> = {}) {
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
  router.push({ path: "/mall-products", query: { tenantId: row.tenant?.id || filters.tenantId, merchantId: row.merchant?.id || filters.merchantId, keyword: row.title || "" } });
}

function openMerchantH5() {
  const url = merchantH5Url();
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

async function copyWorkbenchLink() {
  await copyToClipboard(merchantWorkbenchUrl());
  ElMessage.success("商品审核后台链接已复制，可发给平台审核人员。");
}

async function approveProduct(row: any) {
  try {
    await ElMessageBox.confirm(`确认通过商品「${row.title}」的上架审核？通过后会在 H5/小程序公开展示。`, "通过商品审核", { confirmButtonText: "通过", cancelButtonText: "取消", type: "success" });
    await api.post(`/admin/mall/products/${row.id}/approve`);
    ElMessage.success("商品审核已通过，前台将按店铺和商品可见性展示。");
    await loadAudits();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "商品审核通过失败");
  }
}

async function rejectProduct(row: any) {
  try {
    await ElMessageBox.confirm(`确认驳回商品「${row.title}」？商品会退回草稿，店铺可修改后重新提交。`, "驳回商品审核", { confirmButtonText: "驳回", cancelButtonText: "取消", type: "warning" });
    await api.post(`/admin/mall/products/${row.id}/reject`);
    ElMessage.success("商品已驳回为草稿");
    await loadAudits();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "商品审核驳回失败");
  }
}

function money(value: any) {
  return Number(value || 0).toFixed(2);
}

function formatTime(value: any) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-";
}

onMounted(async () => {
  await loadTenants();
  const ok = await loadMerchants();
  if (ok) await loadAudits();
});

watch(() => [route.query.tenantId, route.query.merchantId, route.query.keyword], async () => {
  const nextTenantId = routeTenantId();
  const nextMerchantId = routeMerchantId();
  const nextKeyword = routeKeyword();
  if (nextKeyword !== filters.keyword) filters.keyword = nextKeyword;
  if (nextTenantId !== filters.tenantId) {
    filters.tenantId = nextTenantId;
    filters.merchantId = nextMerchantId;
    filters.page = 1;
    const ok = await loadMerchants();
    if (ok) await loadAudits();
    return;
  }
  if (nextMerchantId && nextMerchantId !== filters.merchantId && merchants.value.some((item) => item.id === nextMerchantId)) {
    deepLinkWarning.value = "";
    filters.merchantId = nextMerchantId;
    filters.page = 1;
    await loadAudits();
  } else if (nextMerchantId && nextMerchantId !== filters.merchantId) {
    filters.merchantId = undefined;
    deepLinkWarning.value = merchantLinkWarning(nextMerchantId);
    clearAudits();
  }
});
</script>

<style scoped>
.mall-product-audits-page { padding: 24px; display: grid; gap: 16px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-header h2 { margin: 0 0 6px; color: #111827; }
.page-header p { margin: 0; color: #64748b; }
.header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.scope-alert { margin-bottom: 2px; }
.merchant-card { border-color: #fde68a; background: linear-gradient(135deg, #fffbeb 0%, #fff 72%); }
.merchant-card :deep(.el-card__body) { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
.merchant-card strong { color: #0f172a; }
.merchant-card p { margin: 4px 0 0; color: #64748b; }
.merchant-tags, .merchant-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.merchant-actions { grid-column: 1 / -1; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.summary-grid :deep(.el-card__body) { display: grid; gap: 4px; }
.summary-grid small, .summary-grid span { color: #64748b; }
.summary-grid strong { color: #0f172a; font-size: 24px; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-header small, .audit-card small, .muted-line { color: #64748b; }
.product-cell { display: flex; gap: 10px; align-items: center; }
.product-cell img, .cover-placeholder { width: 52px; height: 52px; border-radius: 12px; object-fit: cover; background: #fef3c7; color: #92400e; display: grid; place-items: center; font-weight: 700; }
.product-cell small, .sku-list span, .audit-card small { display: block; margin-top: 3px; }
.sku-list { display: grid; gap: 4px; }
.pager-row { display: flex; justify-content: flex-end; padding-top: 14px; }
@media (max-width: 1200px) {
  .page-header { display: grid; }
  .header-actions { justify-content: flex-start; }
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .mall-product-audits-page { padding: 14px; }
  .summary-grid { grid-template-columns: 1fr; }
  .merchant-card :deep(.el-card__body) { grid-template-columns: 1fr; }
  .merchant-tags, .merchant-actions { justify-content: flex-start; }
}
</style>
