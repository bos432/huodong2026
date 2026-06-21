<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { api } from "../api";

type TenantBrief = { id?: number; code?: string | null; name?: string | null; region?: string | null; enabled?: boolean };
type Tenant = TenantBrief & { id: number };
type TenantRegionHitLog = {
  id: number;
  matched: boolean;
  tenant?: Tenant | null;
  region?: { id: number; name: string; province?: string | null; city?: string | null; district?: string | null } | null;
  latitude: number;
  longitude: number;
  distanceMeters?: number | null;
  source?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
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
const loading = ref(false);
const filters = reactive({ tenantId: 0, matched: "", source: "", dateRange: [] as string[], page: 1, pageSize: 20 });

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
  return `https://uri.amap.com/marker?position=${row.longitude},${row.latitude}&name=${encodeURIComponent(row.region?.name || "定位点")}`;
}

function buildParams(includePage = true) {
  const params: Record<string, string | number> = includePage ? { page: filters.page, pageSize: filters.pageSize } : {};
  if (filters.tenantId) params.tenantId = filters.tenantId;
  if (filters.matched) params.matched = filters.matched;
  if (filters.source.trim()) params.source = filters.source.trim();
  if (filters.dateRange?.[0]) params.startDate = filters.dateRange[0];
  if (filters.dateRange?.[1]) params.endDate = filters.dateRange[1];
  return params;
}

async function load() {
  loading.value = true;
  try {
    const [tenantRows, result, summaryResult] = await Promise.all([
      api.get<any, Tenant[]>("/admin/tenants"),
      api.get<any, { items: TenantRegionHitLog[]; total: number; page: number; pageSize: number }>("/admin/tenant-region-hit-logs", { params: buildParams() }),
      api.get<any, TenantRegionHitLogSummary>("/admin/tenant-region-hit-logs/summary", { params: buildParams(false) })
    ]);
    tenants.value = tenantRows;
    rows.value = result.items || [];
    summary.value = summaryResult || emptySummary();
    total.value = result.total || 0;
  } catch (error: any) {
    ElMessage.error(error.message || "加载定位命中日志失败");
  } finally {
    loading.value = false;
  }
}

function search() {
  filters.page = 1;
  load();
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="hero">
      <div>
        <span>LOCATION HIT LOGS</span>
        <h2>定位命中日志</h2>
        <p>查看公开端定位解析记录，核对用户坐标是否命中正确商家和区域。</p>
      </div>
      <el-button type="primary" @click="load">刷新</el-button>
    </div>

    <div v-loading="loading" class="summary-grid">
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
        <el-select v-model="filters.tenantId" clearable filterable placeholder="全部商家" @change="search">
          <el-option :value="0" label="全部商家" />
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.matched" clearable placeholder="命中状态" @change="search">
          <el-option label="全部状态" value="" />
          <el-option label="已命中" value="true" />
          <el-option label="未命中" value="false" />
        </el-select>
        <el-date-picker v-model="filters.dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" @change="search" />
        <el-input v-model="filters.source" clearable placeholder="来源 source" @keyup.enter="search" />
        <el-button @click="search">查询</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" row-key="id">
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
            <div>{{ row.latitude }}, {{ row.longitude }}</div>
            <el-button link type="primary" tag="a" :href="mapUrl(row)" target="_blank">看地图</el-button>
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
            <small>{{ row.userAgent || "-" }}</small>
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
        @current-change="load"
        @size-change="search"
      />
    </el-card>
  </div>
</template>

<style scoped>
.page { display: grid; gap: 16px; }
.hero { display: flex; justify-content: space-between; align-items: center; gap: 18px; padding: 22px; border-radius: 8px; background: linear-gradient(135deg, #11352f, #22604f 58%, #d39a42); color: #fff; box-shadow: 0 16px 40px rgba(17,53,47,.18); }
.hero span { font-size: 12px; letter-spacing: 0; opacity: .72; }
.hero h2 { margin: 6px 0 8px; font-size: 26px; }
.hero p { margin: 0; max-width: 760px; color: rgba(255,255,255,.86); line-height: 1.7; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.metric { min-height: 96px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.metric span { display: block; color: #64748b; font-size: 13px; }
.metric strong { margin-top: 8px; font-size: 28px; color: #0f172a; }
.metric small { margin-top: 8px; }
.summary-panel { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; min-height: 32px; margin-bottom: 8px; }
.section-head h3 { margin: 0; font-size: 15px; color: #0f172a; }
.section-head span { color: #64748b; font-size: 12px; white-space: nowrap; }
.toolbar { display: grid; grid-template-columns: minmax(220px, 1.1fr) minmax(140px, .6fr) minmax(260px, 1fr) minmax(160px, .8fr) auto; gap: 10px; margin-bottom: 14px; }
strong { display: block; color: #0f172a; }
small { display: block; margin-top: 4px; color: #64748b; line-height: 1.5; word-break: break-all; }
.pager { justify-content: flex-end; margin-top: 14px; }
@media (max-width: 900px) {
  .hero { align-items: stretch; flex-direction: column; }
  .summary-grid,
  .summary-panel,
  .toolbar { grid-template-columns: 1fr; }
}
</style>
