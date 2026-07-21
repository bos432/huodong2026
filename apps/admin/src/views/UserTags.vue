<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";
import { hasPermission } from "../permissions";
import { maskPhone } from "../privacy";

const route = useRoute();
const router = useRouter();
const canManage = computed(() => hasPermission("tag.manage"));
const canViewSensitive = computed(() => hasPermission("tag.sensitive"));
const rows = ref<any[]>([]);
const activities = ref<any[]>([]);
const memberLevels = ref<any[]>([]);
const activityUserCount = ref(0);
const focusedActivity = ref<any | null>(null);
const loading = ref(false);
const loadError = ref("");
const optionsLoading = ref(false);
const optionsError = ref("");
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const bulkLoading = ref(false);
const submitLoading = ref(false);
const segmentSaving = ref(false);
const behaviorRefreshing = ref(false);
const behaviorRuns = ref<any[]>([]);
const behaviorRunLoading = ref(false);
const behaviorRunError = ref("");
const behaviorRefreshKey = ref("");
const snapshotKeys = reactive<Record<number, string>>({});
const rowActionId = ref<number | null>(null);
const query = reactive({ userId: undefined as number | undefined, activityId: routeActivityId() as number | undefined });
const form = reactive({ userId: undefined as number | undefined, name: "重点用户", color: "success", remark: "" });
const bulkForm = reactive({ name: "活动活跃用户", color: "success", remark: "" });
const segments = ref<any[]>([]);
const snapshots = ref<any[]>([]);
const snapshotMembers = ref<any[]>([]);
const snapshotMemberTotal = ref(0);
const snapshotMemberPage = ref(1);
const snapshotMemberPageSize = 20;
const snapshotMemberLoading = ref(false);
const snapshotMemberError = ref("");
const selectedSnapshot = ref<any | null>(null);
const preview = ref<any>({ items: [], total: 0 });
const selectedSegment = ref<any | null>(null);
const segmentLoading = ref(false);
const segmentError = ref("");
const segmentForm = reactive<any>({ name: "", description: "", enabled: true, rules: { levelIds: [], minPoints: undefined, maxPoints: undefined, minGrowth: undefined, maxGrowth: undefined, minSpent: undefined, maxSpent: undefined, minRegistrations: undefined, minCheckIns: undefined, activeWithinDays: undefined, inactiveForDays: undefined, sourceChannels: [], anyTags: [], allTags: [] } });

const colorOptions = [
  { label: "默认", value: "default" },
  { label: "重点", value: "success" },
  { label: "嘉宾", value: "warning" },
  { label: "黑名单", value: "danger" },
  { label: "候补", value: "info" }
];

function routeActivityId() {
  const activityId = typeof route.query.activityId === "string" ? Number(route.query.activityId) : undefined;
  return activityId && Number.isFinite(activityId) ? activityId : undefined;
}

const focusedActivityName = computed(() => focusedActivity.value?.title || (query.activityId ? `活动 ID ${query.activityId}` : ""));
const activityUserSummary = computed(() => {
  if (!query.activityId) return "";
  return `当前活动共有 ${activityUserCount.value} 个报名用户，已显示这些用户在本商家下的标签。`;
});

async function loadOptions() {
  optionsLoading.value = true;
  optionsError.value = "";
  try {
    const result = await api.get<any, { activities: any[]; levels: any[] }>("/admin/tags/options");
    activities.value = result.activities || [];
    memberLevels.value = result.levels || [];
  } catch (error: any) {
    activities.value = [];
    memberLevels.value = [];
    optionsError.value = error.message || "标签筛选项加载失败";
  } finally {
    optionsLoading.value = false;
  }
}

async function load() {
  loading.value = true;
  loadError.value = "";
  try {
    const result = await api.get<any, { items: any[]; total: number; activity: any | null; activityUserCount: number }>("/admin/tags", { params: { userId: query.userId || undefined, activityId: query.activityId || undefined, page: page.value, pageSize } });
    rows.value = result.items || [];
    total.value = Number(result.total || 0);
    activityUserCount.value = Number(result.activityUserCount || 0);
    focusedActivity.value = result.activity || null;
  } catch (error: any) {
    rows.value = [];
    total.value = 0;
    loadError.value = error.message || "加载标签失败";
    ElMessage.error(loadError.value);
  } finally {
    loading.value = false;
  }
}

