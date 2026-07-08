<template>
  <view class="container forum-detail-page">
    <view v-if="topic" class="topic-card">
      <view class="topic-line">
        <text v-if="topic.pinned" class="topic-badge danger">置顶</text>
        <text v-if="topic.featured" class="topic-badge">精华</text>
        <text class="topic-category">{{ topic.category?.name || "共修" }}</text>
      </view>
      <text class="topic-title">{{ topic.title }}</text>
      <text class="topic-author">{{ topic.author?.nickname || "同学" }} · 浏览 {{ topic.viewCount || 0 }}</text>
      <text class="topic-content">{{ topic.content }}</text>
      <view v-if="topic.images?.length" class="topic-images">
        <image v-for="image in topic.images" :key="image" class="topic-image" :src="image" mode="aspectFill" />
      </view>
      <view class="action-row">
        <view class="button sm secondary" @click="toggleFavorite">{{ topic.favorited ? "已收藏" : "收藏" }} {{ topic.favoriteCount || 0 }}</view>
        <view class="button sm secondary" @click="reportTopic">举报</view>
        <view class="button sm" @click="replyTopic">回复</view>
      </view>
    </view>

    <view class="reply-section">
      <view class="section-title">
        <text class="title-md">回复 {{ topic?.replyCount || replies.length }}</text>
      </view>
      <view v-for="reply in replies" :key="reply.id" class="reply-card">
        <view class="reply-head">
          <text class="reply-author">{{ reply.author?.nickname || "同学" }}</text>
          <text class="reply-time">{{ formatTime(reply.createdAt) }}</text>
        </view>
        <text class="reply-content">{{ reply.content }}</text>
        <view class="reply-actions">
          <text @click="replyTo(reply)">回复</text>
          <text @click="reportReply(reply)">举报</text>
        </view>
        <view v-if="reply.children?.length" class="child-replies">
          <view v-for="child in reply.children" :key="child.id" class="child-reply">
            <text class="child-author">{{ child.author?.nickname || "同学" }}</text>
            <text class="child-content">{{ child.content }}</text>
            <view class="reply-actions child">
              <text @click="replyTo(child)">回复</text>
              <text @click="reportReply(child)">举报</text>
            </view>
          </view>
        </view>
      </view>
      <view v-if="!replies.length" class="empty-card">
        <text class="empty-title">还没有回复</text>
        <text class="empty-copy">可以写下你的想法，审核通过后会展示。</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, request } from "../../api";

const id = ref(0);
const topic = ref<any>(null);
const loading = ref(false);
const replies = computed(() => Array.isArray(topic.value?.replies) ? topic.value.replies : []);

onLoad((options: any) => {
  id.value = Number(options?.id || 0);
});

onShow(loadTopic);

