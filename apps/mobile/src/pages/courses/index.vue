<template>
  <view class="container has-custom-nav">
    <view class="page-header">
      <text class="title-lg">全部课程</text>
    </view>

    <scroll-view class="category-tabs" scroll-x :show-scrollbar="false">
      <view
        v-for="(cat, idx) in categories"
        :key="idx"
        class="category-tab"
        :class="{ active: activeCategory === cat.key }"
        @click="activeCategory = cat.key"
      >{{ cat.label }}</view>
    </scroll-view>

    <view class="sort-bar">
      <text class="subtle">共 {{ filteredCourses.length }} 门课</text>
      <view class="sort-options">
        <text
          v-for="opt in sortOptions"
          :key="opt.key"
          class="sort-option"
          :class="{ active: activeSort === opt.key }"
          @click="activeSort = opt.key"
        >{{ opt.label }}</text>
      </view>
    </view>

    <view v-if="loading" class="card subtle">加载中...</view>
    <view v-else-if="error" class="card state-card">
      <view>{{ error }}</view>
      <view class="button secondary retry-button" @click="loadCourses">重试</view>
    </view>

    <view v-else-if="filteredCourses.length" class="course-grid">
      <view v-for="course in filteredCourses" :key="course.id" class="course-card" @click="goDetail(course)">
        <view class="course-cover" :style="{ background: course.color }">
          <image v-if="course.coverUrl" class="course-cover-img" :src="course.coverUrl" mode="aspectFill" />
          <text v-else style="font-size:64rpx;">{{ course.icon }}</text>
          <view v-if="course.tag" class="card-tag" :class="course.tag === '限时优惠' ? 'tag-warning' : 'tag-success'">{{ course.tag }}</view>
        </view>
        <view class="course-info">
          <text class="course-title">{{ course.title }}</text>
          <text class="course-teacher">by {{ course.teacher }}</text>
          <view class="row" style="justify-content:flex-start;">
            <text class="price">{{ priceText(course.price) }}</text>
            <text class="price-original" style="margin-left:8rpx;" v-if="Number(course.originalPrice) > 0">{{ priceText(course.originalPrice) }}</text>
          </view>
          <text class="course-rating">⭐ {{ course.rating }}</text>
        </view>
      </view>
    </view>
    <empty-state v-else icon="📚" text="暂无课程，请先在后台新增并发布课程" />

    <view style="height:120rpx;"></view>
    <TabBar current="courses" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { withTenantCode } from "../../api";
import { fetchPublishedCourses, priceText } from "../../course-data";
import { loadPageTheme } from "../../theme";
import TabBar from "../../components/TabBar.vue";
import EmptyState from "../../components/EmptyState.vue";

onShow(() => { loadPageTheme(); });

const categories = [
  { key: "all", label: "全部" },
  { key: "国学", label: "国学" },
  { key: "玄学", label: "玄学" },
  { key: "书法", label: "书法" },
  { key: "教育", label: "教育" },
  { key: "健康", label: "健康" },
  { key: "创业", label: "创业" },
  { key: "技能", label: "技能" }
];

const sortOptions = [
  { key: "newest", label: "最新" },
  { key: "hottest", label: "最热" },
  { key: "price", label: "价格低→高" }
];

const activeCategory = ref("all");
const activeSort = ref("newest");
const loading = ref(true);
const error = ref("");
const allCourses = ref<any[]>([]);

async function loadCourses() {
  loading.value = true;
  error.value = "";
  try {
    allCourses.value = await fetchPublishedCourses();
  } catch (err: any) {
    error.value = err.message || "课程加载失败";
  } finally {
    loading.value = false;
  }
}

const filteredCourses = computed(() => {
  let list = activeCategory.value === "all"
    ? allCourses.value
    : allCourses.value.filter((course) => course.category === activeCategory.value);

  if (activeSort.value === "newest") list = [...list].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  else if (activeSort.value === "hottest") list = [...list].sort((a, b) => b.hot - a.hot);
  else if (activeSort.value === "price") list = [...list].sort((a, b) => Number(a.price) - Number(b.price));

  return list;
});

function goDetail(course: any) {
  uni.navigateTo({ url: withTenantCode(`/pages/course/detail?id=${course.id}`) });
}

onMounted(loadCourses);
</script>

<style scoped>
.page-header { padding: 20rpx 0 16rpx; }
.category-tabs {
  white-space: nowrap;
  overflow-x: auto;
  margin-bottom: 16rpx;
}
.category-tabs::-webkit-scrollbar { display:none; }
.category-tab {
  display: inline-block;
  padding: 12rpx 24rpx;
  font-size: 28rpx;
  color: #666;
  margin-right: 16rpx;
}
.category-tab.active {
  color: #C43D3D;
  font-weight: 600;
  border-bottom: 4rpx solid #C43D3D;
}
.sort-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 0 16rpx;
}
.sort-options { display: flex; gap: 16rpx; }
.sort-option { font-size: 24rpx; color: #999; }
.sort-option.active { color: #C43D3D; }
.state-card { text-align: center; }
.retry-button { display: inline-flex; margin-top: 20rpx; min-width: 160rpx; }
.course-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
.course-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}
.course-cover {
  width: 100%;
  height: 200rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.course-cover-img { width: 100%; height: 100%; display: block; }
.card-tag {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  padding: 6rpx 14rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}
.course-info { padding: 16rpx; }
.course-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.course-teacher { font-size: 24rpx; color: #999; display: block; margin: 4rpx 0; }
.course-rating { font-size: 22rpx; color: #FF9F00; }
</style>
