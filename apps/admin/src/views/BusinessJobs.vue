<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { CircleClose, Refresh, RefreshRight, Search, VideoPlay } from "@element-plus/icons-vue";
import { api } from "../api";
import { hasPermission, isPlatformAdmin } from "../permissions";

type BusinessJob = {
  id: number;
  tenantId: number;
  type: string;
  idempotencyKey: string;
  status: string;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt?: string | null;
  lockedUntil?: string | null;
  lockedBy?: string | null;
  lastWorkerId?: string | null;
  lastStartedAt?: string | null;
  lastFinishedAt?: string | null;
  lastError?: string | null;
  requestId?: string | null;
  completedAt?: string | null;
  deadLetteredAt?: string | null;
  createdAt?: string | null;
};

const rows = ref<BusinessJob[]>([]);
const total = ref(0);
const loading = ref(false);
const errorMessage = ref("");
const actionError = ref("");
const runSummary = ref("");
const actionKey = ref("");
const loadGeneration = ref(0);
const filters = reactive({ status: "", type: "", keyword: "", page: 1, pageSize: 20 });
const statuses = ["pending", "processing", "completed", "dead_letter", "cancelled"];
const statusText: Record<string, string> = { pending: "待执行", processing: "执行中", completed: "已完成", dead_letter: "死信", cancelled: "已取消" };
const statusType: Record<string, string> = { pending: "warning", processing: "", completed: "success", dead_letter: "danger", cancelled: "info" };
const canManageJobs = computed(() => hasPermission("business_job.manage"));
const canRunDue = computed(() => isPlatformAdmin() && canManageJobs.value);
const showTenant = computed(() => isPlatformAdmin());

