<template>
  <view class="container discovery-page has-custom-nav">
    <view class="discovery-topbar app-enter-soft">
      <TenantSwitcher compact :tenant="tenant" @changed="handleTenantChanged" />
      <view class="topbar-actions">
        <view v-if="pageBrand.logoUrl" class="brand-mark"><image :src="pageBrand.logoUrl" mode="aspectFit" /></view>
        <view class="search-btn app-press" role="button" tabindex="0" aria-label="搜索活动" @click="goSearch" @keyup.enter="goSearch" @keyup.space.prevent="goSearch"><view class="search-glyph" aria-hidden="true" /></view>
      </view>
    </view>

    <template v-for="section in homeSections" :key="section.id">
      <template v-if="section.id === featuredSection?.id">
        <view v-if="leadActivity && featuredDisplay !== 'list'" class="feature-showcase app-enter" style="animation-delay: 42ms">
          <view class="feature-lead app-press" role="button" tabindex="0" @click="goActivityDetail(leadActivity)" @keyup.enter="goActivityDetail(leadActivity)">
            <image v-if="leadActivity.coverUrl" class="app-media-motion" :src="leadActivity.coverUrl" mode="aspectFill" />
            <view v-else class="feature-fallback">{{ leadActivity.category?.name || "本地活动" }}</view><view class="feature-shade" />
            <view class="feature-copy feature-lead-copy"><text>本周主推 · {{ activityDateParts(leadActivity.startTime).month }}{{ activityDateParts(leadActivity.startTime).day }}日</text><text>{{ leadActivity.title }}</text><text>{{ formatActivityHour(leadActivity.startTime) }} · {{ leadActivity.location || "地点待确认" }} · {{ priceText(leadActivity.price) }}</text></view>
          </view>
          <scroll-view v-if="sideActivities.length" class="feature-side-rail" scroll-x :show-scrollbar="false"><view class="feature-side-track"><view v-for="activity in sideActivities" :key="activity.id" class="feature-side-card app-press" role="button" tabindex="0" @click="goActivityDetail(activity)" @keyup.enter="goActivityDetail(activity)"><image v-if="activity.coverUrl" class="app-media-motion" :src="activity.coverUrl" mode="aspectFill" /><view v-else class="feature-fallback">{{ activity.category?.name || "活动" }}</view><view class="feature-shade" /><view class="feature-copy"><text>{{ activityDateParts(activity.startTime).month }}{{ activityDateParts(activity.startTime).day }}日</text><text>{{ activity.title }}</text><text>{{ priceText(activity.price) }}</text></view></view></view></scroll-view>
        </view>
        <view v-else-if="leadActivity" class="activity-preview-list featured-list app-enter" style="animation-delay: 42ms"><view v-for="(activity, index) in heroActivities" :key="activity.id" class="activity-preview-card app-stagger app-press" :style="{ '--motion-delay': `${index * 42}ms` }" role="button" tabindex="0" :aria-label="`查看活动：${activity.title}`" @click="goActivityDetail(activity)" @keyup.enter="goActivityDetail(activity)" @keyup.space.prevent="goActivityDetail(activity)"><view class="activity-date"><text>{{ activityDateParts(activity.startTime).month }}</text><text class="activity-date-day">{{ activityDateParts(activity.startTime).day }}</text><text>{{ activityDateParts(activity.startTime).time }}</text></view><image v-if="activity.coverUrl" class="activity-cover app-media-motion" :src="activity.coverUrl" mode="aspectFill" /><view v-else class="activity-cover cover-fallback">{{ activity.category?.name || "活动" }}</view><view class="activity-main"><view class="activity-tags"><text class="activity-category">{{ activity.category?.name || "活动" }}</text><text class="activity-status" :class="{ ended: activity.displayStatus === 'ended', full: activity.displayStatus === 'full' }">{{ activityStatusText(activity.displayStatus || activity.status) }}</text></view><text class="activity-title">{{ activity.title }}</text><text class="activity-meta">{{ formatActivityHour(activity.startTime) }} · {{ activity.location || "地点待确认" }}</text><view class="activity-foot"><text>{{ activity.registeredCount || 0 }} 人已报名 · 余 {{ activity.remainingSeats ?? activity.capacity ?? "-" }}</text><text class="activity-price">{{ priceText(activity.price) }}</text></view></view></view></view>
        <view v-else class="discovery-empty-hero app-enter" style="animation-delay: 42ms"><text class="discovery-empty-kicker">近期活动</text><text class="discovery-empty-title">暂时没有可报名的活动</text><text class="discovery-empty-copy">可先查看往期活动，主办方发布新活动后会显示在这里。</text><view v-if="publicActivityArchiveEnabled" class="discovery-empty-action app-press" role="button" tabindex="0" @click="goActivityHistory" @keyup.enter="goActivityHistory">查看活动回顾</view></view>
      </template>

      <scroll-view v-else-if="section.id === tabsSection?.id" class="discovery-categories app-enter" style="animation-delay: 78ms" scroll-x :show-scrollbar="false" role="tablist" aria-label="活动分类"><view class="category-track"><view class="category-tab active app-press" role="tab" aria-selected="true" tabindex="0" @click="goActivityList()" @keyup.enter="goActivityList()" @keyup.space.prevent="goActivityList()">推荐</view><view v-for="category in categories" :key="category.id" class="category-tab app-press" role="tab" aria-selected="false" tabindex="0" @click="goActivityList(category.id)" @keyup.enter="goActivityList(category.id)" @keyup.space.prevent="goActivityList(category.id)">{{ category.name }}</view></view></scroll-view>

      <template v-else-if="section.id === feedSection?.id">
        <view class="discovery-heading app-enter" style="animation-delay: 112ms"><view><text class="heading-title">{{ section.title || `${cityName}正在发生` }}</text><text class="heading-copy">{{ section.subtitle || "按日期发现适合你的线下活动" }}</text></view><view class="all-link app-press" role="button" tabindex="0" aria-label="查看全部活动" @click="goActivityList()" @keyup.enter="goActivityList()" @keyup.space.prevent="goActivityList()">全部</view></view>
        <view v-if="activitiesLoading && !featuredActivities.length" class="activity-state" role="status" aria-live="polite">活动加载中...</view><view v-else-if="activitiesError" class="activity-state activity-error" role="alert" aria-live="assertive"><text>{{ activitiesError }}</text><button class="activity-retry" :disabled="activitiesLoading" aria-label="重新加载活动" @click="loadActivities">重试</button></view>
        <view v-else-if="feedActivities.length" class="activity-preview-list"><view v-for="(activity, index) in feedActivities" :key="activity.id" class="activity-preview-card app-stagger app-press" :style="{ '--motion-delay': `${index * 42}ms` }" role="button" tabindex="0" :aria-label="`查看活动：${activity.title}`" @click="goActivityDetail(activity)" @keyup.enter="goActivityDetail(activity)" @keyup.space.prevent="goActivityDetail(activity)"><view class="activity-date"><text>{{ activityDateParts(activity.startTime).month }}</text><text class="activity-date-day">{{ activityDateParts(activity.startTime).day }}</text><text>{{ activityDateParts(activity.startTime).time }}</text></view><image v-if="activity.coverUrl" class="activity-cover app-media-motion" :src="activity.coverUrl" mode="aspectFill" /><view v-else class="activity-cover cover-fallback">{{ activity.category?.name || "活动" }}</view><view class="activity-main"><view class="activity-tags"><text class="activity-category">{{ activity.category?.name || "活动" }}</text><text class="activity-status" :class="{ ended: activity.displayStatus === 'ended', full: activity.displayStatus === 'full' }">{{ activityStatusText(activity.displayStatus || activity.status) }}</text></view><text class="activity-title">{{ activity.title }}</text><text class="activity-meta">{{ formatActivityHour(activity.startTime) }} · {{ activity.location || "地点待确认" }}</text><view class="activity-foot"><text>{{ activity.registeredCount || 0 }} 人已报名 · 余 {{ activity.remainingSeats ?? activity.capacity ?? "-" }}</text><text class="activity-price">{{ priceText(activity.price) }}</text></view></view></view></view>
        <view v-else class="activity-empty"><text>近期没有开放报名的活动</text><text v-if="publicActivityArchiveEnabled" class="activity-empty-action" role="button" tabindex="0" @click="goActivityHistory" @keyup.enter="goActivityHistory" @keyup.space.prevent="goActivityHistory">查看活动回顾</text></view>
      </template>

      <PageDecorationBlocks v-else-if="section.type !== 'search_bar'" :sections="[section]" />
    </template>

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

