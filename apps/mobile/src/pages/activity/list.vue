<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onReachBottom, onShareAppMessage, onShareTimeline, onShow } from "@dcloudio/uni-app";
import { consumeActivityListIntent, getCurrentTenantCode, request, withTenantCode } from "../../api";
import { filterIntrinsicHeaderDecorationSections, usePageDecoration } from "../../decoration";
import { loadPageTheme } from "../../theme";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { defaultMiniProgramShare, defaultMiniProgramTimelineShare, showMiniProgramShareMenu } from "../../share";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import ActivityPreviewRow from '../../components/ActivityPreviewRow.vue';
import TabBar from "../../components/TabBar.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import { motionStyle } from "../../motion/platform-adapter";

type ActivityStatusFilter = "all" | "open" | "full" | "ended";

const categories = ref<any[]>([]);
const rows = ref<any[]>([]);
const activeCategoryId = ref<number | "all">("all");
const activeStatus = ref<ActivityStatusFilter>("all");
const publicActivityArchiveEnabled = ref(false);
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

const statusTabs = computed(() => [
  { label: "全部", value: "all" },
  { label: "报名中", value: "open" },
  { label: "已满员", value: "full" },
  ...(publicActivityArchiveEnabled.value ? [{ label: "已结束", value: "ended" as const }] : [])
]);

function safeList<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

const visibleCategories = computed(() => safeList<any>(categories.value));

function goDetail(id: number) {
  uni.navigateTo({ url: withTenantCode(`/pages/activity/detail?id=${id}`) });
}

