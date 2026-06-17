<template>
  <view class="container">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">‹ 返回</view>
      <view class="nav-action" @click="reload">刷新</view>
    </view>

    <view v-if="loading" class="card subtle">加载中...</view>
    <view v-else-if="error" class="card state-card">
      <view>{{ error }}</view>
      <view class="button secondary retry-button" @click="loadPost">重试</view>
    </view>

    <template v-else-if="post">
      <view class="card">
        <view class="row" style="justify-content:flex-start; gap:16rpx;">
          <image class="avatar-sm" :src="post.avatar" mode="aspectFill" />
          <view>
            <text class="body-text" style="font-weight:600;">{{ post.nickname }}</text>
            <text class="subtle" style="display:block;">{{ post.time }}</text>
          </view>
        </view>
        <text class="body-text" style="display:block; margin-top:16rpx; white-space:pre-line;">{{ post.content }}</text>
        <view v-if="post.images?.length" class="post-images">
          <image v-for="(img, index) in post.images" :key="index" class="post-image" :src="img" mode="aspectFill" />
        </view>
        <view class="row" style="justify-content:flex-start; gap:28rpx; margin-top:16rpx;">
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

      <view class="card" style="margin-top:16rpx;">
        <view class="row" style="justify-content:space-between;">
          <text class="title-md">评论区</text>
          <text class="subtle">{{ comments.length }} 条已展示</text>
        </view>
        <view v-if="comments.length">
          <view v-for="item in comments" :key="item.id" class="comment-item">
            <view class="row" style="justify-content:flex-start; gap:12rpx;">
              <image class="avatar-sm" :src="item.avatar" mode="aspectFill" />
              <view>
                <text class="body-text" style="font-weight:600;">{{ item.nickname }}</text>
                <text class="subtle" style="display:block;">{{ item.time }}</text>
              </view>
            </view>
            <text class="body-text" style="display:block; margin-top:10rpx; white-space:pre-line;">{{ item.content }}</text>
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
    rawPost.value = { ...rawPost.value, comments: Number(rawPost.value?.comments || 0) + 1 };
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
.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
}
.nav-back, .nav-action { font-size: 28rpx; color: #4A6B8A; }
.state-card { text-align: center; }
.retry-button { display: inline-flex; margin-top: 20rpx; min-width: 160rpx; }
.post-images { display: flex; gap: 12rpx; flex-wrap: wrap; margin-top: 16rpx; }
.post-image {
  width: calc(50% - 6rpx);
  height: 220rpx;
  border-radius: 16rpx;
  background: #E8E0D8;
}
.interact-btn { display: flex; align-items: center; gap: 8rpx; }
.comment-item {
  padding: 18rpx 0;
  border-bottom: 1rpx solid #E8E0D8;
}
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #E8E0D8;
}
</style>
