<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useRoute } from "vue-router";
import { api, downloadFile } from "../api";
import { hasPermission, isPlatformScopedAdmin } from "../permissions";

const rows = ref<any[]>([]);
const tenants = ref<any[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const errorRetryable = ref(false);
const tenantsLoading = ref(false);
const tenantsErrorMessage = ref("");
const exporting = ref(false);
const total = ref(0);
const loadGeneration = ref(0);
const tenantGeneration = ref(0);
const route = useRoute();
const platformScoped = computed(() => isPlatformScopedAdmin());
const canViewSensitive = computed(() => hasPermission("logs.sensitive"));
const canExport = computed(() => hasPermission("logs.export"));
const interactionLocked = computed(() => loading.value || tenantsLoading.value || exporting.value);
const filters = reactive({
  tenantId: undefined as number | undefined,
  action: "", adminUsername: "", requestId: "", startDate: "", endDate: "", page: 1, pageSize: 30
});
const tenantMap = computed(() => new Map(tenants.value.map((tenant) => [tenant.id, tenant])));

const actionText: Record<string, string> = {
  "activity.create": "创建活动",
  "activity.update": "编辑活动",
  "activity.close": "下架活动",
  "registration.approve": "审核通过",
  "registration.reject": "审核拒绝",
  "registration.cancel": "取消报名",
  "order.confirm_offline_payment": "确认收款",
  "order.close_expired": "关闭过期订单",
  "refund.request": "发起退款",
  "refund.approve": "通过退款",
  "refund.reject": "拒绝退款",
  "check_in.verify": "签到核销",
  "waitlist.promote": "候补补位",
  "waitlist.cancel": "取消候补",
  "wallet.recharge": "余额充值",
  "wallet.deduct": "余额扣减",
  "wallet.adjust": "余额调整",
  "settings.operation.update": "运营设置",
  "tenant.profile.update": "商家资料"
};

async function load() {
  const generation = ++loadGeneration.value;
  const snapshot = { tenantId: filters.tenantId, action: filters.action.trim(), adminUsername: filters.adminUsername.trim(), requestId: filters.requestId.trim(), startDate: filters.startDate, endDate: filters.endDate, page: filters.page, pageSize: filters.pageSize };
  errorMessage.value = "";
  errorRetryable.value = false;
  rows.value = [];
  total.value = 0;
  if (snapshot.startDate && snapshot.endDate && snapshot.startDate > snapshot.endDate) {
    errorMessage.value = "开始日期不能晚于结束日期";
    return;
  }
  loading.value = true;
  try {
    const params: Record<string, unknown> = {};
    if (platformScoped.value && snapshot.tenantId) params.tenantId = snapshot.tenantId;
    Object.assign(params, { action: snapshot.action || undefined, adminUsername: snapshot.adminUsername || undefined, requestId: snapshot.requestId || undefined, startDate: snapshot.startDate || undefined, endDate: snapshot.endDate || undefined, page: snapshot.page, pageSize: snapshot.pageSize });
    const result = await api.get<any, { items: any[]; total: number }>("/admin/operation-logs", { params });
    if (generation !== loadGeneration.value || JSON.stringify(snapshot) !== JSON.stringify({ tenantId: filters.tenantId, action: filters.action.trim(), adminUsername: filters.adminUsername.trim(), requestId: filters.requestId.trim(), startDate: filters.startDate, endDate: filters.endDate, page: filters.page, pageSize: filters.pageSize })) return;
    if (!result || !Array.isArray(result.items) || !Number.isFinite(result.total)) throw new Error("操作日志响应格式异常");
    rows.value = result.items;
    total.value = Math.max(0, result.total);
  } catch (error: any) {
    if (generation !== loadGeneration.value) return;
    rows.value = [];
    total.value = 0;
    errorMessage.value = error.message || "操作日志加载失败";
    errorRetryable.value = true;
  } finally {
    if (generation === loadGeneration.value) loading.value = false;
  }
}

async function loadTenants() {
  if (!platformScoped.value) {
    tenants.value = [];
    return;
  }
  const generation = ++tenantGeneration.value;
  tenantsLoading.value = true;
  tenantsErrorMessage.value = "";
  tenants.value = [];
  try {
    const result = await api.get<any, { tenants: any[] }>("/admin/operation-logs/options");
    if (generation !== tenantGeneration.value) return;
    if (!result || !Array.isArray(result.tenants)) throw new Error("商家选项响应格式异常");
    tenants.value = result.tenants;
  } catch (error: any) {
    if (generation !== tenantGeneration.value) return;
    tenants.value = [];
    tenantsErrorMessage.value = error.message || "商家选项加载失败";
  } finally {
    if (generation === tenantGeneration.value) tenantsLoading.value = false;
  }
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function renderAction(action: string) {
  return actionText[action] || action;
}

function detailText(detail?: Record<string, unknown> | null) {
  if (!detail) return "-";
  return Object.entries(detail).map(([key, value]) => `${key}: ${value}`).join("；");
}

function tenantDisplayName(row: any) {
  if (!row.tenantId) return "平台/未归属";
  const tenant = tenantMap.value.get(row.tenantId);
  return tenant ? `${tenant.name || tenant.code}（${tenant.code}）` : `商家 #${row.tenantId}`;
}

function search() {
  filters.page = 1;
  load();
}

function resetFilters() {
  filters.tenantId = undefined;
  Object.assign(filters, { action: "", adminUsername: "", requestId: "", startDate: "", endDate: "", page: 1 });
  load();
}

async function exportLogs() {
  if (!canExport.value || exporting.value) return;
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) return ElMessage.error("开始日期不能晚于结束日期");
  const snapshot = { tenantId: filters.tenantId, action: filters.action.trim(), adminUsername: filters.adminUsername.trim(), requestId: filters.requestId.trim(), startDate: filters.startDate, endDate: filters.endDate };
  exporting.value = true;
  try {
    const params = new URLSearchParams();
    if (platformScoped.value && snapshot.tenantId) params.set("tenantId", String(snapshot.tenantId));
    for (const key of ["action", "adminUsername", "requestId", "startDate", "endDate"] as const) if (snapshot[key]) params.set(key, String(snapshot[key]));
    await downloadFile(`/admin/operation-logs/export?${params.toString()}`, "operation-logs.xlsx");
    ElMessage.success("操作日志已导出");
  } catch (error: any) {
    ElMessage.error(error.message || "操作日志导出失败");
  } finally {
    exporting.value = false;
  }
}

function applyTenantFromRoute() {
  if (!platformScoped.value) return;
  const tenantId = Number(route.query.tenantId || 0);
  filters.tenantId = Number.isFinite(tenantId) && tenantId > 0 ? tenantId : undefined;
}

watch(
  () => route.query.tenantId,
  () => {
    applyTenantFromRoute();
    load();
  }
);

onMounted(async () => {
  applyTenantFromRoute();
  await loadTenants();
  await load();
});
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>操作日志</h2>
      <div class="toolbar-actions">
        <el-select v-if="platformScoped" v-model="filters.tenantId" :disabled="interactionLocked" clearable filterable placeholder="全部商家" style="width: 220px" @change="search">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
        </el-select>
        <el-button v-if="platformScoped" :disabled="interactionLocked" @click="resetFilters">重置</el-button>
        <el-button v-if="canExport" :loading="exporting" :disabled="loading" @click="exportLogs">导出</el-button>
        <el-button :loading="loading" :disabled="tenantsLoading || exporting" @click="load">刷新</el-button>
      </div>
    </div>
    <el-alert v-if="tenantsErrorMessage" class="page-error" type="error" show-icon :closable="false"><template #title><span>{{ tenantsErrorMessage }}</span></template><template #default><el-button size="small" :loading="tenantsLoading" :disabled="exporting" @click="loadTenants">重试商家选项</el-button></template></el-alert>
    <el-alert v-if="errorMessage" class="page-error" type="error" show-icon :closable="false"><template #title><span>{{ errorMessage }}</span></template><template v-if="errorRetryable" #default><el-button size="small" :disabled="interactionLocked" @click="load">重试</el-button></template></el-alert>
    <el-alert v-if="!canViewSensitive" class="page-error" type="info" show-icon :closable="false" title="终端信息已脱敏" description="IP 仅显示网段，浏览器信息已隐藏；导出遵循相同字段范围。" />

    <div class="filter-bar">
      <el-input v-model="filters.action" :disabled="interactionLocked" clearable placeholder="动作关键词" @keyup.enter="search" />
      <el-input v-model="filters.adminUsername" :disabled="interactionLocked" clearable placeholder="管理员" @keyup.enter="search" />
      <el-input v-model="filters.requestId" :disabled="interactionLocked" clearable placeholder="请求编号" @keyup.enter="search" />
      <el-date-picker v-model="filters.startDate" :disabled="interactionLocked" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" />
      <el-date-picker v-model="filters.endDate" :disabled="interactionLocked" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" />
      <el-button type="primary" :loading="loading" :disabled="tenantsLoading || exporting" @click="search">查询</el-button>
    </div>

    <div class="table-card">
      <el-table :data="rows" stripe v-loading="loading" empty-text="暂无操作日志">
        <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column v-if="platformScoped" label="所属商家" width="190" show-overflow-tooltip><template #default="{ row }">{{ tenantDisplayName(row) }}</template></el-table-column>
        <el-table-column prop="adminUsername" label="管理员" width="130" />
        <el-table-column prop="adminRole" label="角色" width="110" />
        <el-table-column prop="clientIp" label="IP" width="145" show-overflow-tooltip />
        <el-table-column v-if="canViewSensitive" prop="userAgent" label="浏览器" min-width="240" show-overflow-tooltip />
        <el-table-column label="动作" width="150"><template #default="{ row }"><el-tag>{{ renderAction(row.action) }}</el-tag></template></el-table-column>
        <el-table-column prop="targetType" label="对象" width="120" />
        <el-table-column prop="targetId" label="对象ID" width="100" />
        <el-table-column prop="summary" label="摘要" min-width="240" show-overflow-tooltip />
        <el-table-column prop="requestId" label="请求编号" min-width="180" show-overflow-tooltip />
        <el-table-column label="详情" min-width="260" show-overflow-tooltip><template #default="{ row }">{{ detailText(row.detail) }}</template></el-table-column>
      </el-table>
      <el-pagination v-model:current-page="filters.page" v-model:page-size="filters.pageSize" :disabled="interactionLocked" :total="total" :page-sizes="[20, 30, 50, 100]" layout="total, sizes, prev, pager, next" @change="load" />
    </div>
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; }
.filter-bar { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)) auto; gap: 10px; margin-bottom: 14px; }
:deep(.el-pagination) { margin-top: 14px; justify-content: flex-end; }
@media (max-width: 1100px) { .filter-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) {
  .page, .toolbar, .toolbar-actions, .table-card { min-width: 0; }
  .toolbar { align-items: flex-start; flex-direction: column; gap: 10px; }
  .toolbar-actions { width: 100%; flex-wrap: wrap; }
  .toolbar-actions :deep(.el-select) { width: 100% !important; }
  .filter-bar { grid-template-columns: minmax(0, 1fr); }
  :deep(.el-pagination) { justify-content: flex-start; overflow-x: auto; }
}
</style>
