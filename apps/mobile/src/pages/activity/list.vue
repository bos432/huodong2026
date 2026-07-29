<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onReachBottom, onShareAppMessage, onShareTimeline, onShow } from "@dcloudio/uni-app";
import { consumeActivityListIntent, getCurrentTenantCode, request, withTenantCode } from "../../api";
import { filterIntrinsicHeaderDecorationSections, usePageDecoration } from "../../decoration";
import { loadPageTheme } from "../../theme";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { defaultMiniProgramShare, defaultMiniProgramTimelineShare, showMiniProgramShareMenu } from "../../share";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import TabBar from "../../components/TabBar.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";

const categories = ref<any[]>([]);
const rows = ref<any[]>([]);
const activeCategoryId = ref<number | "all">("all");
const activeStatus = ref<"all" | "open" | "full" | "ended">("all");
const keyword = ref("");
const loading = ref(true);
const loadingMore = ref(false);
const error = ref("");
const categoryError = ref("");
const page = ref(1);
const pageSize = 8;
const total = ref(0);
const hasMore = ref(false);
const mounted = ref(false);
const lastLoadedTenantCode = ref("");
const pageLoadGuard = createTenantLoadGuard();
const categoryLoadGuard = createTenantLoadGuard();
const { tenant, contentSections, innerPageConfig, innerPageLayout, loadDecoration } = usePageDecoration("activity_list", "/pages/activity/list");
const shareOptions = { title: () => `${tenant.value?.name || "慢π"}活动列表`, path: "/pages/activity/list" };
onShareAppMessage(() => defaultMiniProgramShare(shareOptions));
onShareTimeline(() => defaultMiniProgramTimelineShare(shareOptions));
onShow(showMiniProgramShareMenu);
const bodyDecorationSections = computed(() => filterIntrinsicHeaderDecorationSections(contentSections.value));

const statusTabs = [
  { label: "全部", value: "all" },
  { label: "报名中", value: "open" },
  { label: "已满员", value: "full" },
  { label: "已结束", value: "ended" }
] as const;

function goDetail(id: number) {
  uni.navigateTo({ url: withTenantCode(`/pages/activity/detail?id=${id}`) });
}

function statusText(status: string) {
  if (status === "full") return "已满员";
  if (status === "ended") return "已结束";
  return "报名中";
}

function statusClass(status: string) {
  if (status === "full") return "is-full";
  if (status === "ended") return "is-ended";
  return "is-open";
}

function priceText(price: string | number) {
  return Number(price) > 0 ? `￥${Number(price).toFixed(2)}` : "免费";
}

function cityName() {
  return tenant.value?.region || tenant.value?.name || "本地雅集";
}

function formatTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

function activityDateParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { month: "日期", day: "待定", time: "时间待定" };
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return {
    month: `${shifted.getUTCMonth() + 1}月`,
    day: String(shifted.getUTCDate()).padStart(2, "0"),
    time: `${String(shifted.getUTCHours()).padStart(2, "0")}:${String(shifted.getUTCMinutes()).padStart(2, "0")}`
  };
}

function clearKeyword() {
  keyword.value = "";
  loadFirstPage();
}

const heroSubtitle = computed(() => innerPageConfig.value.subtitle || "筛选近期活动，快速找到适合参加的线下活动。");
const resultHint = computed(() => {
  const categoryName = activeCategoryId.value === "all"
    ? "全部分类"
    : categories.value.find((item) => item.id === activeCategoryId.value)?.name || "已选分类";
  const statusName = statusTabs.find((item) => item.value === activeStatus.value)?.label || "全部";
  return `${categoryName} · ${statusName}`;
});

function buildQuery(nextPage: number) {
  const params = [
    `page=${nextPage}`,
    `pageSize=${pageSize}`,
    activeCategoryId.value !== "all" ? `categoryId=${activeCategoryId.value}` : "",
    activeStatus.value !== "all" ? `status=${activeStatus.value}` : "",
    keyword.value.trim() ? `keyword=${encodeURIComponent(keyword.value.trim())}` : ""
  ].filter(Boolean);
  return `/public/activities?${params.join("&")}`;
}

