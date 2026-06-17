<template>
  <view class="container">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">‹ 返回</view>
      <text class="nav-title" style="font-size:28rpx; color:#333; flex:1; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ courseTitle }}</text>
      <view class="nav-more" @click="showMore">⋯</view>
    </view>

    <!-- 模拟播放器 -->
    <view class="player-area">
      <text style="font-size:80rpx;">📜</text>
      <view class="player-controls">
        <text class="player-btn">⏮</text>
        <text class="player-btn player-btn-play">▶</text>
        <text class="player-btn">⏭</text>
      </view>
      <view class="player-progress">
        <view class="player-progress-track">
          <view class="player-progress-fill" style="width:35%;"></view>
        </view>
        <view class="row" style="justify-content:space-between; margin-top:8rpx;">
          <text class="subtle">05:23</text>
          <text class="subtle">15:00</text>
        </view>
      </view>
    </view>

    <view class="player-info">
      <text class="title-md">{{ currentChapterTitle }}</text>
      <text class="body-text" style="margin-top:4rpx;">{{ currentLessonTitle }}</text>
    </view>

    <!-- 目录按钮 -->
    <view class="button secondary block" style="margin-top:24rpx;" @click="showCatalog = !showCatalog">
      {{ showCatalog ? '收起目录' : '查看目录' }}
    </view>

    <!-- 目录 -->
    <view v-if="showCatalog" class="card" style="margin-top:16rpx;">
      <view v-for="(chapter, ci) in chapters" :key="ci" style="margin-bottom:12rpx;">
        <text style="font-size:26rpx; font-weight:600; color:#333; display:block; margin-bottom:8rpx;">{{ chapter.title }}</text>
        <view v-for="(lesson, li) in chapter.lessons" :key="li" class="catalog-lesson" :class="{ active: ci === 0 && li === 0 }">
          <text>{{ lesson.isFree || (ci === 0 && li === 0) ? '▶' : '🔒' }}</text>
          <text style="flex:1; color:#333; font-size:26rpx;">{{ lesson.title }}</text>
          <text class="subtle">{{ lesson.duration }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { request, withTenantCode } from "../../api";

const showCatalog = ref(false);
const rawCourse = ref<any>();
const chapters = computed(() => rawCourse.value?.chapters || []);
const courseTitle = computed(() => rawCourse.value?.title || "课程学习");
const currentChapterTitle = computed(() => chapters.value[0]?.title || "课程目录");
const currentLessonTitle = computed(() => chapters.value[0]?.lessons?.[0]?.title || "暂无课时，请先在后台维护课程目录");

function currentCourseId() {
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any)?.options || {};
  return Number(options.id || 0);
}

async function loadCourse() {
  const id = currentCourseId();
  if (!id) return;
  try {
    rawCourse.value = await request<any>(`/public/courses/${id}`);
  } catch {
    rawCourse.value = null;
  }
}

function goBack() { uni.navigateBack(); }
function showMore() {
  uni.showActionSheet({
    itemList: ["查看课程详情", "反馈问题"],
    success(result) {
      if (result.tapIndex === 0) uni.navigateTo({ url: withTenantCode(`/pages/course/detail?id=${currentCourseId() || 1}`) });
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
</style>
