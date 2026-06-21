<template>
  <view class="container course-player-page">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">‹ 返回</view>
      <text class="nav-title">{{ courseTitle }}</text>
      <view class="nav-more" @click="showMore">⋯</view>
    </view>

    <view v-if="loading" class="card subtle">加载中...</view>
    <view v-else-if="error" class="card state-card">
      <view>{{ error }}</view>
      <view class="button block state-button" @click="goDetail">返回课程详情</view>
    </view>

    <template v-else>
    <view class="player-hero">
      <view class="player-kicker">课程学习</view>
      <view class="player-scroll-icon">课</view>
      <view class="player-controls">
        <text class="player-btn">上一节</text>
        <text class="player-btn player-btn-play" @click="markProgress(60)">播放</text>
        <text class="player-btn">下一节</text>
      </view>
      <view class="player-progress">
        <view class="player-progress-track">
          <view class="player-progress-fill" :style="{ width: currentProgress + '%' }"></view>
        </view>
        <view class="progress-meta">
          <text>已学 {{ currentProgress }}%</text>
          <text>{{ currentLesson?.duration || "-" }}</text>
        </view>
      </view>
    </view>

    <view class="lesson-card">
      <text class="chapter-title">{{ currentChapterTitle }}</text>
      <text class="lesson-title">{{ currentLessonTitle }}</text>
      <view class="button block complete-button" :class="{ disabled: savingProgress }" @click="markProgress(100)">{{ savingProgress ? "保存中..." : "标记本课时完成" }}</view>
    </view>

    <view class="button secondary block catalog-toggle" @click="showCatalog = !showCatalog">
      {{ showCatalog ? '收起目录' : '查看目录' }}
    </view>

    <view v-if="showCatalog" class="catalog-card">
      <view v-for="(chapter, ci) in chapters" :key="ci" class="chapter-block">
        <text class="catalog-chapter-title">{{ chapter.title }}</text>
        <view v-for="(lesson, li) in chapter.lessons" :key="li" class="catalog-lesson" :class="{ active: lesson.id === currentLesson?.id, locked: lesson.locked }" @click="selectLesson(lesson)">
          <text class="lesson-status">{{ lesson.locked ? '锁' : '播' }}</text>
          <text class="catalog-lesson-title">{{ lesson.title }}</text>
          <text class="catalog-lesson-meta">{{ lesson.progress ? `${lesson.progress}%` : lesson.duration }}</text>
        </view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ensureUser, request, withTenantCode } from "../../api";

const showCatalog = ref(false);
const loading = ref(true);
const savingProgress = ref(false);
const error = ref("");
const rawCourse = ref<any>();
const selectedLessonId = ref(0);
const chapters = computed(() => rawCourse.value?.chapters || []);
const courseTitle = computed(() => rawCourse.value?.title || "课程学习");
const currentLesson = computed(() => {
  const lessons = chapters.value.flatMap((chapter: any) => chapter.lessons || []).filter((lesson: any) => !lesson.locked);
  return lessons.find((lesson: any) => lesson.id === selectedLessonId.value) || lessons[0];
});
const currentChapterTitle = computed(() => chapters.value.find((chapter: any) => (chapter.lessons || []).some((lesson: any) => lesson.id === currentLesson.value?.id))?.title || "课程目录");
const currentLessonTitle = computed(() => currentLesson.value?.title || "暂无可学习课时，请先在后台维护课程目录");
const currentProgress = computed(() => Math.max(0, Math.min(Number(currentLesson.value?.progress || 0), 100)));

function currentCourseId() {
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any)?.options || {};
  return Number(options.id || 0);
}

async function loadCourse() {
  loading.value = true;
  error.value = "";
  const id = currentCourseId();
  if (!id) {
    error.value = "缺少课程ID";
    loading.value = false;
    return;
  }
  try {
    await ensureUser();
    rawCourse.value = await request<any>(`/public/courses/${id}/player`);
    if (!rawCourse.value) error.value = "课程不存在或未发布";
    selectedLessonId.value = chapters.value.flatMap((chapter: any) => chapter.lessons || []).find((lesson: any) => !lesson.locked)?.id || 0;
  } catch (err: any) {
    rawCourse.value = null;
    error.value = err.message || "暂时无法进入学习";
  } finally {
    loading.value = false;
  }
}

function goBack() { uni.navigateBack(); }
function goDetail() { uni.navigateTo({ url: withTenantCode(`/pages/course/detail?id=${currentCourseId() || 1}`) }); }
function selectLesson(lesson: any) {
  if (lesson.locked) {
    uni.showToast({ title: "该课时需购买后学习", icon: "none" });
    return;
  }
  selectedLessonId.value = lesson.id;
}
async function markProgress(progress: number) {
  if (!currentLesson.value || savingProgress.value) return;
  savingProgress.value = true;
  try {
    const result = await request<any>(`/public/courses/${currentCourseId()}/progress`, {
      method: "POST",
      data: { lessonId: currentLesson.value.id, progress }
    });
    currentLesson.value.progress = Number(result?.lessonLearning?.progress || progress);
    uni.showToast({ title: progress >= 100 ? "已完成本课时" : "学习进度已保存", icon: "none" });
  } catch (error: any) {
    uni.showToast({ title: error.message || "保存进度失败", icon: "none" });
  } finally {
    savingProgress.value = false;
  }
}
function showMore() {
  uni.showActionSheet({
    itemList: ["查看课程详情", "反馈问题"],
    success(result) {
      if (result.tapIndex === 0) goDetail();
      if (result.tapIndex === 1) uni.navigateTo({ url:"/pages/service/index" });
    }
  });
}