async function loadPage(nextPage: number, append = false) {
  if (append && (!hasMore.value || loadingMore.value)) return;
  const loadToken = pageLoadGuard.begin();
  if (append) loadingMore.value = true;
  else loading.value = true;
  error.value = "";
  try {
    const result = await request<any>(buildQuery(nextPage));
    if (!pageLoadGuard.isCurrent(loadToken)) return;
    const items = Array.isArray(result) ? result : result.items || [];
    rows.value = append ? rows.value.concat(items) : items;
    total.value = Array.isArray(result) ? items.length : result.total || 0;
    page.value = Array.isArray(result) ? nextPage : result.page || nextPage;
    hasMore.value = Array.isArray(result) ? false : Boolean(result.hasMore);
  } catch (err: any) {
    if (!pageLoadGuard.isCurrent(loadToken)) return;
    error.value = err.message || "加载失败";
  } finally {
    if (pageLoadGuard.isCurrent(loadToken)) {
      loading.value = false;
      loadingMore.value = false;
    }
  }
}

function loadFirstPage() {
  page.value = 1;
  hasMore.value = false;
  return loadPage(1);
}

function loadMore() {
  loadPage(page.value + 1, true);
}

function selectCategory(value: number | "all") {
  if (activeCategoryId.value === value) return;
  activeCategoryId.value = value;
  loadFirstPage();
}

function selectStatus(value: "all" | "open" | "full" | "ended") {
  if (activeStatus.value === value) return;
  activeStatus.value = value;
  loadFirstPage();
}

function applyRouteQuery() {
  const pages = getCurrentPages();
  const query = (pages[pages.length - 1] as any).options || {};
  activeCategoryId.value = query.categoryId ? Number(query.categoryId) : "all";
  keyword.value = typeof query.keyword === "string" ? query.keyword : keyword.value;
}

function applyIntent() {
  const intent = consumeActivityListIntent();
  if (!intent) return false;
  if (intent.categoryId !== undefined) activeCategoryId.value = intent.categoryId;
  if (intent.keyword !== undefined) keyword.value = intent.keyword;
  if (intent.focus) keyword.value = keyword.value || "";
  return true;
}

async function loadCategories() {
  const loadToken = categoryLoadGuard.begin();
  categoryError.value = "";
  try {
    const items = await request<any[]>("/public/categories");
    if (categoryLoadGuard.isCurrent(loadToken)) categories.value = items;
  } catch (err: any) {
    if (categoryLoadGuard.isCurrent(loadToken)) {
      categories.value = [];
      categoryError.value = err?.message || "活动分类加载失败，可重新同步分类。";
    }
  }
}

async function reloadCurrentTenant(resetFilters = false) {
  const tenantCode = getCurrentTenantCode();
  lastLoadedTenantCode.value = tenantCode;
  pageLoadGuard.invalidate();
  rows.value = [];
  total.value = 0;
  page.value = 1;
  hasMore.value = false;
  error.value = "";
  loading.value = true;
  if (resetFilters) {
    activeCategoryId.value = "all";
    activeStatus.value = "all";
    keyword.value = "";
  }
  await Promise.all([loadCategories(), loadDecoration(), loadFirstPage()]);
  if (getCurrentTenantCode() !== tenantCode) return;
}

async function handleTenantChanged() {
  await Promise.all([loadPageTheme(), reloadCurrentTenant(true)]);
}

onMounted(() => {
  mounted.value = true;
  lastLoadedTenantCode.value = getCurrentTenantCode();
  applyRouteQuery();
  applyIntent();
  void reloadCurrentTenant(false);
});

onShow(() => {
  if (!mounted.value) return;
  const changedTenant = getCurrentTenantCode() !== lastLoadedTenantCode.value;
  const hasIntent = applyIntent();
  if (changedTenant) {
    void loadPageTheme();
    void reloadCurrentTenant(!hasIntent);
  }
  else if (hasIntent) void loadFirstPage();
});

onReachBottom(loadMore);
</script>

