<template>
  <view class="container course-detail-page">
    <SplashAd />
    <view class="custom-nav">
      <view class="nav-back" role="button" tabindex="0" aria-label="返回上一页" @click="goBack" @keyup.enter="goBack" @keyup.space.prevent="goBack">返回</view>
      <view class="nav-title">内容详情</view>
      <view class="nav-share" role="button" tabindex="0" aria-label="分享课程" @click="share" @keyup.enter="share" @keyup.space.prevent="share">分享</view>
    </view>

    <view v-if="loading" class="card subtle">加载中...</view>
    <view v-else-if="error" class="card state-card" role="alert" aria-live="assertive">
      <view>{{ error }}</view>
      <view class="button secondary retry-button" role="button" tabindex="0" aria-label="重新加载课程详情" @click="loadCourse" @keyup.enter="loadCourse" @keyup.space.prevent="loadCourse">重试</view>
    </view>

    <template v-else-if="course">
      <view class="course-cover-full" :style="{ background: course.color }">
        <image v-if="course.coverUrl" class="course-cover-img" :src="course.coverUrl" mode="aspectFill" />
        <text v-else class="course-icon">{{ course.icon }}</text>
        <view class="play-btn">播</view>
      </view>

      <view class="card course-info-section">
        <text class="title-xl">{{ course.title }}</text>
        <view class="row teacher-row">
          <image class="avatar-sm" :src="course.teacherAvatar || '/static/avatar1.png'" mode="aspectFill" />
          <text class="body-text">{{ course.teacher }}</text>
          <view class="tag tag-secondary">主理人</view>
        </view>
        <view class="row rating-row">
          <text class="rating-text">评分 {{ course.rating }}（{{ course.reviewCount }}人评价）</text>
        </view>
        <view class="row price-row">
          <text class="price course-price">{{ priceText(course.price) }}</text>
          <text class="price-original course-original-price" v-if="Number(course.originalPrice) > 0">{{ priceText(course.originalPrice) }}</text>
          <view v-if="course.tag" class="tag" :class="course.tag === '限时优惠' ? 'tag-warning' : 'tag-success'">{{ course.tag }}</view>
        </view>
      </view>

      <AdSlotRenderer slot-key="course_detail_middle" page-key="course_detail" />

      <view class="detail-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="detail-tab"
          :class="{ active: activeTab === tab.key }"
          role="tab" tabindex="0" :aria-selected="activeTab === tab.key"
          @click="activeTab = tab.key" @keyup.enter="activeTab = tab.key" @keyup.space.prevent="activeTab = tab.key"
        >{{ tab.label }}</view>
      </view>

      <view v-if="activeTab === 'detail'" class="card tab-card">
        <text class="course-description">{{ course.description || "内容介绍正在完善中。" }}</text>
      </view>

      <view v-if="activeTab === 'catalog'" class="card tab-card">
        <view v-if="chapters.length">
          <view v-for="(chapter, ci) in chapters" :key="ci" class="chapter-block">
            <text class="chapter-title">{{ chapter.title }}</text>
            <view v-for="(lesson, li) in chapter.lessons" :key="li" class="lesson-item">
              <view class="row lesson-row">
                <text>{{ lesson.isFree ? "🔓" : "🔒" }}</text>
                <text class="body-text lesson-title">{{ lesson.title }}</text>
                <text class="subtle">{{ lesson.duration || "-" }}</text>
              </view>
            </view>
          </view>
        </view>
        <empty-state v-else icon="📖" text="暂无目录，请先在后台维护内容目录" />
      </view>

      <view v-if="activeTab === 'reviews'" class="card tab-card">
        <view v-if="reviewsError" class="reviews-error">
          <text>{{ reviewsError }}</text>
          <text class="retry-text" role="button" tabindex="0" aria-label="重新加载课程评价" @click="loadReviews" @keyup.enter="loadReviews" @keyup.space.prevent="loadReviews">重新加载评价</text>
        </view>
        <view v-for="(rv, ri) in reviews" :key="ri" class="review-item">
          <view class="row review-author">
            <image class="avatar-sm" :src="rv.avatar" mode="aspectFill" />
            <view>
              <text class="review-name">{{ rv.nickname }}</text>
              <text class="review-stars">{{ "★".repeat(rv.rating) }}</text>
            </view>
          </view>
          <text class="review-content">{{ rv.content }}</text>
          <text v-if="rv.reply" class="review-reply">讲师回复：{{ rv.reply }}</text>
          <text class="subtle review-time">{{ rv.time }}</text>
        </view>
        <EmptyState v-if="!reviewsLoading && !reviewsError && !reviews.length" icon="评" text="暂无已通过审核的课程评价" />
      </view>

      <view class="bottom-actions">
        <view class="bottom-action" role="button" tabindex="0" :aria-disabled="favoriteLoading" aria-label="收藏课程" :class="{ disabled: favoriteLoading }" @click="toggleFavorite" @keyup.enter="toggleFavorite" @keyup.space.prevent="toggleFavorite">
          <text class="favorite-icon">{{ favoriteLoading ? "处理中" : (isFav ? "❤️" : "🤍") }}</text>
          <text class="subtle">收藏</text>
        </view>
        <view class="button buy-button" role="button" tabindex="0" :aria-disabled="joining" :aria-busy="joining" aria-label="加入或继续课程" :class="{ disabled: joining }" @click="buyCourse" @keyup.enter="buyCourse" @keyup.space.prevent="buyCourse">
          {{ joining ? "处理中..." : course.owned ? "继续观看" : course.accessMode === 'member' ? '使用会员权益加入' : course.accessMode === 'redeem' ? '使用兑换码加入' : Number(course.price) > 0 ? `立即加入 ${priceText(course.price)}` : "免费加入" }}
        </view>
      </view>
    </template>
    <WechatPhoneBindSheet
      :visible="phoneBindVisible"
      title="加入内容前绑定手机号"
      message="订单和参与权益需要手机号，授权后将继续当前操作。"
      close-text="暂不加入"
      @close="closePhoneBindPanel"
      @bound="handlePhoneBound"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShareAppMessage, onShareTimeline, onShow } from "@dcloudio/uni-app";
