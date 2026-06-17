<template>
  <view class="container">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">‹ 返回</view>
      <text class="nav-title" style="font-size:28rpx; color:#333; flex:1; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ courseTitle }}</text>
      <view class="nav-more" @click="showMore">⋯</view>
    </view>

    <view v-if="loading" class="card subtle">加载中...</view>
    <view v-else-if="error" class="card state-card">
      <view>{{ error }}</view>
      <view class="button block" style="margin-top:24rpx;" @click="goDetail">返回课程详情</view>
    </view>

    <template v-else>
    <view class="player-area">
      <text style="font-size:80rpx;">📜</text>
      <view class="player-controls">
        <text class="player-btn">⏮</text>
        <text class="player-btn player-btn-play" @click="markProgress(60)">▶</text>
        <text class="player-btn">⏭</text>
      </view>
      <view class="player-progress">
        <view class="player-progress-track">
          <view class="player-progress-fill" :style="{ width: currentProgress + '%' }"></view>
        </view>
        <view class="row" style="justify-content:space-between; margin-top:8rpx;">
          <text class="subtle">已学 {{ currentProgress }}%</text>
          <text class="subtle">{{ currentLesson?.duration || "-" }}</text>
        </view>
      </view>
    </view>

    <view class="player-info">
      <text class="title-md">{{ currentChapterTitle }}</text>
      <text class="body-text" style="margin-top:4rpx;">{{ currentLessonTitle }}</text>
      <view class="button block" style="margin-top:20rpx;" :class="{ disabled: savingProgress }" @click="markProgress(100)">{{ savingProgress ? "保存中..." : "标记本课时完成" }}</view>
    </view>

    <!-- 目录按钮 -->
    <view class="button secondary block" style="margin-top:24rpx;" @click="showCatalog = !showCatalog">
      {{ showCatalog ? '收起目录' : '查看目录' }}
    </view>

    <!-- 目录 -->
    <view v-if="showCatalog" class="card" style="margin-top:16rpx;">
      <view v-for="(chapter, ci) in chapters" :key="ci" style="margin-bottom:12rpx;">
        <text style="font-size:26rpx; font-weight:600; color:#333; display:block; margin-bottom:8rpx;">{{ chapter.title }}</text>
        <view v-for="(lesson, li) in chapter.lessons" :key="li" class="catalog-lesson" :class="{ active: lesson.id === currentLesson?.id, locked: lesson.locked }" @click="selectLesson(lesson)">
          <text>{{ lesson.locked ? '🔒' : '▶' }}</text>
          <text style="flex:1; color:#333; font-size:26rpx;">{{ lesson.title }}</text>
          <text class="subtle">{{ lesson.progress ? `${lesson.progress}%` : lesson.duration }}</text>
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
.custom-nav { display:flex; align-items:center; padding:16rpx 0; }
.nav-back, .nav-more { font-size:28rpx; color:#4A6B8A; padding:0 8rpx; }
.player-area {
  width:100%; height:420rpx;
  background:#1a1a2e;
  border-radius:20rpx;
  display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  color:#fff; margin-bottom:24rpx;
  position:relative;
}
.player-controls { display:flex; gap:40rpx; align-items:center; margin-top:24rpx; }
.player-btn { font-size:36rpx; opacity:0.8; }
.player-btn-play { font-size:56rpx; }
.player-progress { position:absolute; bottom:24rpx; left:32rpx; right:32rpx; }
.player-progress-track { height:6rpx; background:rgba(255,255,255,0.2); border-radius:3rpx; }
.player-progress-fill { height:100%; background:#C43D3D; border-radius:3rpx; }
.player-info { padding:0 0 16rpx; }
.catalog-lesson {
  display:flex; align-items:center; gap:12rpx;
  padding:12rpx 0; border-bottom:1rpx solid #E8E0D8;
}
.catalog-lesson.active { background:rgba(196,61,61,0.06); border-radius:8rpx; padding:12rpx; }
.catalog-lesson.locked { opacity:0.58; }
.state-card { text-align:center; margin-top:24rpx; }
</style>
