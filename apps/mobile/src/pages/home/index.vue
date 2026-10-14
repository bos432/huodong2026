<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import MobileShell from "../../components/layout/MobileShell.vue";
import BaseBottomSheet from "../../components/sheets/BaseBottomSheet.vue";
import CategoryScroller from "../../components/home/CategoryScroller.vue";
import ActivityCard from "../../components/home/ActivityCard.vue";
import WeekendInspiration from "../../components/home/WeekendInspiration.vue";
import { queryInspirations } from "./weekend-inspiration";
import IconGlyph from "../../components/ui/IconGlyph.vue";
import { getCurrentTenantCode, request, setCurrentTenantCode, setCurrentTenantCodeSource, withTenantCode, type TenantBootstrap } from "../../api";
import type { PublicActivityListResponse, PublicActivitySummary } from "@activity/shared";
import type { PublicTenantView } from "@activity/shared";
import { mockActivities } from "../../mock/activity";
import { resolveTenantByCurrentLocation } from "../../tenant-location";
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
const cityPickerOpen = ref(false);
const cityLoading = ref(false);
const locationLoading = ref(false);
const cityError = ref("");
const cityOptions = ref<PublicTenantView[]>([]);
const currentCity = ref("重庆");
const statusFilter = ref<"all" | "open" | "full">("all");
const filterCategory = ref("推荐");
const draftStatusFilter = ref<"all" | "open" | "full">("all");
const draftFilterCategory = ref("推荐");
const page = ref(1);
const loading = ref(true);
const loadError = ref("");
const activities = ref<Activity[]>([]);
const dataSource = ref<"api" | "mock">("mock");
const inspirationTenant = ref(getCurrentTenantCode());
const inspirations = computed(() => statusFilter.value === "all" ? queryInspirations(inspirationTenant.value, filterCategory.value === "推荐" ? activeCategory.value : filterCategory.value, search.value) : []);
const carouselIndex = ref(0);
const heroImageFailed = ref<Record<number, boolean>>({});
const canUseDistanceSort = false;
const canUsePopularitySort = false;
const filteredActivities = computed(() => {
  return queryActivities(activities.value, { keyword: search.value, category: filterCategory.value === "推荐" ? activeCategory.value : filterCategory.value, sort: activeSort.value, status: statusFilter.value, city: currentCity.value }).slice(0, page.value * 4);
});
const cityActivities = computed(() => queryActivities(activities.value, { keyword: "", category: "推荐", sort: "recommended", city: currentCity.value }));
const heroCards = computed(() => {
  return cityActivities.value
    .filter((item) => item.status === "open")
    .slice(0, 3);
});
const demoMode = computed(() => dataSource.value === "mock" || (activities.value.length > 0 && activities.value.every((item) => item.isDemo)));
const hasRealActivities = computed(() => activities.value.some((item) => !item.isDemo));

