<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import MobileShell from "../../components/layout/MobileShell.vue";
import BaseBottomSheet from "../../components/sheets/BaseBottomSheet.vue";
import CategoryScroller from "../../components/home/CategoryScroller.vue";
import ActivityCard from "../../components/home/ActivityCard.vue";
import IconGlyph from "../../components/ui/IconGlyph.vue";
import { request, withTenantCode } from "../../api";
import type { PublicActivityListResponse, PublicActivitySummary } from "@activity/shared";
import { mockActivities } from "../../mock/activity";
import type { Activity, ActivitySort } from "../../types/activity";
import { queryActivities } from "./activity-query";
import { mapPublicActivityList } from "./activity-adapter";
import { mobileTabRoute } from "../../mobile-tab-routes";
import "../../styles/tokens.css";

const categories = ["推荐", "城市漫步", "手作体验", "自然体验", "阅读分享", "主题沙龙", "轻户外", "公益行动", "影像记录"];
const activeCategory = ref("推荐");
const activeSort = ref<ActivitySort>("recommended");
const search = ref("");
const sheet = ref<"filter" | "sort" | null>(null);
const statusFilter = ref<"all" | "open" | "full">("all");
const filterCategory = ref("推荐");
const draftStatusFilter = ref<"all" | "open" | "full">("all");
const draftFilterCategory = ref("推荐");
const page = ref(1);
const loading = ref(true);
const loadError = ref("");
const activities = ref<Activity[]>([]);
const dataSource = ref<"api" | "mock">("mock");
const carouselIndex = ref(0);
const canUseDistanceSort = false;
const canUsePopularitySort = false;
const filteredActivities = computed(() => {
  return queryActivities(activities.value, { keyword: search.value, category: filterCategory.value === "推荐" ? activeCategory.value : filterCategory.value, sort: activeSort.value, status: statusFilter.value }).slice(0, page.value * 4);
});
const heroCards = computed(() => {
  const source = activities.value.length ? activities.value : mockActivities;
  return source.slice(0, 3).map((item, index) => ({
    id: item.id,
    label: item.category || ["本周主推", "主理人精选", "活动回顾"][index] || "慢π活动",
    title: item.title,
    image: item.cover || mockActivities[index % mockActivities.length].cover
  }));
});
const demoMode = computed(() => dataSource.value === "mock" || (activities.value.length > 0 && activities.value.every((item) => item.isDemo)));

function openActivity(id: number) { uni.navigateTo({ url: withTenantCode(`/pages/activity/detail?id=${encodeURIComponent(String(id))}`) }); }
function selectTab(tab: "home" | "checkin" | "messages" | "me" | "publish") {
  if (tab === "checkin") uni.reLaunch({ url: withTenantCode(mobileTabRoute("checkin")) });
  else if (tab === "messages") uni.reLaunch({ url: withTenantCode(mobileTabRoute("messages")) });
  else if (tab === "me") uni.reLaunch({ url: withTenantCode(mobileTabRoute("me")) });
}
async function loadMore() { loading.value = true; await new Promise(resolve => setTimeout(resolve, 260)); page.value += 1; loading.value = false; }
function openFilter() {
  draftStatusFilter.value = statusFilter.value;
  draftFilterCategory.value = filterCategory.value;
  sheet.value = "filter";
}
function applyFilter() {
  statusFilter.value = draftStatusFilter.value;
  filterCategory.value = draftFilterCategory.value;
  activeCategory.value = draftFilterCategory.value;
  sheet.value = null;
  page.value = 1;
}
function selectCategory(category: string) {
  activeCategory.value = category;
  filterCategory.value = category;
  page.value = 1;
}
function clearFilters() {
  activeCategory.value = "推荐";
  filterCategory.value = "推荐";
  statusFilter.value = "all";
  search.value = "";
  page.value = 1;
}
function retryLoad() { void loadActivities(); }
function sortLabel(sort: ActivitySort) { return sort === "recommended" ? "综合排序" : sort === "nearest_time" ? "时间最近" : sort === "nearest_distance" ? "距离最近" : sort === "popularity" ? "报名热度" : "价格最低"; }
function filterSummary() {
  const status = statusFilter.value === "all" ? "全部状态" : statusFilter.value === "open" ? "可报名" : "已满座";
  return `${status} · ${filterCategory.value === "推荐" ? "全部类型" : filterCategory.value}`;
}
async function loadActivities() {
  loading.value = true;
  loadError.value = "";
  try {
    const result = await request<PublicActivityListResponse | PublicActivitySummary[]>("/public/activities?page=1&pageSize=20&status=open");
    const mapped = mapPublicActivityList(result);
    activities.value = mapped.items;
    dataSource.value = "api";
    page.value = 1;
  } catch (error: any) {
    activities.value = mockActivities.map(item => ({ ...item, dataSource: "mock" as const }));
    dataSource.value = "mock";
    loadError.value = `接口暂不可用，当前展示本地演示数据：${error?.message || "请求失败"}`;
  } finally {
    loading.value = false;
  }
}