function safeJson(value: unknown) {
  if (value == null) return "-";
  try { return JSON.stringify(value, null, 2); } catch { return "[无法展示]"; }
}
function formatTime(value?: string | null) { return value ? value.replace("T", " ").slice(0, 19) : "-"; }
function search() { filters.page = 1; load(); }
function filterSnapshot() {
  return { status: filters.status, type: filters.type.trim(), keyword: filters.keyword.trim(), page: filters.page, pageSize: filters.pageSize };
}
function isCurrentSnapshot(snapshot: ReturnType<typeof filterSnapshot>) {
  const current = filterSnapshot();
  return Object.keys(snapshot).every((key) => snapshot[key as keyof typeof snapshot] === current[key as keyof typeof current]);
}
async function load() {
  const generation = ++loadGeneration.value;
  const snapshot = filterSnapshot();
  loading.value = true; errorMessage.value = ""; rows.value = []; total.value = 0;
  try {
    const result = await api.get<any, { items: BusinessJob[]; total: number; page: number; pageSize: number }>("/admin/business-jobs", { params: { ...snapshot, status: snapshot.status || undefined, type: snapshot.type || undefined, keyword: snapshot.keyword || undefined } });
    if (generation !== loadGeneration.value || !isCurrentSnapshot(snapshot)) return;
    if (!result || !Array.isArray(result.items) || !Number.isFinite(result.total) || !Number.isFinite(result.page) || !Number.isFinite(result.pageSize)) throw new Error("业务任务响应格式异常");
    rows.value = result.items; total.value = Math.max(0, result.total); filters.page = result.page; filters.pageSize = result.pageSize;
  } catch (error: any) {
    if (generation !== loadGeneration.value || !isCurrentSnapshot(snapshot)) return;
    rows.value = []; total.value = 0; errorMessage.value = error.message || "业务任务加载失败";
  } finally { if (generation === loadGeneration.value) loading.value = false; }
}
async function confirmAction(row: BusinessJob, action: "cancel" | "replay") {
  if (!canManageJobs.value) return ElMessage.error("当前账号无业务任务处理权限");
  const key = `${action}:${row.id}`; if (actionKey.value) return; actionKey.value = key;
  const generation = loadGeneration.value;
  const snapshot = filterSnapshot();
  const expectedStatus = row.status;
  actionError.value = "";
  try {
    await ElMessageBox.confirm(action === "replay" ? `确认重放死信任务 #${row.id}？任务将重新进入待执行队列。` : `确认取消任务 #${row.id}？`, action === "replay" ? "重放任务" : "取消任务", { type: "warning", confirmButtonText: "确认", cancelButtonText: "取消" });
    const current = rows.value.find((item) => item.id === row.id);
    if (!current || current.status !== expectedStatus || generation !== loadGeneration.value || !isCurrentSnapshot(snapshot)) throw new Error("任务状态或筛选范围已变化，请刷新后重试");
    if (action === "replay" && current.status !== "dead_letter") throw new Error("仅死信任务可以重放");
    if (action === "cancel" && !["pending", "dead_letter"].includes(current.status)) throw new Error("当前任务状态不可取消");
    const result = await api.post<any, BusinessJob & { operationApplied?: boolean }>(`/admin/business-jobs/${row.id}/${action}`);
    ElMessage.success(result.operationApplied === false ? "任务状态已由其他操作更新" : action === "replay" ? "任务已重放" : "任务已取消"); await load();
  } catch (error: any) { if (error !== "cancel" && error !== "close") actionError.value = error.message || "操作失败"; }
  finally { actionKey.value = ""; }
}
async function runDue() {
  if (!canRunDue.value) return ElMessage.error("当前账号无平台任务扫描权限");
  if (actionKey.value) return; actionKey.value = "run-due";
  const generation = loadGeneration.value;
  const snapshot = filterSnapshot();
  actionError.value = ""; runSummary.value = "";
  try { await ElMessageBox.confirm("确认立即扫描并执行到期业务任务？", "手工执行任务", { type: "warning" }); if (generation !== loadGeneration.value || !isCurrentSnapshot(snapshot)) throw new Error("任务筛选范围已变化，请刷新后重试"); const result = await api.post<any, { scanned: number; completed: number; failed: number }>("/admin/business-jobs/run-due"); runSummary.value = `扫描 ${result.scanned} 条，完成 ${result.completed} 条，失败 ${result.failed} 条`; ElMessage.success("任务扫描完成"); await load(); }
  catch (error: any) { if (error !== "cancel" && error !== "close") actionError.value = error.message || "执行失败"; }
  finally { actionKey.value = ""; }
}
onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar"><h2>业务任务</h2><div class="toolbar-actions"><el-button v-if="canRunDue" type="primary" :icon="VideoPlay" :loading="actionKey === 'run-due'" @click="runDue">执行到期任务</el-button><el-button :icon="Refresh" :loading="loading" :disabled="Boolean(actionKey)" @click="load">刷新</el-button></div></div>
    <el-alert v-if="errorMessage" class="page-error" type="error" show-icon :closable="false"><template #title><span>{{ errorMessage }}</span></template><template #default><el-button size="small" :disabled="loading || Boolean(actionKey)" @click="load">重试</el-button></template></el-alert>
    <el-alert v-if="actionError" class="page-error" type="error" show-icon :closable="false" :title="actionError" />
    <el-alert v-if="runSummary" class="page-error" type="success" show-icon :closable="false" title="最近一次手工扫描已完成" :description="runSummary" />
    <el-alert v-if="!canManageJobs" class="page-error" type="info" show-icon :closable="false" title="当前账号为只读任务观察员" description="可查看任务状态、重试次数、错误和脱敏详情，不能重放、取消或手工执行任务。" />
    <div class="filter-bar"><el-select v-model="filters.status" clearable placeholder="全部状态" :disabled="loading || Boolean(actionKey)" @change="search"><el-option v-for="status in statuses" :key="status" :label="statusText[status]" :value="status" /></el-select><el-input v-model="filters.type" clearable maxlength="80" placeholder="任务类型" :disabled="loading || Boolean(actionKey)" @keyup.enter="search" /><el-input v-model="filters.keyword" clearable maxlength="200" placeholder="幂等键、请求编号或错误" :disabled="loading || Boolean(actionKey)" @keyup.enter="search" /><el-button type="primary" :icon="Search" :loading="loading" :disabled="Boolean(actionKey)" @click="search">查询</el-button></div>
    <div class="table-card"><el-table :data="rows" stripe v-loading="loading" empty-text="暂无业务任务" row-key="id">
      <el-table-column type="expand"><template #default="{ row }"><div class="detail"><div class="detail-meta"><b>执行信息</b><dl><dt>请求编号</dt><dd>{{ row.requestId || "-" }}</dd><dt>最近 Worker</dt><dd>{{ row.lastWorkerId || "-" }}</dd><dt>开始时间</dt><dd>{{ formatTime(row.lastStartedAt) }}</dd><dt>结束时间</dt><dd>{{ formatTime(row.lastFinishedAt) }}</dd><dt>当前锁</dt><dd>{{ row.lockedBy || "-" }} / {{ formatTime(row.lockedUntil) }}</dd><dt>死信时间</dt><dd>{{ formatTime(row.deadLetteredAt) }}</dd></dl></div><div><b>Payload</b><pre>{{ safeJson(row.payload) }}</pre></div><div><b>Result</b><pre>{{ safeJson(row.result) }}</pre></div><div v-if="row.lastError"><b>错误</b><pre class="error-text">{{ row.lastError }}</pre></div></div></template></el-table-column>
      <el-table-column prop="id" label="编号" width="80" /><el-table-column v-if="showTenant" prop="tenantId" label="商家ID" width="90" /><el-table-column prop="type" label="类型" min-width="170" show-overflow-tooltip /><el-table-column prop="idempotencyKey" label="幂等键" min-width="190" show-overflow-tooltip /><el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="statusType[row.status] as any">{{ statusText[row.status] || row.status }}</el-tag></template></el-table-column><el-table-column label="重试" width="90"><template #default="{ row }">{{ row.attemptCount }} / {{ row.maxAttempts }}</template></el-table-column><el-table-column label="最近 Worker" min-width="130" show-overflow-tooltip><template #default="{ row }">{{ row.lastWorkerId || "-" }}</template></el-table-column><el-table-column label="下次执行" width="170"><template #default="{ row }">{{ formatTime(row.nextAttemptAt) }}</template></el-table-column><el-table-column label="创建时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column><el-table-column v-if="canManageJobs" label="操作" width="180" fixed="right"><template #default="{ row }"><el-button v-if="row.status === 'dead_letter'" link type="primary" :icon="RefreshRight" :loading="actionKey === `replay:${row.id}`" :disabled="Boolean(actionKey) && actionKey !== `replay:${row.id}`" @click="confirmAction(row, 'replay')">重放</el-button><el-button v-if="['pending', 'dead_letter'].includes(row.status)" link type="danger" :icon="CircleClose" :loading="actionKey === `cancel:${row.id}`" :disabled="Boolean(actionKey) && actionKey !== `cancel:${row.id}`" @click="confirmAction(row, 'cancel')">取消</el-button></template></el-table-column>
    </el-table><el-pagination v-model:current-page="filters.page" v-model:page-size="filters.pageSize" :disabled="loading || Boolean(actionKey)" :total="total" :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next" @change="load" /></div>
  </div>
</template>
<style scoped>
.toolbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }.toolbar-actions { display:flex; gap:10px; }.filter-bar { display:grid; grid-template-columns:180px 220px minmax(240px, 1fr) auto; gap:10px; margin-bottom:14px; }.detail { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; padding:6px 28px 12px; }.detail pre { white-space:pre-wrap; word-break:break-word; background:#f6f8fa; padding:10px; max-height:240px; overflow:auto; }.detail-meta dl { display:grid; grid-template-columns:90px minmax(0,1fr); gap:8px 12px; margin:10px 0 0; }.detail-meta dt { color:#64748b; }.detail-meta dd { margin:0; min-width:0; overflow-wrap:anywhere; }.error-text { color:#b42318; }:deep(.el-pagination) { margin-top:14px; justify-content:flex-end; } @media (max-width:900px) { .toolbar { align-items:flex-start; flex-direction:column; gap:12px; }.filter-bar,.detail { grid-template-columns:1fr; } }
</style>