<template>
  <view class="container activity-page has-custom-nav">
    <TenantSwitcher :tenant="tenant" title="当前城市" @changed="handleTenantChanged" />

    <view class="hero-card" :style="{ background: String(innerPageLayout.headerBackgroundColor || '#e8f5f1') }">
      <view class="hero-copy">
        <text class="hero-kicker">{{ cityName() }} · 城市文化活动</text>
        <text class="hero-title" :style="{ color: String(innerPageLayout.headerTextColor || '#173f3a') }">{{ innerPageConfig.title || "发现正在发生的活动" }}</text>
        <text class="hero-subtitle" :style="{ color: String(innerPageLayout.headerSubtitleColor || '#54716c') }">{{ heroSubtitle }}</text>
      </view>
      <view class="hero-side">
        <view class="hero-count">{{ total }}</view>
        <text class="hero-label">近期场次</text>
      </view>
    </view>

    <PageDecorationBlocks :sections="bodyDecorationSections" />

    <view class="card filter-card" :style="{ background: String(innerPageLayout.stickyFilterBackground || 'var(--card-bg, #FFFFFF)') }">
      <view class="row filter-head">
        <view>
          <text class="title-md">按兴趣找活动</text>
          <text class="subtle filter-hint">{{ resultHint }}</text>
        </view>
        <view class="result-badge">{{ rows.length }}/{{ total }}</view>
      </view>

      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input v-model="keyword" class="search-input" aria-label="搜索活动、地点或分类" placeholder="搜索活动、地点、分类" confirm-type="search" @confirm="loadFirstPage" />
        <text v-if="keyword" class="clear" role="button" tabindex="0" aria-label="清空活动搜索词" @click="clearKeyword" @keyup.enter="clearKeyword" @keyup.space.prevent="clearKeyword">清空</text>
      </view>

      <view v-if="categoryError" class="filter-error" role="alert" aria-live="assertive">
        <text>{{ categoryError }}</text>
        <text class="filter-retry" role="button" tabindex="0" aria-label="重新加载活动分类" @click="loadCategories" @keyup.enter="loadCategories" @keyup.space.prevent="loadCategories">重新同步</text>
      </view>

      <scroll-view class="category-tabs" scroll-x :show-scrollbar="false" role="tablist" aria-label="活动分类筛选">
        <view class="tabs-track">
          <view class="category-chip" :class="{ active: activeCategoryId === 'all' }" role="tab" tabindex="0" :aria-selected="activeCategoryId === 'all'" @click="selectCategory('all')" @keyup.enter="selectCategory('all')" @keyup.space.prevent="selectCategory('all')">全部</view>
          <view v-for="c in categories" :key="c.id" class="category-chip" :class="{ active: activeCategoryId === c.id }" role="tab" tabindex="0" :aria-selected="activeCategoryId === c.id" @click="selectCategory(c.id)" @keyup.enter="selectCategory(c.id)" @keyup.space.prevent="selectCategory(c.id)">{{ c.name }}</view>
        </view>
      </scroll-view>

      <view class="status-tabs" role="tablist" aria-label="活动状态筛选">
        <view v-for="tab in statusTabs" :key="tab.value" class="status-tab" :class="{ active: activeStatus === tab.value }" role="tab" tabindex="0" :aria-selected="activeStatus === tab.value" @click="selectStatus(tab.value)" @keyup.enter="selectStatus(tab.value)" @keyup.space.prevent="selectStatus(tab.value)">
          {{ tab.label }}
        </view>
      </view>
    </view>

    <view class="section-head">
      <view>
        <text class="title-md">近期活动</text>
        <text class="subtle section-copy">共 {{ total }} 场，已加载 {{ rows.length }} 场</text>
      </view>
    </view>

    <view v-if="loading" class="card state-card" role="status" aria-live="polite">加载中...</view>
    <view v-else-if="error" class="card state-card" role="alert" aria-live="assertive">
      <view>{{ error }}</view>
      <view class="button secondary retry-button" role="button" tabindex="0" aria-label="重新加载活动列表" @click="loadFirstPage" @keyup.enter="loadFirstPage" @keyup.space.prevent="loadFirstPage">重试</view>
    </view>
    <view v-else-if="!rows.length" class="card empty-state-card">
      <text class="empty-icon">🪷</text>
      <text class="title-md">没有找到匹配活动</text>
      <text class="body-text empty-copy">试试切换分类、状态，或者减少搜索关键词。</text>
    </view>

    <view v-else class="activity-feed">
      <view v-for="item in rows" :key="item.id" class="activity-card" role="button" tabindex="0" :aria-label="`查看活动：${item.title}`" @click="goDetail(item.id)" @keyup.enter="goDetail(item.id)" @keyup.space.prevent="goDetail(item.id)">
        <view class="activity-date-card">
          <text class="activity-date-month">{{ activityDateParts(item.startTime).month }}</text>
          <text class="activity-date-day">{{ activityDateParts(item.startTime).day }}</text>
          <text class="activity-date-time">{{ activityDateParts(item.startTime).time }}</text>
        </view>
        <image v-if="item.coverUrl" class="activity-cover" :src="item.coverUrl" mode="aspectFill" />
        <view v-else class="activity-cover cover-fallback">{{ item.category?.name || "活动" }}</view>
        <view class="activity-body">
          <view class="row meta-row">
            <view class="tag tag-secondary">{{ item.category?.name || "活动" }}</view>
            <text class="card-tag" :class="statusClass(item.displayStatus)">{{ statusText(item.displayStatus) }}</text>
          </view>
          <text class="activity-title">{{ item.title }}</text>
          <text class="activity-location">{{ item.location || "地点待确认" }}</text>
          <text class="body-text activity-desc">{{ item.description || "主办方正在完善活动介绍，欢迎进入详情页查看完整安排。" }}</text>
          <view class="row capacity-row">
            <view class="capacity-pill">
              <text>{{ item.registeredCount || 0 }} 人已报名</text>
              <text>余 {{ item.remainingSeats }}/{{ item.capacity }}</text>
            </view>
            <view class="card-price">{{ priceText(item.price) }}</view>
          </view>
        </view>
        <view class="activity-action">{{ item.displayStatus === "open" ? "立即报名" : "查看详情" }}</view>
      </view>

      <view v-if="hasMore" class="button block load-more" :class="{ disabled: loadingMore }" role="button" tabindex="0" :aria-disabled="loadingMore" :aria-busy="loadingMore" aria-label="加载更多活动" @click="loadMore" @keyup.enter="loadMore" @keyup.space.prevent="loadMore">
        {{ loadingMore ? "加载中..." : "加载更多" }}
      </view>
      <view v-else class="no-more">没有更多活动了</view>
    </view>

    <TabBar current="activity" />
  </view>
