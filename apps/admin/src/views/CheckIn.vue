<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Camera, Finished, RefreshLeft } from "@element-plus/icons-vue";
import QrScanDialog from "../components/QrScanDialog.vue";
import { ElMessage } from "element-plus";
import { api } from "../api";

const form = reactive({ code: "", remark: "" });
const scanDialogVisible = ref(false);
const loading = ref(false);
const overviewLoading = ref(false);
const result = ref<any>(null);
const selectedActivityId = ref<number>();
const overview = ref<any>({ activities: [], stats: {}, pending: [], checked: [] });
const statCards = computed(() => {
  const stats = overview.value?.stats || {};
  return [
    { label: "今日核销", value: stats.todayCheckedInCount || 0, tone: "success" },
    { label: "待核销", value: stats.pendingCheckInCount || 0, tone: Number(stats.pendingCheckInCount || 0) > 0 ? "warning" : "muted" },
    { label: "已核销", value: stats.checkedInCount || 0, tone: "muted" },
    { label: "核销率", value: `${stats.checkInRate || 0}%`, tone: Number(stats.checkInRate || 0) >= 70 ? "success" : "warning" }
  ];
});

async function loadOverview() {
  overviewLoading.value = true;
  try {
    overview.value = await api.get("/admin/check-ins/overview", { params: { activityId: selectedActivityId.value || undefined } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载核销统计失败");
  } finally {
    overviewLoading.value = false;
  }
}

async function submit() {
  if (!form.code.trim()) {
    ElMessage.warning("请输入签到码");
    return;
  }
  loading.value = true;
  try {
    result.value = await api.post<any, any>("/admin/check-ins", { code: form.code.trim(), remark: form.remark.trim() || undefined });
    ElMessage.success("签到核销成功");
    form.code = "";
    await loadOverview();
  } catch (error: any) {
    ElMessage.error(error.message);
  } finally {
    loading.value = false;
  }
}

function onScan(code: string) {
  form.code = code;
  scanDialogVisible.value = false;
  submit();
}

function openScanner() {
  scanDialogVisible.value = true;
}

function reset() {
  form.code = "";
  form.remark = "";
  result.value = null;
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function registrationOf(row: any) {
  return row?.registration || row || {};
}

function activityOf(row: any) {
  const registration = registrationOf(row);
  return registration?.activity || row?.activity || {};
}

function activityTime(row: any) {
  const activity = activityOf(row);
  const start = formatTime(activity.startTime);
  const end = formatTime(activity.endTime);
  if (start === "-" && end === "-") return "-";
  return end === "-" ? start : `${start} 至 ${end}`;
}

function attendeeName(row: any) {
  const registration = registrationOf(row);
  const user = registration?.user || {};
  const answers = Array.isArray(registration?.answers) ? registration.answers : [];
  const answerName = answers.find((item: any) => String(item.label || item.name || "").includes("姓名"))?.value;
  return answerName || user.nickname || "-";
}

function attendeePhone(row: any) {
  return registrationOf(row)?.user?.phone || "-";
}

function orderText(row: any) {
  const registration = registrationOf(row);
  const order = row?.order || registration?.order;
  if (!order) return "-";
  return `${order.orderNo || "-"} / ¥${Number(order.amount || 0).toFixed(2)}`;
}

function fillCode(row: any) {
  form.code = registrationOf(row)?.checkInCode || "";
  if (form.code) ElMessage.success("已填入签到码，请核对后点击核销");
}

onMounted(loadOverview);
</script>

<template>
  <div class="page check-page">
    <div class="toolbar check-toolbar">
      <div>
        <h2>签到核销</h2>
        <p>现场模式：按活动查看待核销名单，扫码或手动输入签到码完成核销。</p>
      </div>
      <div class="toolbar-actions">
        <el-select v-model="selectedActivityId" clearable filterable placeholder="全部活动" style="width: 280px" @change="loadOverview">
          <el-option v-for="activity in overview.activities" :key="activity.id" :label="activity.title" :value="activity.id" />
        </el-select>
        <el-button :loading="overviewLoading" @click="loadOverview">刷新</el-button>
        <el-button :icon="Camera" size="large" @click="openScanner">扫码</el-button>
      </div>
    </div>

    <div class="stat-grid" v-loading="overviewLoading">
      <div v-for="item in statCards" :key="item.label" class="stat-card" :class="item.tone">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>

    <div class="check-layout">
      <div class="table-card check-card">
        <el-form label-position="top" @keyup.enter="submit">
          <el-form-item label="签到码" required>
            <el-input v-model="form.code" class="code-input" size="large" placeholder="扫码后粘贴，或从待核销列表填入签到码" autofocus />
          </el-form-item>
          <el-form-item label="备注"><el-input v-model="form.remark" placeholder="可填写现场备注" /></el-form-item>
          <div class="actions">
            <el-button size="large" :icon="Camera" @click="openScanner">扫码</el-button>
            <el-button type="primary" size="large" :icon="Finished" :loading="loading" @click="submit">核销签到</el-button>
            <el-button size="large" :icon="RefreshLeft" @click="reset">清空</el-button>
          </div>
        </el-form>

        <el-descriptions v-if="result" class="result" title="最近核销成功" border :column="1">
          <el-descriptions-item label="活动">{{ activityOf(result).title || "-" }}</el-descriptions-item>
          <el-descriptions-item label="场次时间">{{ activityTime(result) }}</el-descriptions-item>
          <el-descriptions-item label="地点">{{ activityOf(result).location || "-" }}</el-descriptions-item>
          <el-descriptions-item label="报名人">{{ attendeeName(result) }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ attendeePhone(result) }}</el-descriptions-item>
          <el-descriptions-item label="订单">{{ orderText(result) }}</el-descriptions-item>
          <el-descriptions-item label="核销时间">{{ formatTime(result.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="核销员">{{ result.operator?.name || result.operator?.username || "-" }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ result.remark || "-" }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="table-card list-card" v-loading="overviewLoading">
        <h3>待核销名单</h3>
        <el-table :data="overview.pending || []" stripe empty-text="暂无待核销报名">
          <el-table-column label="报名人" min-width="150">
            <template #default="{ row }">
              <div>{{ attendeeName(row) }}</div>
              <small>{{ attendeePhone(row) }}</small>
            </template>
          </el-table-column>
          <el-table-column label="活动" min-width="190" show-overflow-tooltip>
            <template #default="{ row }">{{ activityOf(row).title || "-" }}</template>
          </el-table-column>
          <el-table-column label="报名时间" width="150"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }"><el-button size="small" type="primary" plain @click="fillCode(row)">填入核销码</el-button></template>
          </el-table-column>
        </el-table>

        <h3 class="checked-title">最近已核销</h3>
        <el-table :data="overview.checked || []" stripe empty-text="暂无核销记录">
          <el-table-column label="报名人" min-width="140">
            <template #default="{ row }">
              <div>{{ attendeeName(row) }}</div>
              <small>{{ attendeePhone(row) }}</small>
            </template>
          </el-table-column>
          <el-table-column label="活动" min-width="170" show-overflow-tooltip>
            <template #default="{ row }">{{ activityOf(row).title || "-" }}</template>
          </el-table-column>
          <el-table-column label="核销时间" width="150"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column label="核销员" width="120"><template #default="{ row }">{{ row.operator?.name || row.operator?.username || "-" }}</template></el-table-column>
        </el-table>
      </div>
    </div>
  </div>
    <QrScanDialog v-if="scanDialogVisible" @scan="onScan" @close="scanDialogVisible = false" />
</template>

<style scoped>
.check-page { min-width: 0; }
.check-toolbar { align-items: flex-start; gap: 12px; }
.check-toolbar p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
.toolbar-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
.stat-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; display: grid; gap: 8px; }
.stat-card span { color: #667085; font-size: 13px; }
.stat-card strong { color: #0f172a; font-size: 26px; }
.stat-card.success { border-color: #bbf7d0; background: #f0fdf4; }
.stat-card.warning { border-color: #fed7aa; background: #fff7ed; }
.check-layout { display: grid; grid-template-columns: minmax(360px, 520px) minmax(0, 1fr); gap: 14px; align-items: start; }
.check-card, .list-card { min-width: 0; box-sizing: border-box; }
.code-input { width: 100%; }
:deep(.el-input), :deep(.el-input__wrapper) { width: 100%; min-width: 0; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; }
.result { margin-top: 22px; }
.list-card h3 { margin: 0 0 12px; color: #111827; font-size: 16px; }
.checked-title { margin-top: 20px !important; }
small { color: #667085; display: block; line-height: 1.5; }

@media (max-width: 768px) {
  .check-toolbar { display: grid; grid-template-columns: 1fr; }
  .toolbar-actions { justify-content: stretch; }
  .toolbar-actions .el-select, .toolbar-actions .el-button { width: 100%; }
  .stat-grid, .check-layout { grid-template-columns: 1fr; }
  .check-card { width: 100%; padding: 14px; }
  .actions { display: grid; grid-template-columns: 1fr; }
  .actions .el-button { width: 100%; margin-left: 0; }
}
</style>
