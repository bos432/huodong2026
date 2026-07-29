<template>
  <view class="container social-page">
    <view class="custom-nav">
      <view class="nav-back" role="button" tabindex="0" aria-label="返回" @click="goBack">返回</view>
      <text class="nav-title">社区互动</text>
      <view class="nav-placeholder" />
    </view>

    <view class="tabs">
      <view v-for="item in tabs" :key="item.key" :class="{ active: tab === item.key }" role="button" tabindex="0" :aria-label="`查看${item.label}记录`" @click="tab = item.key">{{ item.label }}</view>
    </view>

    <view v-if="loading" class="card state-card" aria-live="polite">社区互动记录加载中...</view>
    <view v-else-if="currentFailed" class="card state-card error-state" role="alert" aria-live="assertive">
      <text>{{ currentError }}</text>
      <button class="retry-text" :disabled="loading" @click="load">重新加载</button>
    </view>

    <template v-else>
      <view v-if="tab === 'favorites'">
        <view v-for="item in favorites" :key="item.id" class="card" role="button" tabindex="0" :aria-label="`查看收藏动态${item.id}`" @click="openPost(item)">
          <text class="title">{{ item.content }}</text>
          <text class="meta">{{ item.likes || 0 }} 赞 · {{ item.comments || 0 }} 评论</text>
        </view>
      </view>

      <view v-if="tab === 'notifications'">
        <view v-for="item in notifications" :key="item.id" class="card" :class="{ unread: !item.readAt, disabled: readingId === item.id }" role="button" tabindex="0" :aria-label="`${item.readAt ? '已读' : '未读'}消息${item.title}`" @click="openNotification(item)">
          <text class="title">{{ item.title }}</text>
          <text class="content">{{ item.content }}</text>
          <text class="meta">{{ readingId === item.id ? "处理中..." : formatTime(item.createdAt) }}</text>
        </view>
      </view>

      <view v-if="tab === 'follows'">
        <view v-for="item in follows" :key="item.id" class="card">
          <text class="title">{{ item.followedName || "已关注用户" }}</text>
          <text class="meta">{{ formatTime(item.createdAt) }}</text>
        </view>
      </view>

      <view v-if="!currentRows.length" class="card empty">暂无记录</view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, getCurrentTenantCode, request, withTenantCode } from "../../api";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";
import { reviewSafeText } from "../../review-safe-text";
import { formatShanghaiDateTime } from "../../shanghai-date";

const loading = ref(true);
const tab = ref<"favorites" | "notifications" | "follows">("favorites");
const favorites = ref<any[]>([]);
const notifications = ref<any[]>([]);
const follows = ref<any[]>([]);
const failedTabs = ref<string[]>([]);
const errorMessages = ref<Record<string, string>>({});
const readingId = ref(0);
const loadGuard = createTenantLoadGuard();
const tabs = [
  { key: "favorites" as const, label: "收藏" },
  { key: "notifications" as const, label: "消息" },
  { key: "follows" as const, label: "关注" }
];
const currentRows = computed(() => tab.value === "favorites" ? favorites.value : tab.value === "notifications" ? notifications.value : follows.value);
const currentFailed = computed(() => failedTabs.value.includes(tab.value));
const currentError = computed(() => errorMessages.value[tab.value] || "当前记录加载失败，请稍后重试。");

async function load() {
  const token = loadGuard.begin();
  loading.value = true;
  failedTabs.value = [];
  errorMessages.value = {};
  try {
    await ensureUser();
    const results = await Promise.allSettled([
      request<any[]>("/public/me/community/favorites"),
      request<any[]>("/public/me/community/notifications"),
      request<any[]>("/public/me/community/follows")
    ]);
    if (!loadGuard.isCurrent(token)) return;
    const targets = [favorites, notifications, follows];
    const keys = ["favorites", "notifications", "follows"];
    const labels = ["收藏", "消息", "关注"];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") targets[index].value = Array.isArray(result.value) ? result.value : [];
      else {
        targets[index].value = [];
        failedTabs.value.push(keys[index]);
        errorMessages.value[keys[index]] = reviewSafeText(result.reason?.message || `${labels[index]}记录加载失败，请稍后重试。`);
      }
    });
  } catch (error: any) {
    if (loadGuard.isCurrent(token) && !String(error?.message || "").includes("请先完成")) {
      failedTabs.value = ["favorites", "notifications", "follows"];
      errorMessages.value = Object.fromEntries(failedTabs.value.map((key) => [key, reviewSafeText(error?.message || "社区互动记录加载失败，请稍后重试。")])) as Record<string, string>;
    }
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}

function openPost(item: any) {
  if (item?.id) uni.navigateTo({ url: withTenantCode(`/pages/community/detail?id=${item.id}`) });
}

async function openNotification(item: any) {
  if (!item?.id || readingId.value) return;
  const tenantCode = getCurrentTenantCode();
  readingId.value = item.id;
  try {
    if (!item.readAt) {
      await request(`/public/me/community/notifications/${item.id}/read`, { method: "POST" });
      if (getCurrentTenantCode() !== tenantCode) return;
      item.readAt = new Date().toISOString();
    }
    if (getCurrentTenantCode() !== tenantCode) return;
    if (item.postId) uni.navigateTo({ url: withTenantCode(`/pages/community/detail?id=${item.postId}`) });
  } catch (error: any) {
    if (getCurrentTenantCode() === tenantCode) uni.showToast({ title: reviewSafeText(error?.message || "消息处理失败"), icon: "none" });
  } finally {
    readingId.value = 0;
  }
}

function formatTime(value: string) {
  return formatShanghaiDateTime(value, "");
}

function goBack() {
  uni.navigateBack();
}

onShow(async () => {
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) return;
  await load();
});
onLoad((query: any) => {
  if (["favorites", "notifications", "follows"].includes(String(query?.tab || ""))) tab.value = query.tab;
});
</script>

<style scoped>
.social-page { min-height:100vh; box-sizing:border-box; padding-bottom:calc(70rpx + env(safe-area-inset-bottom)); background:#f7f3ec; overflow-wrap:anywhere; }
.custom-nav { display:flex; align-items:center; padding:18rpx 0; }
.nav-back, .nav-placeholder { width:120rpx; color:#4a6b8a; }
.nav-title { flex:1; text-align:center; font-weight:800; }
.tabs { display:grid; grid-template-columns:repeat(3,1fr); margin-top:12rpx; border-bottom:1rpx solid #ddd; }
.tabs view { padding:18rpx; text-align:center; }
.tabs .active { color:#8b4a3e; border-bottom:4rpx solid #8b4a3e; }
.card { margin-top:16rpx; padding:24rpx; border:1rpx solid #e1d5c6; border-radius:8px; background:#fff; }
.unread { border-left:6rpx solid #b84435; }
.title, .content, .meta { display:block; }
.title { font-weight:800; }
.content, .meta { margin-top:10rpx; color:#817568; line-height:1.6; }
.empty { text-align:center; }
.state-card { display:grid; gap:10rpx; color:#667085; font-size:24rpx; line-height:1.55; }
.error-state { border-color:#fecaca; background:#fff7f7; color:#b91c1c; }
.retry-text { width:max-content; min-height:58rpx; margin:0; padding:0 22rpx; border:0; border-radius:8rpx; background:#fff; color:#C43D3D; font-size:24rpx; font-weight:900; }
.retry-text::after { border:0; }
.disabled { opacity:.6; pointer-events:none; }
@media (min-width:900px) { .social-page { max-width:760px; margin:0 auto; } }
</style>
