<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { api } from "../api";

const loading = ref(false);
const data = ref<any>({ summary: {}, hosts: [], venues: [] });
const filters = reactive({ startDate: "", endDate: "" });

function formatTime(value?: string) {
  return value ? String(value).replace("T", " ").slice(0, 16) : "-";
}

async function load() {
  if (filters.startDate && filters.endDate && filters.endDate < filters.startDate) return ElMessage.warning("结束日期不能早于开始日期");
  loading.value = true;
  try {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    data.value = await api.get<any, any>("/admin/resource-network", { params });
  } catch (error: any) {
    ElMessage.error(error.message || "资源网络加载失败");
  } finally {
    loading.value = false;
  }
}

function reset() {
  filters.startDate = "";
  filters.endDate = "";
  void load();
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div><h2>场地与讲师资源</h2><p>从已运营活动中沉淀可复用的主讲人和场地资产。</p></div>
      <div class="toolbar-actions">
        <el-date-picker v-model="filters.startDate" value-format="YYYY-MM-DD" type="date" placeholder="开始日期" />
        <el-date-picker v-model="filters.endDate" value-format="YYYY-MM-DD" type="date" placeholder="结束日期" />
        <el-button type="primary" :loading="loading" @click="load">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </div>
    </div>

    <div class="summary-grid" v-loading="loading">
      <div><span>讲师/主理人</span><strong>{{ data.summary?.hostCount || 0 }}</strong></div>
      <div><span>活动场地</span><strong>{{ data.summary?.venueCount || 0 }}</strong></div>
      <div><span>沉淀活动</span><strong>{{ data.summary?.activityCount || 0 }}</strong></div>
      <div><span>覆盖城市</span><strong>{{ data.summary?.cityCount || 0 }}</strong></div>
    </div>

    <div class="resource-grid">
      <div class="table-card">
        <h3>讲师与主理人</h3>
        <el-table v-loading="loading" :data="data.hosts || []" stripe empty-text="活动中尚未录入主讲人">
          <el-table-column prop="name" label="姓名" min-width="120" />
          <el-table-column prop="title" label="身份/头衔" min-width="150" show-overflow-tooltip />
          <el-table-column prop="activityCount" label="活动数" width="90" />
          <el-table-column label="服务城市" min-width="150"><template #default="{ row }">{{ (row.cities || []).join("、") || "-" }}</template></el-table-column>
          <el-table-column label="最近活动" width="160"><template #default="{ row }">{{ formatTime(row.lastActivityAt) }}</template></el-table-column>
        </el-table>
      </div>

      <div class="table-card">
        <h3>活动场地</h3>
        <el-table v-loading="loading" :data="data.venues || []" stripe empty-text="活动中尚未沉淀场地">
          <el-table-column prop="location" label="场地" min-width="210" show-overflow-tooltip />
          <el-table-column prop="city" label="城市" width="120" />
          <el-table-column prop="activityCount" label="活动数" width="90" />
          <el-table-column prop="totalCapacity" label="累计容量" width="100" />
          <el-table-column label="最近活动" width="160"><template #default="{ row }">{{ formatTime(row.lastActivityAt) }}</template></el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar h2 { margin: 0 0 6px; }.toolbar p { margin: 0; color: #667085; }.toolbar-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }.summary-grid > div { display: grid; gap: 8px; min-height: 110px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }.summary-grid span { color: #667085; }.summary-grid strong { font-size: 30px; color: #111827; }
.resource-grid { display: grid; gap: 18px; }.table-card h3 { margin: 0 0 16px; }
@media (max-width: 900px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .summary-grid { grid-template-columns: 1fr; } }
</style>
