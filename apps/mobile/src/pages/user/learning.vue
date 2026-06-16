<template>
  <view class="container">
    <view class="custom-nav"><view class="nav-back" @click="goBack">‹ 返回</view><text class="title-md" style="flex:1; text-align:center;">学习记录</text></view>
    <view v-for="r in records" :key="r.id" class="card" style="margin-bottom:12rpx;">
      <view class="row" style="justify-content:flex-start; gap:16rpx;">
        <view style="width:120rpx; height:80rpx; background:#F5E6D3; border-radius:12rpx; display:flex; align-items:center; justify-content:center;"><text style="font-size:36rpx;">{{ r.icon }}</text></view>
        <view><text style="font-size:28rpx; font-weight:600; color:#333;">{{ r.title }}</text><text class="subtle" style="display:block;">{{ r.time }}</text><text class="subtle">学习 {{ r.duration }}</text></view>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
const records = [
  { id:1, title:"1.1 学而时习之", icon:"📜", time:"2026-06-16 14:23", duration:"15分钟" },
  { id:2, title:"1.2 国学的发展历程", icon:"📜", time:"2026-06-15 10:05", duration:"20分钟" }
];
function goBack() { uni.navigateBack(); }
</script>
<style scoped>
.custom-nav { display:flex; align-items:center; padding:16rpx 0; }
.nav-back { font-size:28rpx; color:#4A6B8A; }
</style>
