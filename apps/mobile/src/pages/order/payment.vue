<template>
  <view class="container payment-result-page">
    <view class="result-card" :class="statusClass">
      <view class="result-kicker">{{ statusKicker }}</view>
      <view class="result-icon">{{ iconText }}</view>
      <text class="result-title">{{ titleText }}</text>
      <text class="result-body">{{ bodyText }}</text>
      <view v-if="orderId" class="order-line">
        <text class="order-label">订单编号</text>
        <text class="order-value">#{{ orderId }}</text>
      </view>
      <view class="action-stack">
        <view class="button block primary-action" @click="goPrimary">{{ primaryText }}</view>
        <view class="button secondary block secondary-action" @click="goBack">返回课程</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { withTenantCode } from "../../api";
const isSuccess = ref(true);
const isPending = ref(false);
const accessMode = ref<"paid" | "free">("paid");
const courseId = ref(0);
const orderId = ref(0);
onLoad((query) => {
  if (query?.status === "fail") isSuccess.value = false;
  if (query?.status === "pending") {
    isSuccess.value = false;
    isPending.value = true;
  }
  if (query?.mode === "free") accessMode.value = "free";
  courseId.value = Number(query?.id || 0);
  orderId.value = Number(query?.orderId || 0);
});
const iconText = computed(() => isSuccess.value ? "🎉" : isPending.value ? "⏳" : "😢");
const statusClass = computed(() => isSuccess.value ? "is-success" : isPending.value ? "is-pending" : "is-fail");
const statusKicker = computed(() => {
  if (isSuccess.value) return accessMode.value === "free" ? "课程已加入" : "课程已开通";
  return isPending.value ? "线下付款待确认" : "订单未完成";
});
const titleText = computed(() => {
  if (isSuccess.value) return accessMode.value === "free" ? "加入成功" : "支付成功";
  return isPending.value ? "等待确认收款" : "支付失败";
});
const bodyText = computed(() => {
  if (isSuccess.value) return accessMode.value === "free" ? "课程已加入，可直接开始学习" : "恭喜您获得课程学习权限";
  if (isPending.value) return "课程订单已提交，当前不会自动开通学习权限。请联系运营方完成线下付款，后台确认收款后再学习。";
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

<style scoped>
.payment-result-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 50% 10%, rgba(184, 68, 53, 0.12), transparent 36%),
    linear-gradient(180deg, #f7efe3 0%, #fbf7ef 42%, #f1e8da 100%);
}

.result-card {
  width: 100%;
  padding: 48rpx 34rpx 36rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.62);
  border-radius: 30rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 18rpx 48rpx rgba(72, 55, 38, 0.12);
  text-align: center;
}

.result-card.is-success {
  border-color: rgba(76, 130, 105, 0.35);
}

.result-card.is-pending {
  border-color: rgba(190, 131, 53, 0.35);
}

.result-card.is-fail {
  border-color: rgba(184, 68, 53, 0.35);
}

.result-kicker {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: #f4e8d8;
  color: #8a5c34;
  font-size: 23rpx;
  font-weight: 700;
}

.is-success .result-kicker {
  background: #e4f0e7;
  color: #3f745b;
}

.is-pending .result-kicker {
  background: #fff1d9;
  color: #9b611f;
}

.is-fail .result-kicker {
  background: #fbe3df;
  color: #a94739;
}

.result-icon {
  margin-top: 34rpx;
  font-size: 112rpx;
  line-height: 1;
}

.result-title {
  display: block;
  margin-top: 28rpx;
  color: #263d3c;
  font-size: 42rpx;
  font-weight: 800;
  line-height: 1.3;
}

.result-body {
  display: block;
  margin: 18rpx auto 0;
  max-width: 560rpx;
  color: #7f7467;
  font-size: 27rpx;
  line-height: 1.75;
}

.order-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-top: 30rpx;
  padding: 20rpx 22rpx;
  border-radius: 18rpx;
  background: #f7efe4;
}

.order-label {
  color: #8b7d6e;
  font-size: 25rpx;
}

.order-value {
  color: #263d3c;
  font-size: 26rpx;
  font-weight: 800;
}

.action-stack {
  margin-top: 44rpx;
}

.primary-action {
  margin-bottom: 16rpx;
}

.secondary-action {
  border-color: rgba(74, 107, 138, 0.28);
}
</style>
