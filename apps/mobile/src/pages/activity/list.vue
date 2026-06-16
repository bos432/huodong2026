<script setup lang="ts">
import { onMounted, ref } from "vue";
import { onReachBottom, onShow } from "@dcloudio/uni-app";
import { consumeActivityListIntent, getCurrentTenantCode, request, withTenantCode } from "../../api";
import { usePageDecoration } from "../../decoration";
import { loadPageTheme } from "../../theme";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import AppBottomNav from "../../components/AppBottomNav.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";

const categories = ref<any[]>([]);
const rows = ref<any[]>([]);
const activeCategoryId = ref<number | "all">("all");
const activeStatus = ref<"all" | "open" | "full" | "ended">("all");
const keyword = ref("");
const loading = ref(true);
const loadingMore = ref(false);
const error = ref("");
const page = ref(1);
const pageSize = 8;
const total = ref(0);
const hasMore = ref(false);
const mounted = ref(false);
const lastLoadedTenantCode = ref("");
const { tenant, bottomNavSection, contentSections, innerPageConfig, innerPageLayout, showBottomNav, loadDecoration } = usePageDecoration("activity_list", "/pages/activity/list");

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

function formatTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function clearKeyword() {
  keyword.value = "";
  loadFirstPage();
}

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
  if (append) loadingMore.value = true;
  else loading.value = true;
  error.value = "";
  try {
    const result = await request<any>(buildQuery(nextPage));
    rows.value = append ? rows.value.concat(result.items || []) : result.items || [];
    total.value = result.total || 0;
    page.value = result.page || nextPage;
    hasMore.value = Boolean(result.hasMore);
  } catch (err: any) {
    error.value = err.message || "加载失败";
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function loadFirstPage() {
  page.value = 1;
  hasMore.value = false;
  loadPage(1);
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
  try {
    categories.value = await request<any[]>("/public/categories");
  } catch {
    categories.value = [];
  }
}

async function reloadCurrentTenant(resetFilters = false) {
  lastLoadedTenantCode.value = getCurrentTenantCode();
  if (resetFilters) {
    activeCategoryId.value = "all";
    activeStatus.value = "all";
    keyword.value = "";
  }
  await Promise.all([loadCategories(), loadDecoration()]);
  loadFirstPage();
}

async function handleTenantChanged() {
  await loadPageTheme();
  await reloadCurrentTenant(true);
}

onMounted(() => {
  mounted.value = true;
  lastLoadedTenantCode.value = getCurrentTenantCode();
  applyRouteQuery();
  applyIntent();
  loadCategories();
  loadFirstPage();
  loadDecoration();
});

onShow(() => {
  if (!mounted.value) return;
  const changedTenant = getCurrentTenantCode() !== lastLoadedTenantCode.value;
  const hasIntent = applyIntent();
  if (changedTenant) {
    loadPageTheme();
    reloadCurrentTenant(!hasIntent);
  }
  else if (hasIntent) loadFirstPage();
});

onReachBottom(loadMore);
</script>

<template>
  <view class="activity-page" :class="{ 'has-custom-nav': showBottomNav }">
    <TenantSwitcher :tenant="tenant" title="当前城市" @changed="handleTenantChanged" />
    <PageDecorationBlocks :sections="contentSections" />

    <view class="page-head" :style="{ background: String(innerPageLayout.headerBackgroundColor || '#ffffff') }">
      <view class="summary-title" :style="{ color: String(innerPageLayout.headerTextColor || '#111827') }">{{ innerPageConfig.title || "活动" }}</view>
      <view class="summary-subtitle" :style="{ color: String(innerPageLayout.headerSubtitleColor || '#667085') }">{{ innerPageConfig.subtitle || "筛选近期活动，快速找到适合参加的课程和线下活动。" }}</view>
    </view>

    <view class="filter-panel" :style="{ background: String(innerPageLayout.stickyFilterBackground || 'var(--page-bg, #f4f6f8)') }">
      <view class="search-box">
        <text class="search-icon">⌕</text>
        <input v-model="keyword" class="search-input" placeholder="搜索活动、地点、分类" confirm-type="search" @confirm="loadFirstPage" />
        <text v-if="keyword" class="clear" @click="clearKeyword">×</text>
      </view>

      <scroll-view scroll-x class="category-tabs" :show-scrollbar="false">
        <view class="tabs-track">
          <view class="chip" :class="{ active: activeCategoryId === 'all' }" @click="selectCategory('all')">全部</view>
          <view v-for="c in categories" :key="c.id" class="chip" :class="{ active: activeCategoryId === c.id }" @click="selectCategory(c.id)">{{ c.name }}</view>
        </view>
      </scroll-view>

      <view class="status-tabs">
        <view v-for="tab in statusTabs" :key="tab.value" class="status-tab" :class="{ active: activeStatus === tab.value }" @click="selectStatus(tab.value)">
          {{ tab.label }}
        </view>
      </view>
    </view>

    <view class="summary">
      <view>
        <view class="summary-subtitle">共 {{ total }} 场，已加载 {{ rows.length }} 场</view>
      </view>
      <view class="summary-count">{{ total }}</view>
    </view>

    <view v-if="loading" class="state-card">加载中...</view>
    <view v-else-if="error" class="state-card">
      <view>{{ error }}</view>
      <view class="retry" @click="loadFirstPage">重试</view>
    </view>
    <view v-else-if="!rows.length" class="empty">
      <view class="empty-title">没有找到匹配活动</view>
      <view class="empty-copy">试试切换分类、状态，或者减少搜索关键词。</view>
    </view>

    <view v-else class="feed">
      <view v-for="item in rows" :key="item.id" class="activity-card" @click="goDetail(item.id)">
        <view class="cover">
          <image v-if="item.coverUrl" :src="item.coverUrl" mode="aspectFill" />
          <view v-else class="cover-fallback">活动</view>
          <text class="status-pill" :class="statusClass(item.displayStatus)">{{ statusText(item.displayStatus) }}</text>
        </view>
        <view class="body">
          <view class="row top-line">
            <text class="category">{{ item.category?.name || "活动" }}</text>
            <text class="price">{{ priceText(item.price) }}</text>
          </view>
          <view class="name">{{ item.title }}</view>
          <view class="desc">{{ item.description || "主办方正在完善活动介绍" }}</view>
          <view class="meta">
            <view>时间：{{ formatTime(item.startTime) }}</view>
            <view>地点：{{ item.location }}</view>
          </view>
          <view class="bottom-line">
            <view class="capacity">
              <text>已报 {{ item.registeredCount }}</text>
              <text>候补 {{ item.waitingCount || 0 }}</text>
              <text>余 {{ item.remainingSeats }}/{{ item.capacity }}</text>
            </view>
            <view class="cta">{{ item.displayStatus === "open" ? "去报名" : "查看详情" }}</view>
          </view>
        </view>
      </view>

      <view v-if="hasMore" class="load-more" :class="{ disabled: loadingMore }" @click="loadMore">
        {{ loadingMore ? "加载中..." : "加载更多" }}
      </view>
      <view v-else class="no-more">没有更多活动了</view>
    </view>

    <AppBottomNav v-if="showBottomNav" :section="bottomNavSection" current-path="/pages/activity/list" />
  </view>
</template>

<style scoped>
.activity-page { min-height: 100vh; padding: 22rpx 24rpx 48rpx; background: var(--page-bg-layer, #f4f6f8); background-size: var(--page-bg-size, cover); background-position: var(--page-bg-position, center top); background-attachment: fixed; color: var(--text-color, #111827); }
.activity-page.has-custom-nav { padding-bottom: 160rpx; }
.page-head { margin-bottom: 18rpx; padding: 28rpx 24rpx; border-radius: var(--card-radius, 8px); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.filter-panel { position: sticky; top: 0; z-index: 3; padding: 10rpx 0 18rpx; background: var(--page-bg, #f4f6f8); }
.search-box { height: 76rpx; display: grid; grid-template-columns: auto 1fr auto; gap: 12rpx; align-items: center; padding: 0 22rpx; border-radius: 999px; background: var(--card-bg, #fff); box-shadow: 0 10rpx 28rpx rgba(15, 23, 42, 0.06); }
.search-icon { color: var(--text-color, #111827); font-size: 34rpx; }
.search-input { min-width: 0; height: 76rpx; color: var(--text-color, #111827); font-size: 27rpx; }
.clear { width: 44rpx; height: 44rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #eef2f7; color: var(--muted-color, #667085); font-size: 34rpx; line-height: 1; }
.category-tabs { width: 100%; height: 64rpx; margin-top: 18rpx; white-space: nowrap; }
.tabs-track { display: inline-flex; gap: 14rpx; padding-right: 24rpx; }
.chip { flex: 0 0 auto; padding: 14rpx 24rpx; border-radius: 999px; background: var(--card-bg, #fff); color: #475467; font-size: 26rpx; font-weight: 700; }
.chip.active { background: #111827; color: #fff; }
.status-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; margin-top: 18rpx; }
.status-tab { height: 62rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--card-bg, #fff); color: var(--muted-color, #667085); font-size: 24rpx; font-weight: 700; }
.status-tab.active { background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); }
.summary { display: flex; justify-content: space-between; align-items: center; margin: 12rpx 0 20rpx; }
.summary-title { font-size: 38rpx; font-weight: 900; }
.summary-subtitle { margin-top: 6rpx; color: var(--muted-color, #667085); font-size: 24rpx; }
.summary-count { min-width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #111827; color: #fff; font-weight: 900; }
.activity-card { overflow: hidden; margin-bottom: 22rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.07); }
.cover { position: relative; height: 310rpx; background: #dbe7e5; }
.cover image, .cover-fallback { width: 100%; height: 100%; display: block; }
.cover-fallback { display: flex; align-items: center; justify-content: center; color: var(--primary-color, #0f766e); background: var(--primary-soft, #dff4ee); font-size: 40rpx; font-weight: 900; }
.status-pill { position: absolute; left: 18rpx; top: 18rpx; padding: 8rpx 16rpx; border-radius: 999px; color: #fff; font-size: 23rpx; font-weight: 800; }
.status-pill.is-open { background: var(--primary-color, #0f766e); }
.status-pill.is-full { background: #f59e0b; }
.status-pill.is-ended { background: #667085; }
.body { padding: 22rpx; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.top-line { margin-bottom: 12rpx; }
.category { color: var(--primary-color, #0f766e); font-size: 24rpx; font-weight: 800; }
.price { color: #ef4444; font-size: 30rpx; font-weight: 900; }
.name { color: var(--text-color, #111827); font-size: 34rpx; line-height: 1.35; font-weight: 900; }
.desc { display: -webkit-box; margin-top: 10rpx; color: var(--muted-color, #667085); font-size: 25rpx; line-height: 1.55; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.meta { display: grid; gap: 8rpx; margin-top: 18rpx; color: #344054; font-size: 25rpx; }
.bottom-line { display: flex; justify-content: space-between; align-items: center; gap: 18rpx; margin-top: 22rpx; }
.capacity { display: flex; flex-wrap: wrap; gap: 10rpx; color: #8a94a6; font-size: 23rpx; }
.cta { flex: 0 0 auto; min-width: 140rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--primary-color, #0f766e); color: #fff; font-size: 26rpx; font-weight: 800; }
.state-card, .empty { padding: 34rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); color: var(--muted-color, #667085); font-size: 26rpx; text-align: center; }
.empty-title { color: var(--text-color, #111827); font-size: 32rpx; font-weight: 900; }
.empty-copy { margin-top: 10rpx; color: var(--muted-color, #667085); font-size: 25rpx; }
.retry { display: inline-flex; margin-top: 18rpx; padding: 12rpx 24rpx; border-radius: 999px; background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); font-weight: 800; }
.load-more, .no-more { height: 76rpx; display: flex; align-items: center; justify-content: center; margin-top: 8rpx; border-radius: 999px; font-size: 26rpx; font-weight: 800; }
.load-more { background: #111827; color: #fff; }
.load-more.disabled { opacity: 0.58; }
.no-more { color: #98a2b3; }
</style>