onLoad((options: any) => {
  void loadActivities();
});
onShow(() => {
  sheet.value = null;
});
</script>

<template>
  <MobileShell active-tab="home" @tab="selectTab">
    <view class="home-page">
      <view class="topbar"><text class="city">重庆⌄</text><view class="search"><IconGlyph name="search" :size="16" label="搜索" /><input v-model="search" placeholder="搜索活动、地点或主理人" /></view><text class="dots">慢π</text></view>
      <view v-if="heroCards.length" class="hero-grid"><view class="hero-main app-press" role="button" tabindex="0" :aria-label="`查看活动：${heroCards[carouselIndex].title}`" @click="openActivity(heroCards[carouselIndex].id)" @keyup.enter="openActivity(heroCards[carouselIndex].id)" @keyup.space.prevent="openActivity(heroCards[carouselIndex].id)"><image :src="heroCards[carouselIndex].image" mode="aspectFill" /><view><small>{{ heroCards[carouselIndex].label }}</small><b>{{ heroCards[carouselIndex].title }}</b></view><i>{{ carouselIndex + 1 }} / {{ heroCards.length }}</i></view><view class="hero-side app-press" role="button" tabindex="0" :aria-label="`查看活动：${heroCards[(carouselIndex + 1) % heroCards.length].title}`" @click="openActivity(heroCards[(carouselIndex + 1) % heroCards.length].id)" @keyup.enter="openActivity(heroCards[(carouselIndex + 1) % heroCards.length].id)" @keyup.space.prevent="openActivity(heroCards[(carouselIndex + 1) % heroCards.length].id)"><image :src="heroCards[(carouselIndex + 1) % heroCards.length].image" mode="aspectFill" /><view><small>{{ heroCards[(carouselIndex + 1) % heroCards.length].label }}</small><b>{{ heroCards[(carouselIndex + 1) % heroCards.length].title }}</b></view></view></view>
      <CategoryScroller :items="categories" :active="activeCategory" @select="selectCategory" />
      <view class="intro"><view class="intro-mark"><IconGlyph name="star" :size="24" label="慢π推荐" /></view><view><b>聚在一起，认真玩</b><small>{{ demoMode ? '演示数据，仅用于页面展示' : '来自活动服务的公开信息' }}</small></view><view class="actions"><view @click="sheet = 'sort'"><IconGlyph name="sort" :size="14" /><text>{{ sortLabel(activeSort) }}</text></view><view @click="openFilter"><IconGlyph name="filter" :size="14" /><text>筛选</text></view></view></view>
      <view v-if="statusFilter !== 'all' || filterCategory !== '推荐'" class="active-filters"><IconGlyph name="filter" :size="13" label="当前筛选" /><text>当前条件：{{ filterSummary() }}</text><view role="button" tabindex="0" aria-label="清除筛选" @click="clearFilters">清除</view></view>
      <view class="feed"><view v-if="loadError" class="state notice"><b>当前为本地演示模式</b><small>{{ loadError }}</small><button @click="retryLoad">重试接口</button></view><view v-if="loading" class="state loading">正在同步公开活动…</view><template v-else><ActivityCard v-for="activity in filteredActivities" :key="activity.id" :activity="activity" @open="openActivity" /><view v-if="!filteredActivities.length" class="state empty"><b>还没有匹配的活动</b><small>换个关键词或放宽筛选条件，再看看附近的安排。</small><button @click="clearFilters">清除筛选</button></view><button v-else-if="filteredActivities.length < activities.length" class="load" @click="loadMore">加载更多活动</button><view v-else class="load done">已加载全部活动</view></template></view>
    </view>
    <BaseBottomSheet :open="sheet === 'sort'" title="排序" @close="sheet = null"><view class="option" v-for="option in (['recommended','nearest_time','nearest_distance','popularity','price_low'] as ActivitySort[])" :key="option" :class="{ disabled: (option === 'nearest_distance' && !canUseDistanceSort) || (option === 'popularity' && !canUsePopularitySort) }" @click="(option !== 'nearest_distance' || canUseDistanceSort) && (option !== 'popularity' || canUsePopularitySort) ? (activeSort = option, sheet = null) : undefined"><view><text>{{ sortLabel(option) }}</text><small v-if="option === 'nearest_distance' && !canUseDistanceSort">需要定位权限，当前不可用</small><small v-else-if="option === 'popularity' && !canUsePopularitySort">演示数据不提供可信热度</small></view><b v-if="activeSort === option">✓</b></view></BaseBottomSheet>
    <BaseBottomSheet :open="sheet === 'filter'" title="筛选" @close="sheet = null"><view class="filter-content"><b>活动状态</b><view class="filter-grid"><text :class="{ selected: draftStatusFilter === 'all' }" @click="draftStatusFilter = 'all'">全部</text><text :class="{ selected: draftStatusFilter === 'open' }" @click="draftStatusFilter = 'open'">可报名</text><text :class="{ selected: draftStatusFilter === 'full' }" @click="draftStatusFilter = 'full'">已满座</text></view><b>活动类型</b><view class="filter-grid types"><text v-for="type in categories.slice(1)" :key="type" :class="{ selected: draftFilterCategory === type }" @click="draftFilterCategory = type">{{ type }}</text></view><button class="reset" @click="draftStatusFilter = 'all'; draftFilterCategory = '推荐'">重置</button><button class="confirm" @click="applyFilter">确定</button></view></BaseBottomSheet>
  </MobileShell>
