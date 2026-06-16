<template>
  <view class="container">
    <view class="custom-nav"><view class="nav-back" @click="goBack">‹ 返回</view></view>
    <view class="activity-cover"><text style="font-size:80rpx;">📅</text></view>
    <view class="activity-detail-info">
      <text class="title-xl">线上共读会：《论语》精读</text>
      <view class="activity-row">🕐 2026-07-15 19:30-21:00</view>
      <view class="activity-row">📍 线上·腾讯会议</view>
      <view class="activity-row">👥 已报名 128 人</view>
      <view class="activity-row">🏢 主办：七维书院</view>
    </view>
    <view class="card" style="margin-top:16rpx;">
      <text class="title-md" style="margin-bottom:12rpx; display:block;">活动详情</text>
      <text class="body-text" style="white-space:pre-line;">本期共读《论语·学而篇》，由张明远老师领读。\n\n流程安排：\n1. 静心开场（5分钟）\n2. 原文诵读（15分钟）\n3. 老师讲解（40分钟）\n4. 讨论交流（30分钟）\n\n请提前预习学而篇全文。</text>
    </view>
    <view class="bottom-actions"><view class="button block button-lg" @click="register">立即报名</view></view>
  </view>
</template>
<script setup lang="ts">
function goBack() { uni.navigateBack(); }
function register() { /* placeholder */ }
</script>
<style scoped>
.custom-nav { padding:16rpx 0; }
.nav-back { font-size:28rpx; color:#4A6B8A; }
.activity-cover { width:100%; height:360rpx; background:#E8E0D8; border-radius:20rpx; display:flex; align-items:center; justify-content:center; margin-bottom:24rpx; }
.activity-detail-info { margin-bottom:16rpx; }
.activity-row { font-size:26rpx; color:#666; margin-top:8rpx; }
.bottom-actions { position:fixed; bottom:0; left:0; right:0; padding:16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom)); background:#fff; }
</style>
