<template>
  <view class="container discovery-page has-custom-nav">
    <view class="discovery-topbar">
      <TenantSwitcher compact :tenant="tenant" @changed="handleTenantChanged" />
      <view class="home-brand-title"><text>{{ pageBrand.name || "慢π" }}</text><text class="brand-subtitle">五行雅集</text></view>
      <view class="topbar-actions">
        <view v-if="pageBrand.logoUrl" class="brand-mark"><image :src="pageBrand.logoUrl" mode="aspectFit" /></view>
        <view class="scan-btn app-press" role="button" tabindex="0" aria-label="扫一扫" @click="goScan" @keyup.enter="goScan" @keyup.space.prevent="goScan"><view class="scan-glyph" aria-hidden="true" /></view>
        <view class="search-btn app-press" role="button" tabindex="0" aria-label="搜索活动" @click="goSearch" @keyup.enter="goSearch" @keyup.space.prevent="goSearch"><view class="search-glyph" aria-hidden="true" /></view>
      </view>
    </view>

    <scroll-view class="wuxing-strip" scroll-x :show-scrollbar="false" role="tablist" aria-label="五行主题活动入口">
      <view class="wuxing-track">
        <view v-for="item in [{ key: 'metal', glyph: '金', label: '手作' }, { key: 'wood', glyph: '木', label: '漫游' }, { key: 'water', glyph: '水', label: '共读' }, { key: 'fire', glyph: '火', label: '雅集' }, { key: 'earth', glyph: '土', label: '茶事' }]" :key="item.key" class="wuxing-item app-press" :class="item.key" role="tab" tabindex="0" :aria-label="`${item.glyph} · ${item.label}`" @click="goActivityList()" @keyup.enter="goActivityList()">
          <text class="wuxing-seal">{{ item.glyph }}</text><text>{{ item.label }}</text>
        </view>
      </view>
    </scroll-view>

    <template v-for="section in homeSections" :key="section.id">
      <template v-if="section.id === featuredSection?.id">
        <view v-if="leadActivity && featuredDisplay !== 'list'" class="feature-showcase app-enter" :style="motionStyle(42)">
          <view class="feature-lead app-press" role="button" tabindex="0" :aria-label="`查看活动：${leadActivity.title}`" @click="goActivityDetail(leadActivity)" @keyup.enter="goActivityDetail(leadActivity)" @keyup.space.prevent="goActivityDetail(leadActivity)">
            <view class="feature-media"><image v-if="leadActivity.coverUrl && !leadImageFailed" :src="leadActivity.coverUrl" mode="aspectFit" @error="leadImageFailed = true" /><view v-else class="feature-fallback">{{ leadActivity.category?.name || "本地活动" }}</view></view>
            <view class="feature-lead-copy">
              <view class="feature-meta"><text>{{ leadActivity.category?.name || '近期活动' }}</text><text v-if="leadActivity.isTest">测试活动</text></view>
              <text class="feature-title">{{ leadActivity.title }}</text>
              <text class="feature-time">{{ formatActivityMonthDay(leadActivity.startTime) }} {{ formatActivityHour(leadActivity.startTime) }} · {{ leadActivity.location || "地点待确认" }}</text>
              <view class="feature-footer"><text class="feature-price">{{ priceText(leadActivity.price) }}<text v-if="leadActivity.isTest" class="price-example">示例价格</text></text><text class="feature-open">查看详情 →</text></view>
            </view>
          </view>
          <view v-if="featuredDisplay === 'lead_rail' && sideActivities.length" class="feature-side-list"><ActivityPreviewRow v-for="activity in sideActivities" :key="activity.id" :activity="activity" :date-label="`${formatActivityMonthDay(activity.startTime)} ${formatActivityHour(activity.startTime)}`" :price-label="priceText(activity.price)" :status-label="activityStatusText(activity.displayStatus || activity.status)" @open="goActivityDetail(activity)" /></view>
        </view>
        <view v-else-if="leadActivity" class="activity-preview-list featured-list app-enter" :style="motionStyle(42)"><ActivityPreviewRow v-for="activity in heroActivities" :key="activity.id" :activity="activity" :date-label="`${formatActivityMonthDay(activity.startTime)} ${formatActivityHour(activity.startTime)}`" :price-label="priceText(activity.price)" :status-label="activityStatusText(activity.displayStatus || activity.status)" @open="goActivityDetail(activity)" /></view>
        <view v-else class="discovery-empty-hero app-enter" :style="motionStyle(42)"><text class="discovery-empty-kicker">近期活动</text><text class="discovery-empty-title">暂时没有可报名的活动</text><text class="discovery-empty-copy">可先查看往期活动，主办方发布新活动后会显示在这里。</text><view v-if="publicActivityArchiveEnabled" class="discovery-empty-action app-press" role="button" tabindex="0" @click="goActivityHistory" @keyup.enter="goActivityHistory" @keyup.space.prevent="goActivityHistory">查看活动回顾</view></view>
      </template>

      <scroll-view v-else-if="section.id === tabsSection?.id" class="discovery-categories app-enter" :style="motionStyle(78)" scroll-x :show-scrollbar="false" role="tablist" aria-label="活动分类"><view class="category-track"><view class="category-tab active app-press" role="tab" aria-selected="true" tabindex="0" @click="goActivityList()" @keyup.enter="goActivityList()" @keyup.space.prevent="goActivityList()">推荐</view><view v-for="category in categories" :key="category.id" class="category-tab app-press" role="tab" aria-selected="false" tabindex="0" @click="goActivityList(category.id)" @keyup.enter="goActivityList(category.id)" @keyup.space.prevent="goActivityList(category.id)">{{ category.name }}</view></view></scroll-view>

      <template v-else-if="section.id === feedSection?.id">
        <view v-if="feedActivities.length || activitiesLoading || activitiesError" class="discovery-heading app-enter" :style="motionStyle(112)"><view><text class="heading-title">{{ section.title || `${cityName}正在发生` }}</text><text class="heading-copy">{{ section.subtitle || "按日期发现适合你的线下活动" }}</text></view><view class="all-link app-press" role="button" tabindex="0" aria-label="查看全部活动" @click="goActivityList()" @keyup.enter="goActivityList()" @keyup.space.prevent="goActivityList()">全部</view></view>
        <view v-if="activitiesLoading && !featuredActivities.length" class="activity-state" role="status" aria-live="polite">活动加载中…</view><view v-else-if="activitiesError" class="activity-state activity-error" role="alert" aria-live="assertive"><text>{{ activitiesError }}</text><button class="activity-retry" :disabled="activitiesLoading" aria-label="重新加载活动" @click="loadActivities">重试</button></view>
        <view v-else-if="feedActivities.length" class="activity-preview-list"><ActivityPreviewRow v-for="activity in feedActivities" :key="activity.id" :activity="activity" :date-label="`${formatActivityMonthDay(activity.startTime)} ${formatActivityHour(activity.startTime)}`" :price-label="priceText(activity.price)" :status-label="activityStatusText(activity.displayStatus || activity.status)" @open="goActivityDetail(activity)" /></view>
      </template>

      <PageDecorationBlocks v-else-if="section.type !== 'search_bar'" :sections="[section]" :show-overlays="false" />
    </template>

    <view
      v-if="featureGates.userContentSharing && featureGates.community"
      class="home-social-entry app-enter app-press"
      :style="motionStyle(156)"
      role="button"
      tabindex="0"
      aria-label="进入社交拓展"
      @click="goSocialExpansion"
      @keyup.enter="goSocialExpansion"
      @keyup.space.prevent="goSocialExpansion"
    >
      <view class="home-social-copy">
        <text class="home-social-eyebrow">同城连接</text>
        <text class="home-social-title">社交拓展</text>
        <text class="home-social-description">展示你的能力与资源，认识同行和潜在合作伙伴</text>
      </view>
      <view class="home-social-action">立即拓展</view>
    </view>

    <SplashAd />
    <MarketingPopup />
    <view style="height:120rpx;"></view>
    <TabBar current="index" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { onShareAppMessage, onShareTimeline, onShow } from "@dcloudio/uni-app";
