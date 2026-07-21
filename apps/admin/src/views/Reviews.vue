<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";
import { maskPhone } from "../privacy";
import { hasPermission } from "../permissions";

const canManage = computed(() => hasPermission("review.manage"));
const canViewSensitive = computed(() => hasPermission("review.sensitive"));
const permissionHint = computed(() => canManage.value
  ? `当前账号可查看并处置评价和举报，${canViewSensitive.value ? "可查看完整会员手机号" : "会员手机号固定脱敏"}。`
  : `当前账号仅可查看评价和举报，${canViewSensitive.value ? "可查看完整会员手机号" : "会员手机号固定脱敏"}。`);

const route = useRoute();
const router = useRouter();
const rows = ref<any[]>([]);
const reports = ref<any[]>([]);
const activities = ref<any[]>([]);
const reviewLoading = ref(false);
const reportLoading = ref(false);
const optionsLoading = ref(false);
const reviewError = ref("");
const reportError = ref("");
const optionsError = ref("");
const reviewActionId = ref<number | null>(null);
const reportActionId = ref<number | null>(null);
const reviewGeneration = ref(0);
const reportGeneration = ref(0);
const optionsGeneration = ref(0);
const reviewPage = ref(1);
const reviewTotal = ref(0);
const reportPage = ref(1);
const reportTotal = ref(0);
const pageSize = 20;
const status = ref("");
const activityId = ref<number | undefined>(routeActivityId());
const scopeLocked = computed(() => reviewLoading.value || reportLoading.value || optionsLoading.value || reviewActionId.value !== null || reportActionId.value !== null);

function reviewQuerySnapshot() {
  return { status: status.value, activityId: activityId.value, page: reviewPage.value, pageSize };
}

function sameReviewQuery(snapshot: ReturnType<typeof reviewQuerySnapshot>) {
  return snapshot.status === status.value && snapshot.activityId === activityId.value && snapshot.page === reviewPage.value;
}

function reportQuerySnapshot() {
  return { status: "pending", page: reportPage.value, pageSize };
}

function sameReportQuery(snapshot: ReturnType<typeof reportQuerySnapshot>) {
  return snapshot.page === reportPage.value;
}

async function loadReviews() {
  const generation = ++reviewGeneration.value;
  const snapshot = reviewQuerySnapshot();
  reviewLoading.value = true;
  reviewError.value = "";
  rows.value = [];
  reviewTotal.value = 0;
  try {
    const result = await api.get<any, { items: any[]; total: number }>("/admin/reviews", { params: { ...snapshot, status: snapshot.status || undefined, activityId: snapshot.activityId || undefined } });
    if (generation !== reviewGeneration.value || !sameReviewQuery(snapshot)) return;
    if (!result || !Array.isArray(result.items) || !Number.isFinite(Number(result.total))) throw new Error("评价列表响应格式无效");
    rows.value = result.items;
    reviewTotal.value = Number(result.total);
  } catch (error: any) {
    if (generation !== reviewGeneration.value || !sameReviewQuery(snapshot)) return;
    rows.value = [];
    reviewTotal.value = 0;
    reviewError.value = error.message || "评价数据加载失败";
  } finally {
    if (generation === reviewGeneration.value) reviewLoading.value = false;
  }
}

async function loadReports() {
  const generation = ++reportGeneration.value;
  const snapshot = reportQuerySnapshot();
  reportLoading.value = true;
  reportError.value = "";
  reports.value = [];
  reportTotal.value = 0;
  try {
    const result = await api.get<any, { items: any[]; total: number }>("/admin/review-reports", { params: snapshot });
    if (generation !== reportGeneration.value || !sameReportQuery(snapshot)) return;
    if (!result || !Array.isArray(result.items) || !Number.isFinite(Number(result.total))) throw new Error("举报列表响应格式无效");
    reports.value = result.items;
    reportTotal.value = Number(result.total);
  } catch (error: any) {
    if (generation !== reportGeneration.value || !sameReportQuery(snapshot)) return;
    reports.value = [];
    reportTotal.value = 0;
    reportError.value = error.message || "举报数据加载失败";
  } finally {
    if (generation === reportGeneration.value) reportLoading.value = false;
  }
}

