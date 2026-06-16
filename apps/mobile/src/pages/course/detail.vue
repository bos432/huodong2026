<template>
  <view class="container">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">‹ 返回</view>
      <view class="nav-share" @click="share">分享</view>
    </view>

    <!-- 课程封面 -->
    <view class="course-cover-full">
      <text style="font-size:120rpx;">{{ course.icon }}</text>
      <view class="play-btn">▶</view>
    </view>

    <!-- 基本信息 -->
    <view class="course-info-section">
      <text class="title-xl">{{ course.title }}</text>
      <view class="row" style="justify-content:flex-start; gap:16rpx; margin-top:12rpx;">
        <image class="avatar-sm" src="/static/avatar1.png" mode="aspectFill" />
        <text class="body-text">{{ course.teacher }}</text>
        <view class="tag tag-secondary">讲师</view>
      </view>
      <view class="row" style="justify-content:flex-start; gap:8rpx; margin-top:8rpx;">
        <text style="color:#FF9F00; font-size:28rpx;">⭐ {{ course.rating }}（{{ course.reviewCount }}人评价）</text>
      </view>
      <view class="row" style="justify-content:flex-start; gap:16rpx; margin-top:12rpx;">
        <text class="price" style="font-size:48rpx;">¥{{ course.price }}</text>
        <text class="price-original" style="font-size:28rpx; margin-top:12rpx;" v-if="course.originalPrice > 0">¥{{ course.originalPrice }}</text>
        <view v-if="course.tag" class="tag" :class="course.tag==='限时优惠'?'tag-warning':'tag-success'">{{ course.tag }}</view>
      </view>
    </view>

    <!-- Tab: 详情 / 目录 / 评价 -->
    <view class="detail-tabs">
      <view v-for="tab in tabs" :key="tab.key"
        class="detail-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >{{ tab.label }}</view>
    </view>

    <!-- 详情 -->
    <view v-if="activeTab === 'detail'" class="card">
      <text class="body-text" style="white-space:pre-line;">{{ course.description }}</text>
    </view>

    <!-- 目录 -->
    <view v-if="activeTab === 'catalog'" class="card">
      <view v-for="(chapter, ci) in chapters" :key="ci" style="margin-bottom:16rpx;">
        <text style="font-size:28rpx; font-weight:600; color:#333;">{{ chapter.title }}</text>
        <view v-for="(lesson, li) in chapter.lessons" :key="li" class="lesson-item">
          <view class="row" style="justify-content:flex-start; gap:12rpx;">
            <text>{{ lesson.isFree ? '🔓' : '🔒' }}</text>
            <text class="body-text" style="flex:1;">{{ lesson.title }}</text>
            <text class="subtle">{{ lesson.duration }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 评价 -->
    <view v-if="activeTab === 'reviews'" class="card">
      <view v-for="(rv, ri) in reviews" :key="ri" class="review-item">
        <view class="row" style="justify-content:flex-start; gap:12rpx;">
          <image class="avatar-sm" :src="rv.avatar" mode="aspectFill" />
          <view>
            <text class="body-text" style="font-weight:600;">{{ rv.nickname }}</text>
            <text style="font-size:22rpx; color:#FF9F00;">{{ '⭐'.repeat(rv.rating) }}</text>
          </view>
        </view>
        <text class="body-text" style="margin-top:8rpx; display:block;">{{ rv.content }}</text>
        <text class="subtle" style="display:block; margin-top:4rpx;">{{ rv.time }}</text>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-actions">
      <view class="bottom-action" @click="toggleFavorite">
        <text style="font-size:36rpx;">{{ isFav ? '❤️' : '🤍' }}</text>
        <text class="subtle">收藏</text>
      </view>
      <view class="button" style="flex:1; margin-left:24rpx;" @click="buyCourse">
        {{ course.price > 0 ? '立即购买 ¥' + course.price : '免费加入' }}
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";

const activeTab = ref("detail");
const isFav = ref(false);

const tabs = [
  { key: "detail", label: "详情" },
  { key: "catalog", label: "目录" },
  { key: "reviews", label: "评价" }
];

const course = ref({
  id: 1,
  title: "国学入门七讲",
  teacher: "张明远",
  price: 0,
  originalPrice: 199,
  icon: "📜",
  rating: 4.9,
  reviewCount: 128,
  tag: "限时免费",
  description: "【课程介绍】\n从零开始，系统学习中国传统文化精髓。\n\n【适合人群】\n- 对中国传统文化感兴趣的初学者\n- 希望提升文化素养的职场人士\n- 想为孩子做国学启蒙的家长\n\n【学习目标】\n- 掌握国学基本概念和核心思想\n- 了解四书五经的主要内容和历史背景\n- 培养传统文化思维方式"
});

const chapters = [
  {
    title: "第一章：国学是什么",
    lessons: [
      { title: "1.1 国学的定义与范围", duration: "15:00", isFree: true },
      { title: "1.2 国学的发展历程", duration: "20:00", isFree: true },
      { title: "1.3 为什么今天还要学国学", duration: "18:00", isFree: true }
    ]
  },
  {
    title: "第二章：四书精要",
    lessons: [
      { title: "2.1 《大学》之道", duration: "25:00", isFree: false },
      { title: "2.2 《中庸》之理", duration: "22:00", isFree: false },
      { title: "2.3 《论语》导读", duration: "30:00", isFree: false }
    ]
  }
];

const reviews = [
  { avatar:"/static/avatar1.png", nickname:"学而时习", rating:5, content:"非常棒的入门课程，老师讲得深入浅出。", time:"3天前" },
  { avatar:"/static/avatar2.png", nickname:"书道中人", rating:4, content:"内容很扎实，就是节奏可以再慢一点。", time:"1周前" }
];

function goBack() { uni.navigateBack(); }
function share() { /* placeholder */ }
function toggleFavorite() { isFav.value = !isFav.value; }
function buyCourse() {
  if (course.value.price > 0) {
    uni.navigateTo({ url:"/pages/order/confirm?id=" + course.value.id });
  } else {
    uni.navigateTo({ url:"/pages/order/payment?status=success" });
  }
}
</script>

<style scoped>
.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
}
.nav-back, .nav-share { font-size: 28rpx; color: #4A6B8A; }
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
}
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
