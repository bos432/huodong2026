<template>
  <div class="mall-logistics-page">
    <div class="page-header">
      <div>
        <h2>商城物流管理</h2>
        <p>按店铺维护快递公司、客服电话和物流查询链接；平台可全局监管，商家/代理只操作已授权店铺。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家/代理" style="width:220px" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" clearable filterable placeholder="查看全部店铺；操作前请选择店铺" style="width:280px" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-input v-model="filters.keyword" clearable placeholder="物流公司/编码/电话" style="width:220px" @keyup.enter="loadLogisticsCompanies" @clear="loadLogisticsCompanies" />
        <el-select v-model="filters.enabled" clearable placeholder="全部状态" style="width:120px" @change="loadLogisticsCompanies">
          <el-option label="启用" value="true" />
          <el-option label="停用" value="false" />
        </el-select>
        <el-button :loading="loadingAny" @click="reload">刷新</el-button>
      </div>
    </div>

    <el-alert
      v-if="deepLinkWarning"
      class="scope-alert"
      type="error"
      show-icon
      :closable="false"
      title="商城物流店铺链接不可用"
      :description="deepLinkWarning"
    />
    <el-alert
      v-else-if="!selectedMerchant && isPlatformAdmin()"
      class="scope-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前是全局监管模式"
      description="平台账号可以不选店铺查看物流配置；新增、编辑或启停物流公司时必须先选择具体店铺，避免把物流规则写到错误商户。"
    />
    <el-alert
      v-else-if="!selectedMerchant && merchants.length > 1"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="请选择要运营的店铺"
      description="当前账号可管理多个商城店铺。为了避免误操作，新增、编辑、启停物流公司前必须先选择一个店铺。"
    />

    <el-card v-if="selectedMerchant && !deepLinkWarning" shadow="never" class="merchant-card">
      <div>
        <strong>当前物流店铺：{{ selectedMerchant.name || selectedMerchant.code }}</strong>
        <p>{{ selectedMerchant.tenant?.name || selectedMerchant.tenant?.code || "平台店铺" }} · {{ merchantOwnerText(selectedMerchant) }} · {{ selectedMerchant.region || "未设置区域" }}</p>
      </div>
      <div class="merchant-tags">
        <el-tag :type="selectedMerchantOpen ? 'success' : 'info'">{{ selectedMerchantOpen ? "商城已开放" : "商城未开放" }}</el-tag>
        <el-tag type="warning" effect="plain">{{ paymentModeText(selectedMerchant.paymentMode) }}</el-tag>
      </div>
      <div class="merchant-actions">
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-products')">商品管理</el-button>
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-orders')">订单管理</el-button>
        <el-button size="small" type="success" plain @click="goMerchantAdmin('/mall-marketing')">营销中心</el-button>
        <el-button size="small" type="warning" plain @click="goMerchantAdmin('/mall-payments')">收款配置</el-button>
        <el-button size="small" @click="openMerchantH5">打开 H5 店铺</el-button>
        <el-button size="small" @click="copyWorkbenchLink">复制物流后台链接</el-button>
      </div>
    </el-card>

    <el-alert
      v-if="selectedMerchant && !selectedMerchantOpen"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="当前店铺未开放商城"
      :description="selectedMerchantDisabledReason"
    />

    <div class="content-grid">
      <el-card shadow="never" class="form-card">
        <template #header>
          <div class="section-header">
            <span>{{ form.id ? "编辑物流公司" : "新增物流公司" }}</span>
            <el-button v-if="form.id" size="small" @click="resetForm">取消编辑</el-button>
          </div>
        </template>
        <el-form label-width="96px">
          <el-form-item label="归属店铺" required>
            <span class="form-scope">{{ selectedMerchantName }}</span>
          </el-form-item>
          <el-form-item label="公司名称" required>
            <el-input v-model="form.name" maxlength="80" placeholder="如 顺丰速运 / 中通快递" />
          </el-form-item>
          <el-form-item label="物流编码">
            <el-input v-model="form.code" maxlength="40" placeholder="如 SF / ZTO，用于内部识别或后续物流接口" />
          </el-form-item>
          <el-form-item label="客服电话">
            <el-input v-model="form.servicePhone" maxlength="40" placeholder="快递客服电话或店铺物流客服" />
          </el-form-item>
          <el-form-item label="查询链接">
            <el-input v-model="form.trackingUrl" maxlength="300" placeholder="可填快递官网查询页，后续发货后给运营参考" />
          </el-form-item>
          <el-form-item label="排序/启用">
            <div class="inline-fields">
              <el-input-number v-model="form.sortOrder" :precision="0" />
              <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
            </div>
          </el-form-item>
          <el-button type="primary" :loading="saving" :disabled="!canOperateSelectedMerchant" @click="saveLogisticsCompany">
            {{ form.id ? "保存物流公司" : "新增物流公司" }}
          </el-button>
        </el-form>
      </el-card>

      <el-card shadow="never" class="table-card">
        <template #header>
          <div class="section-header">
            <span>物流公司列表</span>
            <span class="table-note">共 {{ logisticsCompanies.length }} 条，启用 {{ enabledCount }} 条</span>
          </div>
        </template>
        <el-table v-loading="loading" :data="logisticsCompanies" stripe empty-text="暂无物流公司">
          <el-table-column label="物流公司" min-width="190">
            <template #default="{ row }">
              <strong>{{ row.name }}</strong>
              <small>{{ row.code || "未填写编码" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="店铺" min-width="170">
            <template #default="{ row }">{{ row.merchant?.name || "默认店铺" }}</template>
          </el-table-column>
          <el-table-column v-if="isPlatformAdmin()" label="商家/代理" min-width="170">
            <template #default="{ row }">{{ row.tenant?.name || row.tenant?.code || "-" }}</template>
          </el-table-column>
          <el-table-column label="客服电话" width="150">
            <template #default="{ row }">{{ row.servicePhone || "-" }}</template>
          </el-table-column>
          <el-table-column label="查询链接" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.trackingUrl || "-" }}</template>
          </el-table-column>
          <el-table-column label="排序" width="80" prop="sortOrder" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="editLogisticsCompany(row)">编辑</el-button>
              <el-button size="small" :type="row.enabled ? 'warning' : 'success'" plain @click="toggleLogisticsCompany(row)">
                {{ row.enabled ? "停用" : "启用" }}
              </el-button>
            </template>
          </el-table-column>
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
const logisticsCompanies = ref<any[]>([]);
const loading = ref(false);
const merchantLoading = ref(false);
const saving = ref(false);
const deepLinkWarning = ref("");
const filters = reactive({ tenantId: routeTenantId(), merchantId: routeMerchantId(), keyword: "", enabled: "" });
const form = reactive<any>({ id: null, name: "", code: "", servicePhone: "", trackingUrl: "", sortOrder: 0, enabled: true });

