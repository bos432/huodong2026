<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { api, downloadFile } from "../api";
import { hasPermission } from "../permissions";
import { maskPhone } from "../privacy";

const activities = ref<any[]>([]);
const selectedId = ref<number>();
const data = ref<any>();
const loading = ref(false);
const activityErrorMessage = ref("");
const growthErrorMessage = ref("");
const growth = ref<any>(null);
const growthLoading = ref(false);
const growthExporting = ref(false);
const activeTab = ref("growth");
const filters = reactive({ startDate: "", endDate: "", activityId: undefined as number | undefined });
const canExportGrowth = computed(() => hasPermission("analytics.export"));
const canViewActivityFunnel = computed(() => hasPermission("analytics.view"));

async function loadActivities() {
  activityErrorMessage.value = "";
  try {
    activities.value = await api.get<any, any>("/admin/analytics/activity-options");
    selectedId.value ||= activities.value[0]?.id;
    if (selectedId.value) await loadFunnel();
  } catch (error: any) {
    activityErrorMessage.value = error.message || "活动列表或单活动漏斗加载失败";
  }
}

function growthParams() { return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined)); }

async function loadGrowth() {
  if (growthLoading.value) return;
  if (filters.startDate && filters.endDate && filters.endDate < filters.startDate) return ElMessage.warning("结束日期不能早于开始日期");
  growthLoading.value = true;
  try { growthErrorMessage.value = ""; growth.value = await api.get("/admin/analytics/growth", { params: growthParams() }); }
  catch (error: any) { growthErrorMessage.value = error.message || "综合增长数据加载失败"; }
  finally { growthLoading.value = false; }
}

async function exportGrowth() {
  if (!canExportGrowth.value) return ElMessage.error("当前账号无分析数据导出权限");
  if (growthExporting.value) return;
  if (filters.startDate && filters.endDate && filters.endDate < filters.startDate) return ElMessage.warning("结束日期不能早于开始日期");
  growthExporting.value = true;
  try {
    const params = new URLSearchParams(growthParams() as Record<string, string>);
    await downloadFile(`/admin/analytics/growth-export?${params.toString()}`, `增长分析-${filters.startDate || "全部"}-${filters.endDate || "全部"}.csv`);
    ElMessage.success("增长数据已导出");
  } catch (error: any) {
    ElMessage.error(error.message || "增长数据导出失败");
  } finally {
    growthExporting.value = false;
  }
}

function resetGrowth() { filters.startDate = ""; filters.endDate = ""; filters.activityId = undefined; loadGrowth(); }

function moneyFen(value: unknown) { return `¥${(Number(value || 0) / 100).toFixed(2)}`; }

