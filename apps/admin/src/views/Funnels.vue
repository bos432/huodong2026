<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "../api";

const activities = ref<any[]>([]);
const selectedId = ref<number>();
const data = ref<any>();
const loading = ref(false);

async function loadActivities() {
  activities.value = await api.get<any, any[]>("/admin/activities");
  selectedId.value ||= activities.value[0]?.id;
  if (selectedId.value) await loadFunnel();
}

async function loadFunnel() {
  if (!selectedId.value) return;
  loading.value = true;
  try {
    data.value = await api.get(`/admin/activities/${selectedId.value}/funnel`);
  } finally {
    loading.value = false;
  }
}

onMounted(loadActivities);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>活动漏斗</h2>
      <div class="toolbar-actions">
        <el-select v-model="selectedId" filterable placeholder="选择活动" style="width: 360px" @change="loadFunnel">
          <el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" />
        </el-select>
        <el-button @click="loadFunnel">刷新</el-button>
      </div>
    </div>

    <el-empty v-if="!selectedId" description="暂无活动" />
    <template v-else-if="data">
      <div class="metric-grid" v-loading="loading">
        <div class="metric"><span>浏览</span><strong>{{ data.funnel.viewCount }}</strong></div>
        <div class="metric"><span>分享访问</span><strong>{{ data.funnel.shareVisitCount }}</strong></div>
        <div class="metric"><span>邀请码</span><strong>{{ data.funnel.inviteCount }}</strong></div>
        <div class="metric"><span>报名</span><strong>{{ data.funnel.registrationCount }}</strong></div>
        <div class="metric"><span>付款</span><strong>{{ data.funnel.paidCount }}</strong></div>
        <div class="metric"><span>成功</span><strong>{{ data.funnel.approvedCount }}</strong></div>
        <div class="metric"><span>签到</span><strong>{{ data.funnel.checkInCount }}</strong></div>
        <div class="metric"><span>评价</span><strong>{{ data.funnel.reviewCount }}</strong></div>
      </div>

      <div class="table-card rates">
        <h3>转化率</h3>
        <div class="rate-row"><span>浏览到报名</span><strong>{{ data.rates.signupRate }}%</strong></div>
        <div class="rate-row"><span>报名到付款</span><strong>{{ data.rates.paymentRate }}%</strong></div>
        <div class="rate-row"><span>成功到签到</span><strong>{{ data.rates.checkInRate }}%</strong></div>
        <div class="rate-row"><span>签到到评价</span><strong>{{ data.rates.reviewRate }}%</strong></div>
      </div>

      <div class="table-card">
        <h3>邀请榜</h3>
        <el-table :data="data.topInvites" stripe empty-text="暂无邀请数据">
          <el-table-column prop="code" label="邀请码" width="160" />
          <el-table-column label="用户" min-width="180">
            <template #default="{ row }">{{ row.user?.nickname || row.user?.phone || "-" }}</template>
          </el-table-column>
          <el-table-column prop="visitCount" label="访问" width="100" />
          <el-table-column prop="registrationCount" label="报名" width="100" />
          <el-table-column prop="createdAt" label="生成时间" width="180" />
        </el-table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.toolbar-actions { display: flex; align-items: center; gap: 10px; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
.metric { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; display: grid; gap: 8px; }
.metric span { color: #667085; font-size: 13px; }
.metric strong { font-size: 28px; }
h3 { margin: 0 0 16px; }
.rates { display: grid; gap: 12px; margin-bottom: 18px; }
.rate-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #edf0f5; }
.rate-row:last-child { border-bottom: 0; }
.rate-row span { color: #667085; }
.rate-row strong { color: #0f766e; font-size: 20px; }
@media (max-width: 900px) { .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
