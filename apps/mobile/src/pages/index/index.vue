<template>
  <view class="container has-custom-nav">
    <TenantSwitcher :tenant="tenant" title="当前城市" @changed="handleTenantChanged" />

    <view class="header-row">
      <view class="brand-title">
        <image v-if="pageBrand.logoUrl" class="brand-logo" :src="pageBrand.logoUrl" mode="aspectFit" />
        <text class="title-xxl brand-name">{{ pageBrand.name }}</text>
      </view>
      <view class="search-btn" @click="goSearch">
        <text class="search-icon">搜</text>
      </view>
    </view>

    <view class="home-activity-panel">
      <view class="home-activity-head">
        <view>
          <text class="home-activity-kicker">城市活动</text>
          <text class="home-activity-title">近期可参加的活动</text>
          <text class="home-activity-copy">查看时间、地点和报名状态，找到适合参加的活动。</text>
        </view>
        <view class="home-activity-all" role="button" tabindex="0" aria-label="查看全部活动" @click="goActivityList" @keyup.enter="goActivityList" @keyup.space.prevent="goActivityList">全部活动</view>
      </view>

      <view v-if="activitiesLoading && !featuredActivities.length" class="activity-state" role="status" aria-live="polite">近期活动加载中...</view>
      <view v-else-if="activitiesError" class="activity-state activity-error" role="alert" aria-live="assertive">
        <text>{{ activitiesError }}</text>
        <button class="activity-retry" :disabled="activitiesLoading" aria-label="重新加载近期活动" @click="loadActivities">重试</button>
      </view>
      <view v-else-if="featuredActivities.length" class="activity-preview-list">
        <view v-for="activity in featuredActivities" :key="activity.id" class="activity-preview-card" role="button" tabindex="0" :aria-label="`查看活动：${activity.title}`" @click="goActivityDetail(activity)" @keyup.enter="goActivityDetail(activity)" @keyup.space.prevent="goActivityDetail(activity)">
          <view class="activity-date"><text>{{ activityDateParts(activity.startTime).month }}</text><text class="activity-date-day">{{ activityDateParts(activity.startTime).day }}</text><text>{{ activityDateParts(activity.startTime).time }}</text></view>
          <image v-if="activity.coverUrl" class="activity-cover" :src="activity.coverUrl" mode="aspectFill" />
          <view v-else class="activity-cover cover-fallback">{{ activity.category?.name || "活动" }}</view>
          <view class="activity-main">
            <view class="activity-tags"><text class="activity-category">{{ activity.category?.name || "活动" }}</text><text class="activity-status">{{ activityStatusText(activity.displayStatus || activity.status) }}</text></view>
            <text class="activity-title">{{ activity.title }}</text>
            <text class="activity-meta">{{ formatActivityHour(activity.startTime) }} · {{ activity.location || "地点待确认" }}</text>
            <view class="activity-foot"><text>{{ activity.registeredCount || 0 }} 人已报名 · 余 {{ activity.remainingSeats ?? activity.capacity ?? "-" }}</text><text class="activity-price">{{ priceText(activity.price) }}</text></view>
          </view>
        </view>
      </view>
      <view v-else class="activity-empty"><text>暂未发布近期活动</text><text class="activity-empty-action" role="button" tabindex="0" @click="goMyRegistrations" @keyup.enter="goMyRegistrations" @keyup.space.prevent="goMyRegistrations">查看我的报名</text></view>
    </view>

    <PageDecorationBlocks :sections="contentSections" />

    <view style="height:120rpx;"></view>
    <TabBar current="index" />
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onShareAppMessage, onShareTimeline, onShow } from "@dcloudio/uni-app";
import { applyTenantBootstrapDefault, getCurrentTenantCode, request, withTenantCode } from "../../api";
import { loadPageTheme, pageBrand } from "../../theme";
import { defaultMiniProgramShare, defaultMiniProgramTimelineShare, showMiniProgramShareMenu } from "../../share";
import { resolveTenantByCurrentLocation } from "../../tenant-location";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import TabBar from "../../components/TabBar.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import { usePageDecoration } from "../../decoration";
import { reviewSafeText } from "../../review-safe-text";

const { tenant, contentSections, loadDecoration } = usePageDecoration("home", "/pages/index/index");
const featuredActivities = ref<any[]>([]);
const activitiesLoading = ref(false);
const activitiesError = ref("");
const loadedActivitiesTenantCode = ref("");
const activityLoadGuard = createTenantLoadGuard();

