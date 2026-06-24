<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onReachBottom, onShow } from "@dcloudio/uni-app";
import { consumeActivityListIntent, getCurrentTenantCode, request, withTenantCode } from "../../api";
import { usePageDecoration } from "../../decoration";
import { loadPageTheme } from "../../theme";
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
const page = ref(1);
const pageSize = 8;
const total = ref(0);
const hasMore = ref(false);
const mounted = ref(false);
const lastLoadedTenantCode = ref("");
const { tenant, contentSections, innerPageConfig, innerPageLayout, loadDecoration } = usePageDecoration("activity_list", "/pages/activity/list");
const bodyDecorationSections = computed(() => contentSections.value.filter((section) => {
  if (section.type === "hero") return false;
  if (section.type === "rich_text" && section.title === "页面说明") return false;
  return true;
}));

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

const heroSubtitle = computed(() => innerPageConfig.value.subtitle || "筛选近期活动，快速找到适合参加的课程和线下活动。");
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
  if (append) loadingMore.value = true;
  else loading.value = true;
  error.value = "";
  try {
    const result = await request<any>(buildQuery(nextPage));
    const items = Array.isArray(result) ? result : result.items || [];
    rows.value = append ? rows.value.concat(items) : items;
    total.value = Array.isArray(result) ? items.length : result.total || 0;
    page.value = Array.isArray(result) ? nextPage : result.page || nextPage;
    hasMore.value = Array.isArray(result) ? false : Boolean(result.hasMore);
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
  <view class="container activity-page has-custom-nav">
    <TenantSwitcher :tenant="tenant" title="当前城市" @changed="handleTenantChanged" />

    <view class="hero-card" :style="{ background: String(innerPageLayout.headerBackgroundColor || 'linear-gradient(135deg, rgba(196,61,61,0.96), rgba(122,36,32,0.96))') }">
      <view class="hero-copy">
        <text class="hero-kicker">慢π · {{ cityName() }}</text>
        <text class="hero-title" :style="{ color: String(innerPageLayout.headerTextColor || '#fff8f0') }">{{ innerPageConfig.title || "活动列表" }}</text>
        <text class="hero-subtitle" :style="{ color: String(innerPageLayout.headerSubtitleColor || 'rgba(255,248,240,0.82)') }">{{ heroSubtitle }}</text>
      </view>
      <view class="hero-side">
        <view class="hero-count">{{ total }}</view>
        <text class="hero-label">当前场次</text>
      </view>
    </view>

    <PageDecorationBlocks :sections="bodyDecorationSections" />

    <view class="card filter-card" :style="{ background: String(innerPageLayout.stickyFilterBackground || 'var(--card-bg, #FFFFFF)') }">
      <view class="row filter-head">
        <view>
          <text class="title-md">活动雅集</text>
          <text class="subtle filter-hint">{{ resultHint }}</text>
        </view>
        <view class="result-badge">{{ rows.length }}/{{ total }}</view>
      </view>

      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input v-model="keyword" class="search-input" placeholder="搜索活动、地点、分类" confirm-type="search" @confirm="loadFirstPage" />
        <text v-if="keyword" class="clear" @click="clearKeyword">清空</text>
      </view>

      <scroll-view class="category-tabs" scroll-x :show-scrollbar="false">
        <view class="tabs-track">
          <view class="category-chip" :class="{ active: activeCategoryId === 'all' }" @click="selectCategory('all')">全部</view>
          <view v-for="c in categories" :key="c.id" class="category-chip" :class="{ active: activeCategoryId === c.id }" @click="selectCategory(c.id)">{{ c.name }}</view>
        </view>
      </scroll-view>

      <view class="status-tabs">
        <view v-for="tab in statusTabs" :key="tab.value" class="status-tab" :class="{ active: activeStatus === tab.value }" @click="selectStatus(tab.value)">
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

    <view v-if="loading" class="card state-card">加载中...</view>
    <view v-else-if="error" class="card state-card">
      <view>{{ error }}</view>
      <view class="button secondary retry-button" @click="loadFirstPage">重试</view>
    </view>
    <view v-else-if="!rows.length" class="card empty-state-card">
      <text class="empty-icon">🪷</text>
      <text class="title-md">没有找到匹配活动</text>
      <text class="body-text empty-copy">试试切换分类、状态，或者减少搜索关键词。</text>
    </view>

    <view v-else class="activity-feed">
      <view v-for="item in rows" :key="item.id" class="activity-card" @click="goDetail(item.id)">
        <view class="activity-cover">
          <image v-if="item.coverUrl" :src="item.coverUrl" mode="aspectFill" />
          <view v-else class="cover-fallback">
            <text>{{ item.category?.name || "活动" }}</text>
          </view>
          <view class="cover-overlay"></view>
          <view class="cover-top">
            <text class="card-tag" :class="statusClass(item.displayStatus)">{{ statusText(item.displayStatus) }}</text>
            <text class="card-price">{{ priceText(item.price) }}</text>
          </view>
          <view class="cover-bottom">
            <text class="cover-title">{{ item.title }}</text>
            <text class="cover-meta">{{ formatTime(item.startTime) }} · {{ item.location || "待定地点" }}</text>
          </view>
        </view>

        <view class="activity-body">
          <view class="row meta-row">
            <view class="tag tag-secondary">{{ item.category?.name || "活动" }}</view>
            <text class="subtle">{{ item.requireReview ? "需审核" : "即时确认" }}</text>
          </view>

          <text class="body-text activity-desc">{{ item.description || "主办方正在完善活动介绍，欢迎先进入详情页了解完整安排。" }}</text>

          <view class="info-grid">
            <view class="info-cell">
              <text class="info-label">时间</text>
              <text class="info-value">{{ formatTime(item.startTime) }}</text>
            </view>
            <view class="info-cell">
              <text class="info-label">地点</text>
              <text class="info-value">{{ item.location || "待定" }}</text>
            </view>
          </view>

          <view class="row capacity-row">
            <view class="capacity-pill">
              <text>已报 {{ item.registeredCount }}</text>
              <text>候补 {{ item.waitingCount || 0 }}</text>
              <text>余 {{ item.remainingSeats }}/{{ item.capacity }}</text>
            </view>
            <view class="button sm">{{ item.displayStatus === "open" ? "去报名" : "查看详情" }}</view>
          </view>
        </view>
      </view>

      <view v-if="hasMore" class="button block load-more" :class="{ disabled: loadingMore }" @click="loadMore">
        {{ loadingMore ? "加载中..." : "加载更多" }}
      </view>
      <view v-else class="no-more">没有更多活动了</view>
    </view>

    <TabBar current="activity" />
  </view>
</template>

<style scoped>
.activity-page { gap: 0; }
.hero-card {
  display: flex;
  gap: 20rpx;
  align-items: stretch;
  padding: 30rpx 28rpx;
  margin-bottom: 24rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, rgba(196,61,61,0.96), rgba(122,36,32,0.96));
  box-shadow: 0 18rpx 40rpx rgba(122, 36, 32, 0.18);
}
.hero-copy { flex: 1; min-width: 0; display: grid; gap: 12rpx; }
.hero-kicker { color: rgba(255, 240, 228, 0.76); font-size: 23rpx; font-weight: 700; letter-spacing: 2rpx; }
.hero-title { color: #fff8f0; font-size: 48rpx; font-weight: 700; line-height: 1.24; font-family: "STKaiti", "KaiTi", serif; }
.hero-subtitle { color: rgba(255, 248, 240, 0.82); font-size: 25rpx; line-height: 1.65; }
.hero-side {
  width: 148rpx;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
  background: rgba(255, 248, 240, 0.14);
  color: #fff8f0;
}
.hero-count { font-size: 52rpx; font-weight: 700; line-height: 1; }
.hero-label { margin-top: 10rpx; font-size: 22rpx; color: rgba(255, 248, 240, 0.84); }
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
  background: rgba(196, 61, 61, 0.12);
  color: #c43d3d;
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
  border-radius: 999px;
  background: #f9f4ee;
  border: 1rpx solid rgba(196, 61, 61, 0.08);
}
.search-icon { font-size: 30rpx; }
.search-input { min-width: 0; height: 84rpx; font-size: 28rpx; color: var(--text-color, #333333); }
.clear { color: #c43d3d; font-size: 24rpx; font-weight: 600; }
.category-tabs { width: 100%; margin-top: 18rpx; white-space: nowrap; }
.tabs-track { display: inline-flex; gap: 12rpx; padding-right: 20rpx; }
.category-chip {
  flex: 0 0 auto;
  min-height: 60rpx;
  padding: 0 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #f3ece4;
  color: #666666;
  font-size: 25rpx;
}
.category-chip.active { background: #c43d3d; color: #fff; font-weight: 600; }
.status-tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12rpx; margin-top: 20rpx; }
.status-tab {
  min-height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
  background: #f3ece4;
  color: #666666;
  font-size: 24rpx;
}
.status-tab.active { background: rgba(74, 107, 138, 0.14); color: #4a6b8a; font-weight: 600; }
.section-head { margin-bottom: 18rpx; }
.section-copy { display: block; margin-top: 8rpx; }
.state-card { text-align: center; }
.retry-button { display: inline-flex; margin: 20rpx auto 0; min-width: 180rpx; }
.empty-state-card { display: grid; justify-items: center; gap: 14rpx; text-align: center; }
.empty-icon { font-size: 72rpx; }
.empty-copy { text-align: center; }
.activity-feed { display: grid; gap: 24rpx; }
.activity-card {
  overflow: hidden;
  border-radius: 24rpx;
  background: var(--card-bg, #ffffff);
  box-shadow: 0 8rpx 28rpx rgba(51, 51, 51, 0.06);
}
.activity-cover { position: relative; height: 320rpx; background: linear-gradient(135deg, #eadfd0, #d7d0ca); }
.activity-cover image,
.cover-fallback { width: 100%; height: 100%; display: block; }
.cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 248, 240, 0.92);
  font-size: 46rpx;
  font-weight: 700;
  font-family: "STKaiti", "KaiTi", serif;
  background: linear-gradient(135deg, #8e2d28, #c43d3d);
}
.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(24, 20, 18, 0.14), rgba(24, 20, 18, 0.68));
}
.cover-top,
.cover-bottom {
  position: absolute;
  left: 22rpx;
  right: 22rpx;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}
.cover-top { top: 20rpx; }
.cover-bottom {
  bottom: 20rpx;
  flex-direction: column;
  align-items: flex-start;
}
.card-tag {
  min-height: 50rpx;
  padding: 0 16rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #fff;
  font-size: 23rpx;
  font-weight: 700;
}
.card-tag.is-open { background: rgba(7, 193, 96, 0.9); }
.card-tag.is-full { background: rgba(255, 159, 0, 0.92); }
.card-tag.is-ended { background: rgba(102, 102, 102, 0.9); }
.card-price {
  padding: 8rpx 16rpx;
  border-radius: 999px;
  background: rgba(255, 248, 240, 0.18);
  color: #fff8f0;
  font-size: 25rpx;
  font-weight: 700;
}
.cover-title {
  color: #fff8f0;
  font-size: 38rpx;
  line-height: 1.3;
  font-weight: 700;
  font-family: "STKaiti", "KaiTi", serif;
}
.cover-meta { color: rgba(255, 248, 240, 0.82); font-size: 23rpx; }
.activity-body { padding: 24rpx; }
.meta-row { margin-bottom: 14rpx; }
.activity-desc {
  display: -webkit-box;
  margin-bottom: 18rpx;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; margin-bottom: 18rpx; }
.info-cell {
  min-width: 0;
  padding: 18rpx;
  border-radius: 18rpx;
  background: #f9f4ee;
  display: grid;
  gap: 8rpx;
}
.info-label { color: #999999; font-size: 22rpx; }
.info-value {
  color: #333333;
  font-size: 25rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.capacity-row { gap: 16rpx; }
.capacity-pill {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  color: #666666;
  font-size: 23rpx;
}
.load-more { margin-top: 4rpx; }
.no-more { padding: 6rpx 0 10rpx; text-align: center; color: #999999; font-size: 24rpx; }
</style>

