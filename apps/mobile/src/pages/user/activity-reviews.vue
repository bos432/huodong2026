<template>
  <view class="reviews-page has-custom-nav">
    <view class="reviews-topbar">
      <view class="back-action app-press" role="button" tabindex="0" aria-label="返回上一页" @click="goBack" @keyup.enter="goBack" @keyup.space.prevent="goBack">返回</view>
      <text class="reviews-title">我的评价</text>
      <view class="refresh-action app-press" role="button" tabindex="0" :aria-busy="loading" aria-label="刷新我的活动评价" @click="loadReviews" @keyup.enter="loadReviews" @keyup.space.prevent="loadReviews">刷新</view>
    </view>

    <view class="reviews-intro app-enter">
      <text class="reviews-kicker">活动记录</text>
      <text class="reviews-heading">留下的每一份真实反馈</text>
      <text class="reviews-copy">评价会随活动记录保留，主办方回复也会在这里更新。</text>
    </view>

    <LoadingState v-if="loading" title="正在加载评价" description="正在同步你的活动评价。" />
    <EmptyState v-else-if="loadError" variant="error" title="活动评价加载失败" :description="loadError" action-text="重新加载" @action="loadReviews" />
    <template v-else-if="reviews.length">
      <view v-for="(item, index) in reviews" :key="item.id" class="review-card app-stagger app-press" :style="{ '--motion-delay': `${index * 42}ms` }" role="button" tabindex="0" :aria-label="`查看活动：${item.activity?.title || '活动评价'}`" @click="openActivity(item)" @keyup.enter="openActivity(item)" @keyup.space.prevent="openActivity(item)">
        <image v-if="item.activity?.coverUrl" class="review-cover" :src="item.activity.coverUrl" mode="aspectFill" />
        <view v-else class="review-cover review-cover-fallback">活动</view>
        <view class="review-content">
          <view class="review-head"><text class="review-activity">{{ item.activity?.title || "活动评价" }}</text><text class="review-status" :class="String(item.status || 'visible')">{{ statusText(item.status) }}</text></view>
          <text class="review-meta">{{ activityMeta(item) }}</text>
          <text class="review-rating">{{ stars(item.rating) }}</text>
          <text class="review-body">{{ item.content }}</text>
          <view v-if="item.adminReply" class="review-reply"><text>主办方回复</text><text>{{ item.adminReply }}</text></view>
          <text class="review-time">{{ formatDate(item.createdAt) }}</text>
        </view>
      </view>
    </template>
    <EmptyState v-else variant="review" title="还没有活动评价" description="参加并完成活动后，可以在报名详情提交真实评价。" action-text="查看我的报名" @action="goOrders" />

    <TabBar current="user" />
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import TabBar from "../../components/TabBar.vue";
import EmptyState from "../../components/EmptyState.vue";
import LoadingState from "../../components/LoadingState.vue";
import { reviewSafeText } from "../../review-safe-text";
import { createTenantLoadGuard, formatShanghaiDate } from "../../tenant-load-guard";

const reviews = ref<any[]>([]);
const loading = ref(false);
const loadError = ref("");
const loadGuard = createTenantLoadGuard();

function stars(value: unknown) {
  return "★".repeat(Math.max(1, Math.min(5, Number(value || 0))));
}

function statusText(value: unknown) {
  const status = String(value || "visible");
  if (status === "pending") return "审核中";
  if (status === "hidden" || status === "rejected") return "暂不展示";
  return "已提交";
}

function formatDate(value?: string) {
  return formatShanghaiDate(value, "刚刚");
}

function activityMeta(item: any) {
  const activity = item?.activity || {};
  const rows = [formatShanghaiDate(activity.startTime, ""), activity.location].filter(Boolean);
  return rows.join(" · ") || "活动信息待确认";
}

async function loadReviews() {
  const token = loadGuard.begin();
  loading.value = true;
  loadError.value = "";
  try {
    await ensureUser();
    const result = await request<any[]>("/public/me/activity-reviews");
    if (!loadGuard.isCurrent(token)) return;
    reviews.value = Array.isArray(result) ? result : [];
  } catch (error: any) {
    if (loadGuard.isCurrent(token)) loadError.value = reviewSafeText(error?.message || "活动评价加载失败，请稍后重试。");
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}

function openActivity(item: any) {
  const id = Number(item?.activity?.id || 0);
  if (!id) return;
  uni.navigateTo({ url: withTenantCode(`/pages/activity/detail?id=${id}`) });
}

function goOrders() {
  uni.navigateTo({ url: withTenantCode("/pages/user/orders?status=completed") });
}

function goBack() {
  uni.navigateBack();
}

onShow(loadReviews);
</script>

<style scoped>
.reviews-page{background:var(--app-page-bg);color:var(--app-text)}.reviews-title,.reviews-heading,.empty-heading{color:var(--app-text)}.back-action,.refresh-action,.reviews-kicker,.state-retry{color:var(--app-primary)}.reviews-intro{border-color:var(--app-border);background:var(--app-success-soft)}.reviews-copy,.empty-copy,.review-meta,.review-time{color:var(--app-text-muted)}.review-state,.review-card{border-color:var(--app-border);background:var(--app-surface)}.review-state{color:var(--app-text-muted)}.review-state.error{border-color:var(--app-danger);background:var(--app-danger-soft);color:var(--app-danger)}.review-cover{background:var(--app-surface-muted)}.review-cover-fallback,.review-status{background:var(--app-success-soft);color:var(--app-success)}.review-activity,.review-body{color:var(--app-text)}.review-status.pending{background:var(--app-warning-soft);color:var(--app-warning)}.review-status.hidden,.review-status.rejected{background:var(--app-danger-soft);color:var(--app-danger)}
</style>