onMounted(loadCourse);
</script>

<style scoped>
.course-player-page {
  min-height: 100vh;
  background:
    linear-gradient(180deg, #f7efe3 0%, #fbf7ef 38%, #f4eadc 100%);
}

.custom-nav {
  display: flex;
  align-items: center;
  padding: 18rpx 0 20rpx;
}

.nav-back,
.nav-more {
  width: 118rpx;
  color: #4a6b8a;
  font-size: 28rpx;
}

.nav-more {
  text-align: right;
  font-size: 36rpx;
}

.nav-title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: #263d3c;
  font-size: 29rpx;
  font-weight: 700;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-hero {
  position: relative;
  min-height: 430rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 30rpx;
  background:
    linear-gradient(135deg, rgba(33, 75, 78, 0.96), rgba(129, 55, 48, 0.9)),
    #214b4e;
  color: #fffaf2;
  box-shadow: 0 18rpx 46rpx rgba(36, 60, 60, 0.18);
}

.player-kicker {
  position: absolute;
  top: 26rpx;
  left: 28rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 250, 242, 0.14);
  color: rgba(255, 250, 242, 0.84);
  font-size: 22rpx;
}

.player-scroll-icon {
  width: 126rpx;
  height: 126rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 250, 242, 0.34);
  border-radius: 50%;
  background: rgba(255, 250, 242, 0.12);
  color: #fff7e8;
  font-size: 54rpx;
  font-weight: 800;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 30rpx;
}

.player-btn {
  min-width: 112rpx;
  height: 54rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 250, 242, 0.24);
  border-radius: 999rpx;
  color: rgba(255, 250, 242, 0.78);
  font-size: 23rpx;
}

.player-btn-play {
  width: 104rpx;
  height: 104rpx;
  border-color: rgba(255, 250, 242, 0.48);
  background: rgba(255, 250, 242, 0.18);
  color: #fffaf2;
  font-size: 26rpx;
  font-weight: 800;
}

.player-progress {
  position: absolute;
  right: 30rpx;
  bottom: 26rpx;
  left: 30rpx;
}

.player-progress-track {
  height: 8rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
}

.player-progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: #e7b867;
}

.progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10rpx;
  color: rgba(255, 250, 242, 0.72);
  font-size: 23rpx;
}

.lesson-card,
.catalog-card {
  margin-top: 24rpx;
  padding: 26rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 24rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 12rpx 34rpx rgba(72, 55, 38, 0.08);
}

.chapter-title {
  display: block;
  color: #8b4a3e;
  font-size: 25rpx;
  font-weight: 700;
}

.lesson-title {
  display: block;
  margin-top: 8rpx;
  color: #263d3c;
  font-size: 34rpx;
  font-weight: 800;
  line-height: 1.45;
}

.complete-button {
  margin-top: 24rpx;
}

.catalog-toggle {
  margin-top: 24rpx;
}

.chapter-block + .chapter-block {
  margin-top: 24rpx;
}

.catalog-chapter-title {
  display: block;
  margin-bottom: 10rpx;
  color: #263d3c;
  font-size: 28rpx;
  font-weight: 800;
}

.catalog-lesson {
  display: flex;
  align-items: center;
  gap: 14rpx;
  min-height: 78rpx;
  padding: 14rpx 0;
  border-bottom: 1rpx solid rgba(218, 204, 184, 0.72);
}

.catalog-lesson:last-child {
  border-bottom: 0;
}

.catalog-lesson.active {
  margin: 8rpx -10rpx;
  padding: 16rpx 10rpx;
  border-bottom-color: transparent;
  border-radius: 16rpx;
  background: rgba(184, 68, 53, 0.08);
}

.catalog-lesson.locked {
  opacity: 0.58;
}

.lesson-status {
  width: 42rpx;
  height: 42rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f1e3d0;
  color: #8b4a3e;
  font-size: 21rpx;
  font-weight: 800;
}

.catalog-lesson.active .lesson-status {
  background: #b84435;
  color: #fffaf2;
}

.catalog-lesson-title {
  min-width: 0;
  flex: 1;
  color: #344947;
  font-size: 26rpx;
  line-height: 1.4;
}

.catalog-lesson-meta {
  flex-shrink: 0;
  color: #8f8172;
  font-size: 23rpx;
}

.state-card {
  margin-top: 24rpx;
  text-align: center;
}

.state-button {
  margin-top: 24rpx;
}
</style>