</template>

<style scoped>
@import "../../styles/tokens.css";
.home-page{min-height:100vh;background:var(--mp-bg-page);font-family:var(--mp-font-family)}.topbar{display:flex;align-items:center;gap:8px;padding:18px 14px 10px;background:var(--mp-brand-soft)}.city{white-space:nowrap;font-size:16px}.search{display:flex;align-items:center;gap:6px;min-width:0;flex:1;height:36px;padding:0 12px;border-radius:var(--mp-radius-pill);background:#fff;color:#8d9991}.search text{font-size:24px}.search input{min-width:0;flex:1;border:0;background:transparent;font-size:13px}.dots{width:38px;height:30px;border-radius:18px;background:#fff;line-height:30px;text-align:center}.hero-grid{display:grid;grid-template-columns:1.72fr .82fr;gap:10px;margin:0 14px 14px}.hero-main,.hero-side{position:relative;height:168px;overflow:hidden;border-radius:12px;background:#c8f2e5}.hero-main image,.hero-side image{width:100%;height:100%;filter:brightness(.8)}.hero-main>view,.hero-side>view{position:absolute;right:12px;bottom:14px;left:15px;color:#fff;text-shadow:0 2px 8px #0007}.hero-main small,.hero-main b,.hero-side small,.hero-side b{display:block}.hero-main b{max-width:220px;margin-top:4px;font-size:21px;line-height:1.2}.hero-side b{margin-top:3px;font-size:15px;line-height:1.18}.hero-main i{position:absolute;right:12px;bottom:11px;color:#fff;font-size:11px;font-style:normal}.intro{display:flex;align-items:center;gap:9px;margin:10px 14px 12px;padding:11px 12px;border-radius:11px;background:#fff}.intro-mark{width:40px;color:#19ba83;font-size:32px}.intro b,.intro small{display:block}.intro b{font-size:12px;color:#52625b}.intro small{margin-top:2px;color:#99a39e;font-size:11px}.actions{display:flex;gap:10px;margin-left:auto;color:#3f5048;font-size:12px}.actions text{min-height:44px;display:flex;align-items:center}.feed{padding:0 14px}.empty,.load{padding:18px;text-align:center;color:#929d96;font-size:12px}.load{border:0;background:transparent}.option{display:flex;justify-content:space-between;min-height:44px;padding:17px 18px;border-bottom:1px solid var(--mp-border);font-size:15px}.option b{color:var(--mp-success)}.filter-content{padding:0 14px 18px}.filter-content>b{display:block;margin:14px 0 8px}.filter-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.filter-grid text{min-height:44px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#f6f7f6;color:#65716a;font-size:12px}.filter-grid .selected{background:#d3f9e7;color:#0a9b5d;font-weight:700}.filter-grid.types{grid-template-columns:repeat(3,1fr)}.confirm{width:100%;height:46px;margin-top:18px;border:0;border-radius:23px;background:#202321;color:#1bfa92;font-weight:700}.publish-entry{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px 18px 18px}.publish-entry>view{display:flex;align-items:center;flex-direction:column;padding:15px 5px;border-radius:9px;background:#fafcfb}.publish-entry small{margin-top:4px;color:#929c96;font-size:10px}.publish-entry button{grid-column:1/-1;height:52px;margin-top:10px;border:0;border-radius:15px;background:var(--mp-brand-primary);color:#063c27;font-size:18px;font-weight:700}
</style>
<style scoped>
.state{display:grid;justify-items:center;gap:8px;padding:54px 24px;color:var(--mp-text-secondary);text-align:center}.state small{color:var(--mp-text-muted);font-size:12px}.state button{min-height:42px;padding:0 18px;border:0;border-radius:21px;background:var(--mp-brand-primary);color:#fff}.state.loading{color:var(--mp-brand-primary)}.state.error b{color:var(--mp-danger)}
.hero-main,.hero-side{background:var(--mp-mist-soft)}.hero-main image,.hero-side image{filter:brightness(.88)}.intro-mark{color:var(--mp-brand-primary)}.intro b{color:var(--mp-text-secondary)}.intro small{color:var(--mp-text-muted)}.actions{color:var(--mp-text-secondary)}.filter-grid .selected{background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark)}.confirm{background:var(--mp-brand-primary);color:#fff}.publish-entry button{color:#fff}
.active-filters{display:flex;align-items:center;gap:6px;margin:0 14px 10px;padding:8px 10px;border:1px solid var(--mp-border);border-radius:8px;background:#fff;color:var(--mp-text-secondary);font-size:11px}.active-filters view{margin-left:auto;color:var(--mp-brand-primary-dark);font-weight:700}.option.disabled{color:#a9b1ac;opacity:.72}.option small{display:block;margin-top:4px;color:#a9b1ac;font-size:10px}.filter-content .reset{width:100%;height:40px;margin-top:14px;border:1px solid var(--mp-border);border-radius:20px;background:#fff;color:var(--mp-text-secondary)}.filter-content .confirm{margin-top:8px}.demo-label,.state-label{grid-column:1/-1;color:#927252;font-size:11px;text-align:center}.state-label{color:var(--mp-text-muted);line-height:1.45}.publish-action{min-height:74px;justify-content:center!important;text-align:center;cursor:pointer}.publish-action b{color:var(--mp-text-primary);font-size:12px}.role-panel{grid-column:1/-1;display:grid!important;gap:6px!important;align-items:start!important}.role-panel small{color:#929c96;font-size:11px;line-height:1.5}.close-publish{grid-column:1/-1;height:42px;margin-top:2px;border:1px solid var(--mp-border);border-radius:21px;background:#fff;color:var(--mp-text-secondary);font-size:13px}
</style>
<style scoped>
@media screen and (max-width: 420px){.topbar{grid-template-columns:auto minmax(0,1fr) auto;display:grid;gap:6px}.search{min-width:0;flex:1 1 auto}.city,.dots{font-size:12px}.hero-grid{gap:7px;margin-left:10px;margin-right:10px}.feed{padding-left:10px;padding-right:10px}}
</style>
