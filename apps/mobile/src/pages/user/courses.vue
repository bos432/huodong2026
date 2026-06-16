<template>
  <view class="container">
    <view class="custom-nav"><view class="nav-back" @click="goBack">‹ 返回</view><text class="title-md" style="flex:1; text-align:center;">我的课程</text></view>
    <view class="my-tabs">
      <view v-for="t in tabs" :key="t.key" class="my-tab" :class="{active:activeTab===t.key}" @click="activeTab=t.key">{{ t.label }}</view>
    </view>
    <view v-for="c in courses" :key="c.id" class="card my-course-item" @click="goCourse(c)">
      <view class="row" style="justify-content:flex-start; gap:16rpx;">
        <view style="width:180rpx; height:120rpx; background:#F5E6D3; border-radius:12rpx; display:flex; align-items:center; justify-content:center;"><text style="font-size:48rpx;">{{ c.icon }}</text></view>
        <view style="flex:1;">
          <text style="font-size:28rpx; font-weight:600; color:#333; display:block;">{{ c.title }}</text>
          <view class="progress-bar" style="margin-top:8rpx;"><view class="progress-fill" :style="{width:c.progress+'%'}"></view></view>
          <text class="subtle" style="margin-top:4rpx;">{{ c.progress }}%</text>
        </view>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from "vue";
const activeTab = ref("all");
const tabs = [{key:"all",label:"全部"},{key:"ongoing",label:"进行中"},{key:"done",label:"已完成"}];
const courses = [
  { id:1, title:"国学入门七讲", icon:"📜", progress:35 },
  { id:2, title:"论语精讲100讲", title2:"论语精讲100讲", icon:"📚", progress:12 }
];
function goBack() { uni.navigateBack(); }
function goCourse(c:any) { uni.navigateTo({ url:"/pages/course/detail?id="+c.id }); }
</script>
<style scoped>
.custom-nav { display:flex; align-items:center; padding:16rpx 0; }
.nav-back { font-size:28rpx; color:#4A6B8A; }
.my-tabs { display:flex; gap:0; margin-bottom:16rpx; border-bottom:2rpx solid #E8E0D8; }
.my-tab { flex:1; text-align:center; padding:16rpx; font-size:28rpx; color:#666; }
.my-tab.active { color:#C43D3D; font-weight:600; border-bottom:4rpx solid #C43D3D; }
.my-course-item { margin-bottom:12rpx; }
</style>
