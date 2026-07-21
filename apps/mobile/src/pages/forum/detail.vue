<template>
  <view class="container forum-detail-page has-custom-nav">
    <view v-if="loading && !topic" class="state-card">帖子加载中...</view>
    <view v-else-if="loadError && !topic" class="state-card error-state">
      <text>{{ loadError }}</text>
        <view class="state-retry" role="button" tabindex="0" aria-label="重新加载论坛帖子" @click="loadTopic" @keyup.enter="loadTopic" @keyup.space.prevent="loadTopic">重新加载</view>
    </view>
    <view v-if="loadError && topic" class="state-card warning-state">
      <text>{{ loadError }}，当前展示上次成功加载的内容。</text>
        <view class="state-retry" role="button" tabindex="0" aria-label="重新同步论坛帖子" @click="loadTopic" @keyup.enter="loadTopic" @keyup.space.prevent="loadTopic">重新同步</view>
    </view>
    <view v-if="topic" class="topic-card">
      <view class="topic-line">
        <text v-if="topic.pinned" class="topic-badge danger">置顶</text>
        <text v-if="topic.featured" class="topic-badge">精华</text>
        <text v-if="topic.locked" class="topic-badge muted">已锁</text>
        <text class="topic-category">{{ topic.category?.name || "共修" }}</text>
      </view>
      <text class="topic-title">{{ topic.title }}</text>
      <text class="topic-author">{{ topic.author?.nickname || "同学" }} · 浏览 {{ topic.viewCount || 0 }}</text>
      <text class="topic-content">{{ topic.content }}</text>
      <view v-if="topic.images?.length" class="topic-images">
        <image v-for="image in topic.images" :key="image" class="topic-image" :src="image" mode="aspectFill" />
      </view>
      <view v-if="topic.locked" class="lock-notice">{{ topic.lockReason || "帖子已锁定，暂停回复" }}</view>
      <view class="action-row">
        <view class="button sm secondary" role="button" tabindex="0" aria-label="收藏帖子" :class="{ disabled: activeAction === 'favorite' }" @click="toggleFavorite" @keyup.enter="toggleFavorite" @keyup.space.prevent="toggleFavorite">{{ activeAction === "favorite" ? "处理中" : (topic.favorited ? "已收藏" : "收藏") }} {{ topic.favoriteCount || 0 }}</view>
        <view class="button sm secondary" role="button" tabindex="0" aria-label="举报帖子" :class="{ disabled: !!activeAction }" @click="reportTopic" @keyup.enter="reportTopic" @keyup.space.prevent="reportTopic">举报</view>
        <view v-if="!topic.locked" class="button sm" role="button" tabindex="0" aria-label="回复帖子" :class="{ disabled: !!activeAction }" @click="replyTopic" @keyup.enter="replyTopic" @keyup.space.prevent="replyTopic">回复</view>
      </view>
    </view>

    <view v-if="topic" class="reply-section">
      <view class="section-title">
        <text class="title-md">回复 {{ topic?.replyCount || replies.length }}</text>
      </view>
      <view v-for="reply in replies" :key="reply.id" class="reply-card">
        <view class="reply-head">
          <text class="reply-author">{{ reply.floorNo ? `${reply.floorNo}楼 · ` : "" }}{{ reply.author?.nickname || "同学" }}</text>
          <text class="reply-time">{{ formatTime(reply.createdAt) }}</text>
        </view>
        <view v-if="reply.quote" class="quote-block">{{ quoteText(reply.quote) }}</view>
        <text class="reply-content">{{ reply.content }}</text>
        <view class="reply-actions">
          <text v-if="!topic?.locked" @click="replyTo(reply)">回复</text>
          <text @click="reportReply(reply)">举报</text>
        </view>
        <view v-if="reply.children?.length" class="child-replies">
          <view v-for="child in reply.children" :key="child.id" class="child-reply">
            <text class="child-author">{{ child.author?.nickname || "同学" }}</text>
            <view v-if="child.quote" class="quote-block child-quote">{{ quoteText(child.quote) }}</view>
            <text class="child-content">{{ child.content }}</text>
            <view class="reply-actions child">
              <text v-if="!topic?.locked" @click="replyTo(child)">回复</text>
              <text @click="reportReply(child)">举报</text>
            </view>
          </view>
        </view>
      </view>
      <view v-if="topic && !replies.length" class="empty-card">
        <text class="empty-title">还没有回复</text>
        <text class="empty-copy">可以写下你的想法，审核通过后会展示。</text>
      </view>
    </view>
    <TabBar current="community" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, request } from "../../api";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import TabBar from "../../components/TabBar.vue";