async function loadTopic() {
  if (!id.value) return;
  loading.value = true;
  try {
    topic.value = await request<any>(`/public/forum/topics/${id.value}`);
  } catch (error: any) {
    topic.value = null;
    uni.showToast({ title: error.message || "帖子加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

async function toggleFavorite() {
  if (!topic.value) return;
  try {
    await ensureUser();
    const result = await request<any>(`/public/forum/topics/${topic.value.id}/favorite`, { method: "POST" });
    topic.value.favorited = Boolean(result?.favorited);
    topic.value.favoriteCount = Number(result?.favoriteCount || 0);
  } catch (error: any) {
    if (error?.message) uni.showToast({ title: error.message, icon: "none" });
  }
}

function replyTopic() {
  if (!topic.value) return;
  promptText("回复帖子", "写下你的回复", async (content) => {
    await ensureUser();
    const result = await request<any>(`/public/forum/topics/${topic.value.id}/replies`, { method: "POST", data: { content } });
    uni.showToast({ title: result?.message || "回复已提交审核", icon: "none" });
    await loadTopic();
  });
}

function replyTo(reply: any) {
  promptText("楼中楼回复", "写下你的回复", async (content) => {
    await ensureUser();
    const result = await request<any>(`/public/forum/replies/${reply.id}/replies`, { method: "POST", data: { content } });
    uni.showToast({ title: result?.message || "回复已提交审核", icon: "none" });
    await loadTopic();
  });
}

function reportTopic() {
  if (!topic.value) return;
  report(`/public/forum/topics/${topic.value.id}/report`);
}

function reportReply(reply: any) {
  report(`/public/forum/replies/${reply.id}/report`);
}

function report(path: string) {
  promptText("举报说明", "请简单说明原因", async (description) => {
    await ensureUser();
    const result = await request<any>(path, { method: "POST", data: { type: "other", description } });
    uni.showToast({ title: result?.message || "举报已提交", icon: "none" });
  });
}

function promptText(title: string, placeholderText: string, handler: (content: string) => Promise<void>) {
  uni.showModal({
    title,
    editable: true,
    placeholderText,
    confirmText: "提交",
    success: async (res: any) => {
      if (!res.confirm) return;
      const content = String(res.content || "").trim();
      if (!content) return uni.showToast({ title: "请输入内容", icon: "none" });
      try {
        await handler(content);
      } catch (error: any) {
        if (error?.message) uni.showToast({ title: error.message, icon: "none" });
      }
    }
  });
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
  return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
</script>

<style scoped>
.forum-detail-page { padding-bottom: 100rpx; }
.topic-card, .reply-card, .empty-card { margin-bottom:16rpx; padding:24rpx; border-radius:20rpx; background:#fff; box-shadow:0 4rpx 20rpx rgba(0,0,0,0.04); }
.topic-line { display:flex; align-items:center; gap:8rpx; margin-bottom:10rpx; }
.topic-badge { padding:4rpx 10rpx; border-radius:999px; background:#fff7ed; color:#c2410c; font-size:20rpx; font-weight:900; }
.topic-badge.danger { background:#fee2e2; color:#b91c1c; }
.topic-category { color:#8a6b58; font-size:22rpx; }
.topic-title { display:block; color:#333; font-size:36rpx; font-weight:900; line-height:1.35; }
.topic-author { display:block; margin-top:8rpx; color:#98a2b3; font-size:23rpx; }
.topic-content { display:block; margin-top:18rpx; color:#344054; font-size:28rpx; line-height:1.7; white-space:pre-wrap; }
.topic-images { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:10rpx; margin-top:14rpx; }
.topic-image { width:100%; height:170rpx; border-radius:14rpx; background:#f3e7d6; }
.action-row { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:12rpx; margin-top:18rpx; }
.section-title { margin:22rpx 0 14rpx; }
.reply-head { display:flex; justify-content:space-between; gap:12rpx; }
.reply-author { color:#333; font-size:27rpx; font-weight:900; }
.reply-time { color:#98a2b3; font-size:22rpx; }
.reply-content { display:block; margin-top:10rpx; color:#344054; font-size:27rpx; line-height:1.65; white-space:pre-wrap; }
.reply-actions { display:flex; gap:24rpx; margin-top:10rpx; color:#C43D3D; font-size:23rpx; font-weight:800; }
.reply-actions.child { margin-top:6rpx; }
.child-replies { display:grid; gap:10rpx; margin-top:12rpx; padding:14rpx; border-radius:14rpx; background:#f8fafc; }
.child-author { color:#5b2f24; font-size:24rpx; font-weight:900; }
.child-content { display:block; margin-top:4rpx; color:#475467; font-size:24rpx; line-height:1.55; }
.empty-card { display:grid; gap:10rpx; background:#fff7ec; border:1rpx solid #eadac6; box-shadow:none; }
.empty-title { color:#5b2f24; font-size:30rpx; font-weight:900; }
.empty-copy { color:#8a6b58; font-size:25rpx; line-height:1.6; }
</style>
