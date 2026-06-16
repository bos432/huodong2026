<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { api, downloadFile } from "../api";

const route = useRoute();
const router = useRouter();
const activities = ref<any[]>([]);
const selectedId = ref<number>();
const data = ref<any>();
const loading = ref(false);

function routeActivityId() {
  const activityId = typeof route.query.activityId === "string" ? Number(route.query.activityId) : undefined;
  return activityId && Number.isFinite(activityId) ? activityId : undefined;
}

const actionAdvice = computed(() => {
  const rates = data.value?.rates || {};
  const funnel = data.value?.funnel || {};
  if (!funnel.registrationCount) return { label: "先做获客", message: "当前报名数据不足，优先检查活动标题、封面、渠道和报名入口。" };
  if (Number(rates.signupRate || 0) < 5) return { label: "优化转化", message: "浏览到报名偏低，优先优化卖点、价格、讲师介绍和报名说明。" };
  if (Number(rates.checkInRate || 0) < 60) return { label: "提升到场", message: "签到率偏低，建议加强开课提醒、客服跟进和现场指引。" };
  if (Number(rates.paymentRate || 0) < 70) return { label: "提升收款", message: "报名到付款偏低，建议缩短付款链路、明确支付方式和客服跟进。" };
  return { label: "沉淀复制", message: "活动漏斗较稳定，建议总结渠道、话术和现场流程，形成可复制模板。" };
});

const actionChecklist = computed(() => {
  if (!data.value || !selectedId.value) return [];
  const rates = data.value.rates || {};
  const funnel = data.value.funnel || {};
  const items: Array<{ title: string; desc: string; tone: string; path: string; query?: Record<string, number | string> }> = [];
  if (!funnel.registrationCount || Number(rates.signupRate || 0) < 5) {
    items.push({
      title: "优化活动获客页",
      desc: "检查标题、封面、讲师介绍、价格说明和报名入口，先提升浏览到报名转化。",
      tone: "warning",
      path: "/activities",
      query: { activityId: selectedId.value }
    });
  }
  if (funnel.registrationCount && Number(rates.paymentRate || 0) < 70) {
    items.push({
      title: "跟进未付款报名",
      desc: "进入订单列表筛选本活动，优先处理待付款订单、线下收款确认和客服提醒。",
      tone: "danger",
      path: "/orders",
      query: { activityId: selectedId.value, status: "pending_payment" }
    });
  }
  if (funnel.approvedCount && Number(rates.checkInRate || 0) < 70) {
    items.push({
      title: "设置到场提醒",
      desc: "进入通知中心预选本活动，配置开课前提醒，减少报名成功但不到场。",
      tone: "warning",
      path: "/notifications",
      query: { activityId: selectedId.value }
    });
  }
  if (funnel.checkInCount && Number(rates.reviewRate || 0) < 50) {
    items.push({
      title: "沉淀评价与口碑",
      desc: "查看评价管理，补充课后评价引导，把高质量反馈用于下一场活动宣传。",
      tone: "muted",
      path: "/reviews",
      query: { activityId: selectedId.value }
    });
  }
  if (funnel.registrationCount) {
    items.push({
      title: "沉淀用户标签",
      desc: "给本活动报名用户批量打标签，方便后续复购邀约、分层通知和会员运营。",
      tone: "success",
      path: "/tags",
      query: { activityId: selectedId.value }
    });
    items.push({
      title: "查看会员转化",
      desc: "查看本活动报名用户的积分、等级、消费和活跃记录，筛出复购与会员运营对象。",
      tone: "success",
      path: "/members",
      query: { activityId: selectedId.value }
    });
  }
  if (funnel.registrationCount >= 10 && Number(rates.checkInRate || 0) >= 70 && Number(rates.paymentRate || 0) >= 70) {
    items.push({
      title: "复制成下一场样板",
      desc: "当前报名、收款和到场表现较稳，可以复用主题、渠道、话术和现场流程。",
      tone: "success",
      path: "/activities",
      query: { activityId: selectedId.value }
    });
  }
  if (!items.length) {
    items.push({
      title: "继续观察数据",
      desc: "当前数据还不够形成明确判断，建议补充通知触达、评价和用户标签后再复盘。",
      tone: "muted",
      path: "/registrations",
      query: { activityId: selectedId.value }
    });
  }
  return items;
});

function openAction(item: { path: string; query?: Record<string, number | string> }) {
  router.push({ path: item.path, query: item.query });
}

async function loadActivities() {
  const result = await api.get<any, any>("/admin/activities", { params: { page: 1, pageSize: 100 } });
  activities.value = Array.isArray(result) ? result : result.items || [];
  selectedId.value = routeActivityId() || selectedId.value || activities.value[0]?.id;
  if (selectedId.value) await loadRecap();
}

async function loadRecap() {
  if (!selectedId.value) return;
  loading.value = true;
  try {
    data.value = await api.get(`/admin/activities/${selectedId.value}/recap`);
  } finally {
    loading.value = false;
  }
}

async function exportRecap() {
  if (!selectedId.value) return;
  try {
    await downloadFile(`/admin/activities/${selectedId.value}/recap/export`, `活动复盘-${selectedId.value}.xlsx`);
  } catch (error: any) {
    ElMessage.error(error.message || "导出失败");
  }
}

onMounted(loadActivities);

