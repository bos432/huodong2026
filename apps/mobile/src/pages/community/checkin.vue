<template>
  <view class="container">
    <view class="custom-nav"><view class="nav-back" @click="goBack">‹ 返回</view><text class="title-md" style="flex:1; text-align:center;">今日打卡</text></view>
    <view class="checkin-card" style="margin-top:24rpx;">
      <text class="subtle" style="display:block; text-align:center; margin-bottom:16rpx;">2026年6月17日 星期二</text>
      <text class="title-lg" style="text-align:center; display:block;">📝 今日任务</text>
      <text class="body-text" style="text-align:center; margin:16rpx 0;">抄写《道德经》第一章</text>
      <view v-if="!checkedIn" class="button block button-lg" @click="doCheckin">点击打卡</view>
      <view v-else class="button block button-lg disabled" style="background:#07C160;">✓ 已完成</view>
      <text class="subtle" style="display:block; text-align:center; margin-top:16rpx;">🔥 已连续打卡 7 天</text>
    </view>

    <!-- 打卡日历 -->
    <view class="card" style="margin-top:24rpx;">
      <text class="title-md" style="margin-bottom:16rpx; display:block;">六月打卡</text>
      <view class="calendar-grid">
        <text v-for="(d, i) in 30" :key="i" class="calendar-day"
          :class="{ active: d <= currentDay && checkedDays.includes(d) }"
        >{{ d }}</text>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
const checkedIn = ref(false);
const currentDay = ref(17);
const checkedDays = ref([1,3,5,7,8,10,12,15,16,17]);
function goBack() { uni.navigateBack(); }
function doCheckin() {
  checkedIn.value = true;
  if (!checkedDays.value.includes(currentDay.value)) checkedDays.value.push(currentDay.value);
  uni.showToast({ title:"🎉 打卡成功！坚持就是胜利", icon:"none", duration:2000 });
}
</script>
<style scoped>
.custom-nav { display:flex; align-items:center; padding:16rpx 0; }
.nav-back { font-size:28rpx; color:#4A6B8A; }
.checkin-card { background:#fff; border-radius:20rpx; padding:40rpx; box-shadow:0 4rpx 20rpx rgba(0,0,0,0.04); }
.calendar-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:8rpx; }
.calendar-day { text-align:center; padding:12rpx; font-size:26rpx; color:#666; border-radius:8rpx; }
.calendar-day.active { background:#C43D3D; color:#fff; }
</style>
