<template>
  <view class="container">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">‹ 返回</view>
      <text class="nav-title" style="font-size:28rpx; color:#333; flex:1; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">国学入门七讲</text>
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
      <text class="title-md">第1章 · 国学入门</text>
      <text class="body-text" style="margin-top:4rpx;">1.1 学而时习之</text>
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
import { ref } from "vue";
const showCatalog = ref(false);
const chapters = [
  { title:"第一章：国学是什么", lessons:[
    { title:"1.1 学而时习之", duration:"15:00", isFree:true },
    { title:"1.2 国学的发展历程", duration:"20:00", isFree:true },
    { title:"1.3 为什么今天还要学国学", duration:"18:00", isFree:false }
  ]},
  { title:"第二章：四书精要", lessons:[
    { title:"2.1 《大学》之道", duration:"25:00", isFree:false },
    { title:"2.2 《中庸》之理", duration:"22:00", isFree:false }
  ]}
];
function goBack() { uni.navigateBack(); }
function showMore() { /* placeholder */ }
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
