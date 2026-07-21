<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";
import { hasPermission } from "../permissions";
import { maskPhone } from "../privacy";

const canManage = computed(() => hasPermission("waitlist.manage"));
const canViewSensitive = computed(() => hasPermission("waitlist.sensitive"));
const permissionHint = computed(() => canManage.value
  ? `当前账号可查看并处理候补，${canViewSensitive.value ? "可查看完整报名信息" : "手机号和敏感报名信息固定脱敏"}。`
  : `当前账号仅可查看候补，${canViewSensitive.value ? "可查看完整报名信息" : "手机号和敏感报名信息固定脱敏"}。`);

const rows = ref<any[]>([]);
const activities = ref<any[]>([]);
const loading = ref(false);
const activitiesLoading = ref(false);
const errorMessage = ref("");
const activitiesError = ref("");
const actionId = ref<number | null>(null);
const listGeneration = ref(0);
const activitiesGeneration = ref(0);
const total = ref(0);
const query = reactive({ activityId: undefined as number | undefined, status: "waiting", page: 1, pageSize: 20 });
const scopeLocked = computed(() => loading.value || activitiesLoading.value || actionId.value !== null);

const statusText: Record<string, string> = {
  waiting: "候补中",
  promoted: "已补位",
  cancelled: "已取消"
};

function querySnapshot() {
  return { activityId: query.activityId, status: query.status, page: query.page, pageSize: query.pageSize };
}

function sameQuery(snapshot: ReturnType<typeof querySnapshot>) {
  return snapshot.activityId === query.activityId && snapshot.status === query.status && snapshot.page === query.page && snapshot.pageSize === query.pageSize;
}

async function load() {
  const generation = ++listGeneration.value;
  const snapshot = querySnapshot();
  loading.value = true;
  errorMessage.value = "";
  rows.value = [];
  total.value = 0;
  try {
    const result = await api.get<any, { items: any[]; total: number }>("/admin/waitlists", { params: snapshot });
    if (generation !== listGeneration.value || !sameQuery(snapshot)) return;
    if (!result || !Array.isArray(result.items) || !Number.isFinite(Number(result.total))) throw new Error("候补列表响应格式无效");
    rows.value = result.items;
    total.value = Number(result.total);
  } catch (error: any) {
    if (generation !== listGeneration.value || !sameQuery(snapshot)) return;
    rows.value = [];
    total.value = 0;
    errorMessage.value = error.message || "加载候补记录失败";
    ElMessage.error(errorMessage.value);
  } finally {
    if (generation === listGeneration.value) loading.value = false;
  }
}

async function loadActivities() {
  const generation = ++activitiesGeneration.value;
  activitiesLoading.value = true;
  activitiesError.value = "";
  activities.value = [];
  try {
    const result = await api.get<any, { activities: any[] }>("/admin/waitlists/options");
    if (generation !== activitiesGeneration.value) return;
    if (!result || !Array.isArray(result.activities)) throw new Error("活动选项响应格式无效");
    activities.value = result.activities;
  } catch (error: any) {
    if (generation !== activitiesGeneration.value) return;
    activities.value = [];
    activitiesError.value = error.message || "活动筛选项加载失败";
  } finally {
    if (generation === activitiesGeneration.value) activitiesLoading.value = false;
  }
}

async function promote(row: any) {
  if (!canManage.value || scopeLocked.value) return;
  const snapshot = querySnapshot();
  const generation = listGeneration.value;
  const target = rows.value.find(item => item.id === row.id);
  if (!target || target.status !== "waiting") return ElMessage.error("候补状态已变化，请刷新后重试");
  actionId.value = row.id;
  try {
    await ElMessageBox.confirm(`确认将 ${userText(row)} 从候补补位为正式报名？系统会重新检查名额和会员门槛，补位成功后用户端会看到正式报名记录。`, "候补补位", {
      type: "warning",
      confirmButtonText: "确认补位",
      cancelButtonText: "再核对一下"
    });
    const current = rows.value.find(item => item.id === row.id);
    if (!current || current.status !== "waiting" || generation !== listGeneration.value || !sameQuery(snapshot)) throw new Error("候补状态或筛选已变化，请刷新后重试");
    await api.post(`/admin/waitlists/${current.id}/promote`, {});
    ElMessage.success("已补位为报名记录");
    await load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "候补补位失败");
  } finally {
    actionId.value = null;
  }
}

