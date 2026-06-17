<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";

const rows = ref<any[]>([]);
const activities = ref<any[]>([]);
const loading = ref(false);
const query = reactive({ activityId: undefined as number | undefined, status: "waiting" });

const statusText: Record<string, string> = {
  waiting: "候补中",
  promoted: "已补位",
  cancelled: "已取消"
};

async function load() {
  loading.value = true;
  try {
    rows.value = await api.get<any, any[]>("/admin/waitlists", { params: query });
  } catch (error: any) {
    ElMessage.error(error.message || "加载候补记录失败");
  } finally {
    loading.value = false;
  }
}

async function loadActivities() {
  const result = await api.get<any, any>("/admin/activities", { params: { page: 1, pageSize: 100 } });
  activities.value = Array.isArray(result) ? result : result.items || [];
}

async function promote(row: any) {
  await ElMessageBox.confirm(`确认将 ${userText(row)} 从候补补位为正式报名？系统会重新检查名额和会员门槛，补位成功后用户端会看到正式报名记录。`, "候补补位", {
    type: "warning",
    confirmButtonText: "确认补位",
    cancelButtonText: "再核对一下"
  });
  try {
    await api.post(`/admin/waitlists/${row.id}/promote`, {});
    ElMessage.success("已补位为报名记录");
    load();
  } catch (error: any) {
    ElMessage.error(error.message);
  }
}

async function cancel(row: any) {
  const { value } = await ElMessageBox.prompt(`确认取消 ${userText(row)} 的候补资格？取消后不会自动恢复排队顺序。`, "取消候补", {
    inputValue: "后台取消候补",
    confirmButtonText: "确认取消",
    cancelButtonText: "返回"
  });
  await api.post(`/admin/waitlists/${row.id}/cancel`, { remark: value });
  ElMessage.success("已取消候补");
  load();
}

function userText(row: any) {
  return row.user?.phone || row.user?.nickname || `ID ${row.user?.id || "-"}`;
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

onMounted(() => {
  loadActivities();
  load();
});
</script>

<template>
  <div class="page">
    <div class="toolbar"><h2>候补管理</h2></div>
    <el-alert class="page-hint" type="info" :closable="false" show-icon title="候补处理提示" description="补位会尝试创建正式报名记录；取消候补会改变用户排队状态。处理前请先核对活动名额、用户沟通记录和报名内容。" />
    <div class="table-card">
      <el-form class="filters" inline>
        <el-form-item label="活动">
          <el-select v-model="query.activityId" clearable filterable style="width: 280px" @change="load">
            <el-option v-for="activity in activities" :key="activity.id" :label="activity.title" :value="activity.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable style="width: 140px" @change="load">
            <el-option v-for="(text, key) in statusText" :key="key" :label="text" :value="key" />
          </el-select>
        </el-form-item>
        <el-button type="primary" @click="load">筛选</el-button>
      </el-form>

      <el-empty v-if="!loading && !rows.length" description="暂无匹配候补记录">
        <el-button type="primary" @click="load">重新筛选</el-button>
      </el-empty>
      <el-table v-else v-loading="loading" :data="rows" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="活动" min-width="220" show-overflow-tooltip><template #default="{ row }">{{ row.activity?.title || "-" }}</template></el-table-column>
        <el-table-column label="用户" width="170"><template #default="{ row }">{{ userText(row) }}</template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag>{{ statusText[row.status] || row.status }}</el-tag></template></el-table-column>
        <el-table-column label="候补内容" min-width="280"><template #default="{ row }"><pre>{{ answerText(row) }}</pre></template></el-table-column>
        <el-table-column label="加入时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" :disabled="row.status !== 'waiting'" @click="promote(row)">补位</el-button>
            <el-button size="small" type="warning" :disabled="row.status !== 'waiting'" @click="cancel(row)">取消</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.page-hint { margin-bottom: 14px; }
.filters { margin-bottom: 12px; }
pre { margin: 0; white-space: pre-wrap; font-family: inherit; line-height: 1.5; }
</style>