function statusText(status: string) {
  if (status === "full") return "已满员";
  if (status === "ended") return "已结束";
  return "报名中";
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

function clearKeyword() {
  keyword.value = "";
  loadFirstPage();
}

const heroSubtitle = computed(() => innerPageConfig.value.subtitle || "筛选近期活动，快速找到适合参加的线下活动。");
const resultHint = computed(() => {
  const categoryName = activeCategoryId.value === "all"
    ? "全部分类"
    : visibleCategories.value.find((item) => item.id === activeCategoryId.value)?.name || "已选分类";
  const statusName = statusTabs.value.find((item) => item.value === activeStatus.value)?.label || "全部";
  return `${categoryName} · ${statusName}`;
});
const dateGroups = computed(() => {
  const groups = new Map<string, { key: string; label: string; items: any[] }>();
  for (const item of safeList<any>(rows.value)) {
    const date = new Date(item.startTime);
    const valid = !Number.isNaN(date.getTime());
    const shifted = valid ? new Date(date.getTime() + 8 * 60 * 60 * 1000) : null;
    const key = shifted ? `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}` : "待定";
    const week = shifted ? ["日", "一", "二", "三", "四", "五", "六"][shifted.getUTCDay()] : "";
    const label = shifted ? `${shifted.getUTCMonth() + 1}月${shifted.getUTCDate()}日 · 周${week}` : "时间待定";
    if (!groups.has(key)) groups.set(key, { key, label, items: [] });
    groups.get(key)!.items.push(item);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, items: [...group.items].sort((left, right) => new Date(left.startTime || 0).getTime() - new Date(right.startTime || 0).getTime()) }))
    .sort((left, right) => left.key.localeCompare(right.key));
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
    const items = Array.isArray(result) ? result : safeList<any>(result?.items);
    rows.value = append ? safeList<any>(rows.value).concat(items) : items;
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

function selectStatus(value: ActivityStatusFilter) {
  if (value === "ended" && !publicActivityArchiveEnabled.value) return;
  if (activeStatus.value === value) return;
  activeStatus.value = value;
  loadFirstPage();
}

function applyRouteQuery() {
  const pages = getCurrentPages();
  const query = (pages[pages.length - 1] as any).options || {};
  activeCategoryId.value = query.categoryId ? Number(query.categoryId) : "all";
  const status = String(query.status || "");
  activeStatus.value = (["all", "open", "full", "ended"] as ActivityStatusFilter[]).includes(status as ActivityStatusFilter) ? status as ActivityStatusFilter : "all";
  keyword.value = typeof query.keyword === "string" ? query.keyword : keyword.value;
}

async function loadOperationSetting() {
  try {
    const setting = await request<any>("/public/settings/operation");
    publicActivityArchiveEnabled.value = Boolean(setting?.publicActivityArchiveEnabled);
  } catch {
    publicActivityArchiveEnabled.value = false;
  }
  if (!publicActivityArchiveEnabled.value && activeStatus.value === "ended") activeStatus.value = "all";
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
    if (categoryLoadGuard.isCurrent(loadToken)) categories.value = safeList<any>(items);
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
  await Promise.all([loadOperationSetting(), loadCategories(), loadDecoration()]);
  await loadFirstPage();
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
    <view class="activity-list-topbar app-enter">
      <TenantSwitcher compact :tenant="tenant" @changed="handleTenantChanged" />
      <view class="activity-list-actions"><view class="activity-list-count">{{ total }} 场活动</view></view>
    </view>

    <view class="activity-list-heading app-enter" :style="motionStyle(36)">
      <text class="activity-list-title">发现活动</text>
      <text class="activity-list-subtitle">按日期、兴趣和报名状态筛选</text>
    </view>

    <PageDecorationBlocks :sections="bodyDecorationSections" />

    <view class="filter-card app-enter" :style="{ ...motionStyle(72), background: String(innerPageLayout.stickyFilterBackground || '#FFFFFF') }">
      <view class="search-box">
        <view class="search-icon" aria-hidden="true" />
        <input v-model="keyword" class="search-input" aria-label="搜索活动、地点或分类" placeholder="搜索活动、地点、分类" confirm-type="search" @confirm="loadFirstPage" />
        <text v-if="keyword" class="clear" role="button" tabindex="0" aria-label="清空活动搜索词" @click="clearKeyword" @keyup.enter="clearKeyword" @keyup.space.prevent="clearKeyword">清空</text>
      </view>

      <view v-if="categoryError" class="filter-error" role="alert" aria-live="assertive">
        <text>{{ categoryError }}</text>
        <text class="filter-retry" role="button" tabindex="0" aria-label="重新加载活动分类" @click="loadCategories" @keyup.enter="loadCategories" @keyup.space.prevent="loadCategories">重新同步</text>
      </view>

      <scroll-view class="category-tabs" scroll-x :show-scrollbar="false" role="tablist" aria-label="活动分类筛选">
        <view class="tabs-track">
          <view class="category-chip app-press" :class="{ active: activeCategoryId === 'all' }" role="tab" tabindex="0" :aria-selected="activeCategoryId === 'all'" @click="selectCategory('all')" @keyup.enter="selectCategory('all')" @keyup.space.prevent="selectCategory('all')">全部</view>
          <view v-for="c in visibleCategories" :key="c.id" class="category-chip app-press" :class="{ active: activeCategoryId === c.id }" role="tab" tabindex="0" :aria-selected="activeCategoryId === c.id" @click="selectCategory(c.id)" @keyup.enter="selectCategory(c.id)" @keyup.space.prevent="selectCategory(c.id)">{{ c.name }}</view>
        </view>
      </scroll-view>

      <view class="status-tabs" :class="{ 'has-ended': publicActivityArchiveEnabled }" role="tablist" aria-label="活动状态筛选">
        <view v-for="tab in statusTabs" :key="tab.value" class="status-tab app-press" :class="{ active: activeStatus === tab.value }" role="tab" tabindex="0" :aria-selected="activeStatus === tab.value" @click="selectStatus(tab.value)" @keyup.enter="selectStatus(tab.value)" @keyup.space.prevent="selectStatus(tab.value)">
          {{ tab.label }}
        </view>
      </view>
    </view>

    <view class="section-head activity-result-head app-enter" :style="motionStyle(108)">
      <view>
        <text class="title-md">{{ resultHint }}</text>
        <text class="subtle section-copy">已展示 {{ rows.length }} 场活动</text>
      </view>
    </view>

    <view v-if="loading" class="card state-card" role="status" aria-live="polite">加载中…</view>
    <view v-else-if="error" class="card state-card" role="alert" aria-live="assertive">
      <view>{{ error }}</view>
      <view class="button secondary retry-button" role="button" tabindex="0" aria-label="重新加载活动列表" @click="loadFirstPage" @keyup.enter="loadFirstPage" @keyup.space.prevent="loadFirstPage">重试</view>
    </view>
    <view v-else-if="!rows.length" class="card empty-state-card">
      <text class="title-md">没有找到匹配活动</text>
      <text class="body-text empty-copy">试试切换分类、状态，或者减少搜索关键词。</text>
    </view>

    <view v-else class="activity-feed">
      <view v-for="group in dateGroups" :key="group.key" class="activity-date-group">
        <view class="date-group-head"><text>{{ group.label }}</text><text>{{ group.items.length }} 场</text></view>
        <ActivityPreviewRow v-for="item in group.items" :key="item.id" :activity="item" :date-label="formatTime(item.startTime)" :price-label="priceText(item.price)" :status-label="statusText(item.displayStatus || item.status)" @open="goDetail(item.id)" />
      </view>

      <view v-if="hasMore" class="button block load-more" :class="{ disabled: loadingMore }" role="button" tabindex="0" :aria-disabled="loadingMore" :aria-busy="loadingMore" aria-label="加载更多活动" @click="loadMore" @keyup.enter="loadMore" @keyup.space.prevent="loadMore">
        {{ loadingMore ? "加载中…" : "加载更多" }}
      </view>
      <view v-else class="no-more">没有更多活动了</view>
    </view>

    <TabBar current="activity" />
  </view>
</template>

<style scoped>
.activity-page { padding: 24rpx 28rpx; background: #fff; max-width: 760px; margin: 0 auto; overflow-wrap: anywhere; }
.activity-list-topbar { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.activity-list-actions { flex-shrink: 0; }
.activity-list-count { color: #65736a; font-size: 24rpx; }
.activity-list-heading { margin: 24rpx 0; }
.activity-list-title { display: block; color: #28332d; font: 40rpx "STSong", "SimSun", "Noto Serif CJK SC", serif; line-height: 1.5; }
.activity-list-subtitle { display: block; margin-top: 8rpx; color: #65736a; font-size: 24rpx; line-height: 1.6; }
.filter-card { padding: 0 0 24rpx; border-bottom: 1rpx solid #e1e6de; }
.search-box { display: flex; align-items: center; gap: 16rpx; min-height: 78rpx; padding: 0 20rpx; border: 1rpx solid #d6dfd4; border-radius: 6rpx; background: #fff; }
.search-icon { width: 25rpx; height: 25rpx; border: 3rpx solid #65736a; border-radius: 50%; position: relative; flex-shrink: 0; }
.search-icon::after { content: ""; position: absolute; width: 12rpx; height: 3rpx; background: #65736a; right: -9rpx; bottom: -5rpx; transform: rotate(45deg); }
.search-input { flex: 1; min-width: 0; height: 76rpx; font-size: 26rpx; color: #28332d; }
.clear { flex-shrink: 0; padding: 12rpx 0; color: #a33d36; font-size: 24rpx; }
.category-tabs { width: 100%; margin-top: 20rpx; white-space: nowrap; }
.tabs-track { display: inline-flex; gap: 22rpx; }
.category-chip { display: inline-flex; align-items: center; min-height: 70rpx; padding: 8rpx 3rpx; border-bottom: 3rpx solid transparent; color: #65736a; font-size: 26rpx; }
.category-chip.active { color: #386151; border-color: #386151; font-weight: 600; }
.status-tabs { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }
.status-tab { display: flex; align-items: center; justify-content: center; min-height: 60rpx; padding: 8rpx 18rpx; border: 1rpx solid #e1e6de; border-radius: 6rpx; color: #65736a; font-size: 24rpx; }
.status-tab.active { color: #386151; background: #eaf0e9; border-color: #b4c6b7; }
.filter-error { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; padding: 16rpx; background: #fff4f2; color: #a33d36; font-size: 24rpx; }
.filter-retry { text-decoration: underline; }
.activity-result-head { margin: 24rpx 0 16rpx; }
.activity-result-head .title-md { color: #28332d; font-size: 26rpx; font-weight: 500; }
.section-copy { display: block; margin-top: 6rpx; color: #65736a; font-size: 22rpx; }
.activity-date-group { margin-bottom: 20rpx; }
.date-group-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 14rpx 0; border-bottom: 1rpx solid #e1e6de; font-size: 25rpx; color: #386151; }
.date-group-head text:last-child { font-size: 21rpx; color: #65736a; }
.state-card,.empty-state-card { border: 0; border-bottom: 1rpx solid #e1e6de; border-radius: 0; padding: 30rpx 0; background: #fff; color: #65736a; line-height: 1.6; }
.empty-copy { display: block; margin-top: 14rpx; font-size: 25rpx; color: #65736a; }
.retry-button { margin-top: 20rpx; }
.load-more { margin-top: 24rpx; background: #a33d36; border-radius: 6rpx; }
.no-more { padding: 26rpx 0; color: #879188; font-size: 23rpx; text-align: center; }
.category-chip:focus-visible,.status-tab:focus-visible { outline: 3rpx solid #386151; outline-offset: 3rpx; }
</style>
