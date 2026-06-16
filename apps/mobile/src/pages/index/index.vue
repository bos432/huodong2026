<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getCurrentTenantCode, request, setActivityListIntent, setCurrentTenantCode, withTenantCode } from "../../api";
import { loadPageTheme } from "../../theme";
import AppBottomNav from "../../components/AppBottomNav.vue";
import { goDecoratedLink, quickInitial as decoratedQuickInitial } from "../../decoration";
import { markdownToPlainText, type HomepagePayload, type HomepageSectionView, type PublicTenantView } from "@activity/shared";

const sections = ref<HomepageSectionView[]>([]);
const tenant = ref<HomepagePayload["tenant"] | null>(null);
const tenantOptions = ref<PublicTenantView[]>([]);
const tenantSwitcherOpen = ref(false);
const announcements = ref<any[]>([]);
const categories = ref<any[]>([]);
const latest = ref<any[]>([]);
const featured = ref<any[]>([]);
const activeCategoryId = ref<number | "hot">("hot");
const feedPageBySection = ref<Record<number, number>>({});
const loading = ref(true);
const error = ref("");
const usingFallback = ref(false);
const mounted = ref(false);
const lastLoadedTenantCode = ref("");

const defaultSections: HomepageSectionView[] = [
  { id: -1, pageKey: "home", type: "search_bar", title: null, subtitle: null, enabled: true, sortOrder: 10, config: { cityLabel: "本地", placeholder: "搜索沙龙、读书会、培训" }, layout: {} },
  { id: -2, pageKey: "home", type: "hero", title: "发现值得参加的线下活动", subtitle: "沙龙、读书会、训练营和社群聚会，一站完成筛选、报名、付款确认和签到。", enabled: true, sortOrder: 20, config: { eyebrow: "Activity OS", showStats: true, primaryButtonText: "浏览活动", primaryButtonLink: "/pages/activity/list", backgroundColor: "#0f766e", backgroundImage: "" }, layout: {} },
  { id: -3, pageKey: "home", type: "announcement_bar", title: "公告", subtitle: null, enabled: true, sortOrder: 30, config: { limit: 5, pinnedFirst: true, link: "/pages/announcement/list" }, layout: {} },
  { id: -4, pageKey: "home", type: "quick_nav", title: null, subtitle: null, enabled: true, sortOrder: 40, config: { items: [
    { label: "全部活动", color: "#0f766e", link: "/pages/activity/list" },
    { label: "公告中心", color: "#c2410c", link: "/pages/announcement/list" },
    { label: "我的报名", color: "#4338ca", link: "/pages/user/my", action: "mainPage" },
    { label: "服务中心", color: "#475467", link: "/pages/service/index" }
  ] }, layout: {} },
  { id: -5, pageKey: "home", type: "category_grid", title: "活动社区", subtitle: "按兴趣快速进入活动池", enabled: true, sortOrder: 50, config: { limit: 8, showCover: true }, layout: {} },
  { id: -6, pageKey: "home", type: "featured_activities", title: "精选活动", subtitle: "主办方推荐，适合优先查看", enabled: true, sortOrder: 60, config: { source: "featured", limit: 6 }, layout: {} },
  { id: -7, pageKey: "home", type: "activity_tabs", title: null, subtitle: null, enabled: true, sortOrder: 70, config: { includeHot: true, limit: 8 }, layout: {} },
  { id: -8, pageKey: "home", type: "activity_feed", title: null, subtitle: null, enabled: true, sortOrder: 80, config: { source: "latest", limit: 10, pageSize: 4, pagination: "pager" }, layout: {} },
  { id: -9, pageKey: "home", type: "bottom_nav", title: "底部菜单", subtitle: null, enabled: true, sortOrder: 90, config: { items: [
    { label: "首页", link: "/pages/index/index", action: "mainPage", color: "#0f766e" },
    { label: "活动", link: "/pages/activity/list", action: "mainPage", color: "#0f766e" },
    { label: "我的", link: "/pages/user/my", action: "mainPage", color: "#0f766e" }
  ] }, layout: {} }
];

