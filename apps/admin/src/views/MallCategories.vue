<template>
  <div class="mall-categories-page">
    <div class="page-header">
      <div>
        <h2>商城分类管理</h2>
        <p>按店铺维护商城货架分类，商品发布时可直接选择；平台可全局查看，新增和保存必须落到具体商家/代理店铺。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家/代理" style="width:220px" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" clearable filterable placeholder="全部授权店铺；新增前请选择" style="width:280px" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-select v-model="filters.enabled" clearable placeholder="全部状态" style="width:130px" @change="loadCategories">
          <el-option label="启用" value="true" />
          <el-option label="停用" value="false" />
        </el-select>
        <el-input v-model="filters.keyword" clearable placeholder="分类名称/店铺/商家" style="width:240px" @keyup.enter="loadCategories" @clear="loadCategories" />
        <el-button :loading="loading || merchantLoading" @click="loadCategories">刷新分类</el-button>
      </div>
    </div>

    <el-alert
      v-if="deepLinkWarning"
      class="scope-alert"
      type="error"
      show-icon
      :closable="false"
      title="商城分类店铺链接不可用"
      :description="deepLinkWarning"
    />
    <el-alert
      v-else-if="!selectedMerchant && isPlatformAdmin()"
      class="scope-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前是全局分类监管模式"
      description="平台账号可以不选店铺查看全平台或所选商家下的全部商城分类；新增、保存分类时必须先选择一个具体店铺，避免把货架写错。"
    />
    <el-alert
      v-else-if="!selectedMerchant && merchants.length > 1"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="请选择要管理分类的店铺"
      description="当前账号可管理多个商城店铺。为避免把不同店铺的货架分类混在一起，请先选择一个店铺。"
    />

    <el-card v-if="selectedMerchant && !deepLinkWarning" shadow="never" class="merchant-card">
      <div>
        <strong>当前分类店铺：{{ selectedMerchant.name || selectedMerchant.code }}</strong>
        <p>{{ selectedMerchant.tenant?.name || selectedMerchant.tenant?.code || "平台店铺" }} · {{ merchantOwnerText(selectedMerchant) }} · {{ selectedMerchant.region || "未设置区域" }}</p>
      </div>
      <div class="merchant-tags">
        <el-tag :type="selectedMerchantOpen ? 'success' : 'info'">{{ selectedMerchantOpen ? "商城已开放" : "商城未开放" }}</el-tag>
        <el-tag type="warning" effect="plain">{{ selectedMerchant.paymentMode === "merchant_direct" ? "商户直收" : "平台代收" }}</el-tag>
      </div>
      <div class="merchant-actions">
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-products')">商品管理</el-button>
        <el-button size="small" type="success" plain @click="goMerchantAdmin('/mall-marketing')">营销中心</el-button>
        <el-button size="small" type="warning" plain @click="goMerchantAdmin('/mall-statistics')">经营统计</el-button>
        <el-button size="small" @click="openMerchantH5">打开 H5 店铺</el-button>
        <el-button size="small" @click="copyWorkbenchLink">复制分类后台链接</el-button>
      </div>
    </el-card>
    <el-alert
      v-if="selectedMerchant && !deepLinkWarning && !selectedMerchantOpen"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="当前店铺未开放商城"
      :description="merchantDisabledReason(selectedMerchant)"
    />

    <div class="summary-grid">
      <el-card v-for="item in summaryCards" :key="item.label" shadow="never">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
        <span>{{ item.desc }}</span>
      </el-card>
    </div>

    <el-card shadow="never" class="category-card">
      <template #header>
        <div class="section-header">
          <span>新增店铺分类</span>
          <small>新增前必须选择具体店铺；平台全局模式只用于查看和监管。</small>
        </div>
      </template>
      <div class="category-form">
        <el-input v-model="categoryForm.name" placeholder="分类名称，如 慢π严选/文创茶器" />
        <el-input v-model="categoryForm.iconUrl" placeholder="图标 URL，可选" />
        <el-input-number v-model="categoryForm.sortOrder" :precision="0" placeholder="排序" />
        <el-switch v-model="categoryForm.enabled" active-text="启用" inactive-text="停用" />
        <el-button type="primary" :loading="saving" :disabled="!canWriteCategories" @click="saveCategory">新增分类</el-button>
      </div>
      <el-alert
        v-if="!canWriteCategories"
        class="form-tip"
        type="info"
        show-icon
        :closable="false"
        :title="writeDisabledTip"
      />
    </el-card>

    <el-card shadow="never" class="category-card">
      <template #header>
        <div class="section-header">
          <span>店铺分类列表</span>
          <small>共 {{ filteredCategories.length }} 个分类；停用后前台不再展示该分类入口。</small>
        </div>
      </template>
      <el-table v-loading="loading" :data="filteredCategories" stripe empty-text="暂无商城分类">
        <el-table-column label="分类名称" min-width="180">
          <template #default="{ row }">
            <el-input v-model="row.name" :disabled="!canEditCategoryRow(row)" placeholder="请输入分类名称" />
          </template>
        </el-table-column>
        <el-table-column label="图标 URL" min-width="260">
          <template #default="{ row }">
            <el-input v-model="row.iconUrl" :disabled="!canEditCategoryRow(row)" placeholder="可选" />
          </template>
        </el-table-column>
        <el-table-column label="商家/店铺" min-width="190">
          <template #default="{ row }">
            {{ row.tenant?.name || row.tenant?.code || "-" }}
            <small>{{ row.merchant?.name || "默认店铺" }} · {{ merchantOwnerText(row.merchant) }}</small>
          </template>
        </el-table-column>
        <el-table-column label="排序" width="120">
          <template #default="{ row }">
            <el-input-number v-model="row.sortOrder" :disabled="!canEditCategoryRow(row)" :precision="0" />
          </template>
        </el-table-column>
        <el-table-column label="启用" width="100">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" :disabled="!canEditCategoryRow(row)" />
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatTime(row.updatedAt || row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" :disabled="!canEditCategoryRow(row)" @click="updateCategory(row)">保存</el-button>
            <el-button size="small" text type="primary" @click="goCategoryProducts(row)">看商品</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
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
const categories = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const merchantLoading = ref(false);
const deepLinkWarning = ref("");
const filters = reactive({
  tenantId: routeTenantId(),
  merchantId: routeMerchantId(),
  enabled: routeEnabled(),
  keyword: routeKeyword()
});
const categoryForm = reactive({ name: "", iconUrl: "", sortOrder: 0, enabled: true });

const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const selectedMerchantOpen = computed(() => merchantOperational(selectedMerchant.value));
const canManageCategories = computed(() => hasPermission("mall.product.manage"));
const canWriteCategories = computed(() => canManageCategories.value && selectedMerchantOpen.value && !deepLinkWarning.value);
const filteredCategories = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase();
  return categories.value.filter((row) => {
    if (filters.enabled === "true" && row.enabled === false) return false;
    if (filters.enabled === "false" && row.enabled !== false) return false;
    if (!keyword) return true;
    return [row.name, row.merchant?.name, row.merchant?.code, row.tenant?.name, row.tenant?.code].some((value) => String(value || "").toLowerCase().includes(keyword));
  });
});
const summaryCards = computed(() => {
  const enabledCount = filteredCategories.value.filter((row) => row.enabled !== false).length;
  const disabledCount = filteredCategories.value.length - enabledCount;
  const storeCount = new Set(filteredCategories.value.map((row) => row.merchant?.id).filter(Boolean)).size;
  return [
    { label: "分类总数", value: filteredCategories.value.length, desc: "当前筛选口径" },
    { label: "启用分类", value: enabledCount, desc: "前台可展示" },
    { label: "停用分类", value: disabledCount, desc: "前台隐藏" },
    { label: "覆盖店铺", value: storeCount, desc: "涉及商家/代理店铺" }
  ];
});
const writeDisabledTip = computed(() => {
  if (deepLinkWarning.value) return "当前店铺链接不可用，请先确认店铺授权后再维护分类。";
  if (!canManageCategories.value) return "当前账号没有商品/分类管理权限，请联系平台管理员授权。";
  if (!selectedMerchant.value) return "请先选择要维护分类的店铺。平台可全局查看，但新增和保存必须落到具体店铺。";
  return merchantDisabledReason(selectedMerchant.value);
});

