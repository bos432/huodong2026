<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { fetchMyCharityTransactions, getCurrentRouteWithQuery, getUserToken, request } from "../../api";
import AppBottomNav from "../../components/AppBottomNav.vue";

const detail = ref<any | null>(null);
const myDetail = ref<any | null>(null);
const transactions = ref<any[]>([]);
const projects = ref<any[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const page = ref(1);
const pageSize = 20;
const total = ref(0);

const ambassador = computed(() => myDetail.value?.ambassador || {});
const pool = computed(() => detail.value?.pool || detail.value || {});
const setting = computed(() => detail.value?.setting || {});
const hasMore = computed(() => transactions.value.length < total.value);
const hasMyCharity = computed(() => Boolean(myDetail.value));

async function load() {
  loading.value = true;
  try {
    page.value = 1;
    transactions.value = [];
    total.value = 0;
    myDetail.value = null;
    const [summary, publicProjects] = await Promise.all([
      request<any>("/public/charity/summary"),
      request<any[]>("/public/charity/projects")
    ]);
    detail.value = summary;
    projects.value = publicProjects?.length ? publicProjects : summary?.projects || [];
    if (!getUserToken()) return;
    try {
      const [myCharity, txPage] = await Promise.all([
        request<any>("/public/me/charity"),
        fetchMyCharityTransactions(1, pageSize)
      ]);
      myDetail.value = myCharity;
      transactions.value = txPage.items || [];
      total.value = Number(txPage.total || transactions.value.length);
    } catch {
      myDetail.value = null;
      transactions.value = [];
      total.value = 0;
    }
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (!hasMyCharity.value || !hasMore.value || loadingMore.value) return;
  loadingMore.value = true;
  try {
    const nextPage = page.value + 1;
    const txPage = await fetchMyCharityTransactions(nextPage, pageSize);
    transactions.value = [...transactions.value, ...(txPage.items || [])];
    total.value = Number(txPage.total || transactions.value.length);
    page.value = nextPage;
  } finally {
    loadingMore.value = false;
  }
}

function money(value: string | number | undefined | null) {
  return Number(value || 0).toFixed(2);
}

function formatTime(value?: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function typeText(type?: string) {
  const map: Record<string, string> = {
    charity_accrual: "订单公益金",
    charity_reversal: "退款冲回",
    project_disbursement: "项目拨付",
    manual_adjust: "人工调整"
  };
  return map[type || ""] || "公益流水";
}

function sourceText(type?: string) {
  const map: Record<string, string> = {
    activity_order: "活动报名",
    mall_order: "商城订单",
    manual: "人工登记"
  };
  return map[type || ""] || "活动报名";
}

function statusText(status?: string) {
  const map: Record<string, string> = {
    fundraising: "筹集中",
    pending_execution: "待执行",
    executing: "执行中",
    pending_acceptance: "待验收",
    completed: "已完成",
    archived: "已归档"
  };
  return map[status || ""] || "筹集中";
}

function goVolunteer() {
  uni.navigateTo({ url: "/pages/volunteer/index" });
}

function goLogin() {
  const redirect = encodeURIComponent(getCurrentRouteWithQuery());
  uni.navigateTo({ url: `/pages/user/login?redirect=${redirect}` });
}

onMounted(load);
</script>

<template>
  <view class="charity-page">
    <view v-if="loading" class="empty-card">加载中...</view>
    <template v-else>
      <view class="hero">
        <view>
          <view class="label">公益公开公示</view>
          <view class="amount">¥{{ money(pool.totalAccrued) }}</view>
          <view class="sub">{{ setting.publicNote || "公益金来自平台订单规则，用户无需额外支付。" }}</view>
        </view>
        <view class="hero-badge">公益金</view>
      </view>

      <view v-if="hasMyCharity && ambassador.eligible" class="ambassador-card active">
        <view>
          <view class="ambassador-label">电子勋章</view>
          <view class="ambassador-title">{{ ambassador.title }} {{ ambassador.number }}</view>
          <view class="ambassador-copy">你的累计公益金已达到 ¥{{ money(ambassador.threshold) }}，系统自动点亮该勋章。</view>
        </view>
      </view>
      <view v-else-if="hasMyCharity" class="ambassador-card">
        <view>
          <view class="ambassador-label">{{ setting.userDisplayName || "我的公益贡献" }}</view>
          <view class="ambassador-title">累计 ¥{{ money(myDetail?.contributionAmount) }}</view>
          <view class="ambassador-copy">累计公益金达到 ¥{{ money(ambassador.threshold) }} 后自动展示电子勋章和编号。</view>
        </view>
      </view>
      <view v-else class="ambassador-card">
        <view>
          <view class="ambassador-label">个人公益明细</view>
          <view class="ambassador-title">登录后查看我的公益贡献</view>
          <view class="ambassador-copy">公开公示无需登录；登录后可查看个人订单公益金、退款保留公益金和电子勋章进度。</view>
        </view>
        <view class="login-link" @click="goLogin">去登录</view>
      </view>

      <view class="stats">
        <view><text>公益池累计</text><strong>¥{{ money(pool.totalAccrued) }}</strong></view>
        <view><text>当前可用</text><strong>¥{{ money(pool.availableAmount) }}</strong></view>
        <view><text>已拨付</text><strong>¥{{ money(pool.totalDisbursed) }}</strong></view>
        <view><text>参与用户</text><strong>{{ pool.participantCount || 0 }}</strong></view>
      </view>

      <view class="ambassador-card volunteer-entry">
        <view>
          <view class="ambassador-label">公益参与</view>
          <view class="ambassador-title">报名志愿任务，沉淀服务记录</view>
          <view class="ambassador-copy">活动协助、课程助教、公益执行和帮扶回访都可形成可追踪的志愿服务记录。</view>
        </view>
        <view class="login-link" @click="goVolunteer">查看志愿任务</view>
      </view>

      <view class="card">
        <view class="section-head">
          <view class="section-title">我的公益明细</view>
          <view class="section-sub">每一笔订单对应的公益金</view>
        </view>
        <view v-if="!hasMyCharity" class="empty">登录后可查看个人公益金明细。</view>
        <view v-else-if="!transactions.length" class="empty">暂无公益金明细，完成活动报名支付后会在这里显示。</view>
        <view v-for="item in transactions" :key="item.id" class="tx">
          <view class="tx-head">
            <view>
              <view class="tx-title">{{ item.sourceTitle || item.activityTitle || "活动订单" }}</view>
              <view class="tx-meta">{{ sourceText(item.sourceType) }} · {{ item.orderNo || "-" }}</view>
            </view>
            <view class="tx-amount" :class="{ debit: item.direction === 'debit' }">{{ item.direction === "debit" ? "-" : "+" }}¥{{ money(item.amount) }}</view>
          </view>
          <view class="tx-grid">
            <view><text>实付</text><strong>¥{{ money(item.paidAmount) }}</strong></view>
            <view><text>公益比例</text><strong>{{ money(item.ratePercent) }}%</strong></view>
            <view><text>预计退款</text><strong>¥{{ money(item.refundAmount) }}</strong></view>
          </view>
          <view class="tx-foot">
            <text>{{ typeText(item.type) }}</text>
            <text>{{ item.retainedOnRefund ? "退款保留公益金" : item.refundStatus ? `退款状态：${item.refundStatus}` : formatTime(item.createdAt) }}</text>
          </view>
        </view>
        <view v-if="hasMore" class="load-more" @click="loadMore">{{ loadingMore ? "加载中..." : "加载更多" }}</view>
      </view>

      <view class="card">
        <view class="section-head">
          <view class="section-title">公益项目</view>
          <view class="section-sub">公益池使用和执行公示</view>
        </view>
        <view v-if="!projects.length" class="empty">暂无公开公益项目，后续执行公益事项后会在这里公示。</view>
        <view v-for="project in projects" :key="project.id" class="project">
          <image v-if="project.coverUrl" class="cover" :src="project.coverUrl" mode="aspectFill" />
          <view class="project-body">
            <view class="project-head">
              <view class="project-title">{{ project.title }}</view>
              <view class="status">{{ statusText(project.status) }}</view>
            </view>
            <view class="desc">{{ project.description || "公益项目执行信息将持续更新。" }}</view>
            <view class="progress-line">
              <view class="progress-fill" :style="{ width: `${Math.min(Number(project.progressPercent || 0), 100)}%` }"></view>
            </view>
            <view class="project-meta">目标 ¥{{ money(project.targetAmount) }} · 已拨付 ¥{{ money(project.disbursedAmount) }} · {{ project.progressPercent || 0 }}%</view>
            <view v-if="project.disbursements?.length" class="timeline">
              <view class="timeline-title">拨付凭证</view>
              <view v-for="item in project.disbursements" :key="item.id" class="timeline-item">
                <text>¥{{ money(item.amount) }} · {{ formatTime(item.createdAt) }}</text>
                <text>{{ item.remark || "公益项目拨付" }}</text>
              </view>
            </view>
            <view v-if="project.updates?.length" class="timeline">
              <view class="timeline-title">执行动态</view>
              <view v-for="item in project.updates" :key="item.id" class="timeline-item">
                <text>{{ item.title }} · {{ formatTime(item.publishedAt || item.createdAt) }}</text>
                <text>{{ item.content }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>

    <AppBottomNav current-path="/pages/user/my" />
  </view>
</template>

<style scoped>
.charity-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 160rpx;
  background:
    linear-gradient(180deg, #f7efe3 0%, #fbf7ef 38%, #f4eadc 100%);
  color: #263d3c;
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
  padding: 36rpx 30rpx;
  border-radius: 30rpx;
  background:
    linear-gradient(135deg, rgba(33, 75, 78, 0.96), rgba(129, 55, 48, 0.9)),
    #214b4e;
  color: #fffaf2;
  box-shadow: 0 18rpx 46rpx rgba(36, 60, 60, 0.18);
}

.label {
  color: rgba(255, 250, 242, 0.72);
  font-size: 25rpx;
  font-weight: 800;
}

.amount {
  margin-top: 12rpx;
  font-size: 58rpx;
  line-height: 1;
  font-weight: 950;
}

.sub {
  margin-top: 16rpx;
  color: rgba(255, 250, 242, 0.78);
  font-size: 25rpx;
  line-height: 1.6;
}

.hero-badge {
  flex: 0 0 auto;
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 250, 242, 0.16);
  color: #fffaf2;
  font-size: 23rpx;
  font-weight: 900;
}

.ambassador-card,
.card,
.empty-card {
  margin-top: 20rpx;
  padding: 26rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 24rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 12rpx 34rpx rgba(72, 55, 38, 0.08);
}

.ambassador-card.active {
  border-color: rgba(202, 151, 72, 0.45);
  background: #fff8e8;
}

.volunteer-entry {
  border-color: rgba(79, 124, 88, 0.42);
}

.ambassador-label {
  color: #8b4a3e;
  font-size: 23rpx;
  font-weight: 800;
}

.ambassador-title {
  margin-top: 10rpx;
  color: #263d3c;
  font-size: 32rpx;
  font-weight: 950;
}

.ambassador-copy {
  margin-top: 10rpx;
  color: #7f7467;
  font-size: 24rpx;
  line-height: 1.55;
}

.login-link {
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20rpx;
  border-radius: 999rpx;
  background: #214b4e;
  color: #fffaf2;
  font-size: 25rpx;
  font-weight: 900;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
  margin: 22rpx 0;
}

.stats view {
  min-width: 0;
  display: grid;
  gap: 8rpx;
  padding: 22rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.46);
  border-radius: 22rpx;
  background: rgba(255, 252, 246, 0.94);
  box-shadow: 0 10rpx 26rpx rgba(72, 55, 38, 0.06);
}

.stats text,
.empty,
.desc,
.project-meta,
.timeline-item,
.section-sub,
.tx-meta,
.tx-foot {
  color: #7f7467;
  font-size: 24rpx;
  line-height: 1.5;
}

.stats strong {
  color: #8b4a3e;
  font-size: 30rpx;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 14rpx;
}

.section-title {
  color: #263d3c;
  font-size: 31rpx;
  font-weight: 950;
}

.empty {
  padding: 34rpx 0;
  text-align: center;
}

.tx {
  padding: 22rpx 0;
  border-top: 1rpx solid rgba(218, 204, 184, 0.72);
}

.tx:first-of-type {
  border-top: 0;
}

.tx-head {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
}

.tx-title {
  color: #263d3c;
  font-size: 28rpx;
  font-weight: 900;
}

.tx-amount {
  flex: 0 0 auto;
  color: #3f745b;
  font-size: 30rpx;
  font-weight: 950;
}

.tx-amount.debit {
  color: #a85d2a;
}

.tx-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10rpx;
  margin-top: 16rpx;
}

.tx-grid view {
  min-width: 0;
  display: grid;
  gap: 4rpx;
  padding: 12rpx;
  border-radius: 16rpx;
  background: #f7efe4;
}

.tx-grid text {
  color: #8f8172;
  font-size: 21rpx;
}

.tx-grid strong {
  color: #263d3c;
  font-size: 23rpx;
}

.tx-foot {
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: 12rpx;
}

.load-more {
  height: 74rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: #f1e3d0;
  color: #214b4e;
  font-size: 25rpx;
  font-weight: 900;
}

.project {
  padding: 22rpx 0;
  border-top: 1rpx solid rgba(218, 204, 184, 0.72);
}

.project:first-of-type {
  border-top: 0;
}

.cover {
  width: 100%;
  height: 220rpx;
  display: block;
  margin-bottom: 16rpx;
  border-radius: 18rpx;
  background: #f1e3d0;
}

.project-body {
  display: grid;
  gap: 12rpx;
}

.project-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.project-title {
  min-width: 0;
  color: #263d3c;
  font-size: 29rpx;
  font-weight: 950;
}

.status {
  flex: 0 0 auto;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #e4f0e7;
  color: #3f745b;
  font-size: 22rpx;
  font-weight: 900;
}

.progress-line {
  height: 12rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: #e8dccb;
}

.progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: #b84435;
}

.timeline {
  margin-top: 10rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid rgba(199, 181, 157, 0.36);
}

.timeline-title {
  color: #8b4a3e;
  font-size: 24rpx;
  font-weight: 900;
}

.timeline-item {
  display: grid;
  gap: 4rpx;
  margin-top: 10rpx;
}

.timeline-item text:first-child {
  color: #263d3c;
  font-weight: 850;
}
</style>
