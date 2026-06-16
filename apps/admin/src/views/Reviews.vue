<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";

const route = useRoute();
const router = useRouter();
const rows = ref<any[]>([]);
const status = ref("");
const activityId = ref<number | undefined>(routeActivityId());

async function load() {
  rows.value = await api.get<any, any[]>("/admin/reviews", { params: { status: status.value || undefined, activityId: activityId.value || undefined } });
}

function routeActivityId() {
  const value = typeof route.query.activityId === "string" ? Number(route.query.activityId) : undefined;
  return value && Number.isFinite(value) ? value : undefined;
}

const focusedActivityName = computed(() => rows.value.find((row) => row.activity?.id === activityId.value)?.activity?.title || (activityId.value ? `活动 ID ${activityId.value}` : ""));

function clearActivityFilter() {
  activityId.value = undefined;
  router.replace({ path: "/reviews", query: { status: status.value || undefined } });
  load();
}

function applyFilter() {
  router.replace({ path: "/reviews", query: { status: status.value || undefined, activityId: activityId.value || undefined } });
  load();
}

async function moderate(row: any, nextStatus: string) {
  const { value } = await ElMessageBox.prompt("管理员回复，可留空", nextStatus === "hidden" ? "隐藏评价" : "显示评价", { inputValue: row.adminReply || "" });
  await api.patch(`/admin/reviews/${row.id}`, { status: nextStatus, adminReply: value || "" });
  ElMessage.success("评价状态已更新");
  load();
}

onMounted(load);

watch(
  () => [route.query.activityId, route.query.status],
  () => {
    const nextActivityId = routeActivityId();
    const nextStatus = typeof route.query.status === "string" ? route.query.status : "";
    if (activityId.value !== nextActivityId || status.value !== nextStatus) {
      activityId.value = nextActivityId;
      status.value = nextStatus;
      load();
    }
  }
);
</script>

<template>
  <div class="page">
    <div class="toolbar"><h2>评价管理</h2></div>
    <div class="table-card">
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
        <el-form-item label="状态"><el-select v-model="status" clearable style="width: 150px"><el-option label="显示" value="visible" /><el-option label="隐藏" value="hidden" /></el-select></el-form-item>
        <el-button type="primary" @click="applyFilter">筛选</el-button>
        <el-button v-if="activityId" @click="clearActivityFilter">查看全部活动评价</el-button>
      </el-form>
      <el-table :data="rows" stripe empty-text="暂无评价">
        <el-table-column label="活动" min-width="220"><template #default="{ row }">{{ row.activity.title }}</template></el-table-column>
        <el-table-column label="用户" width="150"><template #default="{ row }">{{ row.user.phone || row.user.nickname }}</template></el-table-column>
        <el-table-column prop="rating" label="评分" width="90" />
        <el-table-column prop="content" label="评价" min-width="260" />
        <el-table-column prop="adminReply" label="回复" min-width="180" />
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column label="操作" width="170"><template #default="{ row }"><el-button size="small" @click="moderate(row, 'visible')">显示</el-button><el-button size="small" type="warning" @click="moderate(row, 'hidden')">隐藏</el-button></template></el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.activity-alert { margin-bottom: 14px; }
</style>
