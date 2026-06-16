<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ensureUser, fetchMyCharityTransactions, request } from "../../api";
import AppBottomNav from "../../components/AppBottomNav.vue";

const detail = ref<any | null>(null);
const transactions = ref<any[]>([]);
const projects = ref<any[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const page = ref(1);
const pageSize = 20;
const total = ref(0);

const ambassador = computed(() => detail.value?.ambassador || {});
const pool = computed(() => detail.value?.pool || {});
const setting = computed(() => detail.value?.setting || {});
const hasMore = computed(() => transactions.value.length < total.value);

async function load() {
  loading.value = true;
  try {
    await ensureUser();
    page.value = 1;
    const [myCharity, txPage] = await Promise.all([
      request<any>("/public/me/charity"),
      fetchMyCharityTransactions(1, pageSize)
    ]);
    detail.value = myCharity;
    transactions.value = txPage.items || [];
    total.value = Number(txPage.total || transactions.value.length);
    projects.value = myCharity?.projects || [];
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (!hasMore.value || loadingMore.value) return;
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
    completed: "已完成",
    archived: "已归档"
  };
  return map[status || ""] || "筹集中";
}

onMounted(load);
</script>

<template>
  <view class="charity-page">
    <view v-if="loading" class="empty-card">加载中...</view>
    <template v-else>
      <view class="hero">
        <view>
          <view class="label">{{ setting.userDisplayName || "我的公益基金" }}</view>
          <view class="amount">¥{{ money(detail?.contributionAmount) }}</view>
          <view class="sub">{{ setting.publicNote || "公益金来自平台订单规则，用户无需额外支付。" }}</view>
        </view>
        <view class="hero-badge">公益金</view>
      </view>

      <view v-if="ambassador.eligible" class="ambassador-card active">
        <view>
          <view class="ambassador-label">电子勋章</view>
          <view class="ambassador-title">{{ ambassador.title }} {{ ambassador.number }}</view>
          <view class="ambassador-copy">你的累计公益金已达到 ¥{{ money(ambassador.threshold) }}，系统自动点亮该勋章。</view>
        </view>
      </view>
      <view v-else class="ambassador-card">
        <view>
          <view class="ambassador-label">公益大使进度</view>
          <view class="ambassador-title">距离{{ ambassador.title || "公益大使" }}还差 ¥{{ money(Math.max(Number(ambassador.threshold || 0) - Number(detail?.contributionAmount || 0), 0)) }}</view>
          <view class="ambassador-copy">累计公益金达到 ¥{{ money(ambassador.threshold) }} 后自动展示电子勋章和编号。</view>
        </view>
      </view>

      <view class="stats">
        <view><text>公益池累计</text><strong>¥{{ money(pool.totalAccrued) }}</strong></view>
        <view><text>当前可用</text><strong>¥{{ money(pool.availableAmount) }}</strong></view>
        <view><text>已拨付</text><strong>¥{{ money(pool.totalDisbursed) }}</strong></view>
        <view><text>参与用户</text><strong>{{ pool.participantCount || 0 }}</strong></view>
      </view>

      <view class="card">
        <view class="section-head">
          <view class="section-title">公益明细</view>
          <view class="section-sub">每一笔订单对应的公益金</view>
        </view>
        <view v-if="!transactions.length" class="empty">暂无公益金明细，完成活动报名支付后会在这里显示。</view>
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
          </view>
        </view>
      </view>
    </template>

    <AppBottomNav current-path="/pages/user/my" />
  </view>
</template>

<style scoped>
.charity-page { min-height: 100vh; padding: 24rpx 24rpx 160rpx; background: var(--page-bg-layer, #f4f6f8); color: var(--text-color, #111827); }
.hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; padding: 34rpx 30rpx; border-radius: var(--card-radius, 8px); background: linear-gradient(135deg, #14532d 0%, #0f766e 100%); color: #fff; }
.label { color: rgba(255,255,255,.72); font-size: 25rpx; font-weight: 800; }
.amount { margin-top: 10rpx; font-size: 58rpx; line-height: 1; font-weight: 950; }
.sub { margin-top: 14rpx; color: rgba(255,255,255,.78); font-size: 25rpx; line-height: 1.5; }
.hero-badge { flex: 0 0 auto; padding: 10rpx 16rpx; border-radius: 999px; background: rgba(255,255,255,.16); color: #fff; font-size: 23rpx; font-weight: 900; }
.ambassador-card { margin-top: 18rpx; padding: 24rpx; border-radius: var(--card-radius, 8px); background: #fff; border: 1px solid #e5e7eb; box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.ambassador-card.active { background: #fefce8; border-color: #fde68a; }
.ambassador-label { color: #667085; font-size: 23rpx; font-weight: 800; }
.ambassador-title { margin-top: 8rpx; color: #111827; font-size: 32rpx; font-weight: 950; }
.ambassador-copy { margin-top: 8rpx; color: #667085; font-size: 24rpx; line-height: 1.45; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14rpx; margin: 20rpx 0; }
.stats view { min-width: 0; display: grid; gap: 8rpx; padding: 20rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.stats text, .empty, .desc, .project-meta, .section-sub, .tx-meta, .tx-foot { color: var(--muted-color, #667085); font-size: 24rpx; line-height: 1.45; }
.stats strong { color: #14532d; font-size: 30rpx; }
.card, .empty-card { margin-top: 20rpx; padding: 24rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16rpx; margin-bottom: 14rpx; }
.section-title { font-size: 31rpx; font-weight: 950; }
.empty { padding: 34rpx 0; text-align: center; }
.tx { padding: 20rpx 0; border-top: 1px solid #eef2f7; }
.tx:first-of-type { border-top: 0; }
.tx-head { display: flex; justify-content: space-between; gap: 18rpx; }
.tx-title { color: #111827; font-size: 28rpx; font-weight: 900; }
.tx-amount { flex: 0 0 auto; color: #15803d; font-size: 30rpx; font-weight: 950; }
.tx-amount.debit { color: #b45309; }
.tx-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10rpx; margin-top: 16rpx; }
.tx-grid view { min-width: 0; display: grid; gap: 4rpx; padding: 12rpx; border-radius: 8px; background: #f8fafc; }
.tx-grid text { color: #667085; font-size: 21rpx; }
.tx-grid strong { color: #111827; font-size: 23rpx; }
.tx-foot { display: flex; justify-content: space-between; gap: 12rpx; margin-top: 12rpx; }
.load-more { margin-top: 10rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: #f3f4f6; color: #14532d; font-size: 25rpx; font-weight: 900; }
.project { padding: 20rpx 0; border-top: 1px solid #eef2f7; }
.project:first-of-type { border-top: 0; }
.cover { width: 100%; height: 220rpx; border-radius: 8px; margin-bottom: 16rpx; background: #f3f4f6; }
.project-body { display: grid; gap: 12rpx; }
.project-head { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; }
.project-title { min-width: 0; font-size: 29rpx; font-weight: 950; }
.status { flex: 0 0 auto; padding: 8rpx 14rpx; border-radius: 999px; background: #dcfce7; color: #15803d; font-size: 22rpx; font-weight: 900; }
.progress-line { height: 12rpx; border-radius: 999px; background: #e5e7eb; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 999px; background: #16a34a; }
</style>
