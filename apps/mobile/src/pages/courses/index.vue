<template>
  <view class="container has-custom-nav">
    <view class="page-header">
      <text class="title-lg">全部课程</text>
    </view>

    <!-- 分类 Tab -->
    <scroll-view class="category-tabs" scroll-x :show-scrollbar="false">
      <view
        v-for="(cat, idx) in categories"
        :key="idx"
        class="category-tab"
        :class="{ active: activeCategory === cat.key }"
        @click="activeCategory = cat.key"
      >{{ cat.label }}</view>
    </scroll-view>

    <!-- 排序 -->
    <view class="sort-bar">
      <text class="subtle">共 {{ filteredCourses.length }} 门课</text>
      <view class="sort-options">
        <text v-for="opt in sortOptions" :key="opt.key"
          class="sort-option"
          :class="{ active: activeSort === opt.key }"
          @click="activeSort = opt.key"
        >{{ opt.label }}</text>
      </view>
    </view>

    <!-- 课程网格 -->
    <view v-if="filteredCourses.length" class="course-grid">
      <view v-for="course in filteredCourses" :key="course.id" class="course-card" @click="goDetail(course)">
        <view class="course-cover" :style="{ background: course.color }">
          <text style="font-size:64rpx;">{{ course.icon }}</text>
          <view v-if="course.tag" class="card-tag" :class="course.tag === '限时优惠' ? 'tag-warning' : 'tag-success'">{{ course.tag }}</view>
        </view>
        <view class="course-info">
          <text class="course-title">{{ course.title }}</text>
          <text class="course-teacher">by {{ course.teacher }}</text>
          <view class="row" style="justify-content:flex-start;">
            <text class="price">¥{{ course.price }}</text>
            <text class="price-original" style="margin-left:8rpx;" v-if="course.originalPrice">¥{{ course.originalPrice }}</text>
          </view>
          <text class="course-rating">⭐ {{ course.rating }}</text>
        </view>
      </view>
    </view>
    <empty-state v-else icon="📚" text="暂无课程，敬请期待" />

    <view style="height:120rpx;"></view>
    <TabBar current="courses" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
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

const allCourses = [
  { id:1, title:"国学入门七讲", teacher:"张明远", price:"0", originalPrice:"199", icon:"📜", color:"#F5E6D3", category:"国学", rating:"4.9", tag:"限时免费", hot:120 },
  { id:2, title:"论语精讲100讲", teacher:"张明远", price:"399", originalPrice:"599", icon:"📚", color:"#F5E6D3", category:"国学", rating:"4.8", tag:"", hot:89 },
  { id:3, title:"道德经导读", teacher:"王守拙", price:"199", originalPrice:"299", icon:"☯", color:"#DCE8E0", category:"玄学", rating:"4.7", tag:"", hot:95 },
  { id:4, title:"易经入门", teacher:"周易明", price:"299", originalPrice:"499", icon:"☯", color:"#DCE8E0", category:"玄学", rating:"4.8", tag:"限时优惠", hot:76 },
  { id:5, title:"楷书入门到精通", teacher:"李墨白", price:"599", originalPrice:"899", icon:"🖌", color:"#E8E0D8", category:"书法", rating:"4.9", tag:"", hot:110 },
  { id:6, title:"行书艺术鉴赏", teacher:"李墨白", price:"399", originalPrice:"599", icon:"🖌", color:"#E8E0D8", category:"书法", rating:"4.6", tag:"", hot:45 },
  { id:7, title:"家庭教育智慧", teacher:"王慧心", price:"199", originalPrice:"299", icon:"🏠", color:"#E0DCE8", category:"教育", rating:"4.7", tag:"", hot:67 },
  { id:8, title:"亲子共读指南", teacher:"刘念慈", price:"99", originalPrice:"199", icon:"👶", color:"#E0DCE8", category:"教育", rating:"4.5", tag:"", hot:34 },
  { id:9, title:"静坐入门", teacher:"刘静修", price:"99", originalPrice:"199", icon:"🧘", color:"#E0DCE8", category:"健康", rating:"4.4", tag:"", hot:52 },
  { id:10, title:"中医养生基础", teacher:"孙思邈", price:"299", originalPrice:"499", icon:"🌿", color:"#DCE8E0", category:"健康", rating:"4.8", tag:"限时优惠", hot:88 },
  { id:11, title:"创业者的国学课", teacher:"陈知行", price:"499", originalPrice:"799", icon:"⛰", color:"#F0E8E0", category:"创业", rating:"4.6", tag:"", hot:43 },
  { id:12, title:"写作进阶训练", teacher:"李墨白", price:"299", originalPrice:"399", icon:"✍", color:"#F0E8E0", category:"技能", rating:"4.5", tag:"", hot:38 }
];

const filteredCourses = computed(() => {
  let list = activeCategory.value === "all"
    ? allCourses
    : allCourses.filter(c => c.category === activeCategory.value);

  if (activeSort.value === "newest") list = [...list].reverse();
  else if (activeSort.value === "hottest") list = [...list].sort((a,b) => b.hot - a.hot);
  else if (activeSort.value === "price") list = [...list].sort((a,b) => Number(a.price) - Number(b.price));

  return list;
});

function goDetail(course: any) {
  uni.navigateTo({ url: `/pages/course/detail?id=${course.id}` });
}
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
