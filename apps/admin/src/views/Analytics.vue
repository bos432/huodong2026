<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "../api";
import { isPlatformAdmin } from "../permissions";

const loading = ref(false);
const overview = ref<any>(null);
const trends = ref<any[]>([]);
const channels = ref<any[]>([]);
const users = ref<any>(null);
const filters = reactive({ startDate: "", endDate: "" });

const metricCards = computed(() => {
  const totals = overview.value?.totals || {};
  const rates = overview.value?.rates || {};
  return [
    { label: "浏览", value: totals.viewCount || 0, sub: `报名转化 ${rates.signupRate || 0}%` },
    { label: "报名", value: totals.registrationCount || 0, sub: `支付转化 ${rates.paymentRate || 0}%` },
    { label: "支付", value: totals.paidCount || 0, sub: `签到转化 ${rates.checkInRate || 0}%` },
    { label: "净收入", value: `¥${totals.netAmount || "0.00"}`, sub: `退款 ¥${totals.refundAmount || "0.00"}` },
    { label: "活跃用户", value: totals.activeUserCount || 0, sub: `新增 ${users.value?.newUserCount || 0}` },
    { label: "余额充值", value: `¥${totals.walletRechargeAmount || "0.00"}`, sub: "后台充值余额" },
    { label: "公益池", value: `¥${totals.charityAvailableAmount || "0.00"}`, sub: `累计 ¥${totals.charityAccruedAmount || "0.00"}` },
    { label: "公益拨付", value: `¥${totals.charityDisbursedAmount || "0.00"}`, sub: `冲回 ¥${totals.charityReversedAmount || "0.00"}` },
    { label: "评价", value: totals.reviewCount || 0, sub: `评价转化 ${rates.reviewRate || 0}%` },
    { label: "风险待办", value: riskTotal.value, sub: "退款/回调/对账" }
  ];
});

const riskTotal = computed(() => {
  const risk = overview.value?.risk || {};
  return (risk.pendingRefundCount || 0) + (risk.callbackRiskCount || 0) + (risk.pendingReconciliationCount || 0);
});

function queryParams() {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
}

async function load() {
  loading.value = true;
  try {
    const params = queryParams();
    const [overviewData, trendData, channelData, userData] = await Promise.all([
      api.get<any, any>("/admin/analytics/overview", { params }),
      api.get<any, any[]>("/admin/analytics/trends", { params }),
      api.get<any, any[]>("/admin/analytics/channels", { params }),
      api.get<any, any>("/admin/analytics/users", { params })
    ]);
    overview.value = overviewData;
    trends.value = trendData;
    channels.value = channelData;
    users.value = userData;
  } finally {
    loading.value = false;
  }
}

function reset() {
  filters.startDate = "";
  filters.endDate = "";
  load();
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>{{ isPlatformAdmin() ? "平台数据中心" : "商家数据中心" }}</h2>
      <div class="toolbar-actions">
        <el-date-picker v-model="filters.startDate" value-format="YYYY-MM-DD" type="date" placeholder="开始日期" />
        <el-date-picker v-model="filters.endDate" value-format="YYYY-MM-DD" type="date" placeholder="结束日期" />
        <el-button type="primary" @click="load">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </div>
    </div>

    <div class="metric-grid" v-loading="loading">
      <div v-for="item in metricCards" :key="item.label" class="metric">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.sub }}</small>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="table-card">
        <h3>趋势明细</h3>
        <el-table :data="trends" height="320" stripe empty-text="暂无趋势数据">
          <el-table-column prop="date" label="日期" width="120" />
          <el-table-column prop="view" label="浏览" width="90" />
          <el-table-column prop="register" label="报名" width="90" />
          <el-table-column prop="pay" label="支付" width="90" />
          <el-table-column prop="check_in" label="签到" width="90" />
          <el-table-column label="实收" width="120"><template #default="{ row }">¥{{ row.paidAmount || "0.00" }}</template></el-table-column>
        </el-table>
      </div>

      <div class="table-card">
        <h3>风险看板</h3>
        <div class="risk-list">
          <div><span>待处理退款</span><strong>{{ overview?.risk?.pendingRefundCount || 0 }}</strong></div>
          <div><span>异常回调</span><strong>{{ overview?.risk?.callbackRiskCount || 0 }}</strong></div>
          <div><span>待处理对账</span><strong>{{ overview?.risk?.pendingReconciliationCount || 0 }}</strong></div>
        </div>
        <template v-if="isPlatformAdmin()">
          <h3 class="sub-title">商家排行</h3>
          <el-table :data="overview?.tenantRanking || []" height="190" stripe empty-text="暂无排行">
            <el-table-column prop="tenantName" label="商家" min-width="140" />
            <el-table-column prop="registrationCount" label="报名" width="80" />
            <el-table-column label="实收" width="110"><template #default="{ row }">¥{{ row.paidAmount }}</template></el-table-column>
          </el-table>
        </template>
      </div>
    </div>

    <div class="table-card">
      <h3>渠道分析</h3>
      <el-table :data="channels" stripe empty-text="暂无渠道数据">
        <el-table-column prop="name" label="渠道" min-width="150" show-overflow-tooltip />
        <el-table-column prop="activityTitle" label="活动" min-width="220" show-overflow-tooltip />
        <el-table-column prop="code" label="渠道码" width="130" />
        <el-table-column prop="viewCount" label="浏览" width="90" />
        <el-table-column prop="registrationCount" label="报名" width="90" />
        <el-table-column prop="paidCount" label="支付" width="90" />
        <el-table-column label="报名率" width="90"><template #default="{ row }">{{ row.signupRate }}%</template></el-table-column>
        <el-table-column label="支付率" width="90"><template #default="{ row }">{{ row.paymentRate }}%</template></el-table-column>
        <el-table-column label="实收" width="120"><template #default="{ row }">¥{{ row.paidAmount }}</template></el-table-column>
      </el-table>
    </div>

    <div class="dashboard-grid">
      <div class="table-card">
        <h3>会员等级分布</h3>
        <el-table :data="users?.memberLevels || []" stripe empty-text="暂无会员数据">
          <el-table-column prop="level" label="等级" />
          <el-table-column prop="count" label="人数" width="100" />
        </el-table>
      </div>
      <div class="table-card">
        <h3>活动偏好</h3>
        <el-table :data="users?.categoryPreference || []" stripe empty-text="暂无偏好数据">
          <el-table-column prop="category" label="分类" />
          <el-table-column prop="count" label="报名" width="100" />
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
.metric { min-height: 118px; display: grid; gap: 8px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.metric span { color: #667085; font-size: 13px; }
.metric strong { color: #111827; font-size: 28px; }
.metric small { color: #667085; }
.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
h3 { margin: 0 0 16px; }
.sub-title { margin-top: 20px; }
.risk-list { display: grid; gap: 12px; }
.risk-list div { display: flex; align-items: center; justify-content: space-between; min-height: 72px; padding: 14px 16px; border: 1px solid #fee2e2; border-left: 4px solid #dc2626; border-radius: 8px; background: #fffafa; }
.risk-list span { color: #475467; }
.risk-list strong { color: #dc2626; font-size: 24px; }
@media (max-width: 1000px) { .metric-grid, .dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .metric-grid, .dashboard-grid { grid-template-columns: 1fr; } }
</style>
