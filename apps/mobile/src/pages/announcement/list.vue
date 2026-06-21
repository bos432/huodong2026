<script setup lang="ts">
import { onMounted, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getCurrentTenantCode, request } from "../../api";
import { usePageDecoration } from "../../decoration";
import { loadPageTheme } from "../../theme";
import { markdownToRichTextHtml } from "@activity/shared";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import AppBottomNav from "../../components/AppBottomNav.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";

const rows = ref<any[]>([]);
const loading = ref(true);
const error = ref("");
const mounted = ref(false);
const lastLoadedTenantCode = ref("");
const { tenant, bottomNavSection, contentSections, innerPageConfig, innerPageLayout, showBottomNav, loadDecoration } = usePageDecoration("announcement_list", "/pages/announcement/list");

function formatTime(value?: string) {
  if (!value) return "";
  return value.replace("T", " ").slice(0, 16);
}

function richContent(content: unknown) {
  return markdownToRichTextHtml(content);
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    rows.value = await request<any[]>("/public/announcements");
  } catch (err: any) {
    error.value = err.message || "加载失败";
  } finally {
    loading.value = false;
  }
}

async function refreshTenantScopedPage() {
  lastLoadedTenantCode.value = getCurrentTenantCode();
  await Promise.all([load(), loadDecoration()]);
}

async function handleTenantChanged() {
  await loadPageTheme();
  await refreshTenantScopedPage();
}

onMounted(() => {
  mounted.value = true;
  refreshTenantScopedPage();
});

onShow(() => {
  if (!mounted.value) return;
  if (getCurrentTenantCode() === lastLoadedTenantCode.value) return;
  loadPageTheme();
  refreshTenantScopedPage();
});
</script>

<template>
  <view class="notice-page" :class="{ 'has-custom-nav': showBottomNav }">
    <TenantSwitcher :tenant="tenant" title="当前城市" @changed="handleTenantChanged" />

    <view class="notice-hero" :style="{ background: String(innerPageLayout.headerBackgroundColor || '#8e2d28') }">
      <view class="hero-mark">告</view>
      <view class="hero-copy">
        <view class="title" :style="{ color: String(innerPageLayout.headerTextColor || '#fff8f0') }">{{ innerPageConfig.title || "公告中心" }}</view>
        <view class="subtle" :style="{ color: String(innerPageLayout.headerSubtitleColor || 'rgba(255,248,240,0.82)') }">{{ innerPageConfig.subtitle || "活动通知、报名提醒和现场须知都会集中展示在这里。" }}</view>
      </view>
    </view>

    <PageDecorationBlocks :sections="contentSections" />

    <view v-if="loading" class="state-card">加载中...</view>
    <view v-else-if="error" class="state-card">
      <view>{{ error }}</view>
      <view class="retry" @click="load">重试</view>
    </view>
    <view v-else-if="!rows.length" class="empty">
      <view class="empty-title">暂无公告</view>
      <view class="empty-copy">有新的活动通知时会显示在这里。</view>
    </view>

    <view v-else class="notice-list">
      <view v-for="item in rows" :key="item.id" class="notice-card">
        <view class="notice-top">
          <text class="tag">{{ item.pinned ? "置顶" : item.type || "公告" }}</text>
          <text class="time">{{ formatTime(item.publishAt || item.createdAt) }}</text>
        </view>
        <view class="notice-title">{{ item.title }}</view>
        <rich-text class="notice-content notice-rich" :nodes="richContent(item.content)" />
      </view>
    </view>

    <AppBottomNav v-if="showBottomNav" :section="bottomNavSection" current-path="/pages/announcement/list" />
  </view>
</template>

<style scoped>
.notice-page { min-height: 100vh; padding: 24rpx; background: var(--page-bg-layer, #f5f0e8); background-size: var(--page-bg-size, cover); background-position: var(--page-bg-position, center top); background-attachment: fixed; color: var(--text-color, #333333); }
.notice-page.has-custom-nav { padding-bottom: 160rpx; }
.notice-hero {
  position: relative;
  overflow: hidden;
  min-height: 320rpx;
  display: flex;
  align-items: flex-end;
  gap: 22rpx;
  margin-bottom: 20rpx;
  padding: 34rpx 28rpx;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 44rpx rgba(91, 47, 36, 0.16);
}
.notice-hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(34, 24, 19, 0.04), rgba(34, 24, 19, 0.24));
  pointer-events: none;
}
.hero-mark,
.hero-copy {
  position: relative;
  z-index: 1;
}
.hero-mark {
  flex: 0 0 auto;
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
  background: rgba(255, 248, 240, 0.16);
  color: #fff8f0;
  font-size: 38rpx;
  font-weight: 700;
  font-family: "STKaiti", "KaiTi", serif;
}
.hero-copy { min-width: 0; }
.title { font-size: 48rpx; line-height: 1.22; font-weight: 700; font-family: "STKaiti", "KaiTi", serif; }
.subtle { margin-top: 12rpx; color: var(--muted-color, #999999); font-size: 26rpx; line-height: 1.5; }
.hero-copy .subtle { font-size: 25rpx; line-height: 1.6; }
.notice-card, .state-card, .empty { padding: 26rpx; border-radius: 24rpx; background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(91, 47, 36, 0.07); }
.notice-card { margin-bottom: 20rpx; }
.notice-top { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; }
.tag { padding: 6rpx 14rpx; border-radius: 999px; background: rgba(196, 61, 61, 0.12); color: #c43d3d; font-size: 23rpx; font-weight: 800; }
.time { color: #999999; font-size: 23rpx; }
.notice-title { margin-top: 18rpx; color: var(--text-color, #333333); font-size: 34rpx; font-weight: 900; line-height: 1.35; font-family: "STKaiti", "KaiTi", serif; }
.notice-content { display: block; margin-top: 12rpx; color: #666666; font-size: 27rpx; line-height: 1.65; }
.empty { text-align: center; }
.empty-title { font-size: 32rpx; font-weight: 900; font-family: "STKaiti", "KaiTi", serif; }
.empty-copy { margin-top: 10rpx; color: var(--muted-color, #999999); font-size: 25rpx; }
.retry { display: inline-flex; margin-top: 18rpx; padding: 12rpx 24rpx; border-radius: 999px; background: rgba(74, 107, 138, 0.12); color: #4a6b8a; font-weight: 800; }
</style>