async function cancel(row: any) {
  if (!canManage.value || scopeLocked.value) return;
  const snapshot = querySnapshot();
  const generation = listGeneration.value;
  const target = rows.value.find(item => item.id === row.id);
  if (!target || target.status !== "waiting") return ElMessage.error("候补状态已变化，请刷新后重试");
  actionId.value = row.id;
  try {
    const { value } = await ElMessageBox.prompt(`确认取消 ${userText(row)} 的候补资格？取消后不会自动恢复排队顺序。`, "取消候补", {
      inputValue: "后台取消候补",
      inputValidator: value => Boolean(String(value || "").trim()) || "请填写取消原因",
      confirmButtonText: "确认取消",
      cancelButtonText: "返回"
    });
    const current = rows.value.find(item => item.id === row.id);
    if (!current || current.status !== "waiting" || generation !== listGeneration.value || !sameQuery(snapshot)) throw new Error("候补状态或筛选已变化，请刷新后重试");
    await api.post(`/admin/waitlists/${current.id}/cancel`, { remark: String(value || "").trim() });
    ElMessage.success("已取消候补");
    await load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "取消候补失败");
  } finally {
    actionId.value = null;
  }
}

function userText(row: any) {
  const phone = canViewSensitive.value && !row.sensitiveMasked ? row.user?.phone : maskPhone(row.user?.phone);
  return phone || row.user?.nickname || `ID ${row.user?.id || "-"}`;
}

function answerText(row: any) {
  return (row.answers || [])
    .map((answer: any, index: number) => {
      const label = String(answer.label || answer.name || "").trim() || `报名信息 ${index + 1}`;
      const value = Array.isArray(answer.value) ? answer.value.join(", ") : answer.value;
      return `${label}: ${value || "-"}`;
    })
    .join("\n");
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function applyFilters() {
  query.page = 1;
  load();
}

onMounted(() => {
  Promise.allSettled([loadActivities(), load()]);
});
</script>

<template>
  <div class="page">
    <div class="toolbar"><h2>候补管理</h2></div>
    <el-alert class="page-hint" type="info" :closable="false" show-icon :title="permissionHint" />
    <el-alert v-if="activitiesError" class="page-hint" type="warning" :closable="false" show-icon :title="activitiesError"><template #default><el-button size="small" :loading="activitiesLoading" :disabled="loading || actionId !== null" @click="loadActivities">重试加载活动</el-button></template></el-alert>
    <div class="table-card">
      <el-alert v-if="errorMessage" class="page-hint" type="error" :closable="false" show-icon :title="errorMessage"><template #default><el-button size="small" :loading="loading" :disabled="activitiesLoading || actionId !== null" @click="load">重试候补列表</el-button></template></el-alert>
      <el-form class="filters" inline>
        <el-form-item label="活动">
          <el-select v-model="query.activityId" clearable filterable style="width: 280px" :disabled="scopeLocked" @change="applyFilters">
            <el-option v-for="activity in activities" :key="activity.id" :label="activity.title" :value="activity.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable style="width: 140px" :disabled="scopeLocked" @change="applyFilters">
            <el-option v-for="(text, key) in statusText" :key="key" :label="text" :value="key" />
          </el-select>
        </el-form-item>
        <el-button type="primary" :disabled="scopeLocked" @click="applyFilters">筛选</el-button>
      </el-form>

      <el-empty v-if="!loading && !rows.length && !errorMessage" description="暂无匹配候补记录">
        <el-button type="primary" @click="load">重新筛选</el-button>
      </el-empty>
      <el-table v-else v-loading="loading" :data="rows" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="活动" min-width="220" show-overflow-tooltip><template #default="{ row }">{{ row.activity?.title || "-" }}</template></el-table-column>
        <el-table-column label="用户" width="170"><template #default="{ row }">{{ userText(row) }}</template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag>{{ statusText[row.status] || row.status }}</el-tag></template></el-table-column>
        <el-table-column label="候补内容" min-width="280"><template #default="{ row }"><pre>{{ answerText(row) }}</pre></template></el-table-column>
        <el-table-column label="加入时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column v-if="canManage" label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" :loading="actionId === row.id" :disabled="row.status !== 'waiting' || (scopeLocked && actionId !== row.id)" @click="promote(row)">补位</el-button>
            <el-button size="small" type="warning" :disabled="row.status !== 'waiting' || scopeLocked" @click="cancel(row)">取消</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-if="total" v-model:current-page="query.page" v-model:page-size="query.pageSize" :disabled="scopeLocked" :total="total" :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next" @change="load" />
    </div>
  </div>
</template>

<style scoped>
.page-hint { margin-bottom: 14px; }
.filters { margin-bottom: 12px; }
pre { margin: 0; white-space: pre-wrap; font-family: inherit; line-height: 1.5; }
@media (max-width: 640px) {
  .filters { display: grid; grid-template-columns: minmax(0, 1fr); }
  .filters :deep(.el-form-item), .filters :deep(.el-select) { width: 100% !important; margin-right: 0; }
  .table-card { min-width: 0; overflow: hidden; }
  .table-card :deep(.el-table) { max-width: 100%; }
  .table-card :deep(.el-pagination) { justify-content: flex-start; overflow-x: auto; }
}
</style>
