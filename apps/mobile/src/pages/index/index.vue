<template>
  <view class="container has-custom-nav">
    <TenantSwitcher :tenant="tenant" title="当前城市" @changed="handleTenantChanged" />

    <view class="header-row">
      <view class="brand-title">
        <image v-if="pageBrand.logoUrl" class="brand-logo" :src="pageBrand.logoUrl" mode="aspectFit" />
        <text class="title-xxl brand-name">{{ pageBrand.name }}</text>
      </view>
      <view class="search-btn" @click="goSearch">
        <text class="search-icon">搜</text>
      </view>
    </view>

    <view class="home-action-card">
      <view class="home-action-copy">
        <text class="home-action-kicker">活动报名</text>
        <text class="home-action-title">近期可参加的活动</text>
        <text class="home-action-sub">查看时间、地点和报名状态，快速进入报名与签到流程。</text>
      </view>
      <view class="home-action-buttons">
        <view class="home-primary-action" @click="goActivityList">查看活动</view>
        <view class="home-secondary-action" @click="goMyRegistrations">我的报名</view>
      </view>
    </view>

    <view v-if="featuredActivities.length" class="activity-preview-list">
      <view v-for="activity in featuredActivities" :key="activity.id" class="activity-preview-card" @click="goActivityDetail(activity)">
        <view class="activity-date">
          <text>{{ formatActivityMonthDay(activity.startTime) }}</text>
          <text>{{ formatActivityHour(activity.startTime) }}</text>
        </view>
        <view class="activity-main">
          <text class="activity-title">{{ activity.title }}</text>
          <text class="activity-meta">{{ activity.location || "地点待确认" }}</text>
        </view>
        <view class="activity-status">{{ activityStatusText(activity.status) }}</view>
      </view>
    </view>

    <PageDecorationBlocks :sections="contentSections" />

    <view style="height:120rpx;"></view>
    <TabBar current="index" />
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onShareAppMessage, onShareTimeline, onShow } from "@dcloudio/uni-app";
import { applyTenantBootstrapDefault, getCurrentTenantCode, request, withTenantCode } from "../../api";
import { loadPageTheme, pageBrand } from "../../theme";
import { defaultMiniProgramShare, defaultMiniProgramTimelineShare, showMiniProgramShareMenu } from "../../share";
import { resolveTenantByCurrentLocation } from "../../tenant-location";
import TabBar from "../../components/TabBar.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import { usePageDecoration } from "../../decoration";

const { tenant, contentSections, loadDecoration } = usePageDecoration("home", "/pages/index/index");
const lastLoadedTenantCode = ref("");
const featuredActivities = ref<any[]>([]);

const shareOptions = {
  title: () => `${pageBrand.name || "慢π"}活动报名`,
  path: "/pages/index/index"
};
onShareAppMessage(() => defaultMiniProgramShare(shareOptions));
onShareTimeline(() => defaultMiniProgramTimelineShare(shareOptions));
onShow(showMiniProgramShareMenu);

onShow(async () => {
  loadPageTheme();
  const beforeTenantCode = getCurrentTenantCode();
  await applyTenantBootstrapDefault();
  await resolveTenantByCurrentLocation({ silent: true });
  const changedByLocation = getCurrentTenantCode() !== beforeTenantCode || getCurrentTenantCode() !== lastLoadedTenantCode.value;
  await Promise.all([loadDecoration(), loadActivities()]);
  lastLoadedTenantCode.value = getCurrentTenantCode();
  if (changedByLocation && beforeTenantCode) uni.showToast({ title: "已按当前位置切换慢π城市", icon: "none" });
});

async function handleTenantChanged() {
  loadPageTheme();
  await Promise.all([loadDecoration(), loadActivities()]);
  lastLoadedTenantCode.value = getCurrentTenantCode();
}

async function loadActivities() {
  try {
    const result = await request<any>("/public/activities?page=1&pageSize=3&status=open&featured=true");
    let items = Array.isArray(result) ? result : result?.items || [];
    if (!items.length) {
      const fallback = await request<any>("/public/activities?page=1&pageSize=3&status=open");
      items = Array.isArray(fallback) ? fallback : fallback?.items || [];
    }
    featuredActivities.value = items.slice(0, 3);
  } catch {
    featuredActivities.value = [];
  }
}

function goSearch() {
  uni.navigateTo({ url: withTenantCode("/pages/search/index") });
}

function goActivityList() {
  uni.navigateTo({ url: withTenantCode("/pages/activity/list") });
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

function formatActivityDate(value: string, part: "date" | "time") {
  if (!value) return part === "date" ? "待定" : "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const text = String(value).replace("T", " ");
    return part === "date" ? text.slice(5, 10) || "待定" : text.slice(11, 16);
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return part === "date" ? `${month}-${day}` : `${hour}:${minute}`;
}

function formatActivityMonthDay(value: string) {
  return formatActivityDate(value, "date");
}

function formatActivityHour(value: string) {
  return formatActivityDate(value, "time");
}
</script>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0 16rpx;
}

.brand-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.brand-logo {
  width: 58rpx;
  height: 58rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.68);
}

.brand-name {
  font-family: "STKaiti", "KaiTi", serif;
}

.search-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(74, 107, 138, 0.08);
  border-radius: 20rpx;
}

.search-icon {
  color: #4A6B8A;
  font-size: 26rpx;
  font-weight: 700;
}

.home-action-card {
  margin: 8rpx 0 20rpx;
  padding: 32rpx 28rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #C43D3D, #7A2C2C);
  color: #fff;
  box-shadow: 0 12rpx 32rpx rgba(122, 44, 44, 0.18);
}

.home-action-copy {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.home-action-kicker {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.76);
}

.home-action-title {
  font-size: 40rpx;
  line-height: 1.25;
  font-weight: 700;
}

.home-action-sub {
  font-size: 26rpx;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.82);
}

.home-action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-top: 28rpx;
}

.home-primary-action,
.home-secondary-action {
  height: 72rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
}

.home-primary-action {
  background: #fff;
  color: #C43D3D;
}

.home-secondary-action {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  border: 1rpx solid rgba(255, 255, 255, 0.34);
}

.activity-preview-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-bottom: 20rpx;
}

.activity-preview-card {
  min-height: 116rpx;
  display: grid;
  grid-template-columns: 104rpx minmax(0, 1fr) 112rpx;
  gap: 18rpx;
  align-items: center;
  padding: 20rpx;
  border-radius: 18rpx;
  background: #FFFFFF;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.activity-date {
  height: 76rpx;
  border-radius: 16rpx;
  background: rgba(196, 61, 61, 0.08);
  color: #C43D3D;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.activity-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.activity-title {
  font-size: 30rpx;
  line-height: 1.35;
  color: #333;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-meta {
  font-size: 24rpx;
  color: #777;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-status {
  height: 52rpx;
  border-radius: 999rpx;
  background: rgba(74, 107, 138, 0.1);
  color: #4A6B8A;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
}
</style>