const { tenant, sections, loadDecoration } = usePageDecoration("home", "/pages/index/index");
const featuredActivities = ref<any[]>([]);
const categories = ref<any[]>([]);
const publicActivityArchiveEnabled = ref(false);
const tenantSwitcherEnabled = ref(true);
const activitiesLoading = ref(false);
const activitiesError = ref("");
const loadedActivitiesTenantCode = ref("");
const activityLoadGuard = createTenantLoadGuard();
const cityName = computed(() => tenant.value?.region || tenant.value?.name || pageBrand.name || "本地");
const decorationSections = computed(() => Array.isArray(sections.value) ? sections.value : []);
const featuredSection = computed(() => decorationSections.value.find((section) => section.enabled && section.type === "featured_activities"));
const feedSection = computed(() => decorationSections.value.find((section) => section.enabled && section.type === "activity_feed"));
const tabsSection = computed(() => decorationSections.value.find((section) => section.enabled && section.type === "activity_tabs"));
const homeSections = computed(() => decorationSections.value.filter((section) => section.enabled && !["bottom_nav", "my_page", "inner_pages"].includes(section.type)));
const featuredDisplay = computed(() => String(featuredSection.value?.config?.display || "lead_rail"));
const showEndedInFeed = computed(() => publicActivityArchiveEnabled.value && feedSection.value?.config?.showEnded === true);
const featuredLimit = computed(() => Math.max(1, Math.min(Number(featuredSection.value?.config?.limit || 4), 8)));
const sideLimit = computed(() => Math.max(0, featuredLimit.value - 1));
function sectionActivities(section?: any) {
  return Array.isArray(section?.data?.activities) ? section.data.activities : [];
}
function uniqueActivities(rows: any[]) {
  const seen = new Set<number>();
  return rows.filter((item) => {
    const id = Number(item?.id || 0);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
const configuredFeaturedActivities = computed(() => sectionActivities(featuredSection.value).filter((item) => item?.displayStatus !== "ended"));
const configuredFeedActivities = computed(() => sectionActivities(feedSection.value).filter((item) => showEndedInFeed.value || item?.displayStatus !== "ended"));
const displayedActivities = computed(() => {
  const configured = uniqueActivities([...configuredFeaturedActivities.value, ...configuredFeedActivities.value]);
  return configured.length || Boolean(featuredSection.value || feedSection.value) ? configured : featuredActivities.value;
});
const heroActivities = computed(() => (configuredFeaturedActivities.value.length ? configuredFeaturedActivities.value : displayedActivities.value).slice(0, featuredLimit.value));
const leadActivity = computed(() => heroActivities.value[0] || null);
const sideActivities = computed(() => heroActivities.value.slice(1, sideLimit.value + 1));
const feedActivities = computed(() => {
  const limit = Math.max(1, Math.min(Number(feedSection.value?.config?.limit || 6), 30));
  const source = configuredFeedActivities.value.length ? configuredFeedActivities.value : displayedActivities.value.slice(featuredLimit.value);
  const featuredIds = new Set(featuredDisplay.value === "list" ? heroActivities.value.map((item) => Number(item.id)) : []);
  return source.filter((item) => !featuredIds.has(Number(item.id))).slice(0, limit);
});

const shareOptions = {
  title: () => `${pageBrand.name || "慢π"}活动报名`,
  path: "/pages/index/index"
};
onShareAppMessage(() => defaultMiniProgramShare(shareOptions));
onShareTimeline(() => defaultMiniProgramTimelineShare(shareOptions));
onShow(showMiniProgramShareMenu);

onShow(async () => {
  const bootstrap = await applyTenantBootstrapDefault();
  tenantSwitcherEnabled.value = bootstrap?.tenantSwitcherEnabled !== false;
  await Promise.allSettled([loadPageTheme(), loadDecoration(), loadOperationSetting()]);
  await loadActivities();
  await loadCategories();
  const beforeTenantCode = getCurrentTenantCode();
  if (!tenantSwitcherEnabled.value) return;
  void resolveTenantByCurrentLocation({ silent: true }).then(async () => {
    if (getCurrentTenantCode() === beforeTenantCode) return;
    await Promise.allSettled([loadPageTheme(), loadDecoration(), loadOperationSetting()]);
    await Promise.allSettled([loadActivities(), loadCategories()]);
    if (beforeTenantCode) uni.showToast({ title: "已按当前位置切换慢π城市", icon: "none" });
  });
});

async function handleTenantChanged() {
  await loadPageTheme();
  await Promise.all([loadDecoration(), loadOperationSetting()]);
  await Promise.allSettled([loadActivities(), loadCategories()]);
}

async function loadActivities() {
  const loadToken = activityLoadGuard.begin();
  if (loadedActivitiesTenantCode.value && loadedActivitiesTenantCode.value !== loadToken.tenantCode) featuredActivities.value = [];
  activitiesLoading.value = true;
  activitiesError.value = "";
  try {
    const configured = uniqueActivities([...configuredFeaturedActivities.value, ...configuredFeedActivities.value]);
    if (featuredSection.value || feedSection.value) {
      featuredActivities.value = configured;
      loadedActivitiesTenantCode.value = loadToken.tenantCode;
      return;
    }
    const result = await request<any>(`/public/activities?page=1&pageSize=${Math.max(8, featuredLimit.value)}&status=open&featured=true`);
    if (!activityLoadGuard.isCurrent(loadToken)) return;
    const featured = Array.isArray(result) ? result : result?.items || [];
    const feedLimit = Math.max(1, Math.min(Number(feedSection.value?.config?.limit || 6), 12));
    const fallback = await request<any>(`/public/activities?page=1&pageSize=${Math.min(20, featuredLimit.value + feedLimit)}&status=open`);
    if (!activityLoadGuard.isCurrent(loadToken)) return;
    const regular = Array.isArray(fallback) ? fallback : fallback?.items || [];
    const seen = new Set<number>();
    const items = [...featured, ...regular].filter((item: any) => {
      const id = Number(item?.id || 0);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    featuredActivities.value = items.slice(0, featuredLimit.value + feedLimit);
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

async function loadOperationSetting() {
  try {
    const setting = await request<any>("/public/settings/operation");
    publicActivityArchiveEnabled.value = Boolean(setting?.publicActivityArchiveEnabled);
    tenantSwitcherEnabled.value = setting?.tenantSwitcherEnabled !== false;
  } catch {
    publicActivityArchiveEnabled.value = false;
  }
}

function goActivityList(categoryId?: number) {
  const suffix = categoryId ? `?categoryId=${categoryId}` : "";
  uni.navigateTo({ url: withTenantCode(`/pages/activity/list${suffix}`) });
}

function goMyRegistrations() {
  uni.navigateTo({ url: withTenantCode("/pages/user/my") });
}

function goActivityHistory() {
  uni.navigateTo({ url: withTenantCode("/pages/activity/list?status=ended") });
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
.discovery-page { padding-top: 20rpx; background: #f7f9f8; font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif; }
.discovery-topbar { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; min-height: 82rpx; }
.topbar-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 12rpx; }
.brand-mark { width: 52rpx; height: 52rpx; overflow: hidden; border-radius: 50%; background: #e9f9f0; }
.brand-mark image { width: 100%; height: 100%; }
.search-btn { min-width: 70rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; padding: 0 14rpx; border-radius: 8rpx; color: #27362f; font-size: 22rpx; font-weight: 800; }
.search-btn { background: #eef2f0; }
.feature-showcase{display:grid;gap:14rpx;margin:8rpx 0 24rpx}.feature-lead,.feature-side-card{position:relative;overflow:hidden;border-radius:8rpx;background:#143a27}.feature-lead{height:364rpx}.feature-lead image,.feature-side-card image,.feature-shade{position:absolute;inset:0;width:100%;height:100%}.feature-lead image,.feature-side-card image{transition:transform 360ms ease}.feature-lead:active image,.feature-side-card:active image{transform:scale(1.09)}.feature-side-rail{width:100%;white-space:nowrap}.feature-side-track{display:inline-flex;gap:14rpx;padding-right:28rpx}.feature-side-card{width:264rpx;height:196rpx;white-space:normal}.feature-shade{background:linear-gradient(180deg,rgba(8,24,15,.08),rgba(8,24,15,.78))}.feature-fallback{height:100%;display:grid;place-items:center;background:#dff8e7;color:#08753f;font-size:28rpx;font-weight:900}.feature-copy{position:absolute;left:16rpx;right:16rpx;bottom:16rpx;display:grid;gap:5rpx;color:#fff}.feature-copy text:first-child{color:#baf5ca;font-size:22rpx;font-weight:800}.feature-copy text:nth-child(2){display:-webkit-box;overflow:hidden;font-size:30rpx;font-weight:900;line-height:1.28;-webkit-box-orient:vertical;-webkit-line-clamp:2}.feature-copy text:last-child{color:#fff3c4;font-size:22rpx;font-weight:900}.feature-side-card .feature-copy text:nth-child(2){font-size:27rpx}.feature-lead-copy text:nth-child(2){font-size:38rpx}.discovery-empty-hero{display:grid;align-content:center;justify-items:start;min-height:300rpx;margin:8rpx 0 24rpx;padding:32rpx;border:1rpx solid #d8eee1;border-radius:8rpx;background:#effbf4}.discovery-empty-kicker{color:#078347;font-size:22rpx;font-weight:900}.discovery-empty-title{margin-top:12rpx;color:#143a27;font-size:36rpx;font-weight:950}.discovery-empty-copy{margin-top:10rpx;color:#607169;font-size:24rpx}.discovery-empty-action{min-height:58rpx;display:flex;align-items:center;margin-top:22rpx;padding:0 22rpx;border-radius:8rpx;background:#143a27;color:#fff;font-size:24rpx;font-weight:900}
.discovery-categories { width: 100%; margin: 24rpx 0 28rpx; white-space: nowrap; }
.category-track { display: inline-flex; gap: 12rpx; padding-right: 28rpx; }
.category-tab { min-width: 96rpx; height: 64rpx; display: inline-flex; align-items: center; justify-content: center; padding: 0 22rpx; border: 1rpx solid #e0e8e4; border-radius: 8rpx; background: #fff; color: #56635d; font-size: 26rpx; font-weight: 700; transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease, transform 180ms ease; }
.category-tab.active { border-color: #20d477; background: #20d477; color: #072d19; }
.discovery-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20rpx; margin-bottom: 18rpx; }
.heading-title { display: block; color: #15251c; font-size: 42rpx; font-weight: 900; line-height: 1.25; }
.heading-copy { display: block; margin-top: 6rpx; color: #839189; font-size: 26rpx; }
.all-link { flex: 0 0 auto; min-height: 48rpx; display: flex; align-items: center; color: #11894c; font-size: 26rpx; font-weight: 800; }
.activity-state { display: grid; gap: 12rpx; padding: 24rpx; border-radius: 8rpx; background: #fff; color: #667085; font-size: 26rpx; line-height: 1.55; }
.activity-error { border: 1rpx solid #fecaca; background: #fff7f7; color: #b91c1c; }
.activity-retry { width: max-content; min-height: 56rpx; margin: 0; padding: 0 20rpx; border: 0; border-radius: 8rpx; background: #eafbf1; color: #08753f; font-size: 23rpx; font-weight: 800; }
.activity-retry::after { border: 0; }
.activity-preview-list { display: grid; gap: 16rpx; }
.activity-preview-card { display: grid; grid-template-columns: 80rpx 194rpx minmax(0, 1fr); gap: 14rpx; align-items: stretch; min-height: 204rpx; padding: 14rpx; border: 1rpx solid #e2eae6; border-radius: 8rpx; background: #fff; box-shadow: 0 8rpx 20rpx rgba(23, 48, 36, 0.035); }
.activity-date { display: grid; align-content: center; justify-items: center; gap: 3rpx; border-radius: 8rpx; background: #eafbf1; color: #078347; font-size: 22rpx; font-weight: 800; }
.activity-date-day { color: #14271b; font-size: 40rpx; line-height: 1.05; font-weight: 900; }
.activity-cover { width: 194rpx; height: 172rpx; align-self: center; border-radius: 8rpx; background: #e4ece7; }
.cover-fallback { display: flex; align-items: center; justify-content: center; width: 194rpx; height: 172rpx; align-self: center; padding: 12rpx; border-radius: 8rpx; background: #eafbf1; color: #08753f; font-size: 26rpx; font-weight: 800; text-align: center; }
.activity-main { min-width: 0; display: grid; align-content: center; gap: 8rpx; }
.activity-tags { display: flex; align-items: center; gap: 8rpx; min-width: 0; }
.activity-category,.activity-status { max-width: 50%; overflow: hidden; padding: 4rpx 8rpx; border-radius: 5rpx; text-overflow: ellipsis; white-space: nowrap; font-size: 21rpx; font-weight: 800; }
.activity-category { background: #eef2f0; color: #59655f; }
.activity-status { background: #e8faf0; color: #078347; }.activity-status.full { background: #fff2dd; color: #b66300; }.activity-status.ended { background: #f0f2f1; color: #7a8580; }
.activity-title { display: -webkit-box; overflow: hidden; color: #13241a; font-size: 30rpx; font-weight: 900; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.activity-meta { overflow: hidden; color: #607169; font-size: 24rpx; text-overflow: ellipsis; white-space: nowrap; }
.activity-foot { display: flex; align-items: center; justify-content: space-between; gap: 8rpx; min-width: 0; color: #809087; font-size: 22rpx; }.activity-foot text:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.activity-price { flex: 0 0 auto; color: #dc6900; font-size: 26rpx; font-weight: 900; }
.activity-empty { display: flex; justify-content: space-between; align-items: center; gap: 16rpx; padding: 24rpx; border-radius: 8rpx; background: #fff; color: #718078; font-size: 24rpx; }.activity-empty-action { color: #08753f; font-weight: 800; }
.category-tab:focus-visible, .search-btn:focus-visible, .all-link:focus-visible, .activity-preview-card:focus-visible, .activity-empty-action:focus-visible { outline: 3rpx solid #20d477; outline-offset: 3rpx; }

.search-btn { width:56rpx; min-width:56rpx; height:56rpx; padding:0; border:1rpx solid #e2e9e5; background:#fff; }
.search-glyph { position:relative; width:24rpx; height:24rpx; border:3rpx solid currentColor; border-radius:50%; }
.search-glyph::after { position:absolute; right:-8rpx; bottom:-6rpx; width:10rpx; height:3rpx; content:""; border-radius:3rpx; background:currentColor; transform:rotate(45deg); transform-origin:left center; }
.discovery-empty-hero { min-height:236rpx; padding:30rpx; }
.discovery-empty-title { font-size:34rpx; }
.discovery-empty-copy { line-height:1.55; }
.discovery-empty-action { margin-top:20rpx; }

</style>
