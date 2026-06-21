<template>
  <view class="container community-detail-page">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">返回</view>
      <view class="nav-title">书院动态</view>
      <view class="nav-action" @click="reload">刷新</view>
    </view>

    <view v-if="loading" class="card subtle">加载中...</view>
    <view v-else-if="error" class="card state-card">
      <view>{{ error }}</view>
      <view class="button secondary retry-button" @click="loadPost">重试</view>
    </view>

    <template v-else-if="post">
      <view class="card post-card">
        <view class="section-kicker">动态详情</view>
        <view class="row author-row">
          <image class="avatar-sm" :src="post.avatar" mode="aspectFill" />
          <view>
            <text class="author-name">{{ post.nickname }}</text>
            <text class="subtle author-time">{{ post.time }}</text>
          </view>
        </view>
        <text class="post-content">{{ post.content }}</text>
        <view v-if="post.images?.length" class="post-images">
          <image v-for="(img, index) in post.images" :key="index" class="post-image" :src="img" mode="aspectFill" />
        </view>
        <view class="row interact-row">
          <view class="interact-btn" @click="toggleLike">
            <text>{{ post.liked ? "❤️" : "🤍" }}</text>
            <text class="subtle">{{ post.likes }}</text>
          </view>
          <view class="interact-btn" @click="openComment">
            <text>💬</text>
            <text class="subtle">{{ post.comments }}</text>
          </view>
        </view>
      </view>

      <view class="card comments-card">
        <view class="row comments-head">
          <text class="title-md">评论区</text>
          <text class="subtle">{{ comments.length }} 条已展示</text>
        </view>
        <view v-if="comments.length">
          <view v-for="item in comments" :key="item.id" class="comment-item">
            <view class="row comment-author">
              <image class="avatar-sm" :src="item.avatar" mode="aspectFill" />
              <view>
                <text class="author-name">{{ item.nickname }}</text>
                <text class="subtle author-time">{{ item.time }}</text>
              </view>
            </view>
            <text class="comment-content">{{ item.content }}</text>
          </view>
        </view>
        <view v-else class="subtle" style="margin-top:12rpx;">暂无已通过审核的评论，发表后需后台审核展示。</view>
      </view>

      <view class="bottom-actions">
        <view class="button block button-lg" :class="{ disabled: submitting }" @click="openComment">
          {{ submitting ? "提交中..." : "写评论" }}
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onMounted } from "vue";
import { ensureUser, request } from "../../api";
import { normalizeCommunityPosts, type CommunityPost } from "../../community-posts";

type CommunityComment = {
  id: number;
  nickname: string;
  avatar: string;
  content: string;
  time: string;
};

const loading = ref(true);
const submitting = ref(false);
const error = ref("");
const rawPost = ref<any>(null);
const rawComments = ref<any[]>([]);

const post = computed<CommunityPost | null>(() => normalizeCommunityPosts(rawPost.value ? [rawPost.value] : [])[0] || null);
const comments = computed<CommunityComment[]>(() =>
  (Array.isArray(rawComments.value) ? rawComments.value : []).map((item, index) => ({
    id: Number(item.id || index + 1),
    nickname: item.nickname || item.user?.nickname || "书院同学",
    avatar: item.avatar || item.user?.avatarUrl || `/static/avatar${(index % 3) + 1}.png`,
    content: item.content || "",
    time: formatTime(item.createdAt)
  }))
);

function currentPostId() {
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any)?.options || {};
  return Number(options.id || 0);
}

