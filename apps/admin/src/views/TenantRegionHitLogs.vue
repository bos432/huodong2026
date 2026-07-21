<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { api, downloadFile } from "../api";
import { canAccess } from "../permissions";

type TenantBrief = { id?: number; code?: string | null; name?: string | null; region?: string | null; enabled?: boolean };
type Tenant = TenantBrief & { id: number };
type TenantRegionHitLog = {
  id: number;
  matched: boolean;
  tenant?: Tenant | null;
  region?: { id: number; name: string; province?: string | null; city?: string | null; district?: string | null } | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceMeters?: number | null;
  source?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  sensitiveMasked?: boolean;
  createdAt: string;
};
type TenantRegionHitLogSummary = {
  total: number;
  matched: number;
  unmatched: number;
  matchRate: number;
  sources: Array<{ source: string; count: number; matchedCount: number; matchRate: number }>;
  tenants: Array<{ tenant: TenantBrief; count: number; share: number }>;
  regions: Array<{ region: { id: number; name: string; province?: string | null; city?: string | null; district?: string | null }; tenant: TenantBrief; count: number; share: number }>;
};

const tenants = ref<Tenant[]>([]);
const rows = ref<TenantRegionHitLog[]>([]);
const summary = ref<TenantRegionHitLogSummary>(emptySummary());
const total = ref(0);
const optionsLoading = ref(false);
const listLoading = ref(false);
const summaryLoading = ref(false);
const optionsError = ref("");
const listError = ref("");
const summaryError = ref("");
const exportError = ref("");
const exporting = ref(false);
const optionsGeneration = ref(0);
const listGeneration = ref(0);
const summaryGeneration = ref(0);
const filters = reactive({ tenantId: 0, matched: "", source: "", dateRange: [] as string[], page: 1, pageSize: 20 });
const canViewSensitive = computed(() => canAccess(["tenant_region_hit_log.sensitive"]));
const canExport = computed(() => canAccess(["tenant_region_hit_log.export"]));
const loading = computed(() => optionsLoading.value || listLoading.value || summaryLoading.value);
const interactionLocked = computed(() => loading.value || exporting.value);

function emptySummary(): TenantRegionHitLogSummary {
  return { total: 0, matched: 0, unmatched: 0, matchRate: 0, sources: [], tenants: [], regions: [] };
}

function tenantLabel(tenant?: TenantBrief | null) {
  if (!tenant) return "未命中商家";
  const region = tenant.region ? `${tenant.region} · ` : "";
  return `${region}${tenant.name || tenant.code || "未命名商家"}${tenant.code ? `（${tenant.code}）` : ""}`;
}

function regionLabel(row: TenantRegionHitLog) {
  return regionBriefLabel(row.region);
}

