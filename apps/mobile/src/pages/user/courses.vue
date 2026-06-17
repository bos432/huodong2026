<template>
  <view class="container">
    <view class="custom-nav"><view class="nav-back" @click="goBack">‹ 返回</view><text class="title-md" style="flex:1; text-align:center;">我的课程</text></view>
    <view class="my-tabs">
      <view v-for="t in tabs" :key="t.key" class="my-tab" :class="{active:activeTab===t.key}" @click="activeTab=t.key">{{ t.label }}</view>
    </view>
    <view v-for="c in visibleCourses" :key="c.id" class="card my-course-item" @click="goCourse(c)">
      <view class="row" style="justify-content:flex-start; gap:16rpx;">
        <view style="width:180rpx; height:120rpx; border-radius:12rpx; display:flex; align-items:center; justify-content:center; overflow:hidden;" :style="{ background: c.color }">
          <image v-if="c.coverUrl" :src="c.coverUrl" mode="aspectFill" style="width:100%;height:100%;" />
          <text v-else style="font-size:48rpx;">{{ c.icon }}</text>
        </view>
        <view style="flex:1;">
          <text style="font-size:28rpx; font-weight:600; color:#333; display:block;">{{ c.title }}</text>
          <view class="progress-bar" style="margin-top:8rpx;"><view class="progress-fill" :style="{width:c.progress+'%'}"></view></view>
          <text class="subtle" style="margin-top:4rpx;">{{ c.progress }}%</text>
        </view>
      </view>
    </view>
    <empty-state v-if="!visibleCourses.length" icon="📖" text="暂无学习中的课程" />
  </view>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ensureUser, request, withTenantCode } from "../../api";
import { normalizeCourse, type CourseCard } from "../../course-data";

const activeTab = ref("all");
const tabs = [{key:"all",label:"全部"},{key:"ongoing",label:"进行中"},{key:"done",label:"已完成"}];
const courses = ref<CourseCard[]>([]);
const visibleCourses = computed(() => courses.value.filter((course) => {
  if (activeTab.value === "ongoing") return Number(course.progress || 0) < 100;
  if (activeTab.value === "done") return Number(course.progress || 0) >= 100;
  return true;
}));

async function loadCourses() {
  try {
    await ensureUser();
    const rows = await request<any[]>("/public/me/courses");
    courses.value = (Array.isArray(rows) ? rows : []).map((row, index) => ({
      ...normalizeCourse(row, index),
      progress: Number(row.learning?.progress || 0)
    }));
  } catch {
    courses.value = [];
  }
}

function goBack() { uni.navigateBack(); }
function goCourse(c:any) { uni.navigateTo({ url: withTenantCode("/pages/course/detail?id="+c.id) }); }

onMounted(loadCourses);
</script>
<style scoped>
.custom-nav { display:flex; align-items:center; padding:16rpx 0; }
.nav-back { font-size:28rpx; color:#4A6B8A; }
.my-tabs { display:flex; gap:0; margin-bottom:16rpx; border-bottom:2rpx solid #E8E0D8; }
.my-tab { flex:1; text-align:center; padding:16rpx; font-size:28rpx; color:#666; }
.my-tab.active { color:#C43D3D; font-weight:600; border-bottom:4rpx solid #C43D3D; }
.my-course-item { margin-bottom:12rpx; }
</style>
