<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";

const route = useRoute();
const router = useRouter();
const rows = ref<any[]>([]);
const activityUsers = ref<any[]>([]);
const focusedActivity = ref<any | null>(null);
const loading = ref(false);
const bulkLoading = ref(false);
const query = reactive({ userId: undefined as number | undefined, activityId: routeActivityId() as number | undefined });
const form = reactive({ userId: undefined as number | undefined, name: "重点用户", color: "success", remark: "" });
const bulkForm = reactive({ name: "活动活跃用户", color: "success", remark: "" });

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
  return `当前活动共有 ${activityUsers.value.length} 个报名用户，已显示这些用户在本商家下的标签。`;
});

async function load() {
  loading.value = true;
  try {
    const result = await api.get<any, any[] | { activity: any; users: any[]; tags: any[] }>("/admin/tags", { params: { userId: query.userId || undefined, activityId: query.activityId || undefined } });
    if (Array.isArray(result)) {
      rows.value = result;
      activityUsers.value = [];
      focusedActivity.value = null;
    } else {
      rows.value = result.tags || [];
      activityUsers.value = result.users || [];
      focusedActivity.value = result.activity || null;
    }
  } catch (error: any) {
    ElMessage.error(error.message || "加载标签失败");
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!form.userId || !form.name.trim()) {
    ElMessage.warning("请填写用户 ID 和标签名称");
    return;
  }
  await api.post("/admin/tags", { ...form, name: form.name.trim(), remark: form.remark.trim() || undefined });
  ElMessage.success("标签已添加");
  form.remark = "";
  load();
}

async function submitBulk() {
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
  await ElMessageBox.confirm(`确认删除标签「${row.name}」？`, "删除标签", {
    type: "warning",
    confirmButtonText: "确认删除",
    cancelButtonText: "取消"
  });
  await api.post(`/admin/tags/${row.id}/delete`, {});
  ElMessage.success("标签已删除");
  load();
}

function userText(row: any) {
  return row.user?.phone || row.user?.nickname || `ID ${row.user?.id || "-"}`;
}

function tagType(color?: string) {
  return color === "default" ? undefined : color;
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function applyFilter() {
  router.replace({ path: "/tags", query: { activityId: query.activityId || undefined } });
  load();
}

function clearActivityFilter() {
  query.activityId = undefined;
  router.replace({ path: "/tags" });
  load();
}

onMounted(load);

watch(
  () => route.query.activityId,
  () => {
    const nextActivityId = routeActivityId();
    if (query.activityId !== nextActivityId) {
      query.activityId = nextActivityId;
      load();
    }
  }
);
</script>

<template>
  <div class="page">
    <div class="toolbar"><h2>用户标签</h2></div>

    <el-alert
      v-if="query.activityId"
      class="activity-alert"
      type="success"
      show-icon
      :closable="false"
      title="已按复盘活动定位用户"
      :description="`当前活动：${focusedActivityName}。${activityUserSummary}`"
    />

    <div class="table-card form-card">
      <el-form inline>
        <el-form-item label="用户 ID" required><el-input-number v-model="form.userId" :min="1" /></el-form-item>
        <el-form-item label="标签" required><el-input v-model="form.name" style="width: 150px" /></el-form-item>
        <el-form-item label="颜色"><el-select v-model="form.color" style="width: 120px"><el-option v-for="item in colorOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" style="width: 260px" /></el-form-item>
        <el-button type="primary" @click="submit">添加标签</el-button>
      </el-form>
    </div>

    <div v-if="query.activityId" class="table-card form-card">
      <div class="bulk-head">
        <div>
          <h3>批量沉淀活动人群</h3>
          <p>给本活动所有报名用户打同一个标签，用于后续复购、通知触达和会员运营。</p>
        </div>
        <el-tag type="info">{{ activityUsers.length }} 人</el-tag>
      </div>
      <el-form inline>
        <el-form-item label="标签" required><el-input v-model="bulkForm.name" style="width: 170px" /></el-form-item>
        <el-form-item label="颜色"><el-select v-model="bulkForm.color" style="width: 120px"><el-option v-for="item in colorOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="备注"><el-input v-model="bulkForm.remark" placeholder="默认记录活动来源" style="width: 280px" /></el-form-item>
        <el-button type="primary" :loading="bulkLoading" @click="submitBulk">批量标记</el-button>
      </el-form>
    </div>

    <div class="table-card">
      <el-form class="filters" inline>
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
        <el-table-column label="操作" width="110"><template #default="{ row }"><el-button size="small" type="danger" @click="remove(row)">删除</el-button></template></el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.form-card { margin-bottom: 16px; }
.filters { margin-bottom: 12px; }
.activity-alert { margin-bottom: 16px; }
.bulk-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
.bulk-head h3 { margin: 0 0 6px; font-size: 16px; }
.bulk-head p { margin: 0; color: #667085; font-size: 13px; }
</style>
