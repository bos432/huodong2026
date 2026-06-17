<template>
  <view class="container">
    <view class="search-bar">
      <view class="search-input-wrap">
        <text style="font-size:28rpx; margin-right:12rpx;">🔍</text>
        <input class="search-input" v-model="keyword" placeholder="搜索课程、讲师..." confirm-type="search" @confirm="doSearch" />
      </view>
      <text class="search-cancel" @click="goBack">取消</text>
    </view>

    <view v-if="!keyword">
      <view class="section-title"><text class="title-md">🔥 热门搜索</text></view>
      <view class="tags-cloud">
        <text v-for="tag in hotTags" :key="tag" class="tag tag-secondary" style="margin:8rpx;" @click="keyword=tag">{{ tag }}</text>
      </view>
      <view class="section-title" style="margin-top:32rpx;"><text class="title-md">🕐 搜索历史</text></view>
      <view class="tags-cloud">
        <text v-for="(h, i) in history" :key="i" class="tag" style="background:#E8E0D8; color:#666; margin:8rpx;" @click="keyword=h">{{ h }}</text>
      </view>
      <text v-if="history.length" class="subtle" style="display:block; text-align:center; margin-top:24rpx;" @click="history=[]">清空搜索历史</text>
    </view>

    <view v-else>
      <text class="subtle" style="display:block; margin-bottom:16rpx;">搜索 "{{ keyword }}" 共 {{ results.length }} 个结果</text>
      <view v-for="(r, i) in results" :key="i" class="card search-result-item" @click="goCourse(r)">
        <view class="row" style="justify-content:flex-start; gap:16rpx;">
          <view class="result-cover" :style="{ background: r.color }">
            <text style="font-size:40rpx;">{{ r.icon }}</text>
          </view>
          <view style="flex:1;">
            <text style="font-size:28rpx; font-weight:600; color:#333; display:block;">{{ r.title }}</text>
            <text class="subtle">by {{ r.teacher }}</text>
            <text class="price" style="font-size:28rpx;">{{ priceText(r.price) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { withTenantCode } from "../../api";
import { fetchPublishedCourses, priceText, type CourseCard } from "../../course-data";

const keyword = ref("");
const history = ref(["国学","书法","论语"]);
const allCourses = ref<CourseCard[]>([]);
const hotTags = computed(() => {
  const tags = allCourses.value.flatMap((course) => [course.title, course.teacher, course.category]).filter(Boolean);
  return Array.from(new Set(tags)).slice(0, 8);
});
const results = computed(() => {
  const word = keyword.value.trim().toLowerCase();
  if (!word) return [];
  return allCourses.value.filter((course) =>
    course.title.toLowerCase().includes(word) ||
    course.teacher.toLowerCase().includes(word) ||
    course.category.toLowerCase().includes(word)
  );
});

async function loadCourses() {
  try {
    allCourses.value = await fetchPublishedCourses();
  } catch {
    allCourses.value = [];
  }
}

function doSearch() { if (keyword.value && !history.value.includes(keyword.value)) history.value.unshift(keyword.value); }
function goBack() { uni.navigateBack(); }
function goCourse(r:any) { uni.navigateTo({ url: withTenantCode("/pages/course/detail?id="+r.id) }); }

onMounted(loadCourses);
</script>
<style scoped>
.search-bar { display:flex; align-items:center; gap:16rpx; padding:16rpx 0; }
.search-input-wrap { flex:1; display:flex; align-items:center; background:#F5F0E8; border-radius:40rpx; padding:0 24rpx; height:80rpx; }
.search-input { flex:1; height:80rpx; font-size:28rpx; }
.search-cancel { font-size:28rpx; color:#4A6B8A; }
.section-title { margin:24rpx 0 16rpx; }
.tags-cloud { display:flex; flex-wrap:wrap; gap:8rpx; }
.search-result-item { margin-bottom:12rpx; }
.result-cover { width:160rpx; height:100rpx; border-radius:12rpx; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
</style>