</template>

<style scoped>
.activity-page { gap: 0; }
.hero-card { display: flex; gap: 20rpx; align-items: stretch; padding: 28rpx; margin-bottom: 24rpx; border: 1rpx solid rgba(15, 118, 110, 0.1); border-radius: 16rpx; background: #e8f5f1; }
.hero-copy { flex: 1; min-width: 0; display: grid; gap: 12rpx; }
.hero-kicker { color: #0f766e; font-size: 23rpx; font-weight: 800; }
.hero-title { color: #173f3a; font-size: 40rpx; font-weight: 900; line-height: 1.3; }
.hero-subtitle { color: #54716c; font-size: 24rpx; line-height: 1.55; }
.hero-side {
  width: 148rpx;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: #fff;
  color: #173f3a;
}
.hero-count { font-size: 52rpx; font-weight: 700; line-height: 1; }
.hero-label { margin-top: 10rpx; color: #66827d; font-size: 22rpx; }
.filter-card { margin-bottom: 24rpx; padding-bottom: 22rpx; }
.filter-head { align-items: flex-start; margin-bottom: 18rpx; }
.filter-hint { display: block; margin-top: 8rpx; }
.result-badge {
  min-width: 118rpx;
  height: 60rpx;
  padding: 0 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.1);
  color: #0f766e;
  font-size: 24rpx;
  font-weight: 700;
}
.search-box {
  height: 84rpx;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14rpx;
  align-items: center;
  padding: 0 22rpx;
  border-radius: 12rpx;
  background: #f4f8f7;
  border: 1rpx solid rgba(15, 118, 110, 0.1);
}
.search-icon { font-size: 30rpx; }
.search-input { min-width: 0; height: 84rpx; font-size: 28rpx; color: var(--text-color, #333333); }
.clear { color: #0f766e; font-size: 24rpx; font-weight: 700; }
.category-tabs { width: 100%; margin-top: 18rpx; white-space: nowrap; }
.filter-error { display:flex; align-items:center; justify-content:space-between; gap:16rpx; margin-top:16rpx; padding:14rpx 16rpx; border-radius:8px; background:#fff7f7; color:#b91c1c; font-size:23rpx; line-height:1.5; }
.filter-retry { flex:0 0 auto; color:#c43d3d; font-weight:700; }
.tabs-track { display: inline-flex; gap: 12rpx; padding-right: 20rpx; }
.category-chip {
  flex: 0 0 auto;
  min-height: 60rpx;
  padding: 0 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10rpx;
  background: #f2f6f5;
  color: #54716c;
  font-size: 25rpx;
}
.category-chip.active { background: #0f766e; color: #fff; font-weight: 700; }
.status-tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12rpx; margin-top: 20rpx; }
.status-tab {
  min-height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10rpx;
  background: #f2f6f5;
  color: #54716c;
  font-size: 24rpx;
}
.status-tab.active { background: rgba(15, 118, 110, 0.12); color: #0f766e; font-weight: 700; }
.section-head { margin-bottom: 18rpx; }
.section-copy { display: block; margin-top: 8rpx; }
.state-card { text-align: center; }
.retry-button { display: inline-flex; margin: 20rpx auto 0; min-width: 180rpx; }
.empty-state-card { display: grid; justify-items: center; gap: 14rpx; text-align: center; }
.empty-icon { font-size: 72rpx; }
.empty-copy { text-align: center; }
.activity-feed { display: grid; gap: 18rpx; }
.activity-card {
  display: grid;
  grid-template-columns: 76rpx 176rpx minmax(0, 1fr);
  column-gap: 16rpx;
  overflow: hidden;
  padding: 14rpx;
  border: 1rpx solid rgba(15, 118, 110, 0.1);
  border-radius: 14rpx;
  background: var(--card-bg, #ffffff);
  box-shadow: 0 8rpx 24rpx rgba(20, 72, 64, 0.06);
}
.activity-card:focus-visible,
.category-chip:focus-visible,
.status-tab:focus-visible,
.clear:focus-visible,
.filter-retry:focus-visible { outline: 3rpx solid #0f766e; outline-offset: 4rpx; }
.activity-date-card { display: grid; align-content: center; justify-items: center; color: #0f766e; }
.activity-date-month,.activity-date-time { font-size: 19rpx; font-weight: 800; }
.activity-date-day { margin: 4rpx 0; color: #173f3a; font-size: 38rpx; line-height: 1; font-weight: 900; }
.activity-cover { width: 176rpx; height: 176rpx; display: block; border-radius: 10rpx; background: #d7e8e4; }
.cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0f766e;
  font-size: 28rpx;
  font-weight: 900;
}
.card-tag {
  min-height: 40rpx;
  padding: 0 12rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6rpx;
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
}
.card-tag.is-open { background: #0f766e; }
.card-tag.is-full { background: rgba(255, 159, 0, 0.92); }
.card-tag.is-ended { background: rgba(102, 102, 102, 0.9); }
.activity-body { min-width: 0; display: grid; align-content: space-between; }
.meta-row { margin-bottom: 8rpx; }
.activity-title { display: -webkit-box; overflow: hidden; color: #172b28; font-size: 28rpx; line-height: 1.35; font-weight: 900; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.activity-location { margin-top: 8rpx; overflow: hidden; color: #5b7771; font-size: 22rpx; text-overflow: ellipsis; white-space: nowrap; }
.activity-desc {
  display: -webkit-box;
  margin-top: 8rpx;
  overflow: hidden;
  color: #788f8a;
  font-size: 21rpx;
  line-height: 1.45;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
.capacity-row { gap: 10rpx; margin-top: 10rpx; }
.capacity-pill {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  color: #66827d;
  font-size: 20rpx;
  white-space: nowrap;
}
.card-price { flex: 0 0 auto; align-self: flex-end; color: #c35240; font-size: 26rpx; font-weight: 900; }
.activity-action { grid-column: 2 / -1; min-height: 62rpx; display: flex; align-items: center; justify-content: center; margin-top: 12rpx; border-radius: 8rpx; background: #0f766e; color: #fff; font-size: 24rpx; font-weight: 900; }
.load-more { margin-top: 4rpx; }
.no-more { padding: 6rpx 0 10rpx; text-align: center; color: #999999; font-size: 24rpx; }
</style>