const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const selectedMerchantOpen = computed(() => merchantOperational(selectedMerchant.value));
const selectedMerchantDisabledReason = computed(() => merchantDisabledReason(selectedMerchant.value));
const selectedMerchantName = computed(() => selectedMerchant.value ? `${selectedMerchant.value.name || selectedMerchant.value.code}（${merchantOwnerText(selectedMerchant.value)}）` : "请先在页面顶部选择店铺");
const canOperateSelectedMerchant = computed(() => !deepLinkWarning.value && !!filters.merchantId && selectedMerchantOpen.value);
const loadingAny = computed(() => loading.value || merchantLoading.value || saving.value);
const enabledCount = computed(() => logisticsCompanies.value.filter((item) => item.enabled).length);

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
  const status = merchantOperational(merchant) ? "已开放" : "未开放";
  return `${merchant.name || merchant.code}（${merchantOwnerText(merchant)} · ${status}${merchant.region ? ` · ${merchant.region}` : ""}）`;
}

function merchantOperational(merchant?: Merchant) {
  return !!merchant && merchant.status === "active" && merchant.mallEnabled !== false;
}

function merchantDisabledReason(merchant?: Merchant) {
  if (!merchant) return "请先选择要维护物流的商城店铺。";
  if (merchant.status !== "active") return "当前店铺已被平台停用，不能新增、编辑或启停物流公司；历史订单发货查询仍可在订单页按权限处理。";
  if (merchant.mallEnabled === false) return "当前店铺未开放商城，不能新增、编辑或启停物流公司；请先在「商城店铺」完成开通和授权。";
  return "";
}

