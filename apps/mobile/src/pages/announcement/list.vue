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
    <PageDecorationBlocks :sections="contentSections" />

    <view class="head" :style="{ background: String(innerPageLayout.headerBackgroundColor || 'transparent') }">
      <view class="title" :style="{ color: String(innerPageLayout.headerTextColor || '#111827') }">{{ innerPageConfig.title || "公告中心" }}</view>
      <view class="subtle" :style="{ color: String(innerPageLayout.headerSubtitleColor || '#667085') }">{{ innerPageConfig.subtitle || "活动通知、报名提醒和现场须知都会集中展示在这里。" }}</view>
    </view>

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
.notice-page { min-height: 100vh; padding: 24rpx; background: var(--page-bg-layer, #f4f6f8); background-size: var(--page-bg-size, cover); background-position: var(--page-bg-position, center top); background-attachment: fixed; color: var(--text-color, #111827); }
.notice-page.has-custom-nav { padding-bottom: 160rpx; }
.head { margin-bottom: 18rpx; padding: 30rpx 24rpx; border-radius: var(--card-radius, 8px); }
.title { font-size: 44rpx; font-weight: 900; }
.subtle { margin-top: 12rpx; color: var(--muted-color, #667085); font-size: 26rpx; line-height: 1.5; }
.notice-card, .state-card, .empty { padding: 26rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.notice-card { margin-bottom: 20rpx; }
.notice-top { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; }
.tag { padding: 6rpx 14rpx; border-radius: 999px; background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); font-size: 23rpx; font-weight: 800; }
.time { color: #98a2b3; font-size: 23rpx; }
.notice-title { margin-top: 18rpx; color: var(--text-color, #111827); font-size: 34rpx; font-weight: 900; line-height: 1.35; }
.notice-content { display: block; margin-top: 12rpx; color: #344054; font-size: 27rpx; line-height: 1.65; }
.empty { text-align: center; }
.empty-title { font-size: 32rpx; font-weight: 900; }
.empty-copy { margin-top: 10rpx; color: var(--muted-color, #667085); font-size: 25rpx; }
.retry { display: inline-flex; margin-top: 18rpx; padding: 12rpx 24rpx; border-radius: 999px; background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); font-weight: 800; }
</style>