const shareOptions = {
  title: () => `${pageBrand.name || "慢π"}活动报名`,
  path: "/pages/index/index"
};
onShareAppMessage(() => defaultMiniProgramShare(shareOptions));
onShareTimeline(() => defaultMiniProgramTimelineShare(shareOptions));
onShow(showMiniProgramShareMenu);

onShow(async () => {
  await applyTenantBootstrapDefault();
  await Promise.allSettled([loadPageTheme(), loadDecoration(), loadActivities()]);
  const beforeTenantCode = getCurrentTenantCode();
  void resolveTenantByCurrentLocation({ silent: true }).then(async () => {
    if (getCurrentTenantCode() === beforeTenantCode) return;
    await Promise.allSettled([loadPageTheme(), loadDecoration(), loadActivities()]);
    if (beforeTenantCode) uni.showToast({ title: "已按当前位置切换慢π城市", icon: "none" });
  });
});

async function handleTenantChanged() {
  await loadPageTheme();
  await Promise.allSettled([loadDecoration(), loadActivities()]);
}

async function loadActivities() {
  const loadToken = activityLoadGuard.begin();
  if (loadedActivitiesTenantCode.value && loadedActivitiesTenantCode.value !== loadToken.tenantCode) featuredActivities.value = [];
  activitiesLoading.value = true;
  activitiesError.value = "";
  try {
    const result = await request<any>("/public/activities?page=1&pageSize=3&status=open&featured=true");
    if (!activityLoadGuard.isCurrent(loadToken)) return;
    let items = Array.isArray(result) ? result : result?.items || [];
    if (!items.length) {
      const fallback = await request<any>("/public/activities?page=1&pageSize=3&status=open");
      if (!activityLoadGuard.isCurrent(loadToken)) return;
      items = Array.isArray(fallback) ? fallback : fallback?.items || [];
    }
    featuredActivities.value = items.slice(0, 3);
    loadedActivitiesTenantCode.value = loadToken.tenantCode;
  } catch (error: any) {
    if (!activityLoadGuard.isCurrent(loadToken)) return;
    activitiesError.value = reviewSafeText(error?.message || "近期活动加载失败");
  } finally {
    if (activityLoadGuard.isCurrent(loadToken)) activitiesLoading.value = false;
  }
}

function goSearch() {
  uni.navigateTo({ url: withTenantCode("/pages/search/index") });
}

function goActivityList() {
  uni.navigateTo({ url: withTenantCode("/pages/activity/list") });
}

function goMyRegistrations() {
  uni.navigateTo({ url: withTenantCode("/pages/user/my") });
}

function goActivityDetail(activity: any) {
  uni.navigateTo({ url: withTenantCode(`/pages/activity/detail?id=${activity.id}`) });
}

function activityStatusText(status: string) {
  if (status === "full") return "已满员";
  if (status === "ended") return "已结束";
  return "报名中";
}

function priceText(price: string | number | undefined) {
  return Number(price || 0) > 0 ? `￥${Number(price).toFixed(2)}` : "免费";
}

function formatActivityDate(value: string, part: "date" | "time") {
  if (!value) return part === "date" ? "待定" : "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const text = String(value).replace("T", " ");
    return part === "date" ? text.slice(5, 10) || "待定" : text.slice(11, 16);
  }
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (partValue: number) => String(partValue).padStart(2, "0");
  return part === "date"
    ? `${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
    : `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

function formatActivityMonthDay(value: string) { return formatActivityDate(value, "date"); }
function formatActivityHour(value: string) { return formatActivityDate(value, "time"); }

function activityDateParts(value: string) {
  const dateText = formatActivityMonthDay(value);
  if (!dateText.includes("-")) return { month: "日期", day: "待定", time: formatActivityHour(value) || "待定" };
  const [month, day] = dateText.split("-");
  return { month: `${month}月`, day, time: formatActivityHour(value) || "待定" };
}

</script>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0 16rpx;
}

.brand-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.brand-logo {
  width: 58rpx;
  height: 58rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.68);
}

.brand-name {
  font-family: "STKaiti", "KaiTi", serif;
}

.search-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(74, 107, 138, 0.08);
  border-radius: 20rpx;
}