function paymentModeText(value?: string) {
  return value === "merchant_direct" ? "商户直收" : "平台代收";
}

function merchantLinkWarning(requestedMerchantId: number) {
  return `当前链接指定的店铺 #${requestedMerchantId} 对当前账号不可见，或已被商家筛选条件过滤。为避免误操作，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
}

function currentMallParams(extra: Record<string, any> = {}) {
  return {
    tenantId: isPlatformAdmin() ? filters.tenantId || selectedMerchant.value?.tenant?.id : undefined,
    merchantId: filters.merchantId || undefined,
    ...extra
  };
}

function requireMerchantSelection(action: string, row?: any) {
  if (deepLinkWarning.value) {
    ElMessage.error("当前商城物流店铺链接不可用，请先确认店铺授权后再操作。");
    return false;
  }
  if (row?.merchant?.id && row.merchant.id !== filters.merchantId) filters.merchantId = row.merchant.id;
  if (filters.merchantId && selectedMerchantOpen.value) return true;
  if (filters.merchantId) {
    ElMessage.error(selectedMerchantDisabledReason.value);
    return false;
  }
  ElMessage.error(`请先选择要${action}的店铺。平台可以全局查看物流配置，但新增、编辑、启停都必须指定一个店铺。`);
  return false;
}

async function syncRouteQuery() {
  const query: Record<string, string> = {};
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  if (filters.merchantId) query.merchantId = String(filters.merchantId);
  await router.replace({ path: route.path, query });
}

function clearRows() {
  logisticsCompanies.value = [];
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
      clearRows();
      return false;
    } else if (filters.merchantId && !merchants.value.some((merchant) => merchant.id === filters.merchantId)) filters.merchantId = undefined;
    if (!filters.merchantId && !isPlatformAdmin() && merchants.value.length === 1) filters.merchantId = merchants.value[0].id;
    return true;
  } catch (error: any) {
    ElMessage.error(error.message || "加载可运营店铺失败");
    return false;
  } finally {
    merchantLoading.value = false;
  }
}

async function loadLogisticsCompanies() {
  if (deepLinkWarning.value) return;
  if (!isPlatformAdmin() && !filters.merchantId && merchants.value.length > 1) {
    clearRows();
    return;
  }
  loading.value = true;
  try {
    logisticsCompanies.value = await api.get<any, any[]>("/admin/mall/logistics-companies", {
      params: currentMallParams({
        enabled: filters.enabled || undefined,
        keyword: filters.keyword.trim() || undefined
      })
    });
  } catch (error: any) {
    ElMessage.error(error.message || "加载物流公司失败");
  } finally {
    loading.value = false;
  }
}

async function reload() {
  await loadLogisticsCompanies();
}

async function handleTenantChange() {
  filters.merchantId = undefined;
  resetForm();
  await syncRouteQuery();
  const ok = await loadMerchants();
  if (ok) await loadLogisticsCompanies();
}

async function handleMerchantChange() {
  deepLinkWarning.value = "";
  resetForm();
  await syncRouteQuery();
  await loadLogisticsCompanies();
}

async function selectRowMerchant(row: any) {
  if (row?.merchant?.id && row.merchant.id !== filters.merchantId) {
    filters.merchantId = row.merchant.id;
    await syncRouteQuery();
  }
}

function resetForm() {
  Object.assign(form, { id: null, name: "", code: "", servicePhone: "", trackingUrl: "", sortOrder: 0, enabled: true });
}

async function editLogisticsCompany(row: any) {
  await selectRowMerchant(row);
  if (!requireMerchantSelection("编辑物流公司", row)) return;
  Object.assign(form, {
    id: row.id,
    name: row.name || "",
    code: row.code || "",
    servicePhone: row.servicePhone || "",
    trackingUrl: row.trackingUrl || "",
    sortOrder: Number(row.sortOrder || 0),
    enabled: row.enabled !== false
  });
}

async function saveLogisticsCompany() {
  if (!requireMerchantSelection("配置物流")) return;
  if (!form.name?.trim()) return ElMessage.error("请输入物流公司名称");
  saving.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      code: form.code?.trim() || undefined,
      servicePhone: form.servicePhone?.trim() || undefined,
      trackingUrl: form.trackingUrl?.trim() || undefined,
      sortOrder: Number(form.sortOrder || 0),
      enabled: form.enabled,
      ...currentMallParams()
    };
    if (form.id) await api.patch(`/admin/mall/logistics-companies/${form.id}`, payload);
    else await api.post("/admin/mall/logistics-companies", payload);
    ElMessage.success("物流公司已保存");
    resetForm();
    await loadLogisticsCompanies();
  } catch (error: any) {
    ElMessage.error(error.message || "保存物流公司失败");
  } finally {
    saving.value = false;
  }
}

async function toggleLogisticsCompany(row: any) {
  await editLogisticsCompany(row);
  if (!requireMerchantSelection("启停物流公司", row)) return;
  form.enabled = !row.enabled;
  await saveLogisticsCompany();
}

function merchantWorkbenchUrl() {
  if (!selectedMerchant.value) return "";
  const query = new URLSearchParams();
  if (selectedMerchant.value.tenant?.id) query.set("tenantId", String(selectedMerchant.value.tenant.id));
  query.set("merchantId", String(selectedMerchant.value.id));
  return `${window.location.origin}/admin/mall-logistics?${query.toString()}`;
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
  ElMessage.success("商城物流后台链接已复制，可发给已授权的商家/代理账号。");
}

onMounted(async () => {
  await loadTenants();
  const ok = await loadMerchants();
  if (ok) await loadLogisticsCompanies();
});

watch(() => [route.query.tenantId, route.query.merchantId], async () => {
  const nextTenantId = routeTenantId();
  const nextMerchantId = routeMerchantId();
  if (nextTenantId !== filters.tenantId) {
    filters.tenantId = nextTenantId;
    filters.merchantId = nextMerchantId;
    const ok = await loadMerchants();
    if (ok) await loadLogisticsCompanies();
    return;
  }
  if (nextMerchantId && nextMerchantId !== filters.merchantId && merchants.value.some((item) => item.id === nextMerchantId)) {
    deepLinkWarning.value = "";
    filters.merchantId = nextMerchantId;
    await loadLogisticsCompanies();
  } else if (nextMerchantId && nextMerchantId !== filters.merchantId) {
    filters.merchantId = undefined;
    deepLinkWarning.value = merchantLinkWarning(nextMerchantId);
    clearRows();
  }
});
</script>

<style scoped>
.mall-logistics-page { padding: 24px; display: grid; gap: 16px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-header h2 { margin: 0 0 6px; color: #111827; }
.page-header p { margin: 0; color: #64748b; }
.header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.scope-alert { margin-bottom: 2px; }
.merchant-card { border-color: #dcfce7; background: linear-gradient(135deg, #f0fdf4 0%, #fff 72%); }
.merchant-card :deep(.el-card__body) { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
.merchant-card strong { color: #0f172a; }
.merchant-card p { margin: 4px 0 0; color: #64748b; }
.merchant-tags, .merchant-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.merchant-actions { grid-column: 1 / -1; }
.content-grid { display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 16px; align-items: start; }
.form-card, .table-card { min-width: 0; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.table-note, .form-scope { color: #64748b; font-size: 13px; }
.inline-fields { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.table-card small { display: block; color: #64748b; margin-top: 3px; }
@media (max-width: 1100px) {
  .page-header { display: grid; }
  .header-actions { justify-content: flex-start; }
  .content-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .mall-logistics-page { padding: 14px; }
  .merchant-card :deep(.el-card__body) { grid-template-columns: 1fr; }
  .merchant-tags, .merchant-actions { justify-content: flex-start; }
}
</style>