const orderedSections = computed(() => sections.value.filter((item) => item.enabled).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id));
const bottomNavSection = computed(() => orderedSections.value.find((item) => item.type === "bottom_nav"));
const hasBottomNav = computed(() => Boolean(bottomNavSection.value));
const tenantName = computed(() => tenant.value?.name || "");
const tenantHint = computed(() => tenant.value ? `${tenant.value.name}${tenant.value.region ? ` · ${tenant.value.region}` : ""}` : getCurrentTenantCode());
const currentTenantCode = computed(() => tenant.value?.code || getCurrentTenantCode());
const totalOpen = computed(() => latest.value.filter((item) => item.displayStatus === "open").length);
const feedRows = computed(() => {
  const source = activeCategoryId.value === "hot" ? latest.value : latest.value.filter((item) => item.category?.id === activeCategoryId.value);
  return source.slice(0, 10);
});

function sectionData(section: HomepageSectionView, key: string) {
  return ((section.data || {}) as Record<string, any>)[key] || [];
}

function pickActivities(section: HomepageSectionView) {
  const rows = sectionData(section, "activities");
  if (rows.length) return rows;
  return section.type === "featured_activities" ? (featured.value.length ? featured.value : latest.value).slice(0, Number(section.config.limit || 6)) : feedRows.value;
}

function feedAllRows(section: HomepageSectionView) {
  return pickActivities(section).slice(0, Number(section.config.limit || 10));
}

function feedPageSize(section: HomepageSectionView) {
  const value = Number(section.config.pageSize || 4);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1), 12) : 4;
}

function feedPage(section: HomepageSectionView) {
  return feedPageBySection.value[section.id] || 1;
}

function feedPageCount(section: HomepageSectionView) {
  return Math.max(Math.ceil(feedAllRows(section).length / feedPageSize(section)), 1);
}

function visibleFeedRows(section: HomepageSectionView) {
  const all = feedAllRows(section);
  if (section.config.pagination === "load_more") return all.slice(0, feedPage(section) * feedPageSize(section));
  const start = (feedPage(section) - 1) * feedPageSize(section);
  return all.slice(start, start + feedPageSize(section));
}

function setFeedPage(section: HomepageSectionView, nextPage: number) {
  const max = feedPageCount(section);
  feedPageBySection.value = { ...feedPageBySection.value, [section.id]: Math.min(Math.max(nextPage, 1), max) };
}

function resetFeedPages() {
  feedPageBySection.value = {};
}

function pickCategories(section: HomepageSectionView) {
  const rows = sectionData(section, "categories");
  return (rows.length ? rows : categories.value).slice(0, Number(section.config.limit || 8));
}

function pickAnnouncements(section: HomepageSectionView) {
  const rows = sectionData(section, "announcements");
  return (rows.length ? rows : announcements.value).slice(0, Number(section.config.limit || 5));
}

function cityLabel(section: HomepageSectionView) {
  return tenant.value?.region || section.config.cityLabel || "本地";
}

function tenantOptionLabel(item: PublicTenantView) {
  return item.region ? `${item.region} · ${item.name}` : item.name;
}

async function loadTenantOptions() {
  try {
    tenantOptions.value = await request<PublicTenantView[]>("/public/tenants");
  } catch {
    tenantOptions.value = [];
  }
}

function openTenantSwitcher() {
  if (!tenantOptions.value.length) loadTenantOptions();
  tenantSwitcherOpen.value = true;
}

async function selectTenant(item: PublicTenantView) {
  if (item.code === currentTenantCode.value) {
    tenantSwitcherOpen.value = false;
    return;
  }
  setCurrentTenantCode(item.code);
  tenantSwitcherOpen.value = false;
  await loadPageTheme();
  await load();
}

function goDetail(id: number) {
  uni.navigateTo({ url: withTenantCode(`/pages/activity/detail?id=${id}`) });
}

function goList(categoryId?: number) {
  if (categoryId) setActivityListIntent({ categoryId });
  else setActivityListIntent({ categoryId: "all" });
  uni.reLaunch({ url: withTenantCode("/pages/activity/list") });
}

function goSearch() {
  setActivityListIntent({ focus: true });
  uni.reLaunch({ url: withTenantCode("/pages/activity/list") });
}

function goLink(url?: string, action?: string) {
  goDecoratedLink(url, action);
}

