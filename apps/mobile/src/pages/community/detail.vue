<template>
  <view class="container community-detail-page">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">返回</view>
      <view class="nav-title">共修动态</view>
      <view class="nav-action" @click="reload">刷新</view>
    </view>

    <PageDecorationBlocks :sections="decorationSections" />

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
        <view class="button secondary button-lg" @click="copyShareLink">复制链接</view>
        <view class="button secondary button-lg" @click="generatePoster">生成海报</view>
        <view class="button block button-lg" :class="{ disabled: submitting }" @click="openComment">
          {{ submitting ? "提交中..." : "写评论" }}
        </view>
      </view>

      <view v-if="posterUrl" class="poster-mask" @click="posterUrl = ''">
        <view class="poster-panel" @click.stop>
          <image :src="posterUrl" mode="widthFix" />
          <text class="subtle">长按图片保存，或复制链接分享到朋友圈。</text>
          <view class="button block" @click="posterUrl = ''">关闭</view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import QRCode from "qrcode";
import { computed, ref } from "vue";
import { onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request } from "../../api";
import { normalizeCommunityPosts, type CommunityPost } from "../../community-posts";
import { usePageDecoration } from "../../decoration";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";

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
const posterUrl = ref("");
const { contentSections, loadDecoration } = usePageDecoration("community_detail", "/pages/community/detail");

const post = computed<CommunityPost | null>(() => normalizeCommunityPosts(rawPost.value ? [rawPost.value] : [])[0] || null);
const decorationSections = computed(() => contentSections.value.filter((section) => {
  if (section.type === "hero" && section.title === "动态详情") return false;
  if (section.type === "rich_text" && section.title === "页面说明") return false;
  return true;
}));
const shareLink = computed(() => {
  if (!post.value) return "";
  // #ifdef H5
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.hash = `#/pages/community/detail?id=${post.value.id}`;
    return url.toString();
  }
  // #endif
  return `/pages/community/detail?id=${post.value.id}`;
});
const comments = computed<CommunityComment[]>(() =>
  (Array.isArray(rawComments.value) ? rawComments.value : []).map((item, index) => ({
    id: Number(item.id || index + 1),
    nickname: item.nickname || item.user?.nickname || "慢π同学",
    avatar: item.avatar || item.user?.avatarUrl || `/static/avatar${(index % 3) + 1}.png`,
    content: item.content || "",
    time: formatTime(item.createdAt)
  }))
);

function currentPostId() {
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any)?.options || {};
  const pageId = Number(options.id || 0);
  if (pageId) return pageId;
  // #ifdef H5
  if (typeof window !== "undefined") {
    const hash = window.location.hash || "";
    const queryText = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : window.location.search.slice(1);
    const routeId = Number(new URLSearchParams(queryText).get("id") || 0);
    if (routeId) return routeId;
  }
  // #endif
  return 0;
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

function copyShareLink() {
  if (!shareLink.value) return;
  uni.setClipboardData({ data: shareLink.value, success: () => uni.showToast({ title: "链接已复制", icon: "success" }) });
  recordShare();
}

async function recordShare() {
  if (!post.value) return;
  try {
    await request(`/public/community/posts/${post.value.id}/share`, { method: "POST" });
  } catch {
    // Sharing should not be blocked by analytics failures.
  }
}

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const chars = text.split("");
  let line = "";
  let lines = 0;
  for (const char of chars) {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      lines += 1;
      line = char;
      if (lines >= maxLines - 1) break;
    } else {
      line = testLine;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line.length < text.length ? `${line.slice(0, Math.max(0, line.length - 1))}…` : line, x, y);
}

