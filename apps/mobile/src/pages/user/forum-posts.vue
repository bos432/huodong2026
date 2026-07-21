<template>
  <view class="container my-forum-page has-custom-nav">
    <view class="custom-nav">
      <view class="nav-back" role="button" tabindex="0" aria-label="返回上一页" @click="goBack" @keyup.enter="goBack" @keyup.space.prevent="goBack">‹ 返回</view>
      <text class="nav-title">我的论坛</text>
      <view class="nav-action" role="button" tabindex="0" aria-label="刷新论坛记录" @click="load" @keyup.enter="load" @keyup.space.prevent="load">刷新</view>
    </view>
    <view class="tab-row">
      <view v-for="item in tabs" :key="item.key" class="tab-pill" :class="{ active: activeTab === item.key }" role="tab" tabindex="0" :aria-selected="activeTab === item.key" :aria-label="`查看我的${item.label}`" @click="activeTab = item.key" @keyup.enter="activeTab = item.key" @keyup.space.prevent="activeTab = item.key">{{ item.label }}</view>
    </view>

    <view v-if="loading" class="state-card">论坛记录加载中...</view>
    <view v-else-if="activeTabFailed" class="state-card error-state" role="alert" aria-live="assertive">
      <text>{{ loadWarning }}</text>
      <view class="state-retry" @click="load">重新加载</view>
    </view>

    <view v-if="activeTab === 'topics'">
      <view v-for="item in topics" :key="item.id" class="forum-card" @click="goTopic(item)">
        <view class="card-head">
          <text class="card-title">{{ item.title }}</text>
          <text class="status" :class="item.status">{{ statusText(item.status) }}</text>
        </view>
        <text class="card-copy">{{ item.content }}</text>
        <view class="card-meta">
          <text>{{ item.category?.name || "共修" }}</text>
          <text>回复 {{ item.replyCount || 0 }}</text>
          <text>收藏 {{ item.favoriteCount || 0 }}</text>
        </view>
      </view>
      <view v-if="!loading && !activeTabFailed && !topics.length" class="empty-card">暂无我的帖子</view>
    </view>

    <view v-if="activeTab === 'replies'">
      <view v-for="item in replies" :key="item.id" class="forum-card" @click="goTopic(item.topic)">
        <text class="card-title">{{ item.topic?.title || "帖子" }}</text>
        <text class="card-copy">{{ item.content }}</text>
        <view class="card-meta">
          <text>{{ statusText(item.status) }}</text>
          <text>{{ formatTime(item.createdAt) }}</text>
        </view>
      </view>
      <view v-if="!loading && !activeTabFailed && !replies.length" class="empty-card">暂无我的回复</view>
    </view>

    <view v-if="activeTab === 'favorites'">
      <view v-for="item in favorites" :key="item.id" class="forum-card" @click="goTopic(item.topic)">
        <text class="card-title">{{ item.topic?.title || "帖子" }}</text>
        <text class="card-copy">{{ item.topic?.content || "" }}</text>
        <view class="card-meta">
          <text>{{ item.topic?.category?.name || "共修" }}</text>
          <text>回复 {{ item.topic?.replyCount || 0 }}</text>
          <text>{{ formatTime(item.createdAt) }}</text>
        </view>
      </view>
      <view v-if="!loading && !activeTabFailed && !favorites.length" class="empty-card">暂无我的收藏</view>
    </view>
    <TabBar current="user" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { reviewSafeText } from "../../review-safe-text";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";
import TabBar from "../../components/TabBar.vue";

const tabs = [
  { key: "topics", label: "帖子" },
  { key: "replies", label: "回复" },
  { key: "favorites", label: "收藏" }
] as const;
const activeTab = ref<"topics" | "replies" | "favorites">("topics");
const topics = ref<any[]>([]);
const replies = ref<any[]>([]);
const favorites = ref<any[]>([]);
const loading = ref(false);
const loadWarning = ref("");
const failedTabs = ref<string[]>([]);
const loadedTenantCode = ref("");
const loadGuard = createTenantLoadGuard();
const activeTabFailed = computed(() => failedTabs.value.includes(activeTab.value));

onShow(async () => {
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) return;
  await load();
});

