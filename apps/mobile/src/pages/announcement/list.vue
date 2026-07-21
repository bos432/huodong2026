<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { request } from "../../api";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { reviewSafeText } from "../../review-safe-text";
import { usePageDecoration } from "../../decoration";
import { loadPageTheme } from "../../theme";
import { markdownToRichTextHtml } from "@activity/shared";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import AppBottomNav from "../../components/AppBottomNav.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";

const rows = ref<any[]>([]);
const loading = ref(true);
const error = ref("");
const loadGuard = createTenantLoadGuard();
const { tenant, bottomNavSection, contentSections, innerPageConfig, innerPageLayout, showBottomNav, loadDecoration } = usePageDecoration("announcement_list", "/pages/announcement/list");

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
  return date.toLocaleString("zh-CN", { timeZone:"Asia/Shanghai", hour12:false, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" }).replaceAll("/", "-");
}

function richContent(content: unknown) {
  return markdownToRichTextHtml(content);
}

async function load() {
  const token = loadGuard.begin();
  loading.value = true;
  error.value = "";
  try {
    const result = await request<any[]>("/public/announcements");
    if (loadGuard.isCurrent(token)) rows.value = Array.isArray(result) ? result : [];
  } catch (err: any) {
    if (loadGuard.isCurrent(token)) error.value = reviewSafeText(err.message || "公告加载失败");
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}

async function refreshTenantScopedPage() {
  await Promise.allSettled([load(), loadDecoration()]);
}

async function handleTenantChanged() {
  await loadPageTheme();
  await refreshTenantScopedPage();
}

onShow(async () => {
  await loadPageTheme();
  await refreshTenantScopedPage();
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

    <view v-if="loading" class="state-card" aria-live="polite">加载中...</view>
    <view v-else-if="error" class="state-card error-state" role="alert" aria-live="assertive">
      <view>{{ error }}</view>
      <button class="retry" :disabled="loading" aria-label="重新加载公告" @click="load">重试</button>
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
.notice-page { min-height: 100vh; box-sizing:border-box; padding: 24rpx; background: var(--page-bg-layer, #f5f0e8); background-size: var(--page-bg-size, cover); background-position: var(--page-bg-position, center top); background-attachment: fixed; color: var(--text-color, #333333); overflow-wrap:anywhere; }
.notice-page.has-custom-nav { padding-bottom: calc(160rpx + env(safe-area-inset-bottom)); }
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
.error-state { border:1rpx solid #f0b8b0; background:#fff4f2; color:#b42318; }
.retry { display: inline-flex; width:max-content; min-height:60rpx; margin: 18rpx 0 0; padding: 0 24rpx; border:0; border-radius: 8rpx; background: rgba(74, 107, 138, 0.12); color: #4a6b8a; font-size:24rpx; font-weight: 800; }
.retry::after { border:0; }
@media (min-width: 900px) { .notice-page { max-width:760px; margin:0 auto; } }
</style>
