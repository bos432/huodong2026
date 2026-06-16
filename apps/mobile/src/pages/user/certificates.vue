<template>
  <view class="container">
    <view class="custom-nav"><view class="nav-back" @click="goBack">‹ 返回</view><text class="title-md" style="flex:1; text-align:center;">我的证书</text></view>
    <view v-for="c in certificates" :key="c.id" class="card certificate-card">
      <view class="cert-badge">🏅</view>
      <text style="font-size:32rpx; font-weight:700; color:#C43D3D;">{{ c.name }}</text>
      <text class="subtle" style="margin-top:8rpx;">{{ c.date }}</text>
    </view>
    <empty-state v-if="!certificates.length" icon="🏅" text="暂无证书" />
  </view>
</template>
<script setup lang="ts">
const certificates:any[] = [];
function goBack() { uni.navigateBack(); }
</script>
<style scoped>
.custom-nav { display:flex; align-items:center; padding:16rpx 0; }
.nav-back { font-size:28rpx; color:#4A6B8A; }
.certificate-card { text-align:center; padding:40rpx; }
.cert-badge { font-size:80rpx; margin-bottom:16rpx; }
</style>