import { applyTenantBootstrapDefault, getCurrentTenantCode, request, withTenantCode } from "../../api";
import { loadPageTheme, pageBrand } from "../../theme";
import { defaultMiniProgramShare, defaultMiniProgramTimelineShare, showMiniProgramShareMenu } from "../../share";
import { resolveTenantByCurrentLocation } from "../../tenant-location";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import TabBar from "../../components/TabBar.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import MarketingPopup from "../../components/MarketingPopup.vue";
import SplashAd from "../../components/SplashAd.vue";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import ActivityPreviewRow from "../../components/ActivityPreviewRow.vue";
import { usePageDecoration } from "../../decoration";
import { reviewSafeText } from "../../review-safe-text";
import { motionStyle } from "../../motion/platform-adapter";
import { featureGatesState, loadFeatureGates } from "../../feature-gates";

const { tenant, sections, loadDecoration } = usePageDecoration("home", "/pages/index/index");
const featuredActivities = ref<any[]>([]);
const categories = ref<any[]>([]);
const publicActivityArchiveEnabled = ref(false);
const tenantSwitcherEnabled = ref(true);
const activitiesLoading = ref(false);
const activitiesError = ref("");
const loadedActivitiesTenantCode = ref("");
const activityLoadGuard = createTenantLoadGuard();
const featureGates = featureGatesState;
const cityName = computed(() => tenant.value?.region || tenant.value?.name || pageBrand.name || "本地");
const decorationSections = computed(() => Array.isArray(sections.value) ? sections.value : []);
const fallbackFeaturedSection = { id: -1001, pageKey: "home", type: "featured_activities", title: "本周推荐", subtitle: "精选近期活动", enabled: true, sortOrder: 15, config: { display: "lead_rail", limit: 4 } };
const fallbackTabsSection = { id: -1002, pageKey: "home", type: "activity_tabs", title: "活动分类", subtitle: null, enabled: true, sortOrder: 25, config: {} };
const fallbackFeedSection = { id: -1003, pageKey: "home", type: "activity_feed", title: "近期活动", subtitle: "按日期发现适合你的线下活动", enabled: true, sortOrder: 35, config: { limit: 6, showEnded: false } };
const configuredFeaturedSection = computed(() => decorationSections.value.find((section) => section.enabled && section.type === "featured_activities"));
const configuredFeedSection = computed(() => decorationSections.value.find((section) => section.enabled && section.type === "activity_feed"));
const featuredSection = computed(() => configuredFeaturedSection.value || fallbackFeaturedSection);
const feedSection = computed(() => configuredFeedSection.value || fallbackFeedSection);
const tabsSection = computed(() => decorationSections.value.find((section) => section.enabled && section.type === "activity_tabs") || fallbackTabsSection);
const homeSections = computed(() => {
  const configured = decorationSections.value.filter((section) => {
    if (!section.enabled || ["bottom_nav", "my_page", "inner_pages"].includes(section.type)) return false;
    // The home page is a discovery surface. Legacy brand, commerce and community
    // modules remain stored in decoration but belong on their dedicated pages.
    return ["announcement_bar", "image_banner", "featured_activities", "activity_tabs", "activity_feed"].includes(section.type);
  });
  const fallback = [
    configuredFeaturedSection.value ? null : fallbackFeaturedSection,
    decorationSections.value.some((section) => section.enabled && section.type === "activity_tabs") ? null : fallbackTabsSection,
    configuredFeedSection.value ? null : fallbackFeedSection
  ].filter(Boolean) as any[];
  const rank: Record<string, number> = { announcement_bar: 5, image_banner: 10, featured_activities: 20, activity_tabs: 30, activity_feed: 40 };
  return [...configured, ...fallback].sort((left, right) => Number(rank[left.type] || 90) - Number(rank[right.type] || 90) || Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
});
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
  return configured.length ? configured : featuredActivities.value;
});
const heroActivities = computed(() => (configuredFeaturedActivities.value.length ? configuredFeaturedActivities.value : displayedActivities.value).slice(0, featuredLimit.value));
const leadActivity = computed(() => heroActivities.value[0] || null);
const leadImageFailed = ref(false);
watch(() => leadActivity.value?.coverUrl, () => { leadImageFailed.value = false; });
const sideActivities = computed(() => heroActivities.value.slice(1, sideLimit.value + 1));
const feedActivities = computed(() => {
  const limit = Math.max(1, Math.min(Number(feedSection.value?.config?.limit || 6), 30));
  const source = configuredFeedActivities.value.length ? configuredFeedActivities.value : displayedActivities.value.slice(featuredLimit.value);
  const featuredIds = new Set(heroActivities.value.map((item) => Number(item.id)));
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
  await Promise.allSettled([loadPageTheme(), loadDecoration(), loadOperationSetting(), loadFeatureGates(true)]);
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
    if ((configuredFeaturedSection.value || configuredFeedSection.value) && configured.length) {
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

function goScan() {
  uni.navigateTo({ url: withTenantCode("/pages/scan/index") });
}

function goSocialExpansion() {
  uni.navigateTo({ url: withTenantCode("/pages/community/social") });
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

</script>

<style scoped>
.discovery-page { padding: 20rpx 28rpx 0; background: #fff; font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif; }
.discovery-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; min-height: 82rpx; }
.home-brand-title { display: grid; gap: 2rpx; min-width: 0; flex: 1; text-align: center; font-family: "STSong", "SimSun", "Noto Serif CJK SC", serif; }
.home-brand-title text { overflow: hidden; color: var(--app-text); font-size: 34rpx; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.home-brand-title .brand-subtitle { color: var(--app-primary); font: 20rpx -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif; }
.topbar-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 12rpx; }
.brand-mark { width: 52rpx; height: 52rpx; overflow: hidden; border-radius: 50%; background: #e9f9f0; }
.brand-mark image { width: 100%; height: 100%; }
.search-btn { min-width: 70rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; padding: 0 14rpx; border-radius: 8rpx; color: #27362f; font-size: var(--app-font-helper); font-weight: 800; }
.search-btn { background: #eef2f0; }
.wuxing-strip { width: 100%; margin: 4rpx 0 24rpx; white-space: nowrap; }
.wuxing-track { display: inline-flex; width: 100%; justify-content: space-between; gap: 12rpx; }
.wuxing-item { display: flex; min-width: 84rpx; flex-direction: column; align-items: center; gap: 7rpx; color: var(--app-text-muted); font-size: 21rpx; }
.wuxing-seal { width: 52rpx; height: 52rpx; display: grid; place-items: center; border: 1rpx solid currentColor; font: 30rpx "STSong", "SimSun", serif; }
.wuxing-item.metal { color: #9B813E; }.wuxing-item.wood { color: #386151; }.wuxing-item.water { color: #526F79; }.wuxing-item.fire { color: #A33D36; }.wuxing-item.earth { color: #857456; }
.wuxing-item:focus-visible { outline: 3rpx solid var(--app-primary); outline-offset: 3rpx; }
.feature-showcase { margin: 8rpx 0 24rpx; }
.feature-lead { border-bottom: 1rpx solid #e1e6de; background: #fff; }
.feature-media { width: 100%; aspect-ratio: 3 / 2; background: #f0f3ee; border-radius: 6rpx; overflow: hidden; }
.feature-media image { display: block; width: 100%; height: 100%; }
.feature-fallback { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; color: #386151; font-size: 28rpx; }
.feature-lead-copy { display: flex; flex-direction: column; gap: 12rpx; padding: 20rpx 0 24rpx; }
.feature-meta { display: flex; justify-content: space-between; color: #65736a; font-size: 22rpx; }
.feature-meta text:first-child { color: #386151; }
.feature-title { color: #28332d; font-family: "STSong", "SimSun", "Noto Serif CJK SC", serif; font-size: 38rpx; font-weight: 500; line-height: 1.5; overflow-wrap: anywhere; }
.feature-time { color: #65736a; font-size: 24rpx; line-height: 1.6; overflow-wrap: anywhere; }
.feature-footer { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.feature-price { color: #a33d36; font-size: 38rpx; font-weight: 600; }
.price-example { color: #65736a; font-size: 21rpx; font-weight: 400; margin-left: 12rpx; }
.feature-open { color: #a33d36; font-size: 24rpx; flex-shrink: 0; }
.feature-lead:focus-visible { outline: 3rpx solid #386151; outline-offset: 3rpx; }
.discovery-empty-hero { display: grid; align-content: center; justify-items: start; margin: 8rpx 0 24rpx; border: 1rpx solid #e1e6de; border-radius: 6rpx; background: #f0f3ee; }
.discovery-empty-kicker { color: #386151; font-size: var(--app-font-helper); }
.discovery-empty-title { margin-top: 12rpx; color: #28332d; font-weight: 600; }
.discovery-empty-copy { margin-top: 10rpx; color: #65736a; font-size: var(--app-font-helper); }
.discovery-empty-action { min-height: 58rpx; display: flex; align-items: center; padding: 0 22rpx; border-radius: 6rpx; background: #386151; color: #fff; font-size: var(--app-font-helper); }
.discovery-categories { width: 100%; margin: 24rpx 0 28rpx; white-space: nowrap; }
.category-track { display: inline-flex; gap: 12rpx; padding-right: 28rpx; }
.category-tab { min-width: 96rpx; height: 64rpx; display: inline-flex; align-items: center; justify-content: center; padding: 0 22rpx; border: 1rpx solid #e0e8e4; border-radius: 8rpx; background: #fff; color: #56635d; font-size: 26rpx; font-weight: 700; transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease, transform 180ms ease; }
.category-tab.active { border-color: #386151; background: #386151; color: #fff; }
.discovery-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20rpx; margin-bottom: 18rpx; }
.heading-title { display: block; color: var(--app-text); font-size: 36rpx; font-weight: 850; line-height: 1.25; }
.heading-copy { display: block; margin-top: 6rpx; color: #839189; font-size: 26rpx; }
.all-link { flex: 0 0 auto; min-height: 48rpx; display: flex; align-items: center; color: #11894c; font-size: 26rpx; font-weight: 800; }
.activity-state { display: grid; gap: 12rpx; padding: 24rpx; border-radius: 8rpx; background: #fff; color: #667085; font-size: 26rpx; line-height: 1.55; }
.activity-error { border: 1rpx solid #fecaca; background: #fff7f7; color: #b91c1c; }
.activity-retry { width: max-content; min-height: 56rpx; margin: 0; padding: 0 20rpx; border: 0; border-radius: 8rpx; background: #eafbf1; color: #08753f; font-size: var(--app-font-helper); font-weight: 800; }
.activity-retry::after { border: 0; }
.activity-preview-list { width: 100%; }
.activity-empty { display: flex; justify-content: space-between; align-items: center; gap: 16rpx; padding: 24rpx; border-radius: 8rpx; background: #fff; color: #718078; font-size: 24rpx; }.activity-empty-action { color: #08753f; font-weight: 800; }
.category-tab:focus-visible, .search-btn:focus-visible, .all-link:focus-visible, .activity-preview-card:focus-visible, .activity-empty-action:focus-visible { outline: 3rpx solid #20d477; outline-offset: 3rpx; }

.search-btn,.scan-btn { width:56rpx; min-width:56rpx; height:56rpx; display:flex;align-items:center;justify-content:center;padding:0; border:1rpx solid #e2e9e5; border-radius:8rpx; background:#fff; color:#27362f; }
.search-glyph { position:relative; width:24rpx; height:24rpx; border:3rpx solid currentColor; border-radius:50%; }
.search-glyph::after { position:absolute; right:-8rpx; bottom:-6rpx; width:10rpx; height:3rpx; content:""; border-radius:3rpx; background:currentColor; transform:rotate(45deg); transform-origin:left center; }
.scan-glyph{position:relative;width:25rpx;height:25rpx;border:3rpx solid currentColor;border-radius:4rpx;box-sizing:border-box}.scan-glyph::before,.scan-glyph::after{position:absolute;width:11rpx;height:11rpx;content:"";background:#fff}.scan-glyph::before{top:-3rpx;left:-3rpx}.scan-glyph::after{right:-3rpx;bottom:-3rpx}
.discovery-empty-hero { min-height:236rpx; padding:30rpx; }
.discovery-empty-title { font-size:34rpx; }
.discovery-empty-copy { line-height:1.55; }
.discovery-empty-action { margin-top:20rpx; }
.home-social-entry{display:flex;align-items:center;justify-content:space-between;gap:20rpx;margin:28rpx 0 4rpx;padding:28rpx;border:1rpx solid #d5e9dc;border-radius:16rpx;background:#eaf7f1}.home-social-copy{min-width:0;display:grid;gap:6rpx}.home-social-eyebrow{color:#08753f;font-size:22rpx;font-weight:850}.home-social-title{color:#16252d;font-size:32rpx;font-weight:900}.home-social-description{color:#52636b;font-size:24rpx;line-height:1.5}.home-social-action{flex:none;min-height:58rpx;display:flex;align-items:center;padding:0 20rpx;border-radius:12rpx;background:#16252d;color:#fff;font-size:24rpx;font-weight:850}
.discovery-page .heading-title { font-family: "STSong", "SimSun", "Noto Serif CJK SC", serif; font-weight: 600; }

</style>