function openActivity(id: number) { uni.navigateTo({ url: withTenantCode(`/pages/activity/detail?id=${encodeURIComponent(String(id))}`) }); }
function onHeroChange(event: { detail?: { current?: number } }) {
  carouselIndex.value = Number(event?.detail?.current || 0);
}
function selectHero(index: number) {
  carouselIndex.value = index;
}
function heroImageError(id: number) {
  heroImageFailed.value = { ...heroImageFailed.value, [id]: true };
}
async function openCityPicker() {
  cityPickerOpen.value = true;
  cityLoading.value = true;
  cityError.value = "";
  try {
    const bootstrap = await request<TenantBootstrap>("/public/tenants/bootstrap");
    cityOptions.value = bootstrap.tenants || [];
    const current = cityOptions.value.find((item) => item.code === getCurrentTenantCode());
    if (current?.region || current?.name) currentCity.value = current.region || current.name;
    if (!cityOptions.value.length) cityError.value = "当前没有已开放的城市活动服务，请稍后再试。";
  } catch {
    cityOptions.value = [];
    cityError.value = "城市列表暂时无法加载，请检查网络后重试。";
  } finally {
    cityLoading.value = false;
  }
}
function selectCity(item: PublicTenantView) {
  setCurrentTenantCode(item.code);
  setCurrentTenantCodeSource("manual");
  currentCity.value = item.region || item.name;
  cityPickerOpen.value = false;
  void loadActivities();
}
async function locateCurrentCity() {
  if (locationLoading.value) return;
  locationLoading.value = true;
  const result = await resolveTenantByCurrentLocation({ force: true });
  locationLoading.value = false;
  if (result?.tenant?.code) {
    if (getCurrentTenantCode() !== result.tenant.code) setCurrentTenantCode(result.tenant.code);
    setCurrentTenantCodeSource("location");
    cityOptions.value = result.tenants?.length ? result.tenants : cityOptions.value;
    currentCity.value = result.tenant.region || result.tenant.name;
    cityPickerOpen.value = false;
    await loadActivities();
    return;
  }
  if (result?.candidates?.length) cityOptions.value = result.candidates.map((item) => item.tenant);
  if (result?.tenants?.length) cityOptions.value = result.tenants;
  uni.showToast({ title: result?.message || "未匹配到已开放城市，请手动选择", icon: "none" });
}
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
  inspirationTenant.value = getCurrentTenantCode();
  loading.value = true;
  loadError.value = "";
  try {
    const result = await request<PublicActivityListResponse | PublicActivitySummary[]>("/public/activities?page=1&pageSize=20");
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
      <view class="topbar"><view class="city" role="button" tabindex="0" aria-label="选择活动城市" @click="openCityPicker" @keyup.enter="openCityPicker" @keyup.space.prevent="openCityPicker"><IconGlyph name="pin" :size="14" label="当前城市" /><text>{{ currentCity }}</text><IconGlyph name="chevron" :size="12" label="选择城市" /></view><view class="search"><IconGlyph name="search" :size="16" label="搜索" /><input v-model="search" placeholder="搜索活动、地点或主理人" /></view><text class="wordmark">慢π</text></view>
      <view class="discovery-heading"><view><text class="discovery-title">今天，去参加一场活动</text><text class="discovery-subtitle">先看时间、地点和组织者</text></view></view>
      <CategoryScroller :items="categories" :active="activeCategory" @select="selectCategory" />
      <view v-if="heroCards.length" class="hero-carousel">
        <swiper class="hero-swiper" :current="carouselIndex" :duration="260" :circular="heroCards.length > 1" @change="onHeroChange">
          <swiper-item v-for="(item, index) in heroCards" :key="item.id">
            <view class="hero-slide app-press" role="button" tabindex="0" :aria-label="`查看活动：${item.title}`" @click="openActivity(item.id)" @keyup.enter="openActivity(item.id)" @keyup.space.prevent="openActivity(item.id)">
              <image v-if="item.cover && !heroImageFailed[item.id]" class="hero-image" :src="item.cover" mode="aspectFill" @error="heroImageError(item.id)" />
              <view v-else class="hero-image-fallback"><IconGlyph name="image" :size="24" label="封面不可用" /><text>活动封面暂不可用</text></view>
              <view class="hero-copy"><text class="hero-kicker">{{ item.category || "慢π活动" }}<text v-if="item.isDemo"> · 演示活动</text></text><text class="hero-title">{{ item.title }}</text><view class="hero-meta"><view><IconGlyph name="calendar" :size="14" label="活动时间" /><text>{{ item.date }} {{ item.weekday }} {{ item.startTime }}–{{ item.endTime || "时间以正式发布为准" }}</text></view><view><IconGlyph name="pin" :size="14" label="活动地点" /><text>{{ item.isDemo ? `${item.city} · 地点信息以正式发布为准` : `${item.city} · ${item.venue}` }}</text></view></view><view class="hero-bottom"><text class="hero-price">{{ item.isDemo ? "示例费用 " : "" }}{{ item.priceText }}</text><text>{{ item.isDemo ? "报名数据未接入 · 名额以正式发布为准" : "查看活动详情" }}</text></view><text v-if="item.isDemo" class="hero-demo">当前仅用于页面展示 · 不代表真实举办安排</text></view>
              <text class="hero-count">{{ index + 1 }} / {{ heroCards.length }}</text>
            </view>
          </swiper-item>
        </swiper>
        <view v-if="heroCards.length > 1" class="hero-pagination" aria-label="推荐活动">
          <button v-for="(item, index) in heroCards" :key="item.id" class="hero-dot" :class="{ active: carouselIndex === index }" :aria-label="`第${index + 1}项推荐活动`" :aria-current="carouselIndex === index ? 'true' : 'false'" @click="selectHero(index)" />
        </view>
      </view>
      <view v-else-if="!inspirations.length" class="hero-empty"><b>暂时没有推荐活动</b><small>已发布并开放报名的活动会出现在这里。</small></view>
      <WeekendInspiration :items="inspirations" />
      <view class="intro"><view class="intro-copy"><b>近期活动</b><small>{{ demoMode ? '当前仅用于页面展示' : '来自活动服务的公开信息' }}</small></view><view v-if="hasRealActivities" class="actions"><view @click="sheet = 'sort'"><IconGlyph name="sort" :size="14" /><text>{{ sortLabel(activeSort) }}</text></view><view @click="openFilter"><IconGlyph name="filter" :size="14" /><text>筛选</text></view></view></view>
      <view v-if="statusFilter !== 'all' || filterCategory !== '推荐'" class="active-filters"><IconGlyph name="filter" :size="13" label="当前筛选" /><text>当前条件：{{ filterSummary() }}</text><view role="button" tabindex="0" aria-label="清除筛选" @click="clearFilters">清除</view></view>
      <view class="feed"><view v-if="loadError" class="state notice"><b>当前为本地演示模式</b><small>{{ loadError }}</small><button @click="retryLoad">重试接口</button></view><view v-if="loading" class="state loading">正在同步公开活动…</view><template v-else><ActivityCard v-for="activity in filteredActivities" :key="activity.id" :activity="activity" @open="openActivity" /><view v-if="!filteredActivities.length" class="state empty"><b>{{ hasRealActivities ? (cityActivities.length ? "还没有匹配的活动" : `${currentCity}暂没有可展示的活动`) : "真实活动即将上线" }}</b><small>{{ hasRealActivities ? (cityActivities.length ? "换个关键词或放宽筛选条件，再看看附近的安排。" : "该城市暂无已发布活动，试试切换城市。") : "目前展示的演示内容不代表真实举办安排。主理人发布并通过审核后，活动会显示在这里。" }}</small><button v-if="hasRealActivities && cityActivities.length" @click="clearFilters">清除筛选</button></view><button v-else-if="filteredActivities.length < activities.length" class="load" @click="loadMore">加载更多活动</button><view v-else-if="filteredActivities.length" class="load done">已加载全部活动</view></template></view>
    </view>
    <BaseBottomSheet :open="sheet === 'sort'" title="排序" @close="sheet = null"><view class="option" v-for="option in (['recommended','nearest_time','nearest_distance','popularity','price_low'] as ActivitySort[])" :key="option" :class="{ disabled: (option === 'nearest_distance' && !canUseDistanceSort) || (option === 'popularity' && !canUsePopularitySort) }" @click="(option !== 'nearest_distance' || canUseDistanceSort) && (option !== 'popularity' || canUsePopularitySort) ? (activeSort = option, sheet = null) : undefined"><view><text>{{ sortLabel(option) }}</text><small v-if="option === 'nearest_distance' && !canUseDistanceSort">需要定位权限，当前不可用</small><small v-else-if="option === 'popularity' && !canUsePopularitySort">演示数据不提供可信热度</small></view><b v-if="activeSort === option">✓</b></view></BaseBottomSheet>
    <BaseBottomSheet :open="sheet === 'filter'" title="筛选" @close="sheet = null"><view class="filter-content"><b>活动状态</b><view class="filter-grid"><text :class="{ selected: draftStatusFilter === 'all' }" @click="draftStatusFilter = 'all'">全部</text><text :class="{ selected: draftStatusFilter === 'open' }" @click="draftStatusFilter = 'open'">可报名</text><text :class="{ selected: draftStatusFilter === 'full' }" @click="draftStatusFilter = 'full'">已满座</text></view><b>活动类型</b><view class="filter-grid types"><text v-for="type in categories.slice(1)" :key="type" :class="{ selected: draftFilterCategory === type }" @click="draftFilterCategory = type">{{ type }}</text></view><button class="reset" @click="draftStatusFilter = 'all'; draftFilterCategory = '推荐'">重置</button><button class="confirm" @click="applyFilter">确定</button></view></BaseBottomSheet>
    <view v-if="cityPickerOpen" class="city-overlay" role="presentation" @click="cityPickerOpen = false"><view class="city-sheet" role="dialog" aria-modal="true" aria-label="选择活动城市" @click.stop><view class="city-sheet-head"><b>选择活动城市</b><view role="button" tabindex="0" aria-label="关闭城市选择" @click="cityPickerOpen = false" @keyup.enter="cityPickerOpen = false">×</view></view><text class="city-note">活动按你选择的城市展示。定位只用于匹配已开放服务，不会覆盖手动选择。</text><view class="locate-row" role="button" tabindex="0" :aria-disabled="locationLoading" @click="locateCurrentCity" @keyup.enter="locateCurrentCity"><IconGlyph name="pin" :size="18" label="定位" /><view><b>{{ locationLoading ? "正在匹配当前城市…" : "定位到当前城市" }}</b><small>仅在你主动点击后请求定位权限</small></view><IconGlyph name="chevron" :size="15" label="继续" /></view><view v-if="cityLoading" class="city-state">正在读取已开放城市…</view><view v-else-if="cityError" class="city-state">{{ cityError }}<button @click="openCityPicker">重试</button></view><view v-else class="city-list"><button v-for="item in cityOptions" :key="item.code" :class="{ selected: item.code === getCurrentTenantCode() }" @click="selectCity(item)"><text>{{ item.region || item.name }}</text><small>{{ item.name }}</small></button></view></view></view>
  </MobileShell>
</template>

<style scoped>
@import "../../styles/tokens.css";
.home-page{min-height:100vh;background:var(--mp-bg-page);font-family:var(--mp-font-family)}.topbar{display:flex;align-items:center;gap:10px;padding:12px 16px 8px;background:var(--mp-bg-page);color:var(--mp-text-primary)}.city{flex:0 0 auto;white-space:nowrap;font-size:14px}.search{display:flex;align-items:center;gap:6px;min-width:0;flex:1;height:38px;padding:0 12px;border:1px solid var(--mp-border);border-radius:var(--mp-radius-md);background:#fff;color:var(--mp-text-muted)}.search input{min-width:0;flex:1;border:0;background:transparent;font-size:13px}.wordmark{flex:0 0 auto;color:var(--mp-text-primary);font-size:13px;font-weight:700}.discovery-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin:4px 16px 12px}.discovery-heading>view{display:grid;gap:3px}.discovery-title{font-size:20px;font-weight:700;line-height:1.35;color:var(--mp-text-primary)}.discovery-subtitle{font-size:12px;line-height:1.5;color:var(--mp-text-muted)}.hero-carousel{margin:10px 16px 8px;overflow:hidden;border:1px solid var(--mp-border);border-radius:var(--mp-radius-md);background:#fff}.hero-swiper{height:314px}.hero-slide{position:relative;height:100%;overflow:hidden;background:#fff}.hero-image{display:block;width:100%;height:43%;object-fit:cover}.hero-image-fallback{display:flex;width:100%;height:43%;flex-direction:column;align-items:center;justify-content:center;gap:9px;background:var(--mp-mist-soft);color:var(--mp-text-secondary);font-size:12px}.hero-copy{position:absolute;right:0;bottom:0;left:0;display:grid;grid-template-rows:auto minmax(40px,auto) auto auto auto;align-content:start;gap:5px;max-height:57%;overflow:hidden;box-sizing:border-box;padding:10px 12px 8px;color:var(--mp-text-primary)}.hero-kicker{color:var(--mp-mist-600);font-size:10px}.hero-title{display:-webkit-box;overflow:hidden;color:var(--mp-text-primary);font-size:16px;font-weight:700;line-height:1.3;-webkit-line-clamp:2;-webkit-box-orient:vertical}.hero-meta{display:grid;gap:4px;color:var(--mp-text-secondary);font-size:10px}.hero-meta>view{display:flex;align-items:center;gap:5px;min-width:0}.hero-meta text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hero-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:2px;padding-top:6px;border-top:1px solid var(--mp-border)}.hero-bottom>text:last-child{color:var(--mp-text-muted);font-size:8px;text-align:right}.hero-price{flex:0 0 auto;color:var(--mp-brand-primary-dark);font-size:13px;font-weight:700}.hero-demo{overflow:hidden;color:var(--mp-mist-600);font-size:9px;line-height:1.2}.hero-count{position:absolute;top:10px;right:10px;padding:3px 7px;border-radius:4px;background:rgb(29 36 48 / 72%);color:#fff;font-size:10px}.hero-pagination{display:flex;align-items:center;justify-content:center;gap:6px;height:28px;background:#fff}.hero-dot{width:7px;height:7px;min-width:7px;margin:0;padding:0;border:0;border-radius:8px;background:#d5d1c9}.hero-dot.active{width:20px;background:var(--mp-brand-primary)}.hero-empty{display:grid;gap:4px;margin:10px 16px;padding:20px 14px;border:1px solid var(--mp-border);border-radius:var(--mp-radius-md);background:#fff}.hero-empty b{font-size:14px}.hero-empty small{color:var(--mp-text-muted);font-size:11px}.intro{display:flex;align-items:center;gap:9px;margin:14px 16px 10px;padding:0;background:transparent}.intro-copy{display:grid;gap:2px}.intro b,.intro small{display:block}.intro b{font-size:17px;color:var(--mp-text-primary)}.intro small{color:var(--mp-text-muted);font-size:10px}.actions{display:flex;gap:8px;margin-left:auto;color:var(--mp-text-secondary);font-size:12px}.actions>view{display:flex;align-items:center;gap:4px;min-height:40px;padding:0 8px;border:1px solid var(--mp-border);border-radius:8px;background:#fff}.actions text{display:flex;align-items:center}.feed{padding:0 16px}.empty,.load{padding:18px;text-align:center;color:var(--mp-text-muted);font-size:12px}.load{border:0;background:transparent}.option{display:flex;justify-content:space-between;min-height:44px;padding:17px 18px;border-bottom:1px solid var(--mp-border);font-size:15px}.option b{color:var(--mp-brand-primary)}.filter-content{padding:0 14px 18px}.filter-content>b{display:block;margin:14px 0 8px}.filter-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.filter-grid text{min-height:44px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:var(--mp-bg-soft);color:var(--mp-text-secondary);font-size:12px}.filter-grid .selected{background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark);font-weight:700}.filter-grid.types{grid-template-columns:repeat(3,1fr)}.confirm{width:100%;height:46px;margin-top:18px;border:0;border-radius:23px;background:var(--mp-brand-primary);color:var(--mp-text-inverse);font-weight:700}.publish-entry{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px 18px 18px}.publish-entry>view{display:flex;align-items:center;flex-direction:column;padding:15px 5px;border-radius:9px;background:var(--mp-bg-surface)}.publish-entry small{margin-top:4px;color:var(--mp-text-muted);font-size:10px}.publish-entry button{grid-column:1/-1;height:52px;margin-top:10px;border:0;border-radius:15px;background:var(--mp-brand-primary);color:var(--mp-text-inverse);font-size:18px;font-weight:700}
.city{display:flex;align-items:center;gap:3px;min-height:44px;white-space:nowrap;font-size:13px;color:var(--mp-text-secondary)}
</style>
<style scoped>
.state{display:grid;justify-items:center;gap:8px;padding:54px 24px;color:var(--mp-text-secondary);text-align:center}.state small{color:var(--mp-text-muted);font-size:12px}.state button{min-height:42px;padding:0 18px;border:0;border-radius:21px;background:var(--mp-brand-primary);color:#fff}.state.loading{color:var(--mp-brand-primary)}.state.error b{color:var(--mp-danger)}
.hero-slide{background:#fff}
.active-filters{display:flex;align-items:center;gap:6px;margin:0 14px 10px;padding:8px 10px;border:1px solid var(--mp-border);border-radius:8px;background:#fff;color:var(--mp-text-secondary);font-size:11px}.active-filters view{margin-left:auto;color:var(--mp-brand-primary-dark);font-weight:700}.option.disabled{color:#a9b1ac;opacity:.72}.option small{display:block;margin-top:4px;color:#a9b1ac;font-size:10px}.filter-content .reset{width:100%;height:40px;margin-top:14px;border:1px solid var(--mp-border);border-radius:20px;background:#fff;color:var(--mp-text-secondary)}.filter-content .confirm{margin-top:8px}.demo-label,.state-label{grid-column:1/-1;color:#927252;font-size:11px;text-align:center}.state-label{color:var(--mp-text-muted);line-height:1.45}.publish-action{min-height:74px;justify-content:center!important;text-align:center;cursor:pointer}.publish-action b{color:var(--mp-text-primary);font-size:12px}.role-panel{grid-column:1/-1;display:grid!important;gap:6px!important;align-items:start!important}.role-panel small{color:#929c96;font-size:11px;line-height:1.5}.close-publish{grid-column:1/-1;height:42px;margin-top:2px;border:1px solid var(--mp-border);border-radius:21px;background:#fff;color:var(--mp-text-secondary);font-size:13px}
</style>
<style scoped>
@media screen and (max-width: 420px){.topbar{grid-template-columns:auto minmax(0,1fr) auto;display:grid;gap:6px}.search{min-width:0;flex:1 1 auto}.city,.dots{font-size:12px}.hero-carousel{margin-left:10px;margin-right:10px}.hero-swiper{height:314px}.feed{padding-left:10px;padding-right:10px}}
.city-overlay{position:fixed;z-index:var(--mp-z-sheet);inset:0;display:flex;align-items:flex-end;background:var(--mp-overlay)}.city-sheet{box-sizing:border-box;width:100%;max-height:78vh;overflow-y:auto;padding:20px 18px calc(22px + env(safe-area-inset-bottom));border-radius:16px 16px 0 0;background:var(--mp-bg-surface);box-shadow:var(--mp-shadow-sheet)}.city-sheet-head{display:flex;align-items:center;justify-content:space-between;font-size:18px;color:var(--mp-text-primary)}.city-sheet-head view{display:grid;width:40px;height:40px;place-items:center;border-radius:50%;background:var(--mp-bg-soft);font-size:24px}.city-note{display:block;margin-top:8px;color:var(--mp-text-muted);font-size:12px;line-height:1.5}.locate-row{display:flex;align-items:center;gap:10px;min-height:62px;margin-top:14px;padding:10px 12px;border:1px solid var(--mp-mist-border);border-radius:10px;background:var(--mp-mist-soft);color:var(--mp-mist-600)}.locate-row>view{display:grid;flex:1;gap:3px}.locate-row b{font-size:13px}.locate-row small{font-size:10px;color:var(--mp-text-muted)}.city-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.city-list button{display:grid;gap:3px;min-height:56px;padding:9px;border:1px solid var(--mp-border);border-radius:8px;background:#fff;color:var(--mp-text-primary);text-align:left}.city-list button.selected{border-color:var(--mp-brand-primary);background:var(--mp-brand-soft)}.city-list button text{font-size:12px;font-weight:700}.city-list button small{font-size:9px;color:var(--mp-text-muted)}.city-state{display:grid;justify-items:center;gap:8px;padding:26px 8px;color:var(--mp-text-muted);font-size:12px;text-align:center}.city-state button{min-height:38px;padding:0 16px;border:1px solid var(--mp-border);border-radius:19px;background:#fff;color:var(--mp-mist-600)}
</style>
<style scoped>
.hero-slide:focus-visible{outline:2px solid var(--mp-brand-primary);outline-offset:-3px}.hero-meta .icon-glyph{flex:0 0 14px;color:var(--mp-mist-600)}
</style>