async function load() {
  const loadToken = loadGuard.begin();
  const sameTenant = loadedTenantCode.value === loadToken.tenantCode;
  if (loadedTenantCode.value && !sameTenant) {
    topics.value = [];
    replies.value = [];
    favorites.value = [];
  }
  loading.value = true;
  loadWarning.value = "";
  failedTabs.value = [];
  try {
    await ensureUser();
    const results = await Promise.allSettled([
      request<any[]>("/public/me/forum/topics"),
      request<any[]>("/public/me/forum/replies"),
      request<any[]>("/public/me/forum/favorites")
    ]);
    if (!loadGuard.isCurrent(loadToken)) return;
    const targets = [topics, replies, favorites];
    const keys = ["topics", "replies", "favorites"];
    const labels = ["帖子", "回复", "收藏"];
    const failures: string[] = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") targets[index].value = result.value || [];
      else {
        if (!sameTenant) targets[index].value = [];
        failedTabs.value.push(keys[index]);
        failures.push(labels[index]);
      }
    });
    loadWarning.value = failures.length ? `${failures.join("、")}记录同步失败，请重新加载。` : "";
    loadedTenantCode.value = loadToken.tenantCode;
  } catch (error: any) {
    if (!loadGuard.isCurrent(loadToken)) return;
    if (!String(error?.message || "").includes("请先完成")) {
      failedTabs.value = ["topics", "replies", "favorites"];
      loadWarning.value = reviewSafeText(error?.message || "论坛记录加载失败，请稍后重试。");
    }
  } finally {
    if (loadGuard.isCurrent(loadToken)) loading.value = false;
  }
}

function statusText(status?: string) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已拒绝";
  if (status === "hidden") return "已隐藏";
  return "待审核";
}

function goTopic(topic: any) {
  if (!topic?.id) return;
  uni.navigateTo({ url: withTenantCode(`/pages/forum/detail?id=${topic.id}`) });
}

function goBack() {
  uni.navigateBack();
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
  return date.toLocaleString("zh-CN", { timeZone:"Asia/Shanghai", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false });
}
</script>

<style scoped>
.my-forum-page { min-height:100vh; box-sizing:border-box; }
.custom-nav { display:flex; align-items:center; padding:18rpx 0 20rpx; }
.nav-back, .nav-action { width:130rpx; color:#4A6B8A; font-size:28rpx; font-weight:800; }
.nav-action { text-align:right; }
.nav-title { flex:1; color:#263d3c; font-size:32rpx; font-weight:900; text-align:center; }
.tab-row { display:flex; gap:12rpx; margin-bottom:18rpx; }
.tab-pill { flex:1; height:64rpx; display:flex; align-items:center; justify-content:center; border-radius:999px; background:#fff; color:#667085; font-size:25rpx; font-weight:900; }
.tab-pill.active { background:#C43D3D; color:#fff; }
.forum-card { margin-bottom:16rpx; padding:24rpx; border-radius:20rpx; background:#fff; box-shadow:0 4rpx 20rpx rgba(0,0,0,0.04); }
.card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12rpx; }
.card-title { color:#333; font-size:30rpx; font-weight:900; line-height:1.4; }
.card-copy { display:-webkit-box; margin-top:8rpx; color:#667085; font-size:25rpx; line-height:1.55; overflow:hidden; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.card-meta { display:flex; flex-wrap:wrap; gap:18rpx; margin-top:12rpx; color:#98a2b3; font-size:22rpx; }
.status { flex-shrink:0; padding:4rpx 10rpx; border-radius:999px; background:#fff7ed; color:#c2410c; font-size:20rpx; font-weight:900; }
.status.approved { background:#dcfce7; color:#15803d; }
.status.rejected, .status.hidden { background:#fee2e2; color:#b91c1c; }
.empty-card { padding:36rpx 24rpx; border-radius:20rpx; background:#fff7ec; color:#8a6b58; text-align:center; font-size:26rpx; }
.state-card { display:grid; gap:10rpx; margin-bottom:18rpx; padding:20rpx 22rpx; border-radius:8px; background:#fff; color:#667085; font-size:24rpx; line-height:1.55; }
.state-card.error-state { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; }
.state-retry { width:max-content; color:#C43D3D; font-weight:900; }
@media (min-width: 900px) { .my-forum-page { max-width:760px; margin:0 auto; } }
</style>
