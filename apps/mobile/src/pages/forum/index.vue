<template>
  <view class="container forum-page">
    <TenantSwitcher title="当前城市" @changed="reload" />
    <view class="page-head">
      <view>
        <text class="title-lg">共修论坛</text>
        <text class="subtle head-sub">讨论活动、课程、公益与本地共修。</text>
      </view>
      <view class="head-actions">
        <view class="button sm secondary" @click="goMine">我的</view>
        <view class="button sm" @click="goPublish">发帖</view>
      </view>
    </view>

    <view class="search-row">
      <input v-model="keyword" class="search-input" confirm-type="search" placeholder="搜索标题或内容" @confirm="loadTopics" />
      <view class="button sm secondary" @click="loadTopics">搜索</view>
    </view>

    <scroll-view scroll-x class="category-scroll">
      <view class="category-row">
        <view class="category-pill" :class="{ active: !activeCategoryId }" @click="selectCategory(0)">全部</view>
        <view v-for="item in categories" :key="item.id" class="category-pill" :class="{ active: activeCategoryId === item.id }" @click="selectCategory(item.id)">{{ item.name }}</view>
      </view>
    </scroll-view>

    <view v-for="topic in topics" :key="topic.id" class="topic-card" @click="goDetail(topic)">
      <view class="topic-line">
        <text v-if="topic.pinned" class="topic-badge danger">置顶</text>
        <text v-if="topic.featured" class="topic-badge">精华</text>
        <text class="topic-category">{{ topic.category?.name || "共修" }}</text>
      </view>
      <text class="topic-title">{{ topic.title }}</text>
      <text class="topic-content">{{ topic.content }}</text>
      <view v-if="topic.images?.length" class="topic-images">
        <image v-for="image in topic.images.slice(0, 3)" :key="image" class="topic-image" :src="image" mode="aspectFill" />
      </view>
      <view class="topic-meta">
        <text>{{ topic.author?.nickname || "同学" }}</text>
        <text>浏览 {{ topic.viewCount || 0 }}</text>
        <text>回复 {{ topic.replyCount || 0 }}</text>
        <text>收藏 {{ topic.favoriteCount || 0 }}</text>
      </view>
    </view>

    <view v-if="!loading && !topics.length" class="empty-card">
      <text class="empty-title">暂无帖子</text>
      <text class="empty-copy">可以先发布一个共修话题，审核通过后会展示在这里。</text>
      <view class="button sm" @click="goPublish">发布帖子</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import TenantSwitcher from "../../components/TenantSwitcher.vue";

const categories = ref<any[]>([]);
const topics = ref<any[]>([]);
const keyword = ref("");
const activeCategoryId = ref(0);
const loading = ref(false);

onShow(reload);

async function reload() {
  await Promise.all([loadCategories(), loadTopics()]);
}

async function loadCategories() {
  try {
    categories.value = await request<any[]>("/public/forum/categories");
  } catch {
    categories.value = [];
  }
}

async function loadTopics() {
  loading.value = true;
  try {
    const params = [
      activeCategoryId.value ? `categoryId=${activeCategoryId.value}` : "",
      keyword.value.trim() ? `keyword=${encodeURIComponent(keyword.value.trim())}` : ""
    ].filter(Boolean).join("&");
    topics.value = await request<any[]>(`/public/forum/topics${params ? `?${params}` : ""}`);
  } catch {
    topics.value = [];
  } finally {
    loading.value = false;
  }
}

function selectCategory(id: number) {
  activeCategoryId.value = id;
  loadTopics();
}

async function goPublish() {
  try {
    await ensureUser();
    uni.navigateTo({ url: withTenantCode(activeCategoryId.value ? `/pages/forum/publish?categoryId=${activeCategoryId.value}` : "/pages/forum/publish") });
  } catch (error: any) {
    if (error?.message) uni.showToast({ title: error.message, icon: "none" });
  }
}

async function goMine() {
  try {
    await ensureUser();
    uni.navigateTo({ url: withTenantCode("/pages/user/forum-posts") });
  } catch (error: any) {
    if (error?.message) uni.showToast({ title: error.message, icon: "none" });
  }
}

function goDetail(topic: any) {
  uni.navigateTo({ url: withTenantCode(`/pages/forum/detail?id=${topic.id}`) });
}
</script>

<style scoped>
.forum-page { padding-bottom: 80rpx; }
.page-head { display:flex; justify-content:space-between; align-items:flex-start; gap:18rpx; margin-bottom:18rpx; }
.head-sub { display:block; margin-top:6rpx; }
.head-actions { display:flex; gap:10rpx; flex-shrink:0; }
.search-row { display:flex; gap:12rpx; align-items:center; margin-bottom:18rpx; }
.search-input { flex:1; min-width:0; height:72rpx; padding:0 22rpx; border-radius:18rpx; background:#fff; color:#333; font-size:26rpx; }
.category-scroll { margin-bottom:18rpx; white-space:nowrap; }
.category-row { display:flex; gap:12rpx; }
.category-pill { flex:0 0 auto; height:58rpx; display:flex; align-items:center; justify-content:center; padding:0 22rpx; border-radius:999px; background:#fff; color:#6b7280; font-size:24rpx; font-weight:800; }
.category-pill.active { background:#C43D3D; color:#fff; }
.topic-card { margin-bottom:16rpx; padding:24rpx; border-radius:20rpx; background:#fff; box-shadow:0 4rpx 20rpx rgba(0,0,0,0.04); }
.topic-line { display:flex; align-items:center; gap:8rpx; margin-bottom:10rpx; }
.topic-badge { padding:4rpx 10rpx; border-radius:999px; background:#fff7ed; color:#c2410c; font-size:20rpx; font-weight:900; }
.topic-badge.danger { background:#fee2e2; color:#b91c1c; }
.topic-category { color:#8a6b58; font-size:22rpx; }
.topic-title { display:block; color:#333; font-size:32rpx; font-weight:900; line-height:1.35; }
.topic-content { display:-webkit-box; margin-top:8rpx; color:#667085; font-size:25rpx; line-height:1.55; overflow:hidden; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.topic-images { display:flex; gap:10rpx; margin-top:12rpx; }
.topic-image { width:31%; height:140rpx; border-radius:14rpx; background:#f3e7d6; }
.topic-meta { display:flex; flex-wrap:wrap; gap:18rpx; margin-top:14rpx; color:#98a2b3; font-size:22rpx; }
.empty-card { display:grid; gap:12rpx; padding:28rpx; border-radius:20rpx; background:#fff7ec; border:1rpx solid #eadac6; }
.empty-title { color:#5b2f24; font-size:30rpx; font-weight:900; }
.empty-copy { color:#8a6b58; font-size:25rpx; line-height:1.6; }
</style>
