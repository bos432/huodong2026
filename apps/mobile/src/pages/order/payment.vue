<template>
  <view class="container" style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh;">
    <text style="font-size:120rpx; margin-bottom:32rpx;">{{ iconText }}</text>
    <text class="title-xl" style="margin-bottom:16rpx;">{{ titleText }}</text>
    <text class="body-text" style="margin-bottom:48rpx; text-align:center;">{{ bodyText }}</text>
    <view class="button block" style="margin-bottom:16rpx;" @click="goPrimary">{{ primaryText }}</view>
    <view class="button secondary block" @click="goBack">返回课程</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { withTenantCode } from "../../api";
const isSuccess = ref(true);
const isPending = ref(false);
const courseId = ref(0);
const orderId = ref(0);
onLoad((query) => {
  if (query?.status === "fail") isSuccess.value = false;
  if (query?.status === "pending") {
    isSuccess.value = false;
    isPending.value = true;
  }
  courseId.value = Number(query?.id || 0);
  orderId.value = Number(query?.orderId || 0);
});
const iconText = computed(() => isSuccess.value ? "🎉" : isPending.value ? "⏳" : "😢");
const titleText = computed(() => isSuccess.value ? "支付成功" : isPending.value ? "等待确认收款" : "支付失败");
const bodyText = computed(() => {
  if (isSuccess.value) return "恭喜您获得课程学习权限";
  if (isPending.value) return "课程订单已提交，当前不会自动开通学习权限。请联系书院完成线下付款，后台确认收款后再学习。";
  return "请稍后重试或联系客服";
});
const primaryText = computed(() => isSuccess.value ? "去学习" : isPending.value ? "返回课程" : "重新支付");
function goPrimary() {
  if (isSuccess.value) uni.navigateTo({ url: withTenantCode(`/pages/course/player?id=${courseId.value || 1}`) });
  else if (isPending.value) uni.navigateTo({ url: withTenantCode(`/pages/course/detail?id=${courseId.value || 1}`) });
  else uni.navigateTo({ url: withTenantCode(`/pages/order/confirm?id=${courseId.value || 1}&orderId=${orderId.value || ""}`) });
}
function goBack() { uni.navigateBack(); }
</script>