function isCurrentNav(url?: string) {
  return url === "/pages/index/index";
}

function priceText(price: string | number) {
  return Number(price) > 0 ? `¥${Number(price).toFixed(2)}` : "免费";
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

function announcementSummary(content: unknown) {
  return markdownToPlainText(content, 60);
}

function categoryCover(category: any) {
  return latest.value.find((item) => item.category?.id === category.id && item.coverUrl)?.coverUrl || latest.value.find((item) => item.coverUrl)?.coverUrl || "";
}

function quickInitial(label: string) {
  return decoratedQuickInitial(label);
}

function richTextLines(content: unknown) {
  return String(content || "").split("\n").filter(Boolean);
}

function clampPercent(value: unknown, fallback: number) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, 0), 100);
}

function hexToRgb(color: unknown) {
  const value = String(color || "").trim();
  const match = value.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return "15, 35, 39";
  return `${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}`;
}

function rgba(color: unknown, opacity: unknown, fallback = 100) {
  return `rgba(${hexToRgb(color)}, ${clampPercent(opacity, fallback) / 100})`;
}

function opacity(value: unknown, fallback: number) {
  return clampPercent(value, fallback) / 100;
}

function heroBackground(section: HomepageSectionView) {
  const config = section.config || {};
  const base = String(config.backgroundColor || "#0f766e");
  const overlay = rgba(config.overlayColor || "#0f2327", config.overlayOpacity, config.backgroundImage ? 42 : 0);
  const fit = config.backgroundFit === "contain" ? "contain" : "cover";
  return config.backgroundImage ? `linear-gradient(90deg, ${overlay}, ${overlay}), url(${config.backgroundImage}) center/${fit} no-repeat, ${base}` : base;
}

function heroStyle(section: HomepageSectionView) {
  const layout = section.layout || {};
  return {
    background: heroBackground(section),
    borderRadius: `${Number(layout.borderRadius ?? 8)}px`,
    marginBottom: `${Number(layout.spacingBottom ?? 10)}rpx`
  };
}

function surfaceStyle(section: HomepageSectionView, fallback = "#fff") {
  const layout = section.layout || {};
  const background = layout.backgroundImage ? `url(${layout.backgroundImage}) center/cover no-repeat, ${layout.backgroundColor || fallback}` : layout.backgroundColor || fallback;
  return {
    background,
    borderRadius: `${Number(layout.borderRadius ?? 8)}px`,
    marginBottom: `${Number(layout.spacingBottom ?? 20)}rpx`
  };
}

function bannerPadding(section: HomepageSectionView) {
  const ratio = String(section.config.ratio || "3:1");
  const [width, height] = ratio.split(":").map((item) => Number(item));
  if (!width || !height || width <= 0 || height <= 0) return "33.3333%";
  return `${Math.min(Math.max((height / width) * 100, 18), 120)}%`;
}

function bannerMode(section: HomepageSectionView) {
  return section.config.fit === "contain" ? "aspectFit" : "aspectFill";
}

function applyPayload(payload: HomepagePayload) {
  sections.value = payload.sections?.length ? payload.sections : defaultSections;
  tenant.value = payload.tenant || null;
  announcements.value = [];
  categories.value = [];
  featured.value = [];
  latest.value = [];
  resetFeedPages();
  usingFallback.value = payload.fallback || !payload.sections?.length;
  for (const section of sections.value) {
    if (section.type === "announcement_bar") announcements.value = sectionData(section, "announcements");
    if (section.type === "category_grid" || section.type === "activity_tabs") categories.value = sectionData(section, "categories");
    if (section.type === "activity_feed") latest.value = sectionData(section, "activities");
    if (section.type === "featured_activities") featured.value = sectionData(section, "activities");
  }
}

async function loadLegacyData() {
  const [noticeRows, categoryRows, featuredRows, activityRows] = await Promise.all([
    request<any[]>("/public/announcements").catch(() => []),
    request<any[]>("/public/categories").catch(() => []),
    request<any[]>("/public/activities?featured=true").catch(() => []),
    request<any[]>("/public/activities").catch(() => [])
  ]);
  announcements.value = noticeRows;
  categories.value = categoryRows;
  featured.value = featuredRows;
  latest.value = activityRows;
}

