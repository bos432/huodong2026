<template>
  <view class="container">
    <view class="custom-nav"><view class="nav-back" @click="goBack">‹ 返回</view><text class="title-md" style="flex:1; text-align:center;">确认订单</text></view>
    <view class="card" style="margin-top:24rpx;">
      <view class="row" style="justify-content:flex-start; gap:16rpx;">
        <view style="width:160rpx; height:120rpx; background:#F5E6D3; border-radius:12rpx; display:flex; align-items:center; justify-content:center;"><text style="font-size:48rpx;">📜</text></view>
        <view><text style="font-size:30rpx; font-weight:600; color:#333; display:block;">国学入门七讲</text><text class="price" style="font-size:36rpx;">¥0.00</text></view>
      </view>
    </view>

    <view class="card" style="margin-top:16rpx;">
      <text class="title-md" style="margin-bottom:16rpx; display:block;">支付方式</text>
      <view v-for="(pm, i) in paymentMethods" :key="i" class="payment-option" @click="selectedPayment = i">
        <text style="font-size:32rpx;">{{ pm.icon }}</text>
        <text style="flex:1; font-size:28rpx; color:#333;">{{ pm.label }}</text>
        <view class="radio" :class="{ checked: selectedPayment === i }">{{ selectedPayment === i ? '✓' : '' }}</view>
      </view>
    </view>

    <view class="card">
      <view class="row"><text class="subtle">小计</text><text class="price">¥0.00</text></view>
    </view>

    <view class="bottom-actions">
      <view class="button block button-lg" @click="doPay">确认支付 ¥0.00</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
const selectedPayment = ref(0);
const paymentMethods = [
  { icon:"💳", label:"微信支付" },
  { icon:"💰", label:"余额支付" }
];
function goBack() { uni.navigateBack(); }
function doPay() { uni.navigateTo({ url:"/pages/order/payment?status=success" }); }
</script>
<style scoped>
.custom-nav { display:flex; align-items:center; padding:16rpx 0; }
.nav-back { font-size:28rpx; color:#4A6B8A; }
.payment-option { display:flex; align-items:center; gap:16rpx; padding:16rpx 0; border-bottom:1rpx solid #E8E0D8; }
.radio { width:36rpx; height:36rpx; border-radius:50%; border:2rpx solid #ddd; display:flex; align-items:center; justify-content:center; font-size:20rpx; color:#fff; }
.radio.checked { background:#C43D3D; border-color:#C43D3D; }
.bottom-actions { position:fixed; bottom:0; left:0; right:0; padding:16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom)); background:#fff; }
</style>