function regionBriefLabel(region?: TenantRegionHitLog["region"]) {
  if (!region) return "无匹配区域";
  const area = [region.province, region.city, region.district].filter(Boolean).join(" / ");
  return area ? `${region.name} · ${area}` : region.name;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function formatDistance(value?: number | null) {
  if (value === undefined || value === null) return "-";
  return `${Math.round(Number(value))} 米`;
}

function formatRate(value?: number | null) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function formatCount(value?: number | null) {
  return Number(value || 0).toLocaleString("zh-CN");
}

function mapUrl(row: TenantRegionHitLog) {
  if (row.longitude === null || row.longitude === undefined || row.latitude === null || row.latitude === undefined) return "";
  return `https://uri.amap.com/marker?position=${row.longitude},${row.latitude}&name=${encodeURIComponent(row.region?.name || "定位点")}`;
}

function filterSnapshot() {
  return { tenantId: filters.tenantId, matched: filters.matched, source: filters.source.trim(), dateRange: [...filters.dateRange], page: filters.page, pageSize: filters.pageSize };
}

function isCurrentSnapshot(snapshot: ReturnType<typeof filterSnapshot>) {
  return JSON.stringify(snapshot) === JSON.stringify(filterSnapshot());
}

function buildParams(snapshot: ReturnType<typeof filterSnapshot>, includePage = true) {
  const params: Record<string, string | number> = includePage ? { page: snapshot.page, pageSize: snapshot.pageSize } : {};
  if (snapshot.tenantId) params.tenantId = snapshot.tenantId;
  if (snapshot.matched) params.matched = snapshot.matched;
  if (snapshot.source) params.source = snapshot.source;
  if (snapshot.dateRange?.[0]) params.startDate = snapshot.dateRange[0];
  if (snapshot.dateRange?.[1]) params.endDate = snapshot.dateRange[1];
  return params;
}

async function loadOptions() {
  const generation = ++optionsGeneration.value;
  optionsLoading.value = true;
  optionsError.value = "";
  tenants.value = [];
  try {
    const tenantRows = await api.get<any, Tenant[]>("/admin/tenant-region-hit-logs/options");
    if (generation !== optionsGeneration.value) return;
    if (!Array.isArray(tenantRows)) throw new Error("商家选项响应格式异常");
    tenants.value = tenantRows;
  } catch (error: any) {
    if (generation !== optionsGeneration.value) return;
    tenants.value = [];
    optionsError.value = error.message || "商家选项加载失败";
  } finally { if (generation === optionsGeneration.value) optionsLoading.value = false; }
}

async function loadList() {
  const generation = ++listGeneration.value;
  const snapshot = filterSnapshot();
  listLoading.value = true;
  listError.value = "";
  rows.value = [];
  total.value = 0;
  try {
    const result = await api.get<any, { items: TenantRegionHitLog[]; total: number; page: number; pageSize: number }>("/admin/tenant-region-hit-logs", { params: buildParams(snapshot) });
    if (generation !== listGeneration.value || !isCurrentSnapshot(snapshot)) return;
    if (!result || !Array.isArray(result.items) || !Number.isFinite(result.total)) throw new Error("定位日志响应格式异常");
    rows.value = result.items || [];
    total.value = Math.max(0, result.total);
  } catch (error: any) {
    if (generation !== listGeneration.value || !isCurrentSnapshot(snapshot)) return;
    rows.value = [];
    total.value = 0;
    listError.value = error.message || "定位日志加载失败";
  } finally { if (generation === listGeneration.value) listLoading.value = false; }
}

async function loadSummary() {
  const generation = ++summaryGeneration.value;
  const snapshot = filterSnapshot();
  summaryLoading.value = true;
  summaryError.value = "";
  summary.value = emptySummary();
  try {
    const result = await api.get<any, TenantRegionHitLogSummary>("/admin/tenant-region-hit-logs/summary", { params: buildParams(snapshot, false) });
    if (generation !== summaryGeneration.value || !isCurrentSnapshot(snapshot)) return;
    if (!result || !Number.isFinite(result.total) || !Array.isArray(result.sources) || !Array.isArray(result.tenants) || !Array.isArray(result.regions)) throw new Error("定位汇总响应格式异常");
    summary.value = result;
  } catch (error: any) {
    if (generation !== summaryGeneration.value || !isCurrentSnapshot(snapshot)) return;
    summary.value = emptySummary();
    summaryError.value = error.message || "定位汇总加载失败";
  } finally { if (generation === summaryGeneration.value) summaryLoading.value = false; }
}

async function load() {
  await Promise.allSettled([loadOptions(), loadList(), loadSummary()]);
}

function search() {
  if (loading.value) return;
  if (filters.dateRange?.[0] && filters.dateRange?.[1] && filters.dateRange[0] > filters.dateRange[1]) {
    rows.value = [];
    total.value = 0;
    summary.value = emptySummary();
    listError.value = "开始日期必须早于结束日期";
    return;
  }
  filters.page = 1;
  void Promise.allSettled([loadList(), loadSummary()]);
}

async function exportRows() {
  if (!canExport.value || exporting.value) return;
  const snapshot = filterSnapshot();
  exporting.value = true;
  exportError.value = "";
  try {
    const params = new URLSearchParams(buildParams(snapshot, false) as Record<string, string>).toString();
    await downloadFile(`/admin/tenant-region-hit-logs/export${params ? `?${params}` : ""}`, "定位命中日志.xlsx");
    ElMessage.success("定位命中日志已导出");
  } catch (error: any) {
    exportError.value = error.message || "导出定位命中日志失败";
  } finally {
    exporting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>定位命中日志</h2>
        <p>查看公开端定位解析记录，核对用户坐标是否命中正确商家和区域。</p>
      </div>
      <div class="header-actions">
        <el-button v-if="canExport" :loading="exporting" :disabled="loading" @click="exportRows">导出 Excel</el-button>
        <el-button type="primary" :loading="loading" :disabled="exporting" @click="load">刷新</el-button>
      </div>
    </div>

    <el-alert v-if="optionsError" type="error" show-icon :closable="false"><template #title><span>{{ optionsError }}</span></template><template #default><el-button size="small" :loading="optionsLoading" :disabled="exporting" @click="loadOptions">重试商家选项</el-button></template></el-alert>
    <el-alert v-if="summaryError" type="error" show-icon :closable="false"><template #title><span>{{ summaryError }}</span></template><template #default><el-button size="small" :loading="summaryLoading" :disabled="exporting" @click="loadSummary">重试定位汇总</el-button></template></el-alert>
    <el-alert v-if="listError" type="error" show-icon :closable="false"><template #title><span>{{ listError }}</span></template><template #default><el-button size="small" :loading="listLoading" :disabled="exporting" @click="loadList">重试定位日志</el-button></template></el-alert>
    <el-alert v-if="exportError" type="error" show-icon :closable="false" :title="exportError" />
    <el-alert v-if="!canViewSensitive" type="info" show-icon :closable="false" title="当前账号为脱敏查看模式，精确坐标、地图入口和完整 User-Agent 已隐藏。" />

    <div v-loading="summaryLoading" class="summary-grid">
      <div class="metric">
        <span>定位请求</span>
        <strong>{{ formatCount(summary.total) }}</strong>
        <small>当前筛选范围内的解析次数</small>
      </div>
      <div class="metric">
        <span>成功命中</span>
        <strong>{{ formatCount(summary.matched) }}</strong>
        <small>匹配到商家或区域的次数</small>
      </div>
      <div class="metric">
        <span>未命中</span>
        <strong>{{ formatCount(summary.unmatched) }}</strong>
        <small>需核对区域覆盖或引导手动选择</small>
      </div>
      <div class="metric">
        <span>命中率</span>
        <strong>{{ formatRate(summary.matchRate) }}</strong>
        <small>成功命中 / 定位请求</small>
      </div>
    </div>

    <div class="summary-panel">
      <section>
        <div class="section-head">
          <h3>命中商家 Top</h3>
          <span>{{ formatCount(summary.matched) }} 次命中</span>
        </div>
        <el-table :data="summary.tenants" size="small" empty-text="暂无命中商家">
          <el-table-column label="商家" min-width="180">
            <template #default="{ row }">{{ tenantLabel(row.tenant) }}</template>
          </el-table-column>
          <el-table-column label="次数" width="90">
            <template #default="{ row }">{{ formatCount(row.count) }}</template>
          </el-table-column>
          <el-table-column label="占比" width="90">
            <template #default="{ row }">{{ formatRate(row.share) }}</template>
          </el-table-column>
        </el-table>
      </section>
      <section>
        <div class="section-head">
          <h3>命中区域 Top</h3>
          <span>按区域围栏聚合</span>
        </div>
        <el-table :data="summary.regions" size="small" empty-text="暂无命中区域">
          <el-table-column label="区域" min-width="180">
            <template #default="{ row }">{{ regionBriefLabel(row.region) }}</template>
          </el-table-column>
          <el-table-column label="商家" min-width="140">
            <template #default="{ row }">{{ tenantLabel(row.tenant) }}</template>
          </el-table-column>
          <el-table-column label="次数" width="90">
            <template #default="{ row }">{{ formatCount(row.count) }}</template>
          </el-table-column>
        </el-table>
      </section>
      <section>
        <div class="section-head">
          <h3>来源分布</h3>
          <span>按 source 聚合</span>
        </div>
        <el-table :data="summary.sources" size="small" empty-text="暂无来源数据">
          <el-table-column label="来源" min-width="150">
            <template #default="{ row }">{{ row.source || "public_tenant_resolve" }}</template>
          </el-table-column>
          <el-table-column label="次数" width="90">
            <template #default="{ row }">{{ formatCount(row.count) }}</template>
          </el-table-column>
          <el-table-column label="命中率" width="90">
            <template #default="{ row }">{{ formatRate(row.matchRate) }}</template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <el-card shadow="never">
      <div class="toolbar">
        <el-select v-model="filters.tenantId" clearable filterable placeholder="全部商家" :disabled="interactionLocked" @change="search">
          <el-option :value="0" label="全部商家" />
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.matched" clearable placeholder="命中状态" :disabled="interactionLocked" @change="search">
          <el-option label="全部状态" value="" />
          <el-option label="已命中" value="true" />
          <el-option label="未命中" value="false" />
        </el-select>
        <el-date-picker v-model="filters.dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" :disabled="interactionLocked" @change="search" />
        <el-input v-model="filters.source" clearable placeholder="来源 source" :disabled="interactionLocked" @keyup.enter="search" />
        <el-button :loading="loading" :disabled="exporting" @click="search">查询</el-button>
      </div>

      <el-table v-loading="listLoading" :data="rows" row-key="id">
        <el-table-column label="时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="结果" width="100">
          <template #default="{ row }"><el-tag :type="row.matched ? 'success' : 'info'">{{ row.matched ? "已命中" : "未命中" }}</el-tag></template>
        </el-table-column>
        <el-table-column label="商家" min-width="220">
          <template #default="{ row }">{{ tenantLabel(row.tenant) }}</template>
        </el-table-column>
        <el-table-column label="区域" min-width="220">
          <template #default="{ row }">{{ regionLabel(row) }}</template>
        </el-table-column>
        <el-table-column label="定位坐标" min-width="180">
          <template #default="{ row }">
            <template v-if="canViewSensitive && row.latitude !== null && row.longitude !== null">
              <div>{{ row.latitude }}, {{ row.longitude }}</div>
              <el-button link type="primary" tag="a" :href="mapUrl(row)" target="_blank" rel="noopener noreferrer">看地图</el-button>
            </template>
            <span v-else class="masked-value">已隐藏</span>
          </template>
        </el-table-column>
        <el-table-column label="距离" width="110">
          <template #default="{ row }">{{ formatDistance(row.distanceMeters) }}</template>
        </el-table-column>
        <el-table-column label="来源" width="150">
          <template #default="{ row }">{{ row.source || "public_tenant_resolve" }}</template>
        </el-table-column>
        <el-table-column label="客户端" min-width="240">
          <template #default="{ row }">
            <strong>{{ row.clientIp || "-" }}</strong>
            <small>{{ canViewSensitive ? (row.userAgent || "-") : "完整终端信息已隐藏" }}</small>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="pager"
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        v-model:current-page="filters.page"
        v-model:page-size="filters.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :disabled="interactionLocked"
        @current-change="loadList"
        @size-change="search"
      />
    </el-card>
  </div>
</template>

<style scoped>
.page { display: grid; gap: 16px; min-width: 0; }
.page > * { min-width: 0; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.page-header h2 { margin: 0 0 6px; color: #0f172a; font-size: 24px; }
.page-header p { margin: 0; max-width: 760px; color: #64748b; line-height: 1.6; }
.header-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.metric { min-height: 96px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.metric span { display: block; color: #64748b; font-size: 13px; }
.metric strong { margin-top: 8px; font-size: 28px; color: #0f172a; }
.metric small { margin-top: 8px; }
.summary-panel { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.summary-panel > section { min-width: 0; }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; min-height: 32px; margin-bottom: 8px; }
.section-head h3 { margin: 0; font-size: 15px; color: #0f172a; }
.section-head span { color: #64748b; font-size: 12px; white-space: nowrap; }
.toolbar { display: grid; grid-template-columns: minmax(220px, 1.1fr) minmax(140px, .6fr) minmax(260px, 1fr) minmax(160px, .8fr) auto; gap: 10px; min-width: 0; margin-bottom: 14px; }
.toolbar > * { min-width: 0; }
:deep(.toolbar .el-date-editor), :deep(.toolbar .el-select), :deep(.toolbar .el-input) { width: 100%; }
.masked-value { color: #94a3b8; }
strong { display: block; color: #0f172a; }
small { display: block; margin-top: 4px; color: #64748b; line-height: 1.5; word-break: break-all; }
.pager { max-width: 100%; justify-content: flex-end; margin-top: 14px; overflow-x: auto; }
@media (max-width: 900px) {
  .page-header { align-items: stretch; flex-direction: column; }
  .header-actions { justify-content: flex-start; }
  .summary-grid,
  .summary-panel,
  .toolbar { grid-template-columns: 1fr; }
}
</style>
