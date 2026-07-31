<template>
  <view class="container discovery-page has-custom-nav">
    <view class="discovery-topbar">
      <TenantSwitcher compact :tenant="tenant" @changed="handleTenantChanged" />
      <view class="topbar-actions">
        <view v-if="pageBrand.logoUrl" class="brand-mark"><image :src="pageBrand.logoUrl" mode="aspectFit" /></view>
        <view class="search-btn" role="button" tabindex="0" aria-label="搜索活动" @click="goSearch" @keyup.enter="goSearch" @keyup.space.prevent="goSearch"><text>搜索</text></view>
      </view>
    </view>

    <scroll-view class="discovery-categories" scroll-x :show-scrollbar="false" role="tablist" aria-label="活动分类">
      <view class="category-track">
        <view class="category-tab active" role="tab" aria-selected="true" tabindex="0" @click="goActivityList()" @keyup.enter="goActivityList()" @keyup.space.prevent="goActivityList()">推荐</view>
        <view v-for="category in categories" :key="category.id" class="category-tab" role="tab" aria-selected="false" tabindex="0" @click="goActivityList(category.id)" @keyup.enter="goActivityList(category.id)" @keyup.space.prevent="goActivityList(category.id)">{{ category.name }}</view>
      </view>
    </scroll-view>

    <view class="discovery-heading">
      <view>
        <text class="heading-title">{{ cityName }}正在发生</text>
        <text class="heading-copy">按日期发现适合你的线下活动</text>
      </view>
      <view class="all-link" role="button" tabindex="0" aria-label="查看全部活动" @click="goActivityList()" @keyup.enter="goActivityList()" @keyup.space.prevent="goActivityList()">全部</view>
    </view>

    <view v-if="activitiesLoading && !featuredActivities.length" class="activity-state" role="status" aria-live="polite">活动加载中...</view>
    <view v-else-if="activitiesError" class="activity-state activity-error" role="alert" aria-live="assertive">
      <text>{{ activitiesError }}</text>
      <button class="activity-retry" :disabled="activitiesLoading" aria-label="重新加载活动" @click="loadActivities">重试</button>
    </view>
    <view v-else-if="featuredActivities.length" class="activity-preview-list">
      <view v-for="activity in featuredActivities" :key="activity.id" class="activity-preview-card" role="button" tabindex="0" :aria-label="`查看活动：${activity.title}`" @click="goActivityDetail(activity)" @keyup.enter="goActivityDetail(activity)" @keyup.space.prevent="goActivityDetail(activity)">
        <view class="activity-date"><text>{{ activityDateParts(activity.startTime).month }}</text><text class="activity-date-day">{{ activityDateParts(activity.startTime).day }}</text><text>{{ activityDateParts(activity.startTime).time }}</text></view>
        <image v-if="activity.coverUrl" class="activity-cover" :src="activity.coverUrl" mode="aspectFill" />
        <view v-else class="activity-cover cover-fallback">{{ activity.category?.name || "活动" }}</view>
        <view class="activity-main">
          <view class="activity-tags"><text class="activity-category">{{ activity.category?.name || "活动" }}</text><text class="activity-status" :class="{ ended: activity.displayStatus === 'ended', full: activity.displayStatus === 'full' }">{{ activityStatusText(activity.displayStatus || activity.status) }}</text></view>
          <text class="activity-title">{{ activity.title }}</text>
          <text class="activity-meta">{{ formatActivityHour(activity.startTime) }} · {{ activity.location || "地点待确认" }}</text>
          <view class="activity-foot"><text>{{ activity.registeredCount || 0 }} 人已报名 · 余 {{ activity.remainingSeats ?? activity.capacity ?? "-" }}</text><text class="activity-price">{{ priceText(activity.price) }}</text></view>
        </view>
      </view>
    </view>
    <view v-else class="activity-empty"><text>暂未发布近期活动</text><text class="activity-empty-action" role="button" tabindex="0" @click="goMyRegistrations" @keyup.enter="goMyRegistrations" @keyup.space.prevent="goMyRegistrations">查看我的报名</text></view>

    <PageDecorationBlocks :sections="supplementalSections" />

    <view style="height:120rpx;"></view>
    <TabBar current="index" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
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
const categories = ref<any[]>([]);
const activitiesLoading = ref(false);
const activitiesError = ref("");
const loadedActivitiesTenantCode = ref("");
const activityLoadGuard = createTenantLoadGuard();
const cityName = computed(() => tenant.value?.region || tenant.value?.name || pageBrand.name || "本地");
const supplementalSections = computed(() => contentSections.value.filter((section) => ![
  "featured_activities",
  "activity_tabs",
  "activity_feed"
].includes(section.type)));