function routeTenantId() {
  const id = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : 0;
  return isPlatformAdmin() && id ? id : undefined;
}

function routeMerchantId() {
  const id = typeof route.query.merchantId === "string" ? Number(route.query.merchantId) : 0;
  return id || undefined;
}

function routeEnabled() {
  const enabled = typeof route.query.enabled === "string" ? route.query.enabled : "";
  return ["true", "false"].includes(enabled) ? enabled : "";
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

function merchantDisabledReason(merchant?: Merchant | null) {
  if (!merchant) return "请先选择要维护分类的店铺。平台可在「商城店铺」为商家/代理开店并授权账号。";
  if (merchant.status !== "active") return "当前店铺已被平台停用，不能新增或保存分类；历史分类仍可查看。";
  if (merchant.mallEnabled === false) return "当前店铺未开放商城，不能新增或保存分类；请联系平台管理员在「商城店铺」开通商城后再操作。";
  return "";
}

function merchantLinkWarning(requestedMerchantId: number) {
  return `当前链接指定的店铺 #${requestedMerchantId} 对当前账号不可见，或已被商家筛选条件过滤。为避免误维护其它店铺分类，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
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
  if (filters.enabled) query.enabled = filters.enabled;
  if (filters.keyword.trim()) query.keyword = filters.keyword.trim();
  await router.replace({ path: route.path, query });
}

function clearCategories() {
  categories.value = [];
}

function requireCategoryOperation(action: string, merchant = selectedMerchant.value) {
  if (deepLinkWarning.value) {
    ElMessage.error("当前店铺链接不可用，请先确认店铺授权后再操作。");
    return false;
  }
  if (!canManageCategories.value) {
    ElMessage.error("当前账号没有商品/分类管理权限，请联系平台管理员授权。");
    return false;
  }
  if (!merchant) {
    ElMessage.error(`请先选择要${action}的店铺。平台可全局查看分类，但写入必须选择具体店铺。`);
    return false;
  }
  if (!merchantOperational(merchant)) {
    ElMessage.error(merchantDisabledReason(merchant));
    return false;
  }
  return true;
}

function canEditCategoryRow(row: any) {
  return canWriteCategories.value && row?.merchant?.id === selectedMerchant.value?.id;
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
      clearCategories();
      return false;
    } else if (filters.merchantId && !merchants.value.some((merchant) => merchant.id === filters.merchantId)) filters.merchantId = undefined;
    if (!filters.merchantId && !isPlatformAdmin() && merchants.value.length === 1) filters.merchantId = merchants.value[0].id;
    return true;
  } catch (error: any) {
    ElMessage.error(error.message || "加载可管理分类的店铺失败");
    return false;
  } finally {
    merchantLoading.value = false;
  }
}

async function loadCategories() {
  if (deepLinkWarning.value) return;
  if (!isPlatformAdmin() && !filters.merchantId) {
    clearCategories();
    await syncRouteQuery();
    return;
  }
  loading.value = true;
  try {
    categories.value = await api.get<any, any[]>("/admin/mall/categories", { params: currentMallParams() });
    await syncRouteQuery();
  } catch (error: any) {
    clearCategories();
    ElMessage.error(error.message || "加载商城分类失败");
  } finally {
    loading.value = false;
  }
}

async function handleTenantChange() {
  filters.merchantId = undefined;
  await syncRouteQuery();
  const ok = await loadMerchants();
  if (ok) await loadCategories();
}

async function handleMerchantChange() {
  deepLinkWarning.value = "";
  await syncRouteQuery();
  await loadCategories();
}

async function saveCategory() {
  if (!requireCategoryOperation("新增分类")) return;
  if (!categoryForm.name.trim()) return ElMessage.error("请输入分类名称");
  saving.value = true;
  try {
    await api.post("/admin/mall/categories", {
      name: categoryForm.name.trim(),
      iconUrl: categoryForm.iconUrl.trim() || undefined,
      sortOrder: Number(categoryForm.sortOrder || 0),
      enabled: categoryForm.enabled,
      ...currentMallParams()
    });
    Object.assign(categoryForm, { name: "", iconUrl: "", sortOrder: 0, enabled: true });
    ElMessage.success("店铺分类已新增，商品发布时可以选择该分类。");
    await loadCategories();
  } catch (error: any) {
    ElMessage.error(error.message || "新增分类失败");
  } finally {
    saving.value = false;
  }
}

async function updateCategory(row: any) {
  if (!requireCategoryOperation("保存分类")) return;
  if (row?.merchant?.id !== selectedMerchant.value?.id) return ElMessage.error("请先切换到该分类所属店铺后再保存，避免误改其它店铺分类。");
  if (!row.name?.trim()) return ElMessage.error("请输入分类名称");
  try {
    await api.patch(`/admin/mall/categories/${row.id}`, {
      name: row.name.trim(),
      iconUrl: row.iconUrl || undefined,
      sortOrder: Number(row.sortOrder || 0),
      enabled: row.enabled,
      tenantId: isPlatformAdmin() ? row.tenant?.id || filters.tenantId : undefined,
      merchantId: row.merchant?.id || filters.merchantId
    });
    ElMessage.success("店铺分类已保存");
    await loadCategories();
  } catch (error: any) {
    ElMessage.error(error.message || "保存分类失败");
  }
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

function goCategoryProducts(row: any) {
  router.push({
    path: "/mall-products",
    query: {
      tenantId: row.tenant?.id || filters.tenantId,
      merchantId: row.merchant?.id || filters.merchantId,
      categoryId: row.id
    }
  });
}

function merchantWorkbenchUrl() {
  if (!selectedMerchant.value) return `${window.location.origin}/admin/mall-categories`;
  const query = new URLSearchParams();
  if (selectedMerchant.value.tenant?.id) query.set("tenantId", String(selectedMerchant.value.tenant.id));
  query.set("merchantId", String(selectedMerchant.value.id));
  return `${window.location.origin}/admin/mall-categories?${query.toString()}`;
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
  ElMessage.success("商城分类后台链接已复制，可发给已授权的商家/代理账号。");
}

function formatTime(value: any) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-";
}

onMounted(async () => {
  await loadTenants();
  const ok = await loadMerchants();
  if (ok) await loadCategories();
});

watch(() => [route.query.tenantId, route.query.merchantId, route.query.enabled, route.query.keyword], async () => {
  const nextTenantId = routeTenantId();
  const nextMerchantId = routeMerchantId();
  const nextEnabled = routeEnabled();
  const nextKeyword = routeKeyword();
  const filterChanged = nextEnabled !== filters.enabled || nextKeyword !== filters.keyword;
  filters.enabled = nextEnabled;
  filters.keyword = nextKeyword;
  if (nextTenantId !== filters.tenantId) {
    filters.tenantId = nextTenantId;
    filters.merchantId = nextMerchantId;
    const ok = await loadMerchants();
    if (ok) await loadCategories();
    return;
  }
  if (nextMerchantId && nextMerchantId !== filters.merchantId && merchants.value.some((item) => item.id === nextMerchantId)) {
    deepLinkWarning.value = "";
    filters.merchantId = nextMerchantId;
    await loadCategories();
  } else if (nextMerchantId && nextMerchantId !== filters.merchantId) {
    filters.merchantId = undefined;
    deepLinkWarning.value = merchantLinkWarning(nextMerchantId);
    clearCategories();
  } else if (filterChanged) {
    await loadCategories();
  }
});
</script>

<style scoped>
.mall-categories-page { padding: 24px; display: grid; gap: 16px; }
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
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.summary-grid :deep(.el-card__body) { display: grid; gap: 4px; }
.summary-grid small, .summary-grid span, .mall-categories-page :deep(.el-table small) { display: block; color: #64748b; margin-top: 3px; }
.summary-grid strong { color: #0f172a; font-size: 22px; }
.category-card { overflow: hidden; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-header small { color: #64748b; }
.category-form { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(220px, 1.4fr) 130px 110px auto; gap: 10px; align-items: center; }
.form-tip { margin-top: 12px; }
@media (max-width: 1280px) {
  .page-header { display: grid; }
  .header-actions { justify-content: flex-start; }
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .category-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .mall-categories-page { padding: 14px; }
  .summary-grid, .category-form { grid-template-columns: 1fr; }
  .merchant-card :deep(.el-card__body) { grid-template-columns: 1fr; }
  .merchant-tags, .merchant-actions { justify-content: flex-start; }
}
</style>
