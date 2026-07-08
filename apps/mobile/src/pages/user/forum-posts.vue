<template>
  <view class="container my-forum-page">
    <view class="tab-row">
      <view v-for="item in tabs" :key="item.key" class="tab-pill" :class="{ active: activeTab === item.key }" @click="activeTab = item.key">{{ item.label }}</view>
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
      <view v-if="!topics.length" class="empty-card">暂无我的帖子</view>
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
      <view v-if="!replies.length" class="empty-card">暂无我的回复</view>
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
      <view v-if="!favorites.length" class="empty-card">暂无我的收藏</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";

const tabs = [
  { key: "topics", label: "帖子" },
  { key: "replies", label: "回复" },
  { key: "favorites", label: "收藏" }
] as const;
const activeTab = ref<"topics" | "replies" | "favorites">("topics");
const topics = ref<any[]>([]);
const replies = ref<any[]>([]);
const favorites = ref<any[]>([]);

onShow(load);

async function load() {
  try {
    await ensureUser();
    const [topicRows, replyRows, favoriteRows] = await Promise.all([
      request<any[]>("/public/me/forum/topics"),
      request<any[]>("/public/me/forum/replies"),
      request<any[]>("/public/me/forum/favorites")
    ]);
    topics.value = topicRows || [];
    replies.value = replyRows || [];
    favorites.value = favoriteRows || [];
  } catch (error: any) {
    if (error?.message) uni.showToast({ title: error.message, icon: "none" });
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

function formatTime(value?: string) {
  if (!value) return "";
  return String(value).replace("T", " ").slice(0, 16);
}
</script>

<style scoped>
.my-forum-page { padding-bottom:80rpx; }
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
</style>