watch(
  () => route.query.activityId,
  async () => {
    const nextActivityId = routeActivityId();
    if (nextActivityId && selectedId.value !== nextActivityId) {
      selectedId.value = nextActivityId;
      await loadRecap();
    }
  }
);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>活动复盘</h2>
      <div class="toolbar-actions">
        <el-select v-model="selectedId" filterable placeholder="选择活动" style="width: 360px" @change="loadRecap">
          <el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" />
        </el-select>
        <el-button @click="loadRecap">刷新</el-button>
        <el-button type="primary" @click="exportRecap">导出 Excel</el-button>
      </div>
    </div>

    <el-empty v-if="!selectedId" description="暂无活动" />
    <template v-else-if="data">
      <div class="summary" v-loading="loading">
        <div class="hero-card">
          <span>活动</span>
          <strong>{{ data.activity.title }}</strong>
          <small>{{ data.activity.location }}</small>
        </div>
        <div class="metric"><span>报名</span><strong>{{ data.funnel.registrationCount }}</strong></div>
        <div class="metric"><span>签到率</span><strong>{{ data.rates.checkInRate }}%</strong></div>
        <div class="metric"><span>评价均分</span><strong>{{ data.reviewSummary.averageRating }}</strong></div>
        <div class="metric"><span>通知触达</span><strong>{{ data.notifications }}</strong></div>
      </div>

      <div class="two-col">
        <div class="table-card">
          <h3>核心漏斗</h3>
          <div class="funnel-row"><span>浏览</span><strong>{{ data.funnel.viewCount }}</strong></div>
          <div class="funnel-row"><span>分享访问</span><strong>{{ data.funnel.shareVisitCount }}</strong></div>
          <div class="funnel-row"><span>报名</span><strong>{{ data.funnel.registrationCount }}</strong></div>
          <div class="funnel-row"><span>付款</span><strong>{{ data.funnel.paidCount }}</strong></div>
          <div class="funnel-row"><span>报名成功</span><strong>{{ data.funnel.approvedCount }}</strong></div>
          <div class="funnel-row"><span>签到</span><strong>{{ data.funnel.checkInCount }}</strong></div>
          <div class="funnel-row"><span>评价</span><strong>{{ data.funnel.reviewCount }}</strong></div>
        </div>

        <div class="table-card">
          <h3>运营结论</h3>
          <div class="advice-box">
            <span>{{ actionAdvice.label }}</span>
            <strong>{{ actionAdvice.message }}</strong>
          </div>
          <div class="next-actions">
            <div class="section-title">下一步行动</div>
            <button v-for="item in actionChecklist" :key="item.title" type="button" class="next-action" :class="item.tone" @click="openAction(item)">
              <span>{{ item.title }}</span>
              <small>{{ item.desc }}</small>
            </button>
          </div>
          <div class="insight">
            <span>获客效率</span>
            <strong>{{ data.rates.signupRate }}%</strong>
            <small>浏览到报名转化</small>
          </div>
          <div class="insight">
            <span>收款效率</span>
            <strong>{{ data.rates.paymentRate }}%</strong>
            <small>报名到付款转化</small>
          </div>
          <div class="insight">
            <span>现场到场</span>
            <strong>{{ data.rates.checkInRate }}%</strong>
            <small>成功报名到签到</small>
          </div>
          <div class="insight">
            <span>口碑沉淀</span>
            <strong>{{ data.rates.reviewRate }}%</strong>
            <small>签到到评价转化</small>
          </div>
        </div>
      </div>

      <div class="table-card records">
        <h3>最近评价</h3>
        <el-table :data="data.reviewSummary.latestReviews" stripe empty-text="暂无评价">
          <el-table-column label="用户" width="150">
            <template #default="{ row }">{{ row.user?.nickname || row.user?.phone || "-" }}</template>
          </el-table-column>
          <el-table-column prop="rating" label="评分" width="90" />
          <el-table-column prop="content" label="评价内容" min-width="280" show-overflow-tooltip />
          <el-table-column prop="createdAt" label="时间" width="180" />
        </el-table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.toolbar-actions { display: flex; align-items: center; gap: 10px; }
.summary { display: grid; grid-template-columns: 1.7fr repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
.hero-card, .metric { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; display: grid; gap: 8px; }
.hero-card span, .metric span, .insight span { color: #667085; font-size: 13px; }
.hero-card strong { font-size: 22px; }
.metric strong { font-size: 28px; }
.hero-card small, .insight small { color: #667085; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.records { margin-top: 16px; }
h3 { margin: 0 0 16px; }
.funnel-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #edf0f5; }
.funnel-row:last-child { border-bottom: 0; }
.insight { display: grid; gap: 4px; padding: 12px 0; border-bottom: 1px solid #edf0f5; }
.insight:last-child { border-bottom: 0; }
.insight strong { color: #0f766e; font-size: 22px; }
.advice-box { border: 1px solid #dbeafe; border-radius: 8px; background: #f8fbff; padding: 12px; display: grid; gap: 6px; margin-bottom: 8px; }
.advice-box span { color: #0f766e; font-weight: 700; }
.advice-box strong { color: #111827; font-size: 14px; line-height: 1.5; }
.next-actions { display: grid; gap: 8px; margin: 12px 0; }
.section-title { color: #475467; font-size: 13px; font-weight: 700; }
.next-action { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; padding: 12px; display: grid; gap: 4px; text-align: left; cursor: pointer; }
.next-action:hover { border-color: #0f766e; background: #f0fdfa; }
.next-action span { color: #111827; font-weight: 700; }
.next-action small { color: #667085; line-height: 1.5; }
.next-action.warning { border-left: 3px solid #d97706; }
.next-action.danger { border-left: 3px solid #dc2626; }
.next-action.success { border-left: 3px solid #0f766e; }
.next-action.muted { border-left: 3px solid #94a3b8; }
@media (max-width: 1100px) {
  .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hero-card { grid-column: 1 / -1; }
  .two-col { grid-template-columns: 1fr; }
}
</style>