import { ensureUser, fetchMyProfile, getCurrentTenantCode, getUserToken, request, withTenantCode } from "../../api";
import { priceText } from "../../course-data";
import { reviewSafeText } from "../../review-safe-text";
import EmptyState from "../../components/EmptyState.vue";
import WechatPhoneBindSheet from "../../components/WechatPhoneBindSheet.vue";
import AdSlotRenderer from "../../components/AdSlotRenderer.vue";
import SplashAd from "../../components/SplashAd.vue";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { defaultMiniProgramShare, defaultMiniProgramTimelineShare, showMiniProgramShareMenu } from "../../share";

const activeTab = ref("detail");
const isFav = ref(false);
const loading = ref(true);
const error = ref("");
const rawCourse = ref<any>();
const joining = ref(false);
const favoriteLoading = ref(false);
const reviewsLoading = ref(false);
const reviewsError = ref("");
const reviews = ref<any[]>([]);
const phoneBindVisible = ref(false);
const pendingPhoneAction = ref<"" | "buy">("");
const clientOrderKey = ref(`course_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
const courseLoadGuard = createTenantLoadGuard();
const reviewsLoadGuard = createTenantLoadGuard();
const favoriteActionGuard = createTenantLoadGuard();

const tabs = [
  { key: "detail", label: "详情" },
  { key: "catalog", label: "目录" },
  { key: "reviews", label: "评价" }
];
const palette = ["#F5E6D3", "#E8E0D8", "#DCE8E0", "#E0DCE8", "#F0E8E0"];
const icons = ["📜", "📚", "☯", "🖌", "🌿", "🧘", "⛰", "✍"];

const course = computed(() => {
  const row = rawCourse.value;
  if (!row) return null;
  const tags = Array.isArray(row.tags) ? row.tags : [];
  const price = Number(row.price || 0);
  return {
    id: row.id,
    title: reviewSafeText(row.title),
    teacher: reviewSafeText(row.teacherName || "慢π"),
    teacherAvatar: row.teacherAvatar || "",
    price,
    originalPrice: Number(row.originalPrice || 0),
    coverUrl: row.coverUrl || "",
    icon: icons[Number(row.id || 0) % icons.length],
    color: palette[Number(row.id || 0) % palette.length],
    rating: Number(row.rating || 0).toFixed(1),
    reviewCount: Number(row.reviewCount || 0),
    tag: reviewSafeText(tags[0] || (price === 0 ? "限时免费" : "")),
    description: reviewSafeText(row.description || ""),
    accessMode: row.accessMode || "price",
    owned: Boolean(row.owned)
  };
});
const chapters = computed(() => (rawCourse.value?.chapters || []).map((chapter: any) => ({
  ...chapter,
  title: reviewSafeText(chapter.title || ""),
  lessons: (chapter.lessons || []).map((lesson: any) => ({ ...lesson, title: reviewSafeText(lesson.title || "") }))
})));
const shareOptions = {
  title: () => course.value?.title || "慢π专题内容",
  path: () => course.value?.id ? `/pages/course/detail?id=${course.value.id}` : "/pages/courses/index",
  imageUrl: () => course.value?.coverUrl || ""
};
onShareAppMessage(() => defaultMiniProgramShare(shareOptions));
onShareTimeline(() => defaultMiniProgramTimelineShare(shareOptions));
onShow(showMiniProgramShareMenu);

function currentCourseId() {
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any)?.options || {};
  return Number(options.id || 0);
}

async function loadCourse() {
  const token = courseLoadGuard.begin();
  loading.value = true;
  error.value = "";
  reviewsError.value = "";
  try {
    const id = currentCourseId();
    if (!id) throw new Error("缺少内容ID");
    const [courseResult, reviewResult] = await Promise.allSettled([
      request<any>(`/public/courses/${id}`),
      request<any[]>(`/public/courses/${id}/reviews`)
    ]);
    if (!courseLoadGuard.isCurrent(token)) return;
    if (courseResult.status === "rejected") throw courseResult.reason;
    const data = courseResult.value;
    if (!data) throw new Error("内容不存在或未发布");
    rawCourse.value = data;
    if (reviewResult.status === "fulfilled") applyReviews(reviewResult.value);
    else reviewsError.value = (reviewResult.reason as any)?.message || "课程评价加载失败，请稍后重试。";
    if (getUserToken()) {
      try {
      const favorite = await request<any>(`/public/me/course-favorites/${id}`);
      if (courseLoadGuard.isCurrent(token)) isFav.value = Boolean(favorite?.favorited);
      } catch {
        if (courseLoadGuard.isCurrent(token)) isFav.value = false;
      }
    } else {
      isFav.value = false;
    }
  } catch (err: any) {
    if (courseLoadGuard.isCurrent(token)) error.value = reviewSafeText(err.message || "内容加载失败");
  } finally {
    if (courseLoadGuard.isCurrent(token)) loading.value = false;
  }
}

function applyReviews(rows: any[]) {
  reviews.value = (Array.isArray(rows) ? rows : []).map((row, index) => ({
    id: row.id,
    avatar: `/static/avatar${(index % 3) + 1}.png`,
    nickname: reviewSafeText(row.authorName || `学员 ${String(row.id || index + 1).slice(-4)}`),
    rating: Math.min(Math.max(Number(row.rating || 0), 0), 5),
    content: reviewSafeText(row.content || ""),
    time: row.createdAt ? String(row.createdAt).replace("T", " ").slice(0, 16) : "",
    reply: reviewSafeText(row.reply || "")
  }));
}

async function loadReviews() {
  if (!course.value || reviewsLoading.value) return;
  const token = reviewsLoadGuard.begin();
  const courseId = Number(course.value.id);
  reviewsLoading.value = true;
  reviewsError.value = "";
  try {
    const rows = await request<any[]>(`/public/courses/${courseId}/reviews`);
    if (reviewsLoadGuard.isCurrent(token) && Number(course.value?.id) === courseId) applyReviews(rows);
  } catch (error: any) {
    if (reviewsLoadGuard.isCurrent(token)) reviewsError.value = reviewSafeText(error?.message || "课程评价加载失败，请稍后重试。");
  } finally {
    if (reviewsLoadGuard.isCurrent(token)) reviewsLoading.value = false;
  }
}

function goBack() { uni.navigateBack(); }
function share() {
  // #ifdef H5
  const url = typeof window !== "undefined" ? window.location.href : "";
  if (url) {
    uni.setClipboardData({
      data: url,
      success: () => uni.showToast({ title: "链接已复制", icon: "success" }),
      fail: () => uni.showToast({ title: "复制失败，请手动复制地址", icon: "none" })
    });
    return;
  }
  // #endif
  uni.showToast({ title: "请使用系统分享", icon: "none" });
}
async function toggleFavorite() {
  if (!course.value || favoriteLoading.value) return;
  const token = favoriteActionGuard.begin();
  const courseId = Number(course.value.id);
  favoriteLoading.value = true;
  try {
    await ensureUser();
    const result = await request<any>(`/public/me/course-favorites/${courseId}`, { method: "POST" });
    if (!favoriteActionGuard.isCurrent(token) || Number(course.value?.id) !== courseId) return;
    isFav.value = Boolean(result?.favorited);
    uni.showToast({ title: isFav.value ? "已收藏内容" : "已取消收藏", icon: "none" });
  } catch (err: any) {
    if (favoriteActionGuard.isCurrent(token)) uni.showToast({ title: reviewSafeText(err.message || "收藏失败"), icon: "none" });
  } finally {
    if (favoriteActionGuard.isCurrent(token)) favoriteLoading.value = false;
  }
}
async function buyCourse() {
  if (!course.value) return;
  if (course.value.owned) {
    uni.navigateTo({ url: withTenantCode(`/pages/course/player?id=${course.value.id}`) });
    return;
  }
  if (course.value.accessMode === "redeem") { uni.showToast({ title:"请在个人中心输入课程兑换码", icon:"none" }); return; }
  if (joining.value) return;
  const tenantCode = getCurrentTenantCode();
  const courseId = Number(course.value.id);
  joining.value = true;
  try {
    if (Number(course.value.price) > 0 && course.value.accessMode !== "member") {
      if (!(await requirePhoneBound("buy"))) return;
      if (getCurrentTenantCode() === tenantCode) uni.navigateTo({ url: withTenantCode(`/pages/order/confirm?id=${courseId}`) });
    } else {
      if (!(await requirePhoneBound("buy"))) return;
      const result = await request<any>(`/public/courses/${courseId}/orders`, { method: "POST", data: { clientOrderKey: clientOrderKey.value } });
      if (getCurrentTenantCode() !== tenantCode || Number(course.value?.id) !== courseId) return;
      const orderId = Number(result?.order?.id || 0);
      uni.navigateTo({ url: withTenantCode(`/pages/order/payment?status=success&mode=free&id=${courseId}${orderId ? `&orderId=${orderId}` : ""}`) });
    }
  } catch (err: any) {
    uni.showToast({ title: reviewSafeText(err.message || "加入内容失败"), icon: "none" });
  } finally {
    if (getCurrentTenantCode() === tenantCode) joining.value = false;
  }
}

async function requirePhoneBound(action: "buy") {
  await ensureUser();
  const profile = await fetchMyProfile();
  if (profile?.phone) return true;
  pendingPhoneAction.value = action;
  phoneBindVisible.value = true;
  return false;
}

function closePhoneBindPanel() {
  phoneBindVisible.value = false;
  pendingPhoneAction.value = "";
}

function handlePhoneBound() {
  const action = pendingPhoneAction.value;
  phoneBindVisible.value = false;
  pendingPhoneAction.value = "";
  if (action === "buy") buyCourse();
}

onShow(() => { void loadCourse(); });
</script>

<style scoped>
.course-detail-page { width:100%; max-width:760px; min-height:100vh; margin:0 auto; box-sizing:border-box; padding:calc(24rpx + env(safe-area-inset-top)) 24rpx calc(150rpx + env(safe-area-inset-bottom)); overflow-wrap:anywhere; }
.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
}
.nav-back, .nav-share { min-width: 104rpx; min-height: 58rpx; display: flex; align-items: center; color: #4a6b8a; font-size: 27rpx; font-weight: 800; }
.nav-share { justify-content: flex-end; }
.nav-title { color: #333333; font-size: 32rpx; font-weight: 900; font-family: "STKaiti", "KaiTi", serif; }
.state-card { text-align: center; }
.retry-button { display: inline-flex; margin-top: 20rpx; min-width: 160rpx; }
.course-cover-full {
  width: 100%;
  height: 420rpx;
  background: #f5e6d3;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 24rpx;
  overflow: hidden;
  box-shadow: 0 18rpx 44rpx rgba(91, 47, 36, 0.14);
}
.course-cover-img { width: 100%; height: 100%; display: block; }
.course-icon { font-size: 120rpx; }
.play-btn {
  position: absolute;
  width: 100rpx;
  height: 100rpx;
  background: rgba(255, 248, 240, 0.18);
  border: 1px solid rgba(255, 248, 240, 0.28);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 30rpx;
  font-weight: 900;
  font-family: "STKaiti", "KaiTi", serif;
}
.course-info-section { margin-bottom: 24rpx; border-radius: 24rpx; box-shadow: 0 12rpx 34rpx rgba(91, 47, 36, 0.07); }
.title-xl { font-family: "STKaiti", "KaiTi", serif; line-height: 1.24; }
.teacher-row, .rating-row, .price-row { justify-content:flex-start; gap:16rpx; margin-top:12rpx; flex-wrap: wrap; }
.rating-row { gap:8rpx; margin-top:8rpx; }
.rating-text { color:#c43d3d; font-size:28rpx; font-weight: 800; }
.course-price { font-size:48rpx; }
.course-original-price { font-size:28rpx; margin-top:12rpx; }
.detail-tabs {
  display: flex;
  gap: 8rpx;
  margin-bottom: 24rpx;
  padding: 8rpx;
  border-radius: 18rpx;
  background: #f9f4ee;
}
.detail-tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 28rpx;
  color: #666666;
  border-radius: 14rpx;
}
.detail-tab.active {
  color: #c43d3d;
  font-weight: 800;
  background: #fff;
  box-shadow: 0 8rpx 22rpx rgba(91, 47, 36, 0.08);
}
.tab-card { border-radius: 24rpx; box-shadow: 0 12rpx 34rpx rgba(91, 47, 36, 0.07); }
.course-description { display: block; color: #666666; font-size: 28rpx; line-height: 1.7; white-space: pre-line; }
.chapter-block { margin-bottom:16rpx; }
.chapter-block:last-child { margin-bottom:0; }
.chapter-title { font-size:28rpx; font-weight:800; color:#333333; }
.lesson-item {
  padding: 12rpx 0;
  border-bottom: 1rpx solid #e8e0d8;
}
.lesson-row { justify-content:flex-start; gap:12rpx; }
.lesson-title { flex:1; }
.review-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #e8e0d8;
}
.review-item:last-child { border-bottom: 0; }
.review-author { justify-content:flex-start; gap:12rpx; }
.review-name { display: block; color: #333333; font-size: 28rpx; font-weight: 800; }
.review-stars { display: block; margin-top: 4rpx; font-size:22rpx; color:#c43d3d; letter-spacing: 0; }
.review-content { display:block; margin-top:8rpx; color:#666666; font-size: 27rpx; line-height: 1.6; }
.review-reply { display:block; margin-top:8rpx; padding:12rpx 14rpx; border-radius:8px; background:#f8fafc; color:#475467; font-size:24rpx; line-height:1.55; }
.review-time { display:block; margin-top:4rpx; }
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  display: flex;
  align-items: center;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #e8e0d8;
  box-shadow: 0 -10rpx 30rpx rgba(51, 51, 51, 0.08);
}
.bottom-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.favorite-icon { font-size:36rpx; }
.buy-button { flex:1; margin-left:24rpx; }
.disabled { opacity:.6; pointer-events:none; }
.reviews-error { display:grid; gap:8rpx; margin-bottom:16rpx; padding:16rpx; border-radius:8px; border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; font-size:24rpx; }
.retry-text { color:#C43D3D; font-weight:900; }
</style>