async function loadOptions() {
  const generation = ++optionsGeneration.value;
  optionsLoading.value = true;
  optionsError.value = "";
  activities.value = [];
  try {
    const result = await api.get<any, { activities: any[] }>("/admin/reviews/options");
    if (generation !== optionsGeneration.value) return;
    if (!result || !Array.isArray(result.activities)) throw new Error("活动选项响应格式无效");
    activities.value = result.activities;
  } catch (error: any) {
    if (generation !== optionsGeneration.value) return;
    activities.value = [];
    optionsError.value = error.message || "活动筛选项加载失败";
  } finally {
    if (generation === optionsGeneration.value) optionsLoading.value = false;
  }
}

async function load() {
  await Promise.allSettled([loadOptions(), loadReviews(), loadReports()]);
}

async function toggleFeatured(row: any) {
  if (!canManage.value || scopeLocked.value) return;
  const snapshot = reviewQuerySnapshot();
  const generation = reviewGeneration.value;
  const target = rows.value.find(item => item.id === row.id);
  if (!target) return ElMessage.error("评价已变化，请刷新后重试");
  const targetStatus = target.status;
  const targetFeatured = Boolean(target.featured);
  reviewActionId.value = row.id;
  try {
    const current = rows.value.find(item => item.id === row.id);
    if (!current || current.status !== targetStatus || Boolean(current.featured) !== targetFeatured || generation !== reviewGeneration.value || !sameReviewQuery(snapshot)) throw new Error("评价状态或筛选已变化，请刷新后重试");
    await api.patch(`/admin/reviews/${current.id}`, { status: current.status, adminReply: current.adminReply || "", featured: !targetFeatured });
    ElMessage.success(targetFeatured ? "已取消精选" : "已设为精选");
    await loadReviews();
  } catch (error: any) {
    ElMessage.error(error.message || "精选状态更新失败");
  } finally {
    reviewActionId.value = null;
  }
}

async function handleReport(row: any, accepted: boolean) {
  if (!canManage.value || scopeLocked.value) return;
  const snapshot = reportQuerySnapshot();
  const generation = reportGeneration.value;
  const target = reports.value.find(item => item.id === row.id);
  if (!target || target.status !== "pending") return ElMessage.error("举报状态已变化，请刷新后重试");
  const targetReviewId = target.review?.id;
  reportActionId.value = row.id;
  try {
    const { value } = await ElMessageBox.prompt(accepted ? "确认举报成立，可同时隐藏评价。请填写处理说明。" : "确认驳回举报，请填写处理说明。", accepted ? "处理举报" : "驳回举报", { inputValue: accepted ? "举报成立，评价已隐藏" : "未发现违规内容", confirmButtonText: "确认处理", cancelButtonText: "取消" });
    if (!String(value || "").trim()) return ElMessage.warning("请填写处理说明");
    const current = reports.value.find(item => item.id === row.id);
    if (!current || current.status !== "pending" || current.review?.id !== targetReviewId || generation !== reportGeneration.value || !sameReportQuery(snapshot)) throw new Error("举报状态或范围已变化，请刷新后重试");
    await api.patch(`/admin/review-reports/${current.id}`, { status: accepted ? "resolved" : "rejected", resolution: String(value).trim(), hideReview: accepted });
    ElMessage.success("举报已处理");
    await Promise.all([loadReports(), accepted ? loadReviews() : Promise.resolve()]);
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "举报处理失败");
  } finally {
    reportActionId.value = null;
  }
}

function routeActivityId() {
  const value = typeof route.query.activityId === "string" ? Number(route.query.activityId) : undefined;
  return value && Number.isFinite(value) ? value : undefined;
}

const focusedActivityName = computed(() => rows.value.find((row) => row.activity?.id === activityId.value)?.activity?.title || (activityId.value ? `活动 ID ${activityId.value}` : ""));