.search-icon {
  color: #4A6B8A;
  font-size: 26rpx;
  font-weight: 700;
}

.home-activity-panel { margin: 4rpx 0 22rpx; padding: 28rpx; border: 1rpx solid rgba(15, 118, 110, 0.1); border-radius: 16rpx; background: #ffffff; box-shadow: 0 8rpx 24rpx rgba(20, 72, 64, 0.05); }
.home-activity-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; margin-bottom: 20rpx; }
.home-activity-kicker { display: block; color: #0f766e; font-size: 22rpx; font-weight: 800; }
.home-activity-title { display: block; margin-top: 6rpx; color: #173f3a; font-size: 36rpx; font-weight: 900; line-height: 1.3; }
.home-activity-copy { display: block; margin-top: 8rpx; color: #66827d; font-size: 23rpx; line-height: 1.5; }
.home-activity-all { flex: 0 0 auto; min-height: 58rpx; display: flex; align-items: center; padding: 0 16rpx; border-radius: 8rpx; background: #edf7f5; color: #0f766e; font-size: 23rpx; font-weight: 800; }
.activity-state { display: grid; gap: 12rpx; padding: 20rpx; border-radius: 10rpx; background: #f4f8f7; color: #66827d; font-size: 24rpx; line-height: 1.55; }
.activity-error { border: 1rpx solid #fecaca; background: #fff7f7; color: #b91c1c; }
.activity-retry { width: max-content; min-height: 56rpx; margin: 0; padding: 0 20rpx; border: 0; border-radius: 8rpx; background: #edf7f5; color: #0f766e; font-size: 23rpx; font-weight: 800; }
.activity-retry::after { border: 0; }
.activity-preview-list { display: grid; gap: 14rpx; }
.activity-preview-card { display: grid; grid-template-columns: 82rpx 144rpx minmax(0, 1fr); gap: 16rpx; align-items: stretch; min-height: 148rpx; padding: 14rpx; border: 1rpx solid #dce9e6; border-radius: 8rpx; background: #fff; }
.activity-date { display: grid; align-content: center; justify-items: center; gap: 2rpx; min-height: 100%; border-radius: 8rpx; background: #edf7f5; color: #0f766e; font-size: 20rpx; font-weight: 700; }
.activity-date-day { color: #172b4d; font-size: 34rpx; line-height: 1.1; font-weight: 800; }
.activity-cover { width: 144rpx; height: 144rpx; border-radius: 8rpx; background: #dce9e6; }
.cover-fallback { display: flex; align-items: center; justify-content: center; width: 144rpx; height: 144rpx; padding: 12rpx; border-radius: 8rpx; box-sizing: border-box; background: #e9f3f0; color: #0f766e; font-size: 24rpx; font-weight: 700; text-align: center; }
.activity-main { min-width: 0; display: grid; align-content: space-between; gap: 7rpx; }
.activity-tags { display: flex; align-items: center; gap: 8rpx; min-width: 0; }
.activity-category,.activity-status { max-width: 50%; overflow: hidden; padding: 4rpx 8rpx; border-radius: 6rpx; text-overflow: ellipsis; white-space: nowrap; font-size: 20rpx; font-weight: 700; }
.activity-category { background: #f3f5f7; color: #475569; }
.activity-status { background: #edf7f5; color: #0f766e; }
.activity-title { overflow: hidden; color: #172b4d; font-size: 30rpx; font-weight: 800; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.activity-meta { overflow: hidden; color: #64748b; font-size: 22rpx; text-overflow: ellipsis; white-space: nowrap; }
.activity-foot { display: flex; align-items: center; justify-content: space-between; gap: 8rpx; min-width: 0; color: #718a85; font-size: 20rpx; }
.activity-foot text:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.activity-price { flex: 0 0 auto; color: #b45309; font-size: 24rpx; font-weight: 800; }
.activity-empty { display: flex; justify-content: space-between; align-items: center; gap: 16rpx; padding: 20rpx; border-radius: 10rpx; background: #f4f8f7; color: #66827d; font-size: 24rpx; }
.activity-empty-action { color: #0f766e; font-weight: 800; }
.home-activity-all:focus-visible, .activity-preview-card:focus-visible, .activity-empty-action:focus-visible { outline: 3rpx solid #0f766e; outline-offset: 3rpx; }

</style>
