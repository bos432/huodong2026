<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { api, downloadFile } from "../api";
import { hasPermission, isPlatformAdmin } from "../permissions";
import { maskPhone } from "../privacy";
import { ElMessage } from "element-plus";

const loading = ref(false);
const errorMessage = ref("");
const router = useRouter();
const overview = ref<any>(null);
const trends = ref<any[]>([]);
const channels = ref<any[]>([]);
const users = ref<any>(null);
const calculationRuns = ref<any[]>([]);
const businessOverview = ref<any>({ modules: [] });
const recomputing = ref(false);
const metricsExporting = ref(false);
const businessExportingKey = ref("");
const drilldownVisible = ref(false);
const drilldownLoading = ref(false);
const drilldownRows = ref<any[]>([]);
const drilldownTitle = ref("");
const drilldownError = ref("");
const businessDetailVisible = ref(false);
const businessDetailLoading = ref(false);
const businessDetailRows = ref<any[]>([]);
const businessDetailModule = ref<any>(null);
const businessDetailError = ref("");
const businessDetailPage = ref(1);
const businessDetailPageSize = ref(20);
const businessDetailTotal = ref(0);
const filters = reactive({ startDate: "", endDate: "" });
const canExportAnalytics = computed(() => hasPermission("analytics.export"));
const canManageAnalytics = computed(() => hasPermission("analytics.manage"));

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

const operationAdvice = computed(() => overview.value?.operationAdvice || []);

function adviceTagType(level?: string) {
  if (level === "success") return "success";
  if (level === "warning") return "warning";
  if (level === "danger") return "danger";
  return "info";
}

function queryParams() {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
}

function dateRangeError() {
  return filters.startDate && filters.endDate && filters.endDate < filters.startDate ? "结束日期不能早于开始日期" : "";
}

function recomputeRangeError() {
  const rangeError = dateRangeError();
  if (rangeError) return rangeError;
  if (!filters.startDate || !filters.endDate) return "请先选择重算开始和结束日期";
  const days = Math.round((Date.parse(`${filters.endDate}T00:00:00Z`) - Date.parse(`${filters.startDate}T00:00:00Z`)) / 86400000) + 1;
  return days > 31 ? "单次统计重算最多支持 31 天" : "";
}