function formatTime(value?: string) {
  if (!value) return "刚刚";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return String(value);
  const diff = Date.now() - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`;
  return new Date(value).toISOString().slice(0, 10);
}

async function loadPost() {
  loading.value = true;
  error.value = "";
  try {
    const id = currentPostId();
    if (!id) throw new Error("缺少动态ID");
    const [postData, commentData] = await Promise.all([
      request<any>(`/public/community/posts/${id}`),
      request<any>(`/public/community/posts/${id}/comments`)
    ]);
    if (!postData) throw new Error("动态不存在或已下架");
    rawPost.value = postData;
    rawComments.value = Array.isArray(commentData) ? commentData : [];
  } catch (err: any) {
    rawPost.value = null;
    rawComments.value = [];
    error.value = err.message || "动态加载失败";
  } finally {
    loading.value = false;
  }
}

async function toggleLike() {
  if (!post.value) return;
  try {
    await ensureUser();
    const result = await request<any>(`/public/community/posts/${post.value.id}/like`, { method: "POST" });
    rawPost.value = { ...rawPost.value, liked: Boolean(result?.liked), likes: Number(result?.likes || 0) };
    uni.showToast({ title: result?.liked ? "已点赞" : "已取消点赞", icon: "none" });
  } catch (err: any) {
    uni.showToast({ title: err.message || "操作失败", icon: "none" });
  }
}

function openComment() {
  if (!post.value || submitting.value) return;
  uni.showModal({
    title: "评论动态",
    editable: true,
    placeholderText: "写下你的想法",
    confirmText: "提交",
    success: (res: any) => {
      if (!res.confirm) return;
      const content = String(res.content || "").trim();
      if (!content) {
        uni.showToast({ title: "请输入评论内容", icon: "none" });
        return;
      }
      void submitComment(content);
    }
  });
}

async function submitComment(content: string) {
  if (!post.value) return;
  submitting.value = true;
  try {
    await ensureUser();
    const result = await request<any>(`/public/community/posts/${post.value.id}/comments`, { method: "POST", data: { content } });
    uni.showToast({ title: result?.message || "评论已提交审核", icon: "none" });
    await loadPost();
  } catch (err: any) {
    uni.showToast({ title: err.message || "评论失败", icon: "none" });
  } finally {
    submitting.value = false;
  }
}

function goBack() {
  uni.navigateBack();
}

function reload() {
  void loadPost();
}

onMounted(loadPost);
</script>

<style scoped>
.community-detail-page { padding-bottom: 150rpx; }
.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
}
.nav-back, .nav-action { min-width: 104rpx; min-height: 58rpx; display: flex; align-items: center; color: #4a6b8a; font-size: 27rpx; font-weight: 800; }
.nav-action { justify-content: flex-end; }
.nav-title { color: #333333; font-size: 32rpx; font-weight: 900; font-family: "STKaiti", "KaiTi", serif; }
.state-card { text-align: center; }
.retry-button { display: inline-flex; margin-top: 20rpx; min-width: 160rpx; }
.post-card, .comments-card { border-radius: 24rpx; box-shadow: 0 12rpx 34rpx rgba(91, 47, 36, 0.07); }
.comments-card { margin-top: 20rpx; }
.section-kicker { color: #4a6b8a; font-size: 24rpx; font-weight: 800; margin-bottom: 16rpx; }
.author-row, .comment-author { justify-content: flex-start; gap: 16rpx; }
.author-name { color: #333333; font-size: 28rpx; font-weight: 800; display: block; }
.author-time { display: block; margin-top: 4rpx; }
.post-content, .comment-content {
  display: block;
  margin-top: 16rpx;
  color: #666666;
  font-size: 28rpx;
  line-height: 1.7;
  white-space: pre-line;
}
.post-images { display: flex; gap: 12rpx; flex-wrap: wrap; margin-top: 16rpx; }
.post-image {
  width: calc(50% - 6rpx);
  height: 220rpx;
  border-radius: 18rpx;
  background: #e8e0d8;
}
.interact-row { justify-content: flex-start; gap: 18rpx; margin-top: 18rpx; }
.interact-btn { min-height: 62rpx; padding: 0 18rpx; display: flex; align-items: center; gap: 8rpx; border-radius: 999px; background: #f9f4ee; }
.comments-head { justify-content: space-between; }
.title-md { font-family: "STKaiti", "KaiTi", serif; }
.comment-item {
  padding: 18rpx 0;
  border-bottom: 1rpx solid #e8e0d8;
}
.comment-item:last-child { border-bottom: 0; }
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #e8e0d8;
  box-shadow: 0 -10rpx 30rpx rgba(51, 51, 51, 0.08);
}
</style>