function clearActivityFilter() {
  if (scopeLocked.value) return;
  activityId.value = undefined;
  reviewPage.value = 1;
  router.replace({ path: "/reviews", query: { status: status.value || undefined } });
  loadReviews();
}

function applyFilter() {
  if (scopeLocked.value) return;
  reviewPage.value = 1;
  router.replace({ path: "/reviews", query: { status: status.value || undefined, activityId: activityId.value || undefined } });
  loadReviews();
}

async function moderate(row: any, nextStatus: string) {
  if (!canManage.value || scopeLocked.value) return;
  const snapshot = reviewQuerySnapshot();
  const generation = reviewGeneration.value;
  const target = rows.value.find(item => item.id === row.id);
  if (!target) return ElMessage.error("评价已变化，请刷新后重试");
  const targetStatus = target.status;
  reviewActionId.value = row.id;
  try {
    const { value } = await ElMessageBox.prompt("管理员回复，可留空", nextStatus === "hidden" ? "隐藏评价" : "显示评价", { inputValue: row.adminReply || "" });
    const current = rows.value.find(item => item.id === row.id);
    if (!current || current.status !== targetStatus || generation !== reviewGeneration.value || !sameReviewQuery(snapshot)) throw new Error("评价状态或筛选已变化，请刷新后重试");
    await api.patch(`/admin/reviews/${current.id}`, { status: nextStatus, adminReply: value || "" });
    ElMessage.success("评价状态已更新");
    await loadReviews();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "评价状态更新失败");
  } finally {
    reviewActionId.value = null;
  }
}

function displayPhone(row: any) {
  const phone = String(row?.user?.phone || "");
  return canViewSensitive.value && !row?.sensitiveMasked ? phone || row?.user?.nickname || "-" : maskPhone(phone) || row?.user?.nickname || "-";
}

function reviewStatusText(value: string) {
  return value === "visible" ? "显示" : value === "hidden" ? "隐藏" : value || "-";
}

onMounted(() => {
  load();
});

watch(
  () => [route.query.activityId, route.query.status],
  () => {
    const nextActivityId = routeActivityId();
    const nextStatus = typeof route.query.status === "string" ? route.query.status : "";
    if (activityId.value !== nextActivityId || status.value !== nextStatus) {
      activityId.value = nextActivityId;
      status.value = nextStatus;
      reviewPage.value = 1;
      loadReviews();
    }
  }
);
</script>

