<template>
  <view class="container user-subpage has-custom-nav">
    <view class="custom-nav">
      <view class="nav-back" role="button" tabindex="0" aria-label="返回上一页" @click="goBack" @keyup.enter="goBack" @keyup.space.prevent="goBack">‹ 返回</view>
      <text class="nav-title">我的内容</text>
      <view class="nav-placeholder"></view>
    </view>
    <view class="page-hero">
      <view class="hero-kicker">内容中心</view>
      <view class="hero-title">继续你的内容</view>
      <view class="hero-desc">查看已加入内容，按进度继续观看。</view>
    </view>
    <view class="my-tabs">
      <view v-for="t in tabs" :key="t.key" class="my-tab" :class="{active:activeTab===t.key}" role="tab" tabindex="0" :aria-selected="activeTab===t.key" :aria-label="`查看${t.label}内容`" @click="activeTab=t.key" @keyup.enter="activeTab=t.key" @keyup.space.prevent="activeTab=t.key">{{ t.label }}</view>
    </view>
    <view v-if="loading" class="state-card">我的课程加载中...</view>
    <view v-else-if="loadError" class="state-card error-state" role="alert" aria-live="assertive"><text>{{ loadError }}</text><view class="state-retry" role="button" tabindex="0" aria-label="重新加载我的课程" @click="loadCourses" @keyup.enter="loadCourses" @keyup.space.prevent="loadCourses">重新加载</view></view>
    <view v-for="c in visibleCourses" :key="c.id" class="my-course-item" role="button" tabindex="0" :aria-label="`打开${c.title}`" @click="goCourse(c)" @keyup.enter="goCourse(c)" @keyup.space.prevent="goCourse(c)">
      <view class="course-row">
        <view class="course-cover" :style="{ background: c.color }">
          <image v-if="c.coverUrl" class="course-cover-img" :src="c.coverUrl" mode="aspectFill" />
          <text v-else class="course-cover-icon">{{ c.icon }}</text>
        </view>
        <view class="course-info">
          <text class="course-title">{{ c.title }}</text>
          <view class="progress-bar"><view class="progress-fill" :style="{width:c.progress+'%'}"></view></view>
          <text class="course-progress">进度 {{ c.progress }}%</text>
          <text v-if="c.recentLesson" class="recent-lesson">最近：{{ c.recentLesson.title }} · {{ c.recentLesson.progress }}%</text>
        </view>
      </view>
    </view>
    <empty-state v-if="!loading && !loadError && !visibleCourses.length" icon="📖" text="暂无进行中的内容" />
    <TabBar current="courses" />
  </view>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { reviewSafeText } from "../../review-safe-text";
import { normalizeCourse, type CourseCard } from "../../course-data";
import TabBar from "../../components/TabBar.vue";

const activeTab = ref("all");
const tabs = [{key:"all",label:"全部"},{key:"ongoing",label:"进行中"},{key:"done",label:"已完成"}];
const courses = ref<Array<CourseCard & { recentLesson?: { title:string; progress:number } | null }>>([]);
const loading = ref(false);
const loadError = ref("");
const loadedTenantCode = ref("");
const loadGuard = createTenantLoadGuard();
const visibleCourses = computed(() => courses.value.filter((course) => {
  if (activeTab.value === "ongoing") return Number(course.progress || 0) < 100;
  if (activeTab.value === "done") return Number(course.progress || 0) >= 100;
  return true;
}));

async function loadCourses() {
  const loadToken = loadGuard.begin();
  if (loadedTenantCode.value && loadedTenantCode.value !== loadToken.tenantCode) courses.value = [];
  loading.value = true;
  loadError.value = "";
  try {
    await ensureUser();
    const rows = await request<any[]>("/public/me/courses");
    if (!loadGuard.isCurrent(loadToken)) return;
    courses.value = (Array.isArray(rows) ? rows : []).map((row, index) => ({
      ...normalizeCourse(row, index),
      progress: Number(row.learning?.progress || 0), recentLesson: row.learning?.recentLesson || null
    }));
    loadedTenantCode.value = loadToken.tenantCode;
  } catch (error: any) {
    if (!loadGuard.isCurrent(loadToken)) return;
    if (!String(error?.message || "").includes("请先完成")) loadError.value = reviewSafeText(error?.message || "我的课程加载失败，请稍后重试。");
  } finally {
    if (loadGuard.isCurrent(loadToken)) loading.value = false;
  }
}