async function loadSegments() {
  segmentError.value = "";
  try {
    segments.value = await api.get<any, any[]>("/admin/member-segments");
  } catch (error: any) {
    segments.value = [];
    segmentError.value = error.message || "分群列表加载失败";
  }
}
function createBusinessKey(prefix: string) {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}:${random}`.slice(0, 100);
}
async function loadBehaviorRuns() {
  behaviorRunLoading.value = true;
  behaviorRunError.value = "";
  try {
    const result = await api.get<any, any>("/admin/tags/behavior-runs", { params: { page: 1, pageSize: 10 } });
    behaviorRuns.value = result.items || [];
  } catch (error: any) {
    behaviorRuns.value = [];
    behaviorRunError.value = error.message || "行为标签运行记录加载失败";
  } finally { behaviorRunLoading.value = false; }
}
function editSegment(row?: any) { selectedSegment.value = row || null; Object.assign(segmentForm, { name: row?.name || "", description: row?.description || "", enabled: row?.enabled !== false }); Object.assign(segmentForm.rules, { levelIds: [], minPoints: undefined, maxPoints: undefined, minGrowth: undefined, maxGrowth: undefined, minSpent: undefined, maxSpent: undefined, minRegistrations: undefined, minCheckIns: undefined, activeWithinDays: undefined, inactiveForDays: undefined, sourceChannels: [], anyTags: [], allTags: [], ...(row?.rules || {}) }); preview.value = { items: [], total: 0 }; snapshots.value = []; clearSnapshotMembers(); }
async function previewSegment() {
  if (segmentLoading.value) return;
  segmentLoading.value = true;
  try { preview.value = await api.post("/admin/member-segments/preview", { rules: segmentForm.rules, page: 1, pageSize: 20 }); }
  catch (error: any) { ElMessage.error(error.message || "分群预览失败"); }
  finally { segmentLoading.value = false; }
}
async function saveSegment() {
  if (!canManage.value) return ElMessage.warning("当前账号只有查看权限");
  if (!segmentForm.name.trim()) return ElMessage.warning("请填写分群名称");
  if (segmentSaving.value) return;
  segmentSaving.value = true;
  try {
    const payload = { name: segmentForm.name.trim(), description: segmentForm.description.trim(), enabled: segmentForm.enabled, rules: segmentForm.rules };
    if (selectedSegment.value?.id) await api.patch(`/admin/member-segments/${selectedSegment.value.id}`, payload);
    else await api.post("/admin/member-segments", payload);
    ElMessage.success("分群已保存");
    await loadSegments();
    editSegment();
  } catch (error: any) { ElMessage.error(error.message || "分群保存失败"); }
  finally { segmentSaving.value = false; }
}
async function loadSnapshots(row: any) {
  clearSnapshotMembers();
  try { selectedSegment.value = row; snapshots.value = await api.get(`/admin/member-segments/${row.id}/snapshots`); }
  catch (error: any) { snapshots.value = []; ElMessage.error(error.message || "人群快照加载失败"); }
}
async function createSnapshot(row: any) {
  if (!canManage.value) return ElMessage.warning("当前账号只有查看权限");
  if (rowActionId.value !== null) return;
  rowActionId.value = row.id;
  const idempotencyKey = snapshotKeys[row.id] || (snapshotKeys[row.id] = createBusinessKey(`snapshot:${row.id}`));
  try { await api.post(`/admin/member-segments/${row.id}/snapshots`, { idempotencyKey }); delete snapshotKeys[row.id]; ElMessage.success("人群快照已创建"); await loadSegments(); await loadSnapshots(row); }
  catch (error: any) { ElMessage.error(error.message || "人群快照创建失败"); }
  finally { rowActionId.value = null; }
}
function clearSnapshotMembers() {
  selectedSnapshot.value = null;
  snapshotMembers.value = [];
  snapshotMemberTotal.value = 0;
  snapshotMemberPage.value = 1;
  snapshotMemberError.value = "";
}
async function loadSnapshotMembers(row: any, page = 1) {
  if (snapshotMemberLoading.value) return;
  selectedSnapshot.value = row;
  snapshotMemberPage.value = page;
  snapshotMemberLoading.value = true;
  snapshotMemberError.value = "";
  try {
    const result = await api.get<any, any>(`/admin/member-segment-snapshots/${row.id}/members`, { params: { page, pageSize: snapshotMemberPageSize } });
    snapshotMembers.value = result.items || [];
    snapshotMemberTotal.value = Number(result.total || 0);
  } catch (error: any) {
    snapshotMembers.value = [];
    snapshotMemberTotal.value = 0;
    snapshotMemberError.value = error.message || "快照成员加载失败";
  } finally { snapshotMemberLoading.value = false; }
}
async function refreshBehaviorTags() {
  if (!canManage.value) return ElMessage.warning("当前账号只有查看权限");
  if (behaviorRefreshing.value) return;
  behaviorRefreshing.value = true;
  const idempotencyKey = behaviorRefreshKey.value || (behaviorRefreshKey.value = createBusinessKey("behavior-refresh"));
  try { const result = await api.post<any, any>("/admin/tags/refresh-behavior", { idempotencyKey }); behaviorRefreshKey.value = ""; ElMessage.success(`行为标签已刷新：新增 ${result.createdCount}，移除 ${result.deletedCount}`); await Promise.all([load(), loadBehaviorRuns()]); }
  catch (error: any) { ElMessage.error(error.message || "行为标签刷新失败"); }
  finally { behaviorRefreshing.value = false; }
}
function csvArray(value: string) { return value.split(/[,，\n]/).map(item => item.trim()).filter(Boolean); }

async function submit() {
  if (!canManage.value) return ElMessage.warning("当前账号只有查看权限");
  if (!form.userId || !form.name.trim()) {
    ElMessage.warning("请填写用户 ID 和标签名称");
    return;
  }
  if (submitLoading.value) return;
  submitLoading.value = true;
  try {
    await api.post("/admin/tags", {
      userId: form.userId,
      name: form.name.trim(),
      color: form.color,
      remark: form.remark.trim() || undefined
    });
    ElMessage.success("标签已添加");
    form.remark = "";
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "标签添加失败");
  } finally {
    submitLoading.value = false;
  }
}

async function submitBulk() {
  if (!canManage.value) return ElMessage.warning("当前账号只有查看权限");
  if (!query.activityId) return ElMessage.warning("请先从复盘页或 URL 选择活动");
  if (!bulkForm.name.trim()) return ElMessage.warning("请填写标签名称");
  bulkLoading.value = true;
  try {
    const result = await api.post<any, { matchedCount: number; createdCount: number; skippedCount: number }>("/admin/tags/bulk-activity", {
      activityId: query.activityId,
      name: bulkForm.name.trim(),
      color: bulkForm.color,
      remark: bulkForm.remark.trim() || undefined
    });
    ElMessage.success(`已新增 ${result.createdCount} 个标签，跳过 ${result.skippedCount} 个已有标签`);
    load();
  } catch (error: any) {
    ElMessage.error(error.message || "批量标记失败");
  } finally {
    bulkLoading.value = false;
  }
}

async function remove(row: any) {
  if (!canManage.value) return ElMessage.warning("当前账号只有查看权限");
  if (rowActionId.value !== null) return;
  try {
    await ElMessageBox.confirm(`确认删除标签「${row.name}」？`, "删除标签", {
      type: "warning",
      confirmButtonText: "确认删除",
      cancelButtonText: "取消"
    });
    rowActionId.value = row.id;
    await api.post(`/admin/tags/${row.id}/delete`, {});
    ElMessage.success("标签已删除");
    await load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "标签删除失败");
  } finally {
    rowActionId.value = null;
  }
}

function userText(row: any) {
  const phone = row.user?.phone;
  return canViewSensitive.value && !row?.sensitiveMasked && !row?.user?.sensitiveMasked ? phone || row.user?.nickname || `ID ${row.user?.id || "-"}` : maskPhone(phone) || row.user?.nickname || `ID ${row.user?.id || "-"}`;
}

function tagType(color?: string) {
  return color === "default" ? undefined : color;
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function applyFilter() {
  page.value = 1;
  router.replace({ path: "/tags", query: { activityId: query.activityId || undefined } });
  load();
}

function clearActivityFilter() {
  query.activityId = undefined;
  page.value = 1;
  router.replace({ path: "/tags" });
  load();
}

function changePage(nextPage: number) {
  page.value = nextPage;
  load();
}

onMounted(() => { loadOptions(); load(); loadSegments(); loadBehaviorRuns(); });

watch(
  () => route.query.activityId,
  () => {
    const nextActivityId = routeActivityId();
    if (query.activityId !== nextActivityId) {
      query.activityId = nextActivityId;
      page.value = 1;
      load();
    }
  }
);
</script>

<template>
  <div class="page">
    <div class="toolbar"><h2>用户标签</h2></div>

    <el-alert v-if="canViewSensitive" class="permission-alert" type="warning" :closable="false" show-icon title="敏感查看权限已启用：会员手机号和快照创建人可完整显示。" />
    <el-alert v-else-if="canManage" class="permission-alert" type="info" :closable="false" show-icon title="当前账号可维护标签和分群，会员手机号保持脱敏。" />
    <el-alert v-else class="permission-alert" type="info" :closable="false" show-icon title="当前账号仅可查看标签、分群和脱敏会员信息。" />
    <el-alert v-if="optionsError" class="inline-alert" type="error" :closable="false" show-icon :title="optionsError"><template #default><el-button size="small" :loading="optionsLoading" @click="loadOptions">重试</el-button></template></el-alert>

    <div class="table-card segment-card">
      <div class="segment-head"><div><h3>动态人群分群</h3><p>按会员资产、活跃、来源和标签组合筛选，并固化为可追溯快照。</p></div><div v-if="canManage"><el-button :loading="behaviorRefreshing" @click="refreshBehaviorTags">刷新行为标签</el-button><el-button @click="editSegment()">新建分群</el-button></div></div>
      <el-alert v-if="segmentError" class="inline-alert" type="error" :closable="false" show-icon :title="segmentError"><template #default><el-button size="small" @click="loadSegments">重试</el-button></template></el-alert>
      <el-alert v-if="behaviorRunError" class="inline-alert" type="error" :closable="false" show-icon :title="behaviorRunError"><template #default><el-button size="small" @click="loadBehaviorRuns">重试</el-button></template></el-alert>
      <el-table v-loading="behaviorRunLoading" :data="behaviorRuns" size="small" class="behavior-run-table trace-table" empty-text="暂无刷新记录">
        <el-table-column prop="batchKey" label="刷新批次" min-width="210" show-overflow-tooltip />
        <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === 'completed' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'">{{ row.status === "completed" ? "已完成" : row.status === "failed" ? "失败" : "运行中" }}</el-tag></template></el-table-column>
        <el-table-column prop="profileCount" label="会员" width="72" />
        <el-table-column prop="createdCount" label="新增" width="72" />
        <el-table-column prop="deletedCount" label="移除" width="72" />
        <el-table-column prop="retainedCount" label="保留" width="72" />
        <el-table-column label="完成时间" width="170"><template #default="{ row }">{{ formatTime(row.completedAt || row.createdAt) }}</template></el-table-column>
      </el-table>
      <el-row :gutter="16">
        <el-col :xs="24" :lg="9"><el-table :data="segments" size="small" class="segment-list-table" max-height="360" empty-text="暂无分群"><el-table-column prop="name" label="分群" min-width="240" show-overflow-tooltip /><el-table-column prop="lastMatchedCount" label="最近人数" width="90" /><el-table-column label="操作" :width="canManage ? 190 : 120"><template #default="{ row }"><el-button link type="primary" @click="editSegment(row)">{{ canManage ? "编辑" : "查看" }}</el-button><el-button link @click="loadSnapshots(row)">快照</el-button><el-button v-if="canManage" link type="success" :loading="rowActionId === row.id" :disabled="rowActionId !== null" @click="createSnapshot(row)">固化</el-button></template></el-table-column></el-table></el-col>
        <el-col :xs="24" :lg="15">
          <el-form label-width="92px" size="small">
            <el-row :gutter="12"><el-col :xs="24" :sm="12"><el-form-item label="分群名称"><el-input v-model="segmentForm.name" /></el-form-item></el-col><el-col :xs="24" :sm="12"><el-form-item label="说明"><el-input v-model="segmentForm.description" /></el-form-item></el-col></el-row>
            <el-row :gutter="12"><el-col :xs="24" :sm="8"><el-form-item label="最低积分"><el-input-number v-model="segmentForm.rules.minPoints" :min="0" /></el-form-item></el-col><el-col :xs="24" :sm="8"><el-form-item label="最低成长"><el-input-number v-model="segmentForm.rules.minGrowth" :min="0" /></el-form-item></el-col><el-col :xs="24" :sm="8"><el-form-item label="最低消费"><el-input-number v-model="segmentForm.rules.minSpent" :min="0" /></el-form-item></el-col></el-row>
            <el-row :gutter="12"><el-col :xs="24" :sm="8"><el-form-item label="最高积分"><el-input-number v-model="segmentForm.rules.maxPoints" :min="0" /></el-form-item></el-col><el-col :xs="24" :sm="8"><el-form-item label="最高成长"><el-input-number v-model="segmentForm.rules.maxGrowth" :min="0" /></el-form-item></el-col><el-col :xs="24" :sm="8"><el-form-item label="最高消费"><el-input-number v-model="segmentForm.rules.maxSpent" :min="0" /></el-form-item></el-col></el-row>
            <el-row :gutter="12"><el-col :xs="24" :sm="6"><el-form-item label="报名次数"><el-input-number v-model="segmentForm.rules.minRegistrations" :min="0" /></el-form-item></el-col><el-col :xs="24" :sm="6"><el-form-item label="核销次数"><el-input-number v-model="segmentForm.rules.minCheckIns" :min="0" /></el-form-item></el-col><el-col :xs="24" :sm="6"><el-form-item label="近几日活跃"><el-input-number v-model="segmentForm.rules.activeWithinDays" :min="0" /></el-form-item></el-col><el-col :xs="24" :sm="6"><el-form-item label="沉睡天数"><el-input-number v-model="segmentForm.rules.inactiveForDays" :min="0" /></el-form-item></el-col></el-row>
            <el-form-item label="会员等级"><el-select v-model="segmentForm.rules.levelIds" multiple collapse-tags clearable placeholder="不限等级"><el-option v-for="item in memberLevels" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item>
            <el-form-item label="来源渠道"><el-input :model-value="segmentForm.rules.sourceChannels.join(',')" placeholder="h5,mp_weixin,admin" @update:model-value="segmentForm.rules.sourceChannels = csvArray($event)" /></el-form-item>
            <el-form-item label="任一标签"><el-input :model-value="segmentForm.rules.anyTags.join(',')" placeholder="VIP,活跃用户" @update:model-value="segmentForm.rules.anyTags = csvArray($event)" /></el-form-item>
            <el-form-item label="全部标签"><el-input :model-value="segmentForm.rules.allTags.join(',')" placeholder="需同时具备的标签" @update:model-value="segmentForm.rules.allTags = csvArray($event)" /></el-form-item>
            <div class="segment-actions"><el-switch v-model="segmentForm.enabled" active-text="启用" :disabled="!canManage" /><el-button :loading="segmentLoading" @click="previewSegment">预览人群</el-button><el-button v-if="canManage" type="primary" :loading="segmentSaving" @click="saveSegment">保存分群</el-button><el-tag type="info">匹配 {{ preview.total || 0 }} 人</el-tag></div>
          </el-form>
        </el-col>
      </el-row>
      <el-table v-if="preview.items.length" :data="preview.items" size="small" class="preview-table"><el-table-column prop="user.id" label="用户 ID" width="90" /><el-table-column label="用户"><template #default="{ row }">{{ userText(row) }}</template></el-table-column><el-table-column prop="points" label="积分" width="80" /><el-table-column prop="growthValue" label="成长值" width="90" /><el-table-column prop="registrationCount" label="报名" width="70" /><el-table-column prop="checkInCount" label="核销" width="70" /></el-table>
      <el-table v-if="snapshots.length" :data="snapshots" size="small" class="preview-table"><el-table-column prop="snapshotNo" label="快照编号" min-width="180" /><el-table-column prop="businessKey" label="业务键" min-width="220" show-overflow-tooltip /><el-table-column prop="name" label="名称" /><el-table-column prop="memberCount" label="人数" width="80" /><el-table-column label="创建时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column><el-table-column label="明细" width="90"><template #default="{ row }"><el-button link type="primary" :loading="snapshotMemberLoading && selectedSnapshot?.id === row.id" @click="loadSnapshotMembers(row)">成员</el-button></template></el-table-column></el-table>
      <el-alert v-if="snapshotMemberError" class="inline-alert snapshot-member-error" type="error" :closable="false" show-icon :title="snapshotMemberError"><template #default><el-button v-if="selectedSnapshot" size="small" @click="loadSnapshotMembers(selectedSnapshot, snapshotMemberPage)">重试</el-button></template></el-alert>
      <div v-if="selectedSnapshot" class="snapshot-members">
        <div class="snapshot-members-head"><div><strong>{{ selectedSnapshot.name }}</strong><span>不可变成员快照，共 {{ snapshotMemberTotal }} 人</span></div><el-button text @click="clearSnapshotMembers">关闭明细</el-button></div>
        <el-table v-loading="snapshotMemberLoading" :data="snapshotMembers" size="small" empty-text="暂无快照成员"><el-table-column prop="user.id" label="用户 ID" width="90" /><el-table-column label="用户"><template #default="{ row }">{{ userText(row) }}</template></el-table-column><el-table-column label="加入快照时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column></el-table>
        <el-pagination v-if="snapshotMemberTotal > snapshotMemberPageSize" class="snapshot-pagination" layout="prev, pager, next, total" :current-page="snapshotMemberPage" :page-size="snapshotMemberPageSize" :total="snapshotMemberTotal" @current-change="(page: number) => selectedSnapshot && loadSnapshotMembers(selectedSnapshot, page)" />
      </div>
    </div>

    <el-alert
      v-if="query.activityId"
      class="activity-alert"
      type="success"
      show-icon
      :closable="false"
      title="已按复盘活动定位用户"
      :description="`当前活动：${focusedActivityName}。${activityUserSummary}`"
    />

    <div v-if="canManage" class="table-card form-card">
      <el-form inline>
        <el-form-item label="用户 ID" required><el-input-number v-model="form.userId" :min="1" /></el-form-item>
        <el-form-item label="标签" required><el-input v-model="form.name" style="width: 150px" /></el-form-item>
        <el-form-item label="颜色"><el-select v-model="form.color" style="width: 120px"><el-option v-for="item in colorOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" style="width: 260px" /></el-form-item>
        <el-button type="primary" :loading="submitLoading" @click="submit">添加标签</el-button>
      </el-form>
    </div>

    <div v-if="query.activityId && canManage" class="table-card form-card">
      <div class="bulk-head">
        <div>
          <h3>批量沉淀活动人群</h3>
          <p>给本活动所有报名用户打同一个标签，用于后续复购、通知触达和会员运营。</p>
        </div>
        <el-tag type="info">{{ activityUserCount }} 人</el-tag>
      </div>
      <el-form inline>
        <el-form-item label="标签" required><el-input v-model="bulkForm.name" style="width: 170px" /></el-form-item>
        <el-form-item label="颜色"><el-select v-model="bulkForm.color" style="width: 120px"><el-option v-for="item in colorOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="备注"><el-input v-model="bulkForm.remark" placeholder="默认记录活动来源" style="width: 280px" /></el-form-item>
        <el-button type="primary" :loading="bulkLoading" @click="submitBulk">批量标记</el-button>
      </el-form>
    </div>

    <div class="table-card">
      <el-alert v-if="loadError" class="inline-alert" type="error" :closable="false" show-icon :title="loadError"><template #default><el-button size="small" @click="load">重试</el-button></template></el-alert>
      <el-form class="filters" inline>
        <el-form-item label="活动"><el-select v-model="query.activityId" clearable filterable :loading="optionsLoading" placeholder="全部活动" style="width: 240px"><el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" /></el-select></el-form-item>
        <el-form-item label="筛选用户 ID"><el-input-number v-model="query.userId" :min="1" /></el-form-item>
        <el-button type="primary" @click="applyFilter">筛选</el-button>
        <el-button v-if="query.activityId" @click="clearActivityFilter">查看全部用户标签</el-button>
      </el-form>
      <el-table v-loading="loading" :data="rows" stripe empty-text="暂无标签">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="用户" min-width="180"><template #default="{ row }">{{ userText(row) }}</template></el-table-column>
        <el-table-column label="标签" width="130"><template #default="{ row }"><el-tag :type="tagType(row.color)">{{ row.name }}</el-tag></template></el-table-column>
        <el-table-column prop="remark" label="备注" min-width="220" show-overflow-tooltip />
        <el-table-column label="创建时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column v-if="canManage" label="操作" width="110"><template #default="{ row }"><el-button size="small" type="danger" :loading="rowActionId === row.id" :disabled="rowActionId !== null" @click="remove(row)">删除</el-button></template></el-table-column>
      </el-table>
      <el-pagination v-if="total > pageSize" class="tag-pagination" layout="prev, pager, next, total" :current-page="page" :page-size="pageSize" :total="total" @current-change="changePage" />
    </div>
  </div>
</template>

<style scoped>
.form-card { margin-bottom: 16px; }
.permission-alert { margin-bottom: 12px; }
.filters { margin-bottom: 12px; }
.activity-alert { margin-bottom: 16px; }
.bulk-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
.bulk-head h3 { margin: 0 0 6px; font-size: 16px; }
.bulk-head p { margin: 0; color: #667085; font-size: 13px; }
.segment-card { margin-bottom: 16px; }
.segment-head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.segment-head h3 { margin: 0 0 6px; font-size: 16px; }
.segment-head p { margin: 0; color: #667085; font-size: 13px; }
.segment-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.preview-table { margin-top: 16px; }
.behavior-run-table { margin-bottom: 16px; }
.trace-table :deep(.cell), .segment-list-table :deep(.cell) { white-space: nowrap; }
.inline-alert { margin-bottom: 14px; }
.snapshot-member-error { margin-top: 16px; }
.snapshot-members { margin-top: 16px; padding: 14px; border: 1px solid #e7ece9; border-radius: 8px; background: #fbfcfb; }
.snapshot-members-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.snapshot-members-head > div { display: grid; gap: 4px; }
.snapshot-members-head span { color: #667085; font-size: 13px; }
.snapshot-pagination { justify-content: flex-end; margin-top: 12px; }
.tag-pagination { justify-content: flex-end; margin-top: 14px; }
@media (max-width: 720px) {
  .page, .toolbar, .table-card { min-width: 0; }
  .table-card { overflow: hidden; }
  .table-card :deep(.el-table) { max-width: 100%; }
  .segment-head, .bulk-head, .snapshot-members-head { align-items: stretch; flex-direction: column; }
  .segment-head > div:last-child { display: flex; flex-wrap: wrap; }
  .segment-actions { align-items: stretch; flex-direction: column; }
  .segment-card :deep(.el-row) { margin-left: 0 !important; margin-right: 0 !important; }
  .segment-card :deep(.el-col) { min-width: 0; padding-left: 0 !important; padding-right: 0 !important; }
  .segment-card :deep(.el-form-item) { display: block; width: 100%; }
  .segment-card :deep(.el-form-item__label) { display: block; width: auto !important; padding: 0 0 6px; text-align: left; }
  .segment-card :deep(.el-form-item__content), .segment-card :deep(.el-input-number), .segment-card :deep(.el-select), .segment-card :deep(.el-input) { margin-left: 0 !important; min-width: 0; width: 100% !important; }
  .filters { display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0; width: 100%; }
  .filters :deep(.el-form-item), .filters :deep(.el-select), .filters :deep(.el-input-number) { margin-right: 0; min-width: 0; width: 100% !important; }
  .filters > .el-button { margin-left: 0; width: 100%; }
}
</style>