async function load() {
  const rangeError = dateRangeError();
  if (rangeError) return ElMessage.warning(rangeError);
  loading.value = true;
  errorMessage.value = "";
  try {
    const params = queryParams();
    const [overviewData, trendData, channelData, userData, runData, businessData] = await Promise.all([
      api.get<any, any>("/admin/analytics/overview", { params }),
      api.get<any, any[]>("/admin/analytics/trends", { params }),
      api.get<any, any[]>("/admin/analytics/channels", { params }),
      api.get<any, any>("/admin/analytics/users", { params }),
      api.get<any, any[]>("/admin/analytics/calculation-runs"),
      api.get<any, any>("/admin/analytics/business-overview", { params })
    ]);
    overview.value = overviewData;
    trends.value = trendData;
    channels.value = channelData;
    users.value = userData;
    calculationRuns.value = runData;
    businessOverview.value = businessData;
  } catch (error: any) {
    errorMessage.value = error.message || "数据中心加载失败";
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

async function recompute() {
  if (!canManageAnalytics.value) return ElMessage.error("当前账号无统计指标重算权限");
  const rangeError = recomputeRangeError();
  if (rangeError) return ElMessage.warning(rangeError);
  recomputing.value = true;
  try {
    await api.post("/admin/analytics/recompute", { startDate: filters.startDate, endDate: filters.endDate });
    ElMessage.success("统计重算完成");
    await load();
  } catch (error: any) { ElMessage.error(error.message || "统计重算失败"); }
  finally { recomputing.value = false; }
}

function formatTime(value?: string) { return value ? String(value).replace("T", " ").slice(0, 19) : "-"; }

async function exportMetrics() {
  if (!canExportAnalytics.value) return ElMessage.error("当前账号无分析数据导出权限");
  if (metricsExporting.value) return;
  const rangeError = dateRangeError();
  if (rangeError) return ElMessage.warning(rangeError);
  const params = new URLSearchParams(queryParams() as Record<string, string>);
  metricsExporting.value = true;
  try {
    await downloadFile(`/admin/analytics/metrics-export?${params.toString()}`, `统计指标-${filters.startDate || '全部'}-${filters.endDate || '全部'}.csv`);
    ElMessage.success("统计指标已导出");
  } catch (error: any) {
    ElMessage.error(error.message || "统计指标导出失败");
  } finally {
    metricsExporting.value = false;
  }
}

function yuanFromFen(value: unknown) { return (Number(value || 0) / 100).toFixed(2); }

async function openBusinessDetails(item: any, page = 1) {
  businessDetailModule.value = item;
  businessDetailPage.value = page;
  businessDetailVisible.value = true;
  businessDetailLoading.value = true;
  businessDetailRows.value = [];
  businessDetailError.value = "";
  try {
    const result = await api.get<any, any>("/admin/analytics/business-details", { params: { ...queryParams(), module: item.key, page, pageSize: businessDetailPageSize.value } });
    businessDetailRows.value = result.items || [];
    businessDetailTotal.value = Number(result.total || 0);
  } catch (error: any) {
    businessDetailError.value = error.message || `${item.label}经营明细加载失败`;
    ElMessage.error(businessDetailError.value);
  } finally {
    businessDetailLoading.value = false;
  }
}

function changeBusinessDetailPage(page: number) {
  if (businessDetailModule.value) void openBusinessDetails(businessDetailModule.value, page);
}

async function exportBusinessDetails(item: any) {
  if (!canExportAnalytics.value) return ElMessage.error("当前账号无分析数据导出权限");
  if (businessExportingKey.value) return;
  const rangeError = dateRangeError();
  if (rangeError) return ElMessage.warning(rangeError);
  const params = new URLSearchParams({ ...queryParams(), module: item.key } as Record<string, string>);
  businessExportingKey.value = String(item.key || "business");
  try {
    await downloadFile(`/admin/analytics/business-export?${params.toString()}`, `${item.label}经营明细-${filters.startDate || "全部"}-${filters.endDate || "全部"}.csv`);
    ElMessage.success(`${item.label}经营明细已导出`);
  } catch (error: any) {
    ElMessage.error(error.message || `${item.label}经营明细导出失败`);
  } finally {
    businessExportingKey.value = "";
  }
}

async function drilldown(row: any, metricKey: string, label: string) {
  drilldownTitle.value = `${row.date} · ${label}明细`;
  drilldownVisible.value = true;
  drilldownLoading.value = true;
  drilldownRows.value = [];
  drilldownError.value = "";
  try {
    drilldownRows.value = await api.get<any, any[]>("/admin/analytics/metrics/drilldown", { params: { metricKey, startDate: row.date } });
  } catch (error: any) {
    drilldownError.value = error.message || `${label}明细加载失败`;
    ElMessage.error(drilldownError.value);
  } finally {
    drilldownLoading.value = false;
  }
}

function businessModulePermission(item: any) {
  return ({ activity: "activity.view", course: "course.manage", mall: "mall.statistics.view", charity: "charity.view" } as Record<string, string>)[String(item?.key || item?.module || "")];
}

function canOpenBusinessModule(item: any) {
  const permission = businessModulePermission(item);
  return Boolean(permission && hasPermission(permission));
}

function openBusinessModule(item: any) {
  if (!canOpenBusinessModule(item)) return ElMessage.error("当前账号无目标业务模块查看权限");
  router.push(item.path);
}

function openMerchantStatistics(row: any) {
  if (!hasPermission("mall.statistics.view")) return ElMessage.error("当前账号无商城统计查看权限");
  router.push(row.path);
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
        <el-tag :type="overview?.metricSource === 'daily_metrics' ? 'success' : 'info'">{{ overview?.metricSource === 'daily_metrics' ? '统一日指标' : '实时明细' }}</el-tag>
        <el-date-picker v-model="filters.startDate" value-format="YYYY-MM-DD" type="date" placeholder="开始日期" />
        <el-date-picker v-model="filters.endDate" value-format="YYYY-MM-DD" type="date" placeholder="结束日期" />
        <el-button type="primary" @click="load">查询</el-button>
        <el-button v-if="canManageAnalytics" type="warning" :loading="recomputing" @click="recompute">重算指标</el-button>
        <el-button v-if="canExportAnalytics" :loading="metricsExporting" @click="exportMetrics">导出指标</el-button>
        <el-button @click="reset">重置</el-button>
      </div>
    </div>

    <el-alert v-if="errorMessage" class="page-error" type="error" show-icon :closable="false" :title="errorMessage"><template #default><el-button size="small" @click="load">重试</el-button></template></el-alert>

    <div class="table-card run-card">
      <h3>统计任务</h3>
      <el-table :data="calculationRuns" stripe empty-text="暂无统计任务">
        <el-table-column prop="runId" label="运行编号" width="210" /><el-table-column label="范围" width="210"><template #default="{ row }">{{ row.startDate }} 至 {{ row.endDate }}</template></el-table-column><el-table-column prop="status" label="状态" width="100" /><el-table-column prop="metricCount" label="指标行" width="90" /><el-table-column prop="mismatchCount" label="差异" width="80" /><el-table-column label="完成时间" width="180"><template #default="{ row }">{{ formatTime(row.completedAt) }}</template></el-table-column><el-table-column prop="errorMessage" label="错误" min-width="180" show-overflow-tooltip />
      </el-table>
    </div>

    <div class="metric-grid" v-loading="loading">
      <div v-for="item in metricCards" :key="item.label" class="metric">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.sub }}</small>
      </div>
    </div>

    <div class="table-card advice-card">
      <h3>运营建议</h3>
      <div class="advice-list">
        <div v-for="item in operationAdvice" :key="`${item.title}-${item.message}`" class="advice-item">
          <el-tag :type="adviceTagType(item.level)" effect="light">{{ item.title }}</el-tag>
          <span>{{ item.message }}</span>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="table-card">
        <h3>趋势明细</h3>
        <el-table :data="trends" height="320" stripe empty-text="暂无趋势数据">
          <el-table-column prop="date" label="日期" width="120" />
          <el-table-column label="浏览" width="90"><template #default="{ row }"><el-button link type="primary" @click="drilldown(row,'activity_views','浏览')">{{ row.view || 0 }}</el-button></template></el-table-column>
          <el-table-column label="报名" width="90"><template #default="{ row }"><el-button link type="primary" @click="drilldown(row,'registrations_submitted','报名')">{{ row.register || 0 }}</el-button></template></el-table-column>
          <el-table-column label="支付" width="90"><template #default="{ row }"><el-button link type="primary" @click="drilldown(row,'payments_succeeded','支付')">{{ row.pay || 0 }}</el-button></template></el-table-column>
          <el-table-column label="签到" width="90"><template #default="{ row }"><el-button link type="primary" @click="drilldown(row,'check_ins','签到')">{{ row.check_in || 0 }}</el-button></template></el-table-column>
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

    <div class="business-grid">
      <div v-for="item in businessOverview.modules || []" :key="item.key" class="business-item">
        <span>{{ item.label }}</span><strong>{{ item.active }} / {{ item.total }}</strong><small v-if="item.orderCount !== undefined">订单 {{ item.orderCount }} · 净收 ¥{{ yuanFromFen(item.amountFen) }}</small><small v-if="item.refundAmountFen">毛额 ¥{{ yuanFromFen(item.grossAmountFen) }} · 退款 ¥{{ yuanFromFen(item.refundAmountFen) }}</small><small v-else-if="item.orderCount === undefined">运营中 / 总量</small>
        <div class="business-actions"><el-button link type="primary" @click="openBusinessDetails(item)">明细</el-button><el-button v-if="canExportAnalytics" link :loading="businessExportingKey===item.key" :disabled="businessExportingKey!==''" @click="exportBusinessDetails(item)">导出</el-button><el-button v-if="canOpenBusinessModule(item)" link @click="openBusinessModule(item)">查看</el-button></div>
      </div>
    </div>

    <div class="table-card merchant-card">
      <h3>商城店铺经营</h3>
      <el-table :data="businessOverview.merchants || []" stripe empty-text="当前账号暂无授权店铺或所选时段暂无订单">
        <el-table-column prop="name" label="店铺" min-width="180" show-overflow-tooltip />
        <el-table-column prop="code" label="编码" width="150" />
        <el-table-column prop="status" label="状态" width="110" />
        <el-table-column prop="orderCount" label="订单" width="100" />
        <el-table-column label="毛额" width="120"><template #default="{ row }">¥{{ yuanFromFen(row.grossAmountFen) }}</template></el-table-column>
        <el-table-column label="退款" width="120"><template #default="{ row }">¥{{ yuanFromFen(row.refundAmountFen) }}</template></el-table-column>
        <el-table-column label="净收" width="120"><template #default="{ row }">¥{{ yuanFromFen(row.amountFen) }}</template></el-table-column>
        <el-table-column v-if="hasPermission('mall.statistics.view')" label="操作" width="100"><template #default="{ row }"><el-button link type="primary" @click="openMerchantStatistics(row)">查看</el-button></template></el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="drilldownVisible" :title="drilldownTitle" width="980px">
      <el-alert v-if="drilldownError" class="dialog-error" type="error" show-icon :closable="false" :title="drilldownError" />
      <el-table v-loading="drilldownLoading" :data="drilldownRows" stripe max-height="560" empty-text="暂无明细">
        <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column><el-table-column prop="activity.title" label="活动" min-width="190" show-overflow-tooltip /><el-table-column label="用户" width="130"><template #default="{ row }">{{ maskPhone(row.user?.phone) }}</template></el-table-column><el-table-column prop="orderNo" label="订单号" width="180" show-overflow-tooltip /><el-table-column prop="channel.name" label="渠道" width="130" /><el-table-column prop="source" label="来源" width="110" /><el-table-column prop="amount" label="金额" width="100" />
      </el-table>
    </el-dialog>

    <el-dialog v-model="businessDetailVisible" :title="`${businessDetailModule?.label || ''}经营明细`" width="1080px">
      <el-alert v-if="businessDetailError" class="dialog-error" type="error" show-icon :closable="false" :title="businessDetailError"><template #default><el-button size="small" @click="businessDetailModule && openBusinessDetails(businessDetailModule)">重试</el-button></template></el-alert>
      <el-table v-loading="businessDetailLoading" :data="businessDetailRows" stripe max-height="580" empty-text="暂无权限范围内的经营数据">
        <el-table-column prop="name" label="名称" min-width="210" show-overflow-tooltip />
        <el-table-column prop="code" label="编码/讲师" width="150" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="120" />
        <el-table-column prop="activeCount" label="报名/活跃" width="110" />
        <el-table-column prop="totalCount" label="容量/目标" width="110" />
        <el-table-column prop="orderCount" label="订单" width="90" />
        <el-table-column label="毛额" width="120"><template #default="{ row }">¥{{ yuanFromFen(row.grossAmountFen) }}</template></el-table-column>
        <el-table-column label="退款" width="120"><template #default="{ row }">¥{{ yuanFromFen(row.refundAmountFen) }}</template></el-table-column>
        <el-table-column label="净额" width="120"><template #default="{ row }">¥{{ yuanFromFen(row.amountFen) }}</template></el-table-column>
        <el-table-column v-if="businessDetailModule && canOpenBusinessModule(businessDetailModule)" label="操作" width="100"><template #default="{ row }"><el-button link type="primary" @click="openBusinessModule(row)">下钻</el-button></template></el-table-column>
      </el-table>
      <el-pagination v-if="businessDetailTotal > businessDetailPageSize" class="dialog-pagination" background layout="total, prev, pager, next" :current-page="businessDetailPage" :page-size="businessDetailPageSize" :total="businessDetailTotal" @current-change="changeBusinessDetailPage" />
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.dialog-error { margin-bottom: 12px; }
.dialog-pagination { justify-content: flex-end; margin-top: 14px; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
.metric { min-height: 118px; display: grid; gap: 8px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.business-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin-bottom:18px; }
.business-item { min-height:112px; display:grid; gap:6px; padding:16px; border:1px solid #d8dee8; border-radius:8px; background:#fff; text-align:left; }
.business-item:hover { border-color:#409eff; }
.business-item span,.business-item small { color:#667085; }
.business-item strong { color:#111827; font-size:24px; }
.business-actions { display:flex; align-items:center; gap:4px; min-height:24px; }
.merchant-card { margin-bottom:18px; }
.metric span { color: #667085; font-size: 13px; }
.metric strong { color: #111827; font-size: 28px; }
.metric small { color: #667085; }
.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
h3 { margin: 0 0 16px; }
.sub-title { margin-top: 20px; }
.advice-card { margin-bottom: 18px; }
.run-card { margin-bottom: 18px; }
.advice-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.advice-item { min-height: 72px; display: grid; align-content: start; gap: 10px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f8fafc; }
.advice-item span:last-child { color: #475467; line-height: 1.6; }
.risk-list { display: grid; gap: 12px; }
.risk-list div { display: flex; align-items: center; justify-content: space-between; min-height: 72px; padding: 14px 16px; border: 1px solid #fee2e2; border-left: 4px solid #dc2626; border-radius: 8px; background: #fffafa; }
.risk-list span { color: #475467; }
.risk-list strong { color: #dc2626; font-size: 24px; }
@media (max-width: 1000px) { .metric-grid, .dashboard-grid, .business-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .metric-grid, .dashboard-grid, .advice-list, .business-grid { grid-template-columns: 1fr; } }
</style>