const shareOptions = {
  title: () => `${pageBrand.name || "慢π"}活动报名`,
  path: "/pages/index/index"
};
onShareAppMessage(() => defaultMiniProgramShare(shareOptions));
onShareTimeline(() => defaultMiniProgramTimelineShare(shareOptions));
onShow(showMiniProgramShareMenu);

onShow(async () => {
  await applyTenantBootstrapDefault();
  await Promise.allSettled([loadPageTheme(), loadDecoration(), loadActivities(), loadCategories()]);
  const beforeTenantCode = getCurrentTenantCode();
  void resolveTenantByCurrentLocation({ silent: true }).then(async () => {
    if (getCurrentTenantCode() === beforeTenantCode) return;
    await Promise.allSettled([loadPageTheme(), loadDecoration(), loadActivities(), loadCategories()]);
    if (beforeTenantCode) uni.showToast({ title: "已按当前位置切换慢π城市", icon: "none" });
  });
});

async function handleTenantChanged() {
  await loadPageTheme();
  await Promise.allSettled([loadDecoration(), loadActivities(), loadCategories()]);
}

async function loadActivities() {
  const loadToken = activityLoadGuard.begin();
  if (loadedActivitiesTenantCode.value && loadedActivitiesTenantCode.value !== loadToken.tenantCode) featuredActivities.value = [];
  activitiesLoading.value = true;
  activitiesError.value = "";
  try {
    const result = await request<any>("/public/activities?page=1&pageSize=8&status=open&featured=true");
    if (!activityLoadGuard.isCurrent(loadToken)) return;
    let items = Array.isArray(result) ? result : result?.items || [];
    if (!items.length) {
      const fallback = await request<any>("/public/activities?page=1&pageSize=8");
      if (!activityLoadGuard.isCurrent(loadToken)) return;
      items = Array.isArray(fallback) ? fallback : fallback?.items || [];
    }
    featuredActivities.value = items.slice(0, 8);
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

async function loadCategories() {
  try {
    const result = await request<any[]>("/public/categories");
    categories.value = Array.isArray(result) ? result.slice(0, 10) : [];
  } catch {
    categories.value = [];
  }
}

function goActivityList(categoryId?: number) {
  const suffix = categoryId ? `?categoryId=${categoryId}` : "";
  uni.navigateTo({ url: withTenantCode(`/pages/activity/list${suffix}`) });
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
.discovery-page { padding-top: 20rpx; background: #f7f9f8; }
.discovery-topbar { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; min-height: 82rpx; }
.topbar-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 12rpx; }
.brand-mark { width: 52rpx; height: 52rpx; overflow: hidden; border-radius: 50%; background: #e9f9f0; }
.brand-mark image { width: 100%; height: 100%; }
.search-btn { min-width: 82rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; padding: 0 16rpx; border-radius: 8rpx; background: #eef2f0; color: #27362f; font-size: 22rpx; font-weight: 800; }
.discovery-categories { width: 100%; margin: 24rpx 0 28rpx; white-space: nowrap; }
.category-track { display: inline-flex; gap: 12rpx; padding-right: 28rpx; }
.category-tab { min-width: 92rpx; height: 58rpx; display: inline-flex; align-items: center; justify-content: center; padding: 0 20rpx; border: 1rpx solid #e0e8e4; border-radius: 8rpx; background: #fff; color: #56635d; font-size: 24rpx; font-weight: 700; }
.category-tab.active { border-color: #20d477; background: #20d477; color: #072d19; }
.discovery-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20rpx; margin-bottom: 18rpx; }
.heading-title { display: block; color: #15251c; font-size: 36rpx; font-weight: 900; line-height: 1.25; }
.heading-copy { display: block; margin-top: 6rpx; color: #839189; font-size: 22rpx; }
.all-link { flex: 0 0 auto; min-height: 48rpx; display: flex; align-items: center; color: #11894c; font-size: 24rpx; font-weight: 800; }
.activity-state { display: grid; gap: 12rpx; padding: 24rpx; border-radius: 8rpx; background: #fff; color: #667085; font-size: 24rpx; line-height: 1.55; }
.activity-error { border: 1rpx solid #fecaca; background: #fff7f7; color: #b91c1c; }
.activity-retry { width: max-content; min-height: 56rpx; margin: 0; padding: 0 20rpx; border: 0; border-radius: 8rpx; background: #eafbf1; color: #08753f; font-size: 23rpx; font-weight: 800; }
.activity-retry::after { border: 0; }
.activity-preview-list { display: grid; gap: 16rpx; }
.activity-preview-card { display: grid; grid-template-columns: 74rpx 184rpx minmax(0, 1fr); gap: 14rpx; align-items: stretch; min-height: 184rpx; padding: 14rpx; border: 1rpx solid #e2eae6; border-radius: 8rpx; background: #fff; box-shadow: 0 8rpx 20rpx rgba(23, 48, 36, 0.035); }
.activity-date { display: grid; align-content: center; justify-items: center; gap: 3rpx; border-radius: 8rpx; background: #eafbf1; color: #078347; font-size: 19rpx; font-weight: 800; }
.activity-date-day { color: #14271b; font-size: 36rpx; line-height: 1.05; font-weight: 900; }
.activity-cover { width: 184rpx; height: 156rpx; align-self: center; border-radius: 8rpx; background: #e4ece7; }
.cover-fallback { display: flex; align-items: center; justify-content: center; width: 184rpx; height: 156rpx; align-self: center; padding: 12rpx; border-radius: 8rpx; background: #eafbf1; color: #08753f; font-size: 24rpx; font-weight: 800; text-align: center; }
.activity-main { min-width: 0; display: grid; align-content: center; gap: 8rpx; }
.activity-tags { display: flex; align-items: center; gap: 8rpx; min-width: 0; }
.activity-category,.activity-status { max-width: 50%; overflow: hidden; padding: 4rpx 8rpx; border-radius: 5rpx; text-overflow: ellipsis; white-space: nowrap; font-size: 19rpx; font-weight: 800; }
.activity-category { background: #eef2f0; color: #59655f; }
.activity-status { background: #e8faf0; color: #078347; }.activity-status.full { background: #fff2dd; color: #b66300; }.activity-status.ended { background: #f0f2f1; color: #7a8580; }
.activity-title { display: -webkit-box; overflow: hidden; color: #13241a; font-size: 28rpx; font-weight: 900; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.activity-meta { overflow: hidden; color: #607169; font-size: 21rpx; text-overflow: ellipsis; white-space: nowrap; }
.activity-foot { display: flex; align-items: center; justify-content: space-between; gap: 8rpx; min-width: 0; color: #809087; font-size: 19rpx; }.activity-foot text:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.activity-price { flex: 0 0 auto; color: #dc6900; font-size: 23rpx; font-weight: 900; }
.activity-empty { display: flex; justify-content: space-between; align-items: center; gap: 16rpx; padding: 24rpx; border-radius: 8rpx; background: #fff; color: #718078; font-size: 24rpx; }.activity-empty-action { color: #08753f; font-weight: 800; }
.category-tab:focus-visible, .search-btn:focus-visible, .all-link:focus-visible, .activity-preview-card:focus-visible, .activity-empty-action:focus-visible { outline: 3rpx solid #20d477; outline-offset: 3rpx; }

</style>
