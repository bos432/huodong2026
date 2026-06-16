<script setup lang="ts">
import { onMounted, ref } from "vue";
import { request } from "../../api";
import AppBottomNav from "../../components/AppBottomNav.vue";

const summary = ref<any | null>(null);
const projects = ref<any[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const [summaryData, projectRows] = await Promise.all([
      request<any>("/public/charity/summary").catch(() => null),
      request<any[]>("/public/charity/projects").catch(() => [])
    ]);
    summary.value = summaryData;
    projects.value = projectRows?.length ? projectRows : summaryData?.projects || [];
  } finally {
    loading.value = false;
  }
}

function money(value: string | number | undefined | null) {
  return Number(value || 0).toFixed(2);
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
    <view class="hero">
      <view>
        <view class="label">平台公益池</view>
        <view class="amount">¥{{ money(summary?.availableAmount) }}</view>
        <view class="sub">公益金来自平台订单收入计提，用户无需额外支付。</view>
      </view>
    </view>

    <view class="stats">
      <view><text>累计公益金</text><strong>¥{{ money(summary?.totalAccrued) }}</strong></view>
      <view><text>当前可用</text><strong>¥{{ money(summary?.availableAmount) }}</strong></view>
      <view><text>已拨付</text><strong>¥{{ money(summary?.totalDisbursed) }}</strong></view>
      <view><text>退款冲回</text><strong>¥{{ money(summary?.totalReversed) }}</strong></view>
      <view><text>参与用户</text><strong>{{ summary?.participantCount || 0 }}</strong></view>
    </view>

    <view class="card">
      <view class="section-title">公益项目</view>
      <view v-if="loading" class="empty">加载中...</view>
      <view v-else-if="!projects.length" class="empty">暂无公开公益项目，后续执行公益事项后会在这里公示。</view>
      <view v-for="project in projects" v-else :key="project.id" class="project">
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

    <AppBottomNav current-path="/pages/user/my" />
  </view>
</template>

<style scoped>
.charity-page { min-height: 100vh; padding: 24rpx 24rpx 160rpx; background: var(--page-bg-layer, #f4f6f8); color: var(--text-color, #111827); }
.hero { padding: 34rpx 30rpx; border-radius: var(--card-radius, 8px); background: linear-gradient(135deg, #14532d 0%, #0f766e 100%); color: #fff; }
.label { color: rgba(255,255,255,.72); font-size: 25rpx; font-weight: 800; }
.amount { margin-top: 10rpx; font-size: 56rpx; line-height: 1; font-weight: 950; }
.sub { margin-top: 14rpx; color: rgba(255,255,255,.78); font-size: 25rpx; line-height: 1.5; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14rpx; margin: 20rpx 0; }
.stats view { min-width: 0; display: grid; gap: 8rpx; padding: 20rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.stats text, .empty, .desc, .project-meta { color: var(--muted-color, #667085); font-size: 24rpx; line-height: 1.45; }
.stats strong { color: #14532d; font-size: 30rpx; }
.card { padding: 24rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.section-title { margin-bottom: 14rpx; font-size: 31rpx; font-weight: 950; }
.empty { padding: 34rpx 0; text-align: center; }
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
