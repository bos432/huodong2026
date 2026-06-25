<template>
  <view class="container course-detail-page">
    <SplashAd />
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">返回</view>
      <view class="nav-title">课程详情</view>
      <view class="nav-share" @click="share">分享</view>
    </view>

    <view v-if="loading" class="card subtle">加载中...</view>
    <view v-else-if="error" class="card state-card">
      <view>{{ error }}</view>
      <view class="button secondary retry-button" @click="loadCourse">重试</view>
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
          <view class="tag tag-secondary">讲师</view>
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
          @click="activeTab = tab.key"
        >{{ tab.label }}</view>
      </view>

      <view v-if="activeTab === 'detail'" class="card tab-card">
        <text class="course-description">{{ course.description || "课程介绍正在完善中。" }}</text>
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
        <empty-state v-else icon="📖" text="暂无章节，请先在后台维护课程目录" />
      </view>

      <view v-if="activeTab === 'reviews'" class="card tab-card">
        <view v-for="(rv, ri) in reviews" :key="ri" class="review-item">
          <view class="row review-author">
            <image class="avatar-sm" :src="rv.avatar" mode="aspectFill" />
            <view>
              <text class="review-name">{{ rv.nickname }}</text>
              <text class="review-stars">{{ "★".repeat(rv.rating) }}</text>
            </view>
          </view>
          <text class="review-content">{{ rv.content }}</text>
          <text class="subtle review-time">{{ rv.time }}</text>
        </view>
      </view>

      <view class="bottom-actions">
        <view class="bottom-action" @click="toggleFavorite">
          <text class="favorite-icon">{{ isFav ? "❤️" : "🤍" }}</text>
          <text class="subtle">收藏</text>
        </view>
        <view class="button buy-button" @click="buyCourse">
          {{ Number(course.price) > 0 ? `立即购买 ${priceText(course.price)}` : "免费加入" }}
        </view>
      </view>
    </template>
    <WechatPhoneBindSheet
      :visible="phoneBindVisible"
      title="购买课程前绑定手机号"
      message="课程订单和学习权益需要手机号，授权后将继续当前操作。"
      close-text="暂不购买"
      @close="closePhoneBindPanel"
      @bound="handlePhoneBound"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ensureUser, fetchMyProfile, request, withTenantCode } from "../../api";
import { priceText } from "../../course-data";
import EmptyState from "../../components/EmptyState.vue";
import WechatPhoneBindSheet from "../../components/WechatPhoneBindSheet.vue";
import AdSlotRenderer from "../../components/AdSlotRenderer.vue";
import SplashAd from "../../components/SplashAd.vue";

const activeTab = ref("detail");
const isFav = ref(false);
const loading = ref(true);
const error = ref("");
const rawCourse = ref<any>();
const joining = ref(false);
const phoneBindVisible = ref(false);
const pendingPhoneAction = ref<"" | "buy">("");

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
    title: row.title,
    teacher: row.teacherName || "慢π",
    teacherAvatar: row.teacherAvatar || "",
    price,
    originalPrice: Number(row.originalPrice || 0),
    coverUrl: row.coverUrl || "",
    icon: icons[Number(row.id || 0) % icons.length],
    color: palette[Number(row.id || 0) % palette.length],
    rating: Number(row.rating || 0).toFixed(1),
    reviewCount: Number(row.reviewCount || 0),
    tag: tags[0] || (price === 0 ? "限时免费" : ""),
    description: row.description || ""
  };
});
const chapters = computed(() => rawCourse.value?.chapters || []);

const reviews = [
  { avatar: "/static/avatar1.png", nickname: "学而时习", rating: 5, content: "课程内容扎实，适合系统学习。", time: "3天前" },
  { avatar: "/static/avatar2.png", nickname: "书道中人", rating: 4, content: "目录清晰，后续期待更多课时。", time: "1周前" }
];

function currentCourseId() {
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any)?.options || {};
  return Number(options.id || 0);
}

async function loadCourse() {
  loading.value = true;
  error.value = "";
  try {
    const id = currentCourseId();
    if (!id) throw new Error("缺少课程ID");
    const data = await request<any>(`/public/courses/${id}`);
    if (!data) throw new Error("课程不存在或未发布");
    rawCourse.value = data;
    try {
      await ensureUser();
      const favorite = await request<any>(`/public/me/course-favorites/${id}`);
      isFav.value = Boolean(favorite?.favorited);
    } catch {
      isFav.value = false;
    }
  } catch (err: any) {
    error.value = err.message || "课程加载失败";
  } finally {
    loading.value = false;
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
  if (!course.value) return;
  try {
    await ensureUser();
    const result = await request<any>(`/public/me/course-favorites/${course.value.id}`, { method: "POST" });
    isFav.value = Boolean(result?.favorited);
    uni.showToast({ title: isFav.value ? "已收藏课程" : "已取消收藏", icon: "none" });
  } catch (err: any) {
    uni.showToast({ title: err.message || "收藏失败", icon: "none" });
  }
}
async function buyCourse() {
  if (!course.value) return;
  if (Number(course.value.price) > 0) {
    if (!(await requirePhoneBound("buy"))) return;
    uni.navigateTo({ url: withTenantCode(`/pages/order/confirm?id=${course.value.id}`) });
  } else {
    if (joining.value) return;
    joining.value = true;
    try {
      if (!(await requirePhoneBound("buy"))) return;
      await request(`/public/courses/${course.value.id}/orders`, { method: "POST", data: {} });
      uni.navigateTo({ url: withTenantCode(`/pages/order/payment?status=success&mode=free&id=${course.value.id}`) });
    } catch (err: any) {
      uni.showToast({ title: err.message || "加入课程失败", icon: "none" });
    } finally {
      joining.value = false;
    }
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

onMounted(loadCourse);
</script>

<style scoped>
.course-detail-page { padding-bottom: 150rpx; }
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
</style>