async function load() {
  loading.value = true;
  error.value = "";
  lastLoadedTenantCode.value = getCurrentTenantCode();
  try {
    const payload = await request<HomepagePayload>("/public/homepage");
    applyPayload(payload);
    if (!latest.value.length && !categories.value.length) await loadLegacyData();
  } catch (err: any) {
    sections.value = defaultSections;
    tenant.value = null;
    usingFallback.value = true;
    error.value = err.message || "首页配置加载失败，已显示默认首页";
    await loadLegacyData();
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  mounted.value = true;
  load();
  loadTenantOptions();
});

onShow(async () => {
  if (!mounted.value) return;
  const tenantCode = getCurrentTenantCode();
  if (tenantCode === lastLoadedTenantCode.value) return;
  await loadPageTheme();
  await load();
  await loadTenantOptions();
});
</script>

<template>
  <view class="discover" :class="{ 'has-custom-nav': hasBottomNav }">
    <view v-if="loading" class="state-card">加载中...</view>

    <template v-else>
      <view v-if="error" class="state-card error-card">
        <view>{{ error }}</view>
        <view class="retry" @click="load">重试</view>
      </view>

      <template v-for="section in orderedSections" :key="section.id">
        <view v-if="section.type === 'search_bar'" class="top">
          <view class="city-block" @click="openTenantSwitcher">
            <view class="city">{{ cityLabel(section) }}</view>
            <view v-if="tenantHint" class="tenant-name">{{ tenantName || tenantHint }}</view>
          </view>
          <view class="search" @click="goSearch">
            <text class="search-icon">⌕</text>
            <text>{{ section.config.placeholder || "搜索活动" }}</text>
          </view>
        </view>

        <view
          v-else-if="section.type === 'hero'"
          class="hero"
          :style="heroStyle(section)"
        >
          <view>
            <text class="eyebrow" :style="{ opacity: opacity(section.config.textOpacity, 100) }">{{ section.config.eyebrow || "Activity OS" }}</text>
            <view class="hero-title" :style="{ opacity: opacity(section.config.titleOpacity, 100) }">{{ section.title }}</view>
            <view class="hero-copy" :style="{ opacity: opacity(section.config.subtitleOpacity, 86) }">{{ section.subtitle }}</view>
            <view v-if="section.config.primaryButtonText" class="hero-button" :style="{ background: rgba('#ffffff', section.config.buttonOpacity, 18) }" @click="goLink(String(section.config.primaryButtonLink || '/pages/activity/list'))">{{ section.config.primaryButtonText }}</view>
          </view>
          <view v-if="section.config.showStats !== false" class="hero-panel">
            <view :style="{ background: rgba('#ffffff', section.config.statsOpacity, 14) }"><text>{{ totalOpen }}</text><text>报名中</text></view>
            <view :style="{ background: rgba('#ffffff', section.config.statsOpacity, 14) }"><text>{{ latest.length }}</text><text>全部活动</text></view>
          </view>
        </view>

        <view v-else-if="section.type === 'announcement_bar' && pickAnnouncements(section).length" class="notice-bar" :style="surfaceStyle(section)" @click="goLink(String(section.config.link || '/pages/announcement/list'))">
          <text class="notice-label">{{ section.title || "公告" }}</text>
          <swiper class="notice-swiper" vertical autoplay circular :interval="2600">
            <swiper-item v-for="item in pickAnnouncements(section)" :key="item.id">
              <view class="notice-text">{{ item.title }}：{{ announcementSummary(item.content) }}</view>
            </swiper-item>
          </swiper>
        </view>

        <view v-else-if="section.type === 'quick_nav'" class="quick-grid" :style="{ gridTemplateColumns: `repeat(${Number(section.layout.columns || 4)}, 1fr)` }">
          <view v-for="item in ((section.config.items as any[]) || [])" :key="item.label" class="quick-item" @click="goLink(item.link, item.action)">
            <text class="quick-icon" :style="{ background: `${item.color || '#0f766e'}18`, color: item.color || '#0f766e' }">{{ quickInitial(item.label) }}</text>
            <text>{{ item.label }}</text>
          </view>
        </view>

        <template v-else-if="section.type === 'category_grid'">
          <view class="section-head">
            <view>
              <view class="section-title">{{ section.title || "活动分类" }}</view>
              <view v-if="section.subtitle" class="section-subtitle">{{ section.subtitle }}</view>
            </view>
            <text class="more" @click="goList()">全部</text>
          </view>
          <scroll-view v-if="pickCategories(section).length" scroll-x class="category-scroll" show-scrollbar="false">
            <view class="category-track">
              <view v-for="c in pickCategories(section)" :key="c.id" class="category-card" @click="goList(c.id)">
                <image v-if="section.config.showCover !== false && categoryCover(c)" :src="categoryCover(c)" mode="aspectFill" />
                <view v-else class="category-fallback">{{ c.name.slice(0, 1) }}</view>
                <view class="category-mask"></view>
                <view class="category-name">{{ c.name }}</view>
              </view>
            </view>
          </scroll-view>
        </template>

        <template v-else-if="section.type === 'featured_activities'">
          <view class="section-head">
            <view>
              <view class="section-title">{{ section.title || "精选活动" }}</view>
              <view v-if="section.subtitle" class="section-subtitle">{{ section.subtitle }}</view>
            </view>
          </view>
          <scroll-view v-if="pickActivities(section).length" scroll-x class="feature-scroll" show-scrollbar="false">
            <view class="feature-track">
              <view v-for="item in pickActivities(section)" :key="item.id" class="feature-card" @click="goDetail(item.id)">
                <image v-if="item.coverUrl" :src="item.coverUrl" mode="aspectFill" />
                <view v-else class="cover-fallback">活动</view>
                <view class="feature-body">
                  <view class="feature-title">{{ item.title }}</view>
                  <view class="feature-meta">{{ formatTime(item.startTime) }} · {{ item.location }}</view>
                  <view class="feature-foot">
                    <text>{{ priceText(item.price) }}</text>
                    <text>余 {{ item.remainingSeats }}</text>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
          <view v-else class="state-card compact">暂无精选活动</view>
        </template>

        <view v-else-if="section.type === 'activity_tabs'" class="tab-strip">
          <view v-if="section.config.includeHot !== false" class="tab" :class="{ active: activeCategoryId === 'hot' }" @click="activeCategoryId = 'hot'; resetFeedPages()">热门</view>
          <view v-for="c in pickCategories(section)" :key="c.id" class="tab" :class="{ active: activeCategoryId === c.id }" @click="activeCategoryId = c.id; resetFeedPages()">{{ c.name }}</view>
        </view>

        <view v-else-if="section.type === 'activity_feed'" class="feed">
          <view v-if="!feedAllRows(section).length" class="state-card compact">暂时没有活动</view>
          <view v-for="item in visibleFeedRows(section)" :key="item.id" class="activity-card" @click="goDetail(item.id)">
            <view class="cover-wrap">
              <image v-if="item.coverUrl" :src="item.coverUrl" mode="aspectFill" />
              <view v-else class="cover-fallback large">活动</view>
              <text class="status-pill" :class="statusClass(item.displayStatus)">{{ statusText(item.displayStatus) }}</text>
            </view>
            <view class="activity-body">
              <view class="activity-title">{{ item.title }}</view>
              <view class="activity-desc">{{ item.description || "主办方正在完善活动介绍" }}</view>
              <view class="activity-meta">
                <text>{{ formatTime(item.startTime) }}</text>
                <text>{{ item.location }}</text>
              </view>
              <view class="activity-foot">
                <view>
                  <text class="price">{{ priceText(item.price) }}</text>
                  <text class="seats">已报 {{ item.registeredCount }} · 余 {{ item.remainingSeats }}</text>
                </view>
                <view class="cta">{{ item.displayStatus === "open" ? "去报名" : "查看" }}</view>
              </view>
            </view>
          </view>
          <view v-if="feedAllRows(section).length > feedPageSize(section)" class="feed-pager">
            <template v-if="section.config.pagination === 'load_more'">
              <view v-if="visibleFeedRows(section).length < feedAllRows(section).length" class="pager-button primary" @click="setFeedPage(section, feedPage(section) + 1)">下一页 / 加载更多</view>
              <view v-else class="pager-muted">已经到底了</view>
            </template>
            <template v-else>
              <view class="pager-button" :class="{ disabled: feedPage(section) <= 1 }" @click="setFeedPage(section, feedPage(section) - 1)">上一页</view>
              <view class="pager-number">{{ feedPage(section) }} / {{ feedPageCount(section) }}</view>
              <view class="pager-button primary" :class="{ disabled: feedPage(section) >= feedPageCount(section) }" @click="setFeedPage(section, feedPage(section) + 1)">下一页</view>
            </template>
          </view>
        </view>

        <view v-else-if="section.type === 'image_banner'" class="image-banner" :style="{ ...surfaceStyle(section, '#dff4ee'), paddingTop: bannerPadding(section) }" @click="goLink(String(section.config.link || ''))">
          <image v-if="section.config.imageUrl" class="image-banner-media" :src="String(section.config.imageUrl)" :mode="bannerMode(section)" />
          <view v-else class="banner-fallback">{{ section.title || "图片 Banner" }}</view>
        </view>

        <view v-else-if="section.type === 'rich_text'" class="rich-text" :style="surfaceStyle(section)">
          <view v-if="section.title" class="section-title">{{ section.title }}</view>
          <image v-if="section.config.imageUrl" :src="String(section.config.imageUrl)" mode="widthFix" />
          <view v-for="line in richTextLines(section.config.content)" :key="line" class="rich-line">{{ line }}</view>
        </view>

        <AppBottomNav v-else-if="section.type === 'bottom_nav'" :section="bottomNavSection" current-path="/pages/index/index" />
      </template>

      <view v-if="usingFallback && !orderedSections.length" class="state-card compact">暂无首页配置</view>

      <view v-if="tenantSwitcherOpen" class="tenant-mask" @click="tenantSwitcherOpen = false">
        <view class="tenant-sheet" @click.stop>
          <view class="tenant-sheet-head">
            <view>
              <view class="tenant-sheet-title">切换城市合伙人</view>
              <view class="tenant-sheet-subtitle">查看不同商家的活动、首页装修和服务信息</view>
            </view>
            <view class="tenant-close" @click="tenantSwitcherOpen = false">×</view>
          </view>
          <view v-if="!tenantOptions.length" class="tenant-empty">暂无可切换商家</view>
          <view
            v-for="item in tenantOptions"
            :key="item.code"
            class="tenant-option"
            :class="{ active: item.code === currentTenantCode }"
            @click="selectTenant(item)"
          >
            <view>
              <view class="tenant-option-name">{{ tenantOptionLabel(item) }}</view>
              <view class="tenant-option-code">{{ item.code }}</view>
            </view>
            <view class="tenant-option-status">{{ item.code === currentTenantCode ? "当前" : "切换" }}</view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.discover { min-height: 100vh; padding: 22rpx 24rpx 140rpx; background: var(--page-bg-layer, #f4f6f8); background-size: var(--page-bg-size, cover); background-position: var(--page-bg-position, center top); background-attachment: fixed; color: var(--text-color, #111827); }
.top { position: sticky; top: 0; z-index: 2; display: grid; grid-template-columns: minmax(132rpx, 210rpx) 1fr; gap: 18rpx; align-items: center; padding: 10rpx 0 18rpx; background: var(--page-bg, #f4f6f8); }
.city-block { min-width: 0; }
.city { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 30rpx; font-weight: 800; color: var(--text-color, #111827); }
.tenant-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2rpx; color: var(--muted-color, #667085); font-size: 20rpx; font-weight: 700; }
.search { height: 70rpx; display: flex; align-items: center; gap: 12rpx; padding: 0 22rpx; border-radius: 999px; background: var(--card-bg, #fff); color: #8a94a6; font-size: 26rpx; box-shadow: 0 10rpx 28rpx rgba(15, 23, 42, 0.06); }
.search-icon { font-size: 34rpx; color: var(--text-color, #111827); }
.hero { display: grid; grid-template-columns: 1fr 150rpx; gap: 20rpx; padding: 36rpx 28rpx; border-radius: 8px; color: #fff; background: linear-gradient(135deg, #102a2c, #0f766e 72%, #f59e0b); }
.eyebrow { color: #b9f2e4; font-size: 24rpx; }
.hero-title { margin-top: 12rpx; font-size: 44rpx; line-height: 1.16; font-weight: 900; }
.hero-copy { margin-top: 14rpx; color: rgba(255,255,255,0.84); font-size: 25rpx; line-height: 1.55; }
.hero-button { display: inline-flex; margin-top: 20rpx; padding: 12rpx 22rpx; border-radius: 999px; background: rgba(255,255,255,0.18); color: #fff; font-size: 24rpx; font-weight: 800; }
.hero-panel { display: grid; gap: 10rpx; align-content: end; }
.hero-panel view { padding: 14rpx 10rpx; border-radius: 8px; background: rgba(255,255,255,0.14); text-align: center; }
.hero-panel text:first-child { display: block; font-size: 34rpx; font-weight: 900; }
.hero-panel text:last-child { display: block; margin-top: 4rpx; font-size: 22rpx; color: rgba(255,255,255,0.82); }
.notice-bar { display: grid; grid-template-columns: auto 1fr; gap: 14rpx; align-items: center; height: 74rpx; margin-top: 20rpx; padding: 0 20rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); }
.notice-label { padding: 6rpx 14rpx; border-radius: 999px; background: #fff7ed; color: #c2410c; font-size: 22rpx; font-weight: 700; }
.notice-swiper { height: 48rpx; }
.notice-text { height: 48rpx; line-height: 48rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #344054; font-size: 25rpx; }
.quick-grid { display: grid; gap: 14rpx; margin-top: 20rpx; }
.quick-item { min-height: 134rpx; display: grid; gap: 10rpx; justify-items: center; align-content: center; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); color: #344054; font-size: 24rpx; font-weight: 800; box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.quick-icon { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; font-size: 25rpx; font-weight: 900; }
.section-head { display: flex; justify-content: space-between; align-items: flex-end; margin: 32rpx 0 18rpx; }
.section-title { font-size: 34rpx; font-weight: 900; }
.section-subtitle { margin-top: 6rpx; color: #667085; font-size: 24rpx; }
.more { color: #0f766e; font-size: 26rpx; font-weight: 700; }
.category-scroll { width: 100%; height: 128rpx; white-space: nowrap; }
.feature-scroll { width: 100%; height: 382rpx; white-space: nowrap; }
.category-track, .feature-track { display: inline-flex; gap: 18rpx; padding-right: 24rpx; }
.category-card { position: relative; width: 184rpx; height: 128rpx; overflow: hidden; border-radius: 8px; background: #dbe7e5; }
.category-card image, .feature-card image, .cover-wrap image { width: 100%; height: 100%; display: block; }
.category-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #0f766e; font-size: 48rpx; font-weight: 900; background: #dff4ee; }
.category-mask { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.54)); }
.category-name { position: absolute; left: 16rpx; right: 16rpx; bottom: 14rpx; color: #fff; font-size: 28rpx; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.feature-card { width: 292rpx; overflow: hidden; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.07); }
.feature-card image, .cover-fallback { height: 176rpx; }
.cover-fallback { display: flex; align-items: center; justify-content: center; background: #dff4ee; color: #0f766e; font-weight: 900; }
.cover-fallback.large { height: 300rpx; }
.feature-body { padding: 18rpx; }
.feature-title { min-height: 76rpx; color: #111827; font-size: 28rpx; font-weight: 800; line-height: 1.35; white-space: normal; }
.feature-meta { margin-top: 10rpx; color: #667085; font-size: 23rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.feature-foot { display: flex; justify-content: space-between; margin-top: 14rpx; color: #0f766e; font-size: 24rpx; font-weight: 800; }
.tab-strip { display: flex; gap: 14rpx; overflow-x: auto; padding: 4rpx 0 18rpx; margin-top: 24rpx; }
.tab { flex: 0 0 auto; padding: 14rpx 24rpx; border-radius: 999px; background: #fff; color: #475467; font-size: 26rpx; font-weight: 700; }
.tab.active { background: #111827; color: #fff; }
.activity-card { overflow: hidden; margin-bottom: 22rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.07); }
.cover-wrap { position: relative; height: 300rpx; background: #dbe7e5; }
.status-pill { position: absolute; left: 18rpx; top: 18rpx; padding: 8rpx 16rpx; border-radius: 999px; color: #fff; font-size: 23rpx; font-weight: 800; }
.status-pill.is-open { background: #0f766e; }
.status-pill.is-full { background: #f59e0b; }
.status-pill.is-ended { background: #667085; }
.activity-body { padding: 22rpx; }
.activity-title { color: #111827; font-size: 34rpx; font-weight: 900; line-height: 1.35; }
.activity-desc { display: -webkit-box; margin-top: 10rpx; color: #667085; font-size: 25rpx; line-height: 1.55; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.activity-meta { display: grid; gap: 8rpx; margin-top: 18rpx; color: #344054; font-size: 25rpx; }
.activity-foot { display: flex; justify-content: space-between; align-items: center; gap: 18rpx; margin-top: 22rpx; }
.feed-pager { display: flex; align-items: center; justify-content: center; gap: 14rpx; margin: 10rpx 0 28rpx; }
.pager-button { min-width: 132rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; padding: 0 20rpx; border-radius: 999px; background: #fff; color: #111827; font-size: 25rpx; font-weight: 900; box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.06); }
.pager-button.primary { background: #111827; color: #fff; }
.pager-button.disabled { opacity: 0.38; }
.pager-number, .pager-muted { color: #667085; font-size: 24rpx; font-weight: 800; }
.price { display: block; color: #ef4444; font-size: 32rpx; font-weight: 900; }
.seats { display: block; margin-top: 4rpx; color: #8a94a6; font-size: 23rpx; }
.cta { flex: 0 0 auto; min-width: 132rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #0f766e; color: #fff; font-size: 26rpx; font-weight: 800; }
.image-banner { position: relative; width: 100%; height: 0; margin-top: 20rpx; overflow: hidden; border-radius: 8px; background: #dff4ee; }
.image-banner-media { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: block; }
.banner-fallback { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #0f766e; font-size: 30rpx; font-weight: 900; }
.rich-text { margin-top: 20rpx; padding: 24rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); }
.rich-text image { width: 100%; margin: 16rpx 0; border-radius: 8px; }
.rich-line { margin-top: 12rpx; color: #344054; font-size: 26rpx; line-height: 1.65; }
.state-card { padding: 28rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); color: var(--muted-color, #667085); font-size: 26rpx; }
.state-card.compact { margin: 10rpx 0 20rpx; text-align: center; }
.error-card { margin-bottom: 20rpx; }
.retry { display: inline-flex; margin-top: 18rpx; padding: 12rpx 24rpx; border-radius: 999px; background: #e6f2ef; color: #0f766e; font-weight: 800; }
.tenant-mask { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; background: rgba(15, 23, 42, 0.42); }
.tenant-sheet { width: 100%; max-height: 76vh; overflow-y: auto; padding: 28rpx 24rpx calc(28rpx + env(safe-area-inset-bottom)); border-radius: 8px 8px 0 0; background: #fff; box-shadow: 0 -18rpx 48rpx rgba(15, 23, 42, 0.18); }
.tenant-sheet-head { display: flex; justify-content: space-between; gap: 24rpx; align-items: flex-start; margin-bottom: 18rpx; }
.tenant-sheet-title { color: #111827; font-size: 32rpx; font-weight: 900; }
.tenant-sheet-subtitle { margin-top: 6rpx; color: #667085; font-size: 24rpx; line-height: 1.45; }
.tenant-close { flex: 0 0 auto; width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #f2f4f7; color: #344054; font-size: 34rpx; font-weight: 800; }
.tenant-empty { padding: 34rpx 0; color: #667085; text-align: center; font-size: 26rpx; }
.tenant-option { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; min-height: 104rpx; margin-top: 12rpx; padding: 18rpx 20rpx; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.tenant-option.active { border-color: #0f766e; background: #ecfdf7; }
.tenant-option-name { color: #111827; font-size: 28rpx; font-weight: 900; line-height: 1.35; }
.tenant-option-code { margin-top: 6rpx; color: #667085; font-size: 22rpx; }
.tenant-option-status { flex: 0 0 auto; min-width: 76rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #f2f4f7; color: #344054; font-size: 23rpx; font-weight: 800; }
.tenant-option.active .tenant-option-status { background: #0f766e; color: #fff; }
</style>