async function loadFunnel() {
  if (!canViewActivityFunnel.value) return ElMessage.error("当前账号无分析查看权限");
  if (!selectedId.value) return;
  loading.value = true;
  try {
    activityErrorMessage.value = "";
    data.value = await api.get(`/admin/activities/${selectedId.value}/funnel`);
  } catch (error: any) {
    activityErrorMessage.value = error.message || "活动漏斗加载失败";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadGrowth();
  if (canViewActivityFunnel.value) await loadActivities();
});
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>增长分析</h2>
      <div class="toolbar-actions">
        <el-date-picker v-if="activeTab === 'growth'" v-model="filters.startDate" value-format="YYYY-MM-DD" type="date" placeholder="开始日期" />
        <el-date-picker v-if="activeTab === 'growth'" v-model="filters.endDate" value-format="YYYY-MM-DD" type="date" placeholder="结束日期" />
        <el-select v-if="activeTab === 'growth'" v-model="filters.activityId" clearable filterable placeholder="全部活动" style="width: 260px"><el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" /></el-select>
        <el-button v-if="activeTab === 'growth'" type="primary" :loading="growthLoading" @click="loadGrowth">查询</el-button><el-button v-if="activeTab === 'growth' && canExportGrowth" :loading="growthExporting" :disabled="growthLoading" @click="exportGrowth">导出</el-button><el-button v-if="activeTab === 'growth'" :disabled="growthLoading || growthExporting" @click="resetGrowth">重置</el-button>
      </div>
    </div>
    <el-alert v-if="growthErrorMessage" class="page-error" type="error" show-icon :closable="false" :title="growthErrorMessage"><template #default><el-button size="small" @click="loadGrowth">重试增长数据</el-button></template></el-alert>
    <el-alert v-if="activityErrorMessage" class="page-error" type="error" show-icon :closable="false" :title="activityErrorMessage"><template #default><el-button size="small" @click="loadActivities">重试活动漏斗</el-button></template></el-alert>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="综合增长" name="growth">
        <template v-if="growth">
          <div class="metric-grid" v-loading="growthLoading">
            <div class="metric"><span>浏览</span><strong>{{ growth.funnel.view }}</strong><small>报名率 {{ growth.rates.signupRate }}%</small></div>
            <div class="metric"><span>报名</span><strong>{{ growth.funnel.register }}</strong><small>支付率 {{ growth.rates.paymentRate }}%</small></div>
            <div class="metric"><span>支付</span><strong>{{ growth.funnel.pay }}</strong><small>退款率 {{ growth.rates.refundRate }}%</small></div>
            <div class="metric"><span>核销</span><strong>{{ growth.funnel.checkIn }}</strong><small>核销率 {{ growth.rates.checkInRate }}%</small></div>
            <div class="metric"><span>7 日留存</span><strong>{{ growth.cohort.retention7Rate }}%</strong><small>{{ growth.cohort.retained7 }} / {{ growth.cohort.retention7EligibleUsers ?? growth.cohort.users }}</small></div>
            <div class="metric"><span>30 日留存</span><strong>{{ growth.cohort.retention30Rate }}%</strong><small>{{ growth.cohort.retained30 }} / {{ growth.cohort.retention30EligibleUsers ?? growth.cohort.users }}</small></div>
            <div class="metric"><span>重复参与</span><strong>{{ growth.cohort.repeatRate }}%</strong><small>{{ growth.cohort.repeatUsers }} 人</small></div>
            <div class="metric"><span>付费复购</span><strong>{{ growth.cohort.repurchaseRate }}%</strong><small>{{ growth.cohort.repeatPaidUsers }} / {{ growth.cohort.paidUsers }}</small></div>
          </div>
          <div class="analysis-grid">
            <div class="table-card"><h3>来源转化</h3><el-table :data="growth.sources" stripe height="330" empty-text="暂无来源数据"><el-table-column prop="source" label="来源" min-width="130" /><el-table-column prop="view" label="浏览" width="80" /><el-table-column prop="register" label="报名" width="80" /><el-table-column prop="pay" label="支付" width="80" /><el-table-column prop="signupRate" label="报名率%" width="100" /><el-table-column prop="paymentRate" label="支付率%" width="100" /></el-table></div>
            <div class="table-card"><h3>地域分布</h3><el-table :data="growth.regions" stripe height="330" empty-text="暂无定位数据"><el-table-column prop="province" label="省" width="100" /><el-table-column prop="city" label="市" width="110" /><el-table-column prop="district" label="区县" min-width="120" /><el-table-column prop="count" label="定位" width="80" /><el-table-column prop="matchedCount" label="命中" width="80" /></el-table></div>
          </div>
          <div class="table-card channel-card"><h3>渠道转化</h3><el-table :data="growth.channels" stripe empty-text="暂无渠道数据"><el-table-column prop="name" label="渠道" min-width="150" /><el-table-column prop="activityTitle" label="活动" min-width="190" show-overflow-tooltip /><el-table-column prop="viewCount" label="浏览" width="80" /><el-table-column prop="registrationCount" label="报名" width="80" /><el-table-column prop="paidCount" label="支付" width="80" /><el-table-column prop="checkInCount" label="核销" width="80" /><el-table-column prop="signupRate" label="报名率%" width="100" /><el-table-column prop="paymentRate" label="支付率%" width="100" /></el-table></div>
        </template>
      </el-tab-pane>
      <el-tab-pane v-if="canViewActivityFunnel" label="单活动漏斗" name="activity">
        <div class="activity-picker"><el-select v-model="selectedId" filterable placeholder="选择活动" style="width: 360px" @change="loadFunnel"><el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" /></el-select><el-button @click="loadFunnel">刷新</el-button></div>

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
        <div class="metric"><span>取消</span><strong>{{ data.funnel.cancelCount }}</strong></div>
        <div class="metric"><span>退款</span><strong>{{ data.funnel.refundCount }}</strong></div>
        <div class="metric"><span>支付毛额</span><strong>{{ moneyFen(data.funnel.grossAmountFen) }}</strong></div>
        <div class="metric"><span>退款额</span><strong>{{ moneyFen(data.funnel.refundAmountFen) }}</strong></div>
        <div class="metric"><span>净额</span><strong>{{ moneyFen(data.funnel.netAmountFen) }}</strong></div>
      </div>

      <el-alert v-if="!data.reconciliation?.attribution?.consistent" class="page-error" type="warning" show-icon :closable="false" :title="`发现 ${data.reconciliation.attribution.mismatchCount} 条来源快照不一致事件，请先执行数据修复`" />

      <div class="table-card dimension-card">
        <h3>票种拆分</h3>
        <el-table :data="data.dimensions?.ticketTypes || []" stripe empty-text="暂无票种数据">
          <el-table-column prop="name" label="票种" min-width="150" /><el-table-column prop="registrationCount" label="报名" width="72" /><el-table-column prop="paidCount" label="支付" width="72" /><el-table-column prop="approvedCount" label="成功" width="72" /><el-table-column prop="checkInCount" label="核销" width="72" /><el-table-column prop="refundCount" label="退款" width="72" /><el-table-column label="毛额" width="110"><template #default="{ row }">{{ moneyFen(row.grossAmountFen) }}</template></el-table-column><el-table-column label="退款额" width="110"><template #default="{ row }">{{ moneyFen(row.refundAmountFen) }}</template></el-table-column><el-table-column label="净额" width="110"><template #default="{ row }">{{ moneyFen(row.netAmountFen) }}</template></el-table-column>
        </el-table>
      </div>

      <div class="table-card dimension-card">
        <h3>渠道拆分</h3>
        <el-table :data="data.dimensions?.channels || []" stripe empty-text="暂无渠道数据">
          <el-table-column prop="name" label="渠道" min-width="140" /><el-table-column prop="code" label="渠道码" min-width="120" /><el-table-column prop="source" label="来源" min-width="110" /><el-table-column prop="viewCount" label="浏览" width="72" /><el-table-column prop="shareVisitCount" label="分享" width="72" /><el-table-column prop="registrationCount" label="报名" width="72" /><el-table-column prop="paidCount" label="支付" width="72" /><el-table-column prop="checkInCount" label="核销" width="72" /><el-table-column prop="refundCount" label="退款" width="72" /><el-table-column label="净额" width="110"><template #default="{ row }">{{ moneyFen(row.netAmountFen) }}</template></el-table-column>
        </el-table>
      </div>

      <div class="table-card dimension-card">
        <h3>城市归因</h3>
        <el-table :data="data.dimensions?.cities || []" stripe empty-text="暂无明确城市归因，需在活动地点中补充省市区">
          <el-table-column prop="province" label="省" min-width="100" /><el-table-column prop="city" label="市" min-width="110" /><el-table-column prop="district" label="区县" min-width="110" /><el-table-column prop="viewCount" label="浏览" width="72" /><el-table-column prop="registrationCount" label="报名" width="72" /><el-table-column prop="paidCount" label="支付" width="72" /><el-table-column prop="checkInCount" label="核销" width="72" /><el-table-column prop="refundCount" label="退款" width="72" /><el-table-column label="净额" width="110"><template #default="{ row }">{{ moneyFen(row.netAmountFen) }}</template></el-table-column>
        </el-table>
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
            <template #default="{ row }">{{ row.user?.nickname || maskPhone(row.user?.phone) }}</template>
          </el-table-column>
          <el-table-column prop="visitCount" label="访问" width="100" />
          <el-table-column prop="registrationCount" label="报名" width="100" />
          <el-table-column prop="createdAt" label="生成时间" width="180" />
        </el-table>
      </div>
    </template></el-tab-pane></el-tabs>
  </div>
</template>

<style scoped>
.toolbar-actions { display: flex; align-items: center; gap: 10px; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
.metric { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; display: grid; gap: 8px; }
.metric span { color: #667085; font-size: 13px; }
.metric strong { font-size: 28px; }
.metric small { color:#667085; }
.analysis-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:18px; }
.channel-card { margin-bottom:18px; }
.dimension-card { margin-bottom: 18px; overflow: hidden; }
.activity-picker { display:flex; align-items:center; gap:10px; margin-bottom:18px; }
h3 { margin: 0 0 16px; }
.rates { display: grid; gap: 12px; margin-bottom: 18px; }
.rate-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #edf0f5; }
.rate-row:last-child { border-bottom: 0; }
.rate-row span { color: #667085; }
.rate-row strong { color: #0f766e; font-size: 20px; }
@media (max-width: 900px) { .metric-grid, .analysis-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .metric-grid, .analysis-grid { grid-template-columns:1fr; } }
</style>
