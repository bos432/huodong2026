<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useRoute } from "vue-router";
import { api, downloadFile } from "../api";
import { hasPermission } from "../permissions";

type LoginLog = {
  id: number;
  username: string;
  adminId?: number | null;
  tenantId?: number | null;
  clientIp?: string | null;
  status: "success" | "failed" | "rate_limited";
  failureReason?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

type LoginLogResult = {
  items: LoginLog[];
  total: number;
  summary: Record<string, number>;
};

const rows = ref<LoginLog[]>([]);
const tenants = ref<any[]>([]);
const summary = ref<Record<string, number>>({});
const total = ref(0);
const loading = ref(false);
const errorMessage = ref("");
const tenantsLoading = ref(false);
const tenantsErrorMessage = ref("");
const exporting = ref(false);
const loadGeneration = ref(0);
const tenantGeneration = ref(0);
const route = useRoute();
const canViewSensitive = computed(() => hasPermission("security_log.sensitive"));
const canExport = computed(() => hasPermission("security_log.export"));
const interactionLocked = computed(() => loading.value || tenantsLoading.value || exporting.value);
const query = reactive({ username: "", status: "", tenantId: undefined as number | undefined });
const tenantMap = computed(() => new Map(tenants.value.map((tenant) => [tenant.id, tenant])));

const summaryCards = computed(() => [
  { label: "登录成功", value: summary.value.success || 0, type: "success" },
  { label: "登录失败", value: summary.value.failed || 0, type: "danger" },
  { label: "触发限流", value: summary.value.rate_limited || 0, type: "warning" },
  { label: "当前筛选", value: total.value, type: "" }
]);

async function load() {
  const generation = ++loadGeneration.value;
  const snapshot = { username: query.username.trim(), status: query.status, tenantId: query.tenantId };
  loading.value = true;
  errorMessage.value = "";
  rows.value = [];
  summary.value = {};
  total.value = 0;
  try {
    const data = await api.get<any, LoginLogResult>("/admin/auth/login-logs", { params: snapshot });
    if (generation !== loadGeneration.value || snapshot.username !== query.username.trim() || snapshot.status !== query.status || snapshot.tenantId !== query.tenantId) return;
    if (!data || !Array.isArray(data.items) || !Number.isFinite(data.total) || !data.summary || typeof data.summary !== "object") throw new Error("登录日志响应格式异常");
    rows.value = data.items;
    summary.value = data.summary;
    total.value = Math.max(0, data.total);
  } catch (error: any) {
    if (generation !== loadGeneration.value || snapshot.username !== query.username.trim() || snapshot.status !== query.status || snapshot.tenantId !== query.tenantId) return;
    rows.value = [];
    summary.value = {};
    total.value = 0;
    errorMessage.value = error.message || "登录日志加载失败";
  } finally {
    if (generation === loadGeneration.value) loading.value = false;
  }
}

async function loadTenants() {
  const generation = ++tenantGeneration.value;
  tenantsLoading.value = true;
  tenantsErrorMessage.value = "";
  tenants.value = [];
  try {
    const result = await api.get<any, { tenants: any[] }>("/admin/auth/log-options");
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

function reset() {
  query.username = "";
  query.status = "";
  query.tenantId = undefined;
  load();
}

async function exportLogs() {
  if (!canExport.value || exporting.value) return;
  const snapshot = { username: query.username.trim(), status: query.status, tenantId: query.tenantId };
  exporting.value = true;
  try {
    const params = new URLSearchParams();
    if (snapshot.username) params.set("username", snapshot.username);
    if (snapshot.status) params.set("status", snapshot.status);
    if (snapshot.tenantId) params.set("tenantId", String(snapshot.tenantId));
    await downloadFile(`/admin/auth/login-logs/export?${params.toString()}`, "admin-login-logs.xlsx");
    ElMessage.success("后台登录日志已导出");
  } catch (error: any) {
    ElMessage.error(error.message || "后台登录日志导出失败");
  } finally {
    exporting.value = false;
  }
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function statusText(status: LoginLog["status"]) {
  return status === "success" ? "登录成功" : status === "failed" ? "登录失败" : "触发限流";
}

function statusType(status: LoginLog["status"]) {
  return status === "success" ? "success" : status === "failed" ? "danger" : "warning";
}

function reasonText(reason?: string | null) {
  if (reason === "invalid_username") return "账号不存在或已禁用";
  if (reason === "invalid_password") return "密码错误";
  if (reason === "too_many_failures") return "失败次数过多";
  return reason || "-";
}

function tenantDisplayName(row: LoginLog) {
  if (!row.tenantId) return "平台/未归属";
  const tenant = tenantMap.value.get(row.tenantId);
  return tenant ? `${tenant.name || tenant.code}（${tenant.code}）` : `商家 #${row.tenantId}`;
}

function applyTenantFromRoute() {
  const tenantId = Number(route.query.tenantId || 0);
  query.tenantId = Number.isFinite(tenantId) && tenantId > 0 ? tenantId : undefined;
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
      <h2>后台登录日志</h2>
      <div class="toolbar-actions"><el-button v-if="canExport" :loading="exporting" :disabled="loading || tenantsLoading" @click="exportLogs">导出</el-button><el-button :loading="loading" :disabled="tenantsLoading || exporting" @click="load">刷新</el-button></div>
    </div>

    <el-alert v-if="tenantsErrorMessage" class="page-error" type="error" show-icon :closable="false"><template #title><span>{{ tenantsErrorMessage }}</span></template><template #default><el-button size="small" :loading="tenantsLoading" :disabled="exporting" @click="loadTenants">重试商家选项</el-button></template></el-alert>
    <el-alert v-if="!canViewSensitive" class="page-error" type="info" show-icon :closable="false" title="终端信息已脱敏" description="IP 仅显示网段，浏览器信息已隐藏；导出遵循相同字段范围。" />

    <div class="metric-row">
      <div v-for="item in summaryCards" :key="item.label" class="metric">
        <span>{{ item.label }}</span>
        <strong :class="item.type">{{ item.value }}</strong>
      </div>
    </div>

    <div class="table-card">
      <el-alert v-if="errorMessage" type="error" show-icon :closable="false"><template #title><span>{{ errorMessage }}</span></template><template #default><el-button size="small" :disabled="interactionLocked" @click="load">重试</el-button></template></el-alert>
      <el-form :inline="true" :model="query" class="filters">
        <el-form-item label="账号">
          <el-input v-model="query.username" clearable placeholder="管理员账号" :disabled="interactionLocked" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 140px" :disabled="interactionLocked">
            <el-option label="登录成功" value="success" />
            <el-option label="登录失败" value="failed" />
            <el-option label="触发限流" value="rate_limited" />
          </el-select>
        </el-form-item>
        <el-form-item label="商家">
          <el-select v-model="query.tenantId" clearable filterable placeholder="全部商家" style="width: 220px" :disabled="interactionLocked">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" :disabled="exporting || tenantsLoading" @click="load">查询</el-button>
          <el-button :disabled="interactionLocked" @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="rows" stripe v-loading="loading" empty-text="暂无登录日志">
        <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="所属商家" width="190" show-overflow-tooltip><template #default="{ row }">{{ tenantDisplayName(row) }}</template></el-table-column>
        <el-table-column prop="username" label="账号" width="150" />
        <el-table-column prop="adminId" label="管理员ID" width="100" />
        <el-table-column prop="clientIp" label="IP" width="150" />
        <el-table-column label="状态" width="120"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="原因" width="160"><template #default="{ row }">{{ reasonText(row.failureReason) }}</template></el-table-column>
        <el-table-column v-if="canViewSensitive" prop="userAgent" label="浏览器" min-width="260" show-overflow-tooltip />
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.metric-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.metric { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
.metric span { display: block; color: #64748b; font-size: 13px; margin-bottom: 6px; }
.metric strong { font-size: 24px; color: #111827; }
.metric strong.success { color: #16a34a; }
.metric strong.warning { color: #d97706; }
.metric strong.danger { color: #dc2626; }
.filters { margin-bottom: 8px; }
.toolbar-actions { display: flex; gap: 8px; }
@media (max-width: 640px) {
  .page, .toolbar, .toolbar-actions, .table-card { min-width: 0; }
  .toolbar { align-items: flex-start; flex-direction: column; gap: 10px; }
  .metric-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filters :deep(.el-form-item), .filters :deep(.el-input), .filters :deep(.el-select) { width: 100% !important; }
}
</style>
