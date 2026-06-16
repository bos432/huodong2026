<template>
  <view class="container" style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh;">
    <text style="font-size:120rpx; margin-bottom:32rpx;">{{ isSuccess ? '🎉' : '😢' }}</text>
    <text class="title-xl" style="margin-bottom:16rpx;">{{ isSuccess ? '支付成功' : '支付失败' }}</text>
    <text class="body-text" style="margin-bottom:48rpx;">{{ isSuccess ? '恭喜您获得课程学习权限' : '请稍后重试或联系客服' }}</text>
    <view class="button block" style="margin-bottom:16rpx;" @click="goCourse">{{ isSuccess ? '去学习' : '重新支付' }}</view>
    <view class="button secondary block" @click="goBack">返回课程</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
const isSuccess = ref(true);
onLoad((query) => { if (query?.status === "fail") isSuccess.value = false; });
function goCourse() { uni.navigateTo({ url:"/pages/course/detail?id=1" }); }
function goBack() { uni.navigateBack(); }
</script>
