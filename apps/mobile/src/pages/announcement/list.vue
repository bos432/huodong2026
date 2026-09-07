<script setup lang="ts">
import GuofengPageHeading from '../../components/GuofengPageHeading.vue';
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { request } from "../../api";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { reviewSafeText } from "../../review-safe-text";
import { formatShanghaiDateTime } from "../../tenant-load-guard";
import { filterIntrinsicHeaderDecorationSections, usePageDecoration } from "../../decoration";
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
const bodyDecorationSections = computed(() => filterIntrinsicHeaderDecorationSections(contentSections.value));

function formatTime(value?: string) {
  return formatShanghaiDateTime(value, "");
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

    <GuofengPageHeading stamp="告" :title="innerPageConfig.title || '公告中心'" :subtitle="innerPageConfig.subtitle" :background="innerPageLayout.headerBackgroundColor" :text-color="innerPageLayout.headerTextColor" :muted-color="innerPageLayout.headerSubtitleColor" />

    <PageDecorationBlocks :sections="bodyDecorationSections" />

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
.notice-page { min-height: 100vh; max-width: 760px; margin: 0 auto; padding: 24rpx 28rpx; background: #fff; color: #28332d; overflow-wrap: anywhere; }
.notice-page.has-custom-nav { padding-bottom: calc(160rpx + env(safe-area-inset-bottom)); }
.notice-card,.state-card,.empty { padding: 28rpx 0; border-bottom: 1rpx solid #e1e6de; border-radius: 0; background: #fff; }
.notice-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12rpx; }
.tag { padding: 5rpx 12rpx; border: 1rpx solid #d9c1bd; border-radius: 5rpx; color: #a33d36; font-size: 22rpx; }
.time { color: #65736a; font-size: 23rpx; }
.notice-title,.empty-title { margin-top: 18rpx; color: #28332d; font: 34rpx "STSong", "SimSun", "Noto Serif CJK SC", serif; line-height: 1.5; }
.notice-content { display: block; margin-top: 14rpx; color: #65736a; font-size: 27rpx; line-height: 1.8; }
.empty { text-align: center; }
.empty-copy { margin-top: 12rpx; color: #65736a; font-size: 25rpx; line-height: 1.6; }
.error-state { color: #a33d36; }
.retry { display: inline-flex; align-items: center; justify-content: center; min-height: 64rpx; margin: 18rpx 0 0; padding: 0 24rpx; border: 1rpx solid #386151; border-radius: 6rpx; background: #fff; color: #386151; font-size: 24rpx; }
.retry::after { border: 0; }
</style>