async function drawPosterImage(ctx: CanvasRenderingContext2D, src: string, x: number, y: number, width: number, height: number) {
  if (!src || typeof Image === "undefined") return false;
  return new Promise<boolean>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        ctx.drawImage(img, x, y, width, height);
        resolve(true);
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

async function createShareQrDataUrl() {
  if (!shareLink.value) return "";
  try {
    return await QRCode.toDataURL(shareLink.value, {
      errorCorrectionLevel: "M",
      width: 180,
      margin: 1,
      color: { dark: "#3d261f", light: "#ffffff" }
    });
  } catch {
    return "";
  }
}

async function drawShareQr(ctx: CanvasRenderingContext2D) {
  const qrDataUrl = await createShareQrDataUrl();
  if (!qrDataUrl) return false;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(516, 886, 164, 164);
  const drawn = await drawPosterImage(ctx, qrDataUrl, 524, 894, 148, 148);
  if (!drawn) return false;
  ctx.fillStyle = "#8b5a2b";
  ctx.font = "22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("扫码查看动态", 598, 1078);
  ctx.textAlign = "start";
  return true;
}

async function drawPosterCanvas(ctx: CanvasRenderingContext2D, includeImage: boolean) {
  if (!post.value) return;
  ctx.fillStyle = "#fff7ec";
  ctx.fillRect(0, 0, 750, 1120);
  ctx.fillStyle = "#5b2f24";
  ctx.font = "bold 42px sans-serif";
  ctx.fillText("慢π · 活动心得", 54, 84);
  const image = includeImage ? post.value.images?.[0] || post.value.activity?.coverUrl || "" : "";
  const hasImage = includeImage ? await drawPosterImage(ctx, image, 54, 130, 642, 390) : false;
  if (!hasImage) {
    ctx.fillStyle = "#f3e7d6";
    ctx.fillRect(54, 130, 642, 390);
    ctx.fillStyle = "#8b5a2b";
    ctx.font = "bold 54px sans-serif";
    ctx.fillText("活动心得", 266, 340);
  }
  ctx.fillStyle = "#333333";
  ctx.font = "bold 38px sans-serif";
  drawWrappedText(ctx, post.value.activity?.title || "参与者心得", 54, 585, 642, 48, 2);
  ctx.fillStyle = "#666666";
  ctx.font = "30px sans-serif";
  drawWrappedText(ctx, post.value.content, 54, 710, 642, 44, 5);
  ctx.fillStyle = "#8b5a2b";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(`来自 ${post.value.nickname || "慢π同学"}`, 54, 924);
  ctx.fillStyle = "#eadac6";
  ctx.fillRect(54, 952, 642, 2);
  const hasQr = await drawShareQr(ctx);
  ctx.fillStyle = "#333333";
  ctx.font = "24px sans-serif";
  ctx.fillText(hasQr ? "分享链接" : "复制链接查看动态", 54, 1008);
  ctx.fillStyle = "#666666";
  drawWrappedText(ctx, shareLink.value, 54, 1042, hasQr ? 420 : 642, 32, 2);
}

async function generatePoster() {
  if (!post.value) return;
  // #ifdef H5
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 750;
    canvas.height = 1120;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    await drawPosterCanvas(ctx, true);
    try {
      posterUrl.value = canvas.toDataURL("image/png");
    } catch {
      canvas.width = 750;
      canvas.height = 1120;
      const fallbackCtx = canvas.getContext("2d");
      if (fallbackCtx) {
        await drawPosterCanvas(fallbackCtx, false);
        try {
          posterUrl.value = canvas.toDataURL("image/png");
        } catch {
          copyShareLink();
          uni.showToast({ title: "海报生成失败，已复制链接", icon: "none" });
          return;
        }
      }
      uni.showToast({ title: "图片跨域，已生成无图海报", icon: "none" });
    }
    await recordShare();
    return;
  }
  // #endif
  copyShareLink();
}

function goBack() {
  uni.navigateBack();
}

function reload() {
  void loadPost();
  void loadDecoration();
}

onMounted(() => {
  loadPost();
  loadDecoration();
});

onShow(() => {
  loadDecoration();
});
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
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 12rpx;
}
.poster-mask { position: fixed; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center; padding: 40rpx; background: rgba(0,0,0,0.62); }
.poster-panel { width: 620rpx; max-height: 88vh; overflow: auto; display: grid; gap: 18rpx; padding: 22rpx; border-radius: 24rpx; background: #fff; }
.poster-panel image { width: 100%; border-radius: 18rpx; }
</style>