function goBack() { uni.navigateBack(); }
function goCourse(c:any) { uni.navigateTo({ url: withTenantCode(`/pages/course/player?id=${c.id}${c.recentLesson?.id ? `&lessonId=${c.recentLesson.id}` : ""}`) }); }

onShow(loadCourses);
</script>
<style scoped>
.user-subpage {
  min-height: 100vh;
  box-sizing:border-box;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
  background:
    linear-gradient(180deg, #f7efe3 0%, #fbf7ef 40%, #f4eadc 100%);
}

.custom-nav {
  display: flex;
  align-items: center;
  padding: 18rpx 0 20rpx;
}

.nav-back,
.nav-placeholder {
  width: 130rpx;
  color: #4a6b8a;
  font-size: 28rpx;
}

.nav-title {
  flex: 1;
  color: #263d3c;
  font-size: 32rpx;
  font-weight: 800;
  text-align: center;
}

.page-hero {
  padding: 34rpx 30rpx;
  border-radius: 30rpx;
  background:
    linear-gradient(135deg, rgba(33, 75, 78, 0.96), rgba(129, 55, 48, 0.9)),
    #214b4e;
  color: #fffaf2;
  box-shadow: 0 18rpx 46rpx rgba(36, 60, 60, 0.18);
}

.hero-kicker {
  display: inline-flex;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 250, 242, 0.14);
  color: rgba(255, 250, 242, 0.84);
  font-size: 22rpx;
}

.hero-title {
  margin-top: 22rpx;
  font-size: 42rpx;
  font-weight: 800;
  line-height: 1.25;
}

.hero-desc {
  margin-top: 14rpx;
  color: rgba(255, 250, 242, 0.76);
  font-size: 25rpx;
  line-height: 1.65;
}

.my-tabs {
  display: flex;
  gap: 10rpx;
  margin: 24rpx 0 18rpx;
  padding: 8rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 999rpx;
  background: rgba(255, 252, 246, 0.8);
}

.my-tab {
  flex: 1;
  padding: 16rpx 12rpx;
  border-radius: 999rpx;
  color: #7f7467;
  font-size: 27rpx;
  text-align: center;
}

.my-tab.active {
  background: #b84435;
  color: #fffaf2;
  font-weight: 800;
}

.my-course-item {
  margin-bottom: 16rpx;
  padding: 22rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 24rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 12rpx 34rpx rgba(72, 55, 38, 0.08);
}

.course-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.course-cover {
  width: 180rpx;
  height: 120rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 18rpx;
}

.course-cover-img {
  width: 100%;
  height: 100%;
  display: block;
}

.course-cover-icon {
  font-size: 46rpx;
}

.course-info {
  min-width: 0;
  flex: 1;
}

.course-title {
  display: block;
  color: #263d3c;
  font-size: 29rpx;
  font-weight: 800;
  line-height: 1.45;
}

.progress-bar {
  height: 10rpx;
  margin-top: 14rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: #e8dccb;
}

.progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: #b84435;
}

.course-progress {
  display: block;
  margin-top: 8rpx;
  color: #8f8172;
  font-size: 24rpx;
}
.recent-lesson { display:block; margin-top:6rpx; color:#4a6b8a; font-size:23rpx; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.state-card { display:grid; gap:10rpx; margin-bottom:18rpx; padding:20rpx 22rpx; border-radius:8px; background:#fff; color:#667085; font-size:24rpx; line-height:1.55; }
.state-card.error-state { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; }
.state-retry { width:max-content; color:#C43D3D; font-weight:900; }
@media (min-width: 900px) { .user-subpage { max-width:760px; margin:0 auto; } }
</style>