const id = ref(0);
const topic = ref<any>(null);
const loading = ref(false);
const loadError = ref("");
const activeAction = ref("");
const loadGuard = createTenantLoadGuard();
const replies = computed(() => Array.isArray(topic.value?.replies) ? topic.value.replies : []);

onLoad((options: any) => {
  id.value = Number(options?.id || 0);
});

onShow(loadTopic);

async function loadTopic() {
  if (!id.value) return;
  const token = loadGuard.begin();
  loading.value = true;
  loadError.value = "";
  try {
    const result = await request<any>(`/public/forum/topics/${id.value}`);
    if (loadGuard.isCurrent(token)) topic.value = result;
  } catch (error: any) {
    if (loadGuard.isCurrent(token)) loadError.value = error?.message || "帖子加载失败，请稍后重试。";
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}

async function toggleFavorite() {
  if (!topic.value || activeAction.value) return;
  activeAction.value = "favorite";
  try {
    await ensureUser();
    const result = await request<any>(`/public/forum/topics/${topic.value.id}/favorite`, { method: "POST" });
    topic.value.favorited = Boolean(result?.favorited);
    topic.value.favoriteCount = Number(result?.favoriteCount || 0);
  } catch (error: any) {
    if (error?.message) uni.showToast({ title: error.message, icon: "none" });
  } finally {
    activeAction.value = "";
  }
}

function replyTopic() {
  if (!topic.value || activeAction.value) return;
  if (topic.value.locked) return uni.showToast({ title: topic.value.lockReason || "帖子已锁定", icon: "none" });
  promptText("reply-topic", "回复帖子", "写下你的回复", async (content) => {
    await ensureUser();
    const result = await request<any>(`/public/forum/topics/${topic.value.id}/replies`, { method: "POST", data: { content } });
    uni.showToast({ title: result?.message || "回复已提交审核", icon: "none" });
    await loadTopic();
  });
}

function replyTo(reply: any) {
  if (activeAction.value) return;
  if (topic.value?.locked) return uni.showToast({ title: topic.value.lockReason || "帖子已锁定", icon: "none" });
  promptText(`reply-${reply.id}`, "楼中楼回复", "写下你的回复", async (content) => {
    await ensureUser();
    const result = await request<any>(`/public/forum/replies/${reply.id}/replies`, { method: "POST", data: { content } });
    uni.showToast({ title: result?.message || "回复已提交审核", icon: "none" });
    await loadTopic();
  });
}

function reportTopic() {
  if (!topic.value || activeAction.value) return;
  report(`report-topic-${topic.value.id}`, `/public/forum/topics/${topic.value.id}/report`);
}

function reportReply(reply: any) {
  if (activeAction.value) return;
  report(`report-reply-${reply.id}`, `/public/forum/replies/${reply.id}/report`);
}

function report(actionKey: string, path: string) {
  promptText(actionKey, "举报说明", "请简单说明原因", async (description) => {
    await ensureUser();
    const result = await request<any>(path, { method: "POST", data: { type: "other", description } });
    uni.showToast({ title: result?.message || "举报已提交", icon: "none" });
  });
}

function promptText(actionKey: string, title: string, placeholderText: string, handler: (content: string) => Promise<void>) {
  if (activeAction.value) return;
  activeAction.value = `${actionKey}-prompt`;
  uni.showModal({
    title,
    editable: true,
    placeholderText,
    confirmText: "提交",
    success: async (res: any) => {
      if (!res.confirm) {
        activeAction.value = "";
        return;
      }
      const content = String(res.content || "").trim();
      if (!content) {
        activeAction.value = "";
        uni.showToast({ title: "请输入内容", icon: "none" });
        return;
      }
      activeAction.value = actionKey;
      try {
        await handler(content);
      } catch (error: any) {
        if (error?.message) uni.showToast({ title: error.message, icon: "none" });
      } finally {
        activeAction.value = "";
      }
    },
    fail: () => {
      activeAction.value = "";
    }
  });
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
  return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function quoteText(quote: any) {
  const floor = quote?.floorNo ? ` ${quote.floorNo}楼` : "";
  return `引用 ${quote?.authorName || "同学"}${floor}：${quote?.content || "原回复已不可见"}`;
}
</script>

<style scoped>
.forum-detail-page { padding-bottom: 100rpx; }
.topic-card, .reply-card, .empty-card { margin-bottom:16rpx; padding:24rpx; border-radius:20rpx; background:#fff; box-shadow:0 4rpx 20rpx rgba(0,0,0,0.04); }
.topic-line { display:flex; align-items:center; gap:8rpx; margin-bottom:10rpx; }
.topic-badge { padding:4rpx 10rpx; border-radius:999px; background:#fff7ed; color:#c2410c; font-size:20rpx; font-weight:900; }
.topic-badge.danger { background:#fee2e2; color:#b91c1c; }
.topic-badge.muted { background:#f2f4f7; color:#667085; }
.topic-category { color:#8a6b58; font-size:22rpx; }
.topic-title { display:block; color:#333; font-size:36rpx; font-weight:900; line-height:1.35; }
.topic-author { display:block; margin-top:8rpx; color:#98a2b3; font-size:23rpx; }
.topic-content { display:block; margin-top:18rpx; color:#344054; font-size:28rpx; line-height:1.7; white-space:pre-wrap; }
.topic-images { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:10rpx; margin-top:14rpx; }
.topic-image { width:100%; height:170rpx; border-radius:14rpx; background:#f3e7d6; }
.action-row { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:12rpx; margin-top:18rpx; }
.lock-notice { margin-top:16rpx; padding:16rpx 18rpx; border-radius:12rpx; background:#f2f4f7; color:#667085; font-size:24rpx; line-height:1.55; }
.section-title { margin:22rpx 0 14rpx; }
.reply-head { display:flex; justify-content:space-between; gap:12rpx; }
.reply-author { color:#333; font-size:27rpx; font-weight:900; }
.reply-time { color:#98a2b3; font-size:22rpx; }
.reply-content { display:block; margin-top:10rpx; color:#344054; font-size:27rpx; line-height:1.65; white-space:pre-wrap; }
.quote-block { margin-top:10rpx; padding:12rpx 14rpx; border-left:6rpx solid #d0d5dd; background:#f8fafc; color:#667085; font-size:23rpx; line-height:1.5; }
.child-quote { font-size:22rpx; }
.reply-actions { display:flex; gap:24rpx; margin-top:10rpx; color:#C43D3D; font-size:23rpx; font-weight:800; }
.reply-actions.child { margin-top:6rpx; }
.child-replies { display:grid; gap:10rpx; margin-top:12rpx; padding:14rpx; border-radius:14rpx; background:#f8fafc; }
.child-author { color:#5b2f24; font-size:24rpx; font-weight:900; }
.child-content { display:block; margin-top:4rpx; color:#475467; font-size:24rpx; line-height:1.55; }
.empty-card { display:grid; gap:10rpx; background:#fff7ec; border:1rpx solid #eadac6; box-shadow:none; }
.empty-title { color:#5b2f24; font-size:30rpx; font-weight:900; }
.empty-copy { color:#8a6b58; font-size:25rpx; line-height:1.6; }
.state-card { display:grid; gap:12rpx; margin-bottom:18rpx; padding:24rpx; border-radius:8px; background:#fff; color:#667085; font-size:25rpx; line-height:1.55; }
.state-card.error-state { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; }
.state-card.warning-state { border:1rpx solid #fed7aa; background:#fffaf0; color:#9a3412; }
.state-retry { width:max-content; color:#C43D3D; font-weight:900; }
.button.disabled { opacity:.6; pointer-events:none; }
</style>
