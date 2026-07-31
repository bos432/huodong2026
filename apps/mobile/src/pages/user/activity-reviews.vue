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

    <view v-if="loading" class="review-state" role="status" aria-live="polite">正在同步活动评价...</view>
    <view v-else-if="loadError" class="review-state error" role="alert" aria-live="assertive">
      <text>{{ loadError }}</text>
      <view class="state-retry app-press" role="button" tabindex="0" aria-label="重新加载活动评价" @click="loadReviews" @keyup.enter="loadReviews" @keyup.space.prevent="loadReviews">重新加载</view>
    </view>
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
    <view v-else class="review-state empty-state">
      <text class="empty-heading">还没有活动评价</text>
      <text class="empty-copy">参加并完成活动后，可以在报名详情提交真实评价。</text>
      <view class="state-retry app-press" role="button" tabindex="0" aria-label="查看我的报名" @click="goOrders" @keyup.enter="goOrders" @keyup.space.prevent="goOrders">查看我的报名</view>
    </view>

    <TabBar current="user" />
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import TabBar from "../../components/TabBar.vue";
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
.reviews-page{min-height:100vh;padding:24rpx 24rpx calc(188rpx + env(safe-area-inset-bottom));background:#f6f8f7;color:#173f3a;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}.reviews-topbar{display:grid;grid-template-columns:116rpx minmax(0,1fr) 116rpx;align-items:center;min-height:64rpx}.reviews-title{text-align:center;color:#173f3a;font-size:32rpx;font-weight:900}.back-action,.refresh-action{color:#08753f;font-size:24rpx;font-weight:800}.refresh-action{text-align:right}.reviews-intro{display:grid;gap:10rpx;margin:18rpx 0 20rpx;padding:28rpx;border:1rpx solid #d9eadf;border-radius:16rpx;background:#effbf4}.reviews-kicker{color:#08753f;font-size:21rpx;font-weight:900}.reviews-heading{color:#173f3a;font-size:34rpx;font-weight:950}.reviews-copy{color:#607169;font-size:23rpx;line-height:1.55}.review-state{display:grid;gap:14rpx;justify-items:center;padding:48rpx 28rpx;border:1rpx solid #e2eae6;border-radius:16rpx;background:#fff;color:#687871;font-size:25rpx;line-height:1.55;text-align:center}.review-state.error{border-color:#fecaca;background:#fff7f7;color:#b42318}.state-retry{min-height:56rpx;display:flex;align-items:center;justify-content:center;padding:0 20rpx;border-radius:12rpx;background:#eafbf1;color:#08753f;font-size:23rpx;font-weight:850}.empty-heading{color:#173f3a;font-size:30rpx;font-weight:900}.empty-copy{color:#718078;font-size:23rpx}.review-card{display:grid;grid-template-columns:168rpx minmax(0,1fr);gap:18rpx;margin-bottom:16rpx;padding:16rpx;border:1rpx solid #e2eae6;border-radius:16rpx;background:#fff;box-shadow:0 8rpx 20rpx rgba(23,48,36,.035)}.review-cover{width:168rpx;height:168rpx;border-radius:12rpx;background:#e4ece7}.review-cover-fallback{display:grid;place-items:center;color:#08753f;font-size:27rpx;font-weight:900;background:#eafbf1}.review-content{display:grid;align-content:start;gap:8rpx;min-width:0}.review-head{display:flex;align-items:center;gap:10rpx}.review-activity{min-width:0;flex:1;overflow:hidden;color:#19362a;font-size:27rpx;font-weight:900;text-overflow:ellipsis;white-space:nowrap}.review-status{flex:0 0 auto;padding:4rpx 9rpx;border-radius:6rpx;background:#eafbf1;color:#08753f;font-size:19rpx;font-weight:800}.review-status.pending{background:#fff2d9;color:#a45d00}.review-status.hidden,.review-status.rejected{background:#fff0f0;color:#b42318}.review-meta,.review-time{overflow:hidden;color:#7a8881;font-size:20rpx;text-overflow:ellipsis;white-space:nowrap}.review-rating{color:#dc6900;font-size:24rpx;letter-spacing:2rpx}.review-body{display:-webkit-box;overflow:hidden;color:#405148;font-size:22rpx;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:2}.review-reply{display:grid;gap:4rpx;padding:10rpx;border-radius:8rpx;background:#f1faf4;color:#08753f;font-size:20rpx;line-height:1.4}.review-reply text:first-child{font-weight:850}.review-time{margin-top:2rpx}@media (min-width:900px){.reviews-page{width:760px;max-width:100%;margin:0 auto}}
</style>
