<template>
  <view class="container">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">‹ 返回</view>
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
        <text v-else style="font-size:120rpx;">{{ course.icon }}</text>
        <view class="play-btn">▶</view>
      </view>

      <view class="course-info-section">
        <text class="title-xl">{{ course.title }}</text>
        <view class="row" style="justify-content:flex-start; gap:16rpx; margin-top:12rpx;">
          <image class="avatar-sm" :src="course.teacherAvatar || '/static/avatar1.png'" mode="aspectFill" />
          <text class="body-text">{{ course.teacher }}</text>
          <view class="tag tag-secondary">讲师</view>
        </view>
        <view class="row" style="justify-content:flex-start; gap:8rpx; margin-top:8rpx;">
          <text style="color:#FF9F00; font-size:28rpx;">⭐ {{ course.rating }}（{{ course.reviewCount }}人评价）</text>
        </view>
        <view class="row" style="justify-content:flex-start; gap:16rpx; margin-top:12rpx;">
          <text class="price" style="font-size:48rpx;">{{ priceText(course.price) }}</text>
          <text class="price-original" style="font-size:28rpx; margin-top:12rpx;" v-if="Number(course.originalPrice) > 0">{{ priceText(course.originalPrice) }}</text>
          <view v-if="course.tag" class="tag" :class="course.tag === '限时优惠' ? 'tag-warning' : 'tag-success'">{{ course.tag }}</view>
        </view>
      </view>

      <view class="detail-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="detail-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >{{ tab.label }}</view>
      </view>

      <view v-if="activeTab === 'detail'" class="card">
        <text class="body-text" style="white-space:pre-line;">{{ course.description || "课程介绍正在完善中。" }}</text>
      </view>

      <view v-if="activeTab === 'catalog'" class="card">
        <view v-if="chapters.length">
          <view v-for="(chapter, ci) in chapters" :key="ci" style="margin-bottom:16rpx;">
            <text style="font-size:28rpx; font-weight:600; color:#333;">{{ chapter.title }}</text>
            <view v-for="(lesson, li) in chapter.lessons" :key="li" class="lesson-item">
              <view class="row" style="justify-content:flex-start; gap:12rpx;">
                <text>{{ lesson.isFree ? "🔓" : "🔒" }}</text>
                <text class="body-text" style="flex:1;">{{ lesson.title }}</text>
                <text class="subtle">{{ lesson.duration || "-" }}</text>
              </view>
            </view>
          </view>
        </view>
        <empty-state v-else icon="📖" text="暂无章节，请先在后台维护课程目录" />
      </view>

      <view v-if="activeTab === 'reviews'" class="card">
        <view v-for="(rv, ri) in reviews" :key="ri" class="review-item">
          <view class="row" style="justify-content:flex-start; gap:12rpx;">
            <image class="avatar-sm" :src="rv.avatar" mode="aspectFill" />
            <view>
              <text class="body-text" style="font-weight:600;">{{ rv.nickname }}</text>
              <text style="font-size:22rpx; color:#FF9F00;">{{ "⭐".repeat(rv.rating) }}</text>
            </view>
          </view>
          <text class="body-text" style="margin-top:8rpx; display:block;">{{ rv.content }}</text>
          <text class="subtle" style="display:block; margin-top:4rpx;">{{ rv.time }}</text>
        </view>
      </view>

      <view class="bottom-actions">
        <view class="bottom-action" @click="toggleFavorite">
          <text style="font-size:36rpx;">{{ isFav ? "❤️" : "🤍" }}</text>
          <text class="subtle">收藏</text>
        </view>
        <view class="button" style="flex:1; margin-left:24rpx;" @click="buyCourse">
          {{ Number(course.price) > 0 ? `立即购买 ${priceText(course.price)}` : "免费加入" }}
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ensureUser, request, withTenantCode } from "../../api";
import { isFavoriteCourse, priceText, toggleFavoriteCourse } from "../../course-data";
import EmptyState from "../../components/EmptyState.vue";

const activeTab = ref("detail");
const isFav = ref(false);
const loading = ref(true);
const error = ref("");
const rawCourse = ref<any>();
const joining = ref(false);

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
    teacher: row.teacherName || "七维书院",
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
    isFav.value = isFavoriteCourse(id);
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
function toggleFavorite() {
  if (!course.value) return;
  isFav.value = toggleFavoriteCourse(course.value.id);
  uni.showToast({ title: isFav.value ? "已收藏课程" : "已取消收藏", icon: "none" });
}
async function buyCourse() {
  if (!course.value) return;
  if (Number(course.value.price) > 0) {
    uni.navigateTo({ url: withTenantCode(`/pages/order/confirm?id=${course.value.id}`) });
  } else {
    if (joining.value) return;
    joining.value = true;
    try {
      await ensureUser();
      await request(`/public/courses/${course.value.id}/orders`, { method: "POST", data: {} });
      uni.navigateTo({ url: withTenantCode(`/pages/order/payment?status=success&id=${course.value.id}`) });
    } catch (err: any) {
      uni.showToast({ title: err.message || "加入课程失败", icon: "none" });
    } finally {
      joining.value = false;
    }
  }
}

onMounted(loadCourse);
</script>

<style scoped>
.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
}
.nav-back, .nav-share { font-size: 28rpx; color: #4A6B8A; }
.state-card { text-align: center; }
.retry-button { display: inline-flex; margin-top: 20rpx; min-width: 160rpx; }
.course-cover-full {
  width: 100%;
  height: 420rpx;
  background: #F5E6D3;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 24rpx;
  overflow: hidden;
}
.course-cover-img { width: 100%; height: 100%; display: block; }
.play-btn {
  position: absolute;
  width: 100rpx;
  height: 100rpx;
  background: rgba(0,0,0,0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 40rpx;
}
.course-info-section { margin-bottom: 24rpx; }
.detail-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 24rpx;
  border-bottom: 2rpx solid #E8E0D8;
}
.detail-tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 28rpx;
  color: #666;
}
.detail-tab.active {
  color: #C43D3D;
  font-weight: 600;
  border-bottom: 4rpx solid #C43D3D;
}
.lesson-item {
  padding: 12rpx 0;
  border-bottom: 1rpx solid #E8E0D8;
}
.review-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #E8E0D8;
}
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #E8E0D8;
}
.bottom-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
</style>