<template>
  <div class="page">
    <div class="toolbar"><h2>评价管理</h2></div>
    <el-alert class="permission-alert" type="info" show-icon :closable="false" :title="permissionHint" />
    <el-alert v-if="optionsError" class="permission-alert" type="warning" show-icon :closable="false" :title="optionsError"><template #default><el-button size="small" :loading="optionsLoading" :disabled="scopeLocked" @click="loadOptions">重试活动选项</el-button></template></el-alert>
    <div class="table-card">
      <el-alert v-if="reviewError" class="permission-alert" type="error" show-icon :closable="false" :title="reviewError"><template #default><el-button size="small" :loading="reviewLoading" :disabled="scopeLocked" @click="loadReviews">重试评价</el-button></template></el-alert>
      <el-alert
        v-if="activityId"
        class="activity-alert"
        type="success"
        show-icon
        :closable="false"
        title="已按复盘活动筛选评价"
        :description="`当前仅查看「${focusedActivityName}」的评价，可用于沉淀口碑素材和课后反馈。`"
      />
      <el-form inline>
        <el-form-item label="活动"><el-select v-model="activityId" clearable filterable style="width: 280px" :disabled="scopeLocked"><el-option v-for="activity in activities" :key="activity.id" :label="activity.title" :value="activity.id" /></el-select></el-form-item>
        <el-form-item label="状态"><el-select v-model="status" clearable style="width: 150px" :disabled="scopeLocked"><el-option label="显示" value="visible" /><el-option label="隐藏" value="hidden" /></el-select></el-form-item>
        <el-button type="primary" :disabled="scopeLocked" @click="applyFilter">筛选</el-button>
        <el-button v-if="activityId" :disabled="scopeLocked" @click="clearActivityFilter">查看全部活动评价</el-button>
      </el-form>
      <el-table v-loading="reviewLoading" :data="rows" stripe :empty-text="reviewError ? '评价加载失败' : '暂无评价'">
        <el-table-column label="活动" min-width="220"><template #default="{ row }">{{ row.activity.title }}</template></el-table-column>
        <el-table-column label="用户" width="150"><template #default="{ row }">{{ displayPhone(row) }}</template></el-table-column>
        <el-table-column prop="rating" label="评分" width="90" />
        <el-table-column prop="content" label="评价" min-width="260" />
        <el-table-column prop="adminReply" label="回复" min-width="180" />
        <el-table-column label="精选" width="80"><template #default="{ row }"><el-tag v-if="row.featured" type="success">精选</el-tag><span v-else>-</span></template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }">{{ reviewStatusText(row.status) }}</template></el-table-column>
        <el-table-column v-if="canManage" label="操作" width="260"><template #default="{ row }"><el-button size="small" :loading="reviewActionId===row.id" :disabled="scopeLocked" @click="toggleFeatured(row)">{{ row.featured ? "取消精选" : "设为精选" }}</el-button><el-button size="small" :disabled="scopeLocked" @click="moderate(row, 'visible')">显示</el-button><el-button size="small" type="warning" :disabled="scopeLocked" @click="moderate(row, 'hidden')">隐藏</el-button></template></el-table-column>
      </el-table>
      <el-pagination v-if="reviewTotal" v-model:current-page="reviewPage" :disabled="scopeLocked" :total="reviewTotal" :page-size="pageSize" layout="total, prev, pager, next" @change="loadReviews" />
    </div>
    <div class="table-card report-card">
      <h3>待处理举报</h3>
      <el-alert v-if="reportError" class="permission-alert" type="error" show-icon :closable="false" :title="reportError"><template #default><el-button size="small" :loading="reportLoading" :disabled="scopeLocked" @click="loadReports">重试举报</el-button></template></el-alert>
      <el-table v-loading="reportLoading" :data="reports" stripe :empty-text="reportError ? '举报加载失败' : '暂无待处理举报'">
        <el-table-column label="活动" min-width="180"><template #default="{ row }">{{ row.review?.activity?.title || "-" }}</template></el-table-column>
        <el-table-column label="评价内容" min-width="240"><template #default="{ row }">{{ row.review?.content || "-" }}</template></el-table-column>
        <el-table-column prop="reason" label="举报原因" min-width="220" />
        <el-table-column label="举报人" width="150"><template #default="{ row }">{{ displayPhone(row) }}</template></el-table-column>
        <el-table-column v-if="canManage" label="操作" width="180"><template #default="{ row }"><el-button size="small" type="danger" :loading="reportActionId===row.id" :disabled="scopeLocked" @click="handleReport(row, true)">成立并隐藏</el-button><el-button size="small" :disabled="scopeLocked" @click="handleReport(row, false)">驳回</el-button></template></el-table-column>
      </el-table>
      <el-pagination v-if="reportTotal" v-model:current-page="reportPage" :disabled="scopeLocked" :total="reportTotal" :page-size="pageSize" layout="total, prev, pager, next" @change="loadReports" />
    </div>
  </div>
</template>

<style scoped>
.activity-alert { margin-bottom: 14px; }
.permission-alert { margin-bottom: 14px; }
.report-card { margin-top: 16px; }
h3 { margin: 0 0 14px; }
@media (max-width: 640px) {
  .table-card { min-width: 0; overflow: hidden; }
  .table-card :deep(.el-form) { display: grid; grid-template-columns: minmax(0, 1fr); }
  .table-card :deep(.el-form-item), .table-card :deep(.el-select) { width: 100% !important; margin-right: 0; }
  .table-card :deep(.el-table) { max-width: 100%; }
  .table-card :deep(.el-pagination) { justify-content: flex-start; overflow-x: auto; }
}
</style>
