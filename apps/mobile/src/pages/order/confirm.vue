<template>
  <view class="container">
    <view class="custom-nav"><view class="nav-back" @click="goBack">‹ 返回</view><text class="title-md" style="flex:1; text-align:center;">确认订单</text></view>

    <view v-if="loading" class="card subtle">加载中...</view>
    <view v-else-if="error" class="card state-card">
      <view>{{ error }}</view>
      <view class="button secondary retry-button" @click="loadCourse">重试</view>
    </view>

    <template v-else-if="course">
      <view class="card" style="margin-top:24rpx;">
        <view class="row" style="justify-content:flex-start; gap:16rpx;">
          <view class="course-cover">
            <image v-if="course.coverUrl" class="course-cover-img" :src="course.coverUrl" mode="aspectFill" />
            <text v-else style="font-size:48rpx;">📚</text>
          </view>
          <view>
            <text style="font-size:30rpx; font-weight:600; color:#333; display:block;">{{ course.title }}</text>
            <text class="price" style="font-size:36rpx;">{{ priceText(course.price) }}</text>
          </view>
        </view>
      </view>

      <view v-if="Number(course.price) > 0" class="card" style="margin-top:16rpx;">
        <text class="title-md" style="margin-bottom:16rpx; display:block;">支付方式</text>
        <view v-for="(pm, i) in paymentMethods" :key="i" class="payment-option" @click="selectedPayment = i">
          <text style="font-size:32rpx;">{{ pm.icon }}</text>
          <text style="flex:1; font-size:28rpx; color:#333;">{{ pm.label }}</text>
          <view class="radio" :class="{ checked: selectedPayment === i }">{{ selectedPayment === i ? "✓" : "" }}</view>
        </view>
      </view>

      <view class="card">
        <view class="row"><text class="subtle">小计</text><text class="price">{{ priceText(course.price) }}</text></view>
      </view>

      <view class="bottom-actions">
        <view class="button block button-lg" :class="{ disabled: paying }" @click="doPay">{{ paying ? "处理中..." : `确认支付 ${priceText(course.price)}` }}</view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ensureUser, request, withTenantCode } from "../../api";

const selectedPayment = ref(0);
const loading = ref(true);
const paying = ref(false);
const error = ref("");
const course = ref<any>();
const paymentMethods = [
  { icon: "💳", label: "微信支付", value: "wechat" },
  { icon: "💰", label: "余额支付", value: "balance" }
];

function currentCourseId() {
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any)?.options || {};
  return Number(options.id || 0);
}

async function loadCourse() {
  loading.value = true;
  error.value = "";
  try {
    const id = currentCourseId();
    if (!id) throw new Error("缺少课程ID");
    const data = await request<any>(`/public/courses/${id}`);
    if (!data) throw new Error("课程不存在或未发布");
    course.value = data;
  } catch (err: any) {
    error.value = err.message || "订单加载失败";
  } finally {
    loading.value = false;
  }
}

function priceText(value: number | string) {
  const price = Number(value || 0);
  return price > 0 ? `¥${price.toFixed(2)}` : "免费";
}

function goBack() { uni.navigateBack(); }
async function doPay() {
  if (!course.value) return;
  if (paying.value) return;
  paying.value = true;
  try {
    await ensureUser();
    const paymentMethod = Number(course.value.price) > 0 ? paymentMethods[selectedPayment.value]?.value || "wechat" : undefined;
    const result = await request<any>(`/public/courses/${course.value.id}/orders`, {
      method: "POST",
      data: { paymentMethod }
    });
    if (result?.owned && !result?.order) {
      uni.navigateTo({ url: withTenantCode(`/pages/order/payment?status=success&id=${course.value.id}`) });
      return;
    }
    const order = result?.order;
    if (!order?.id) throw new Error("课程订单创建失败");
    if (Number(order.amount || 0) <= 0 || order.status === "paid") {
      uni.navigateTo({ url: withTenantCode(`/pages/order/payment?status=success&id=${course.value.id}&orderId=${order.id}`) });
      return;
    }
    await request(`/public/course-orders/${order.id}/pay/mock`, {
      method: "POST",
      data: { transactionNo: `H5-COURSE-${Date.now()}` }
    });
    uni.navigateTo({ url: withTenantCode(`/pages/order/payment?status=success&id=${course.value.id}&orderId=${order.id}`) });
  } catch (err: any) {
    uni.showToast({ title: err.message || "支付失败", icon: "none" });
  } finally {
    paying.value = false;
  }
}

onMounted(loadCourse);
</script>

<style scoped>
.custom-nav { display:flex; align-items:center; padding:16rpx 0; }
.nav-back { font-size:28rpx; color:#4A6B8A; }
.state-card { text-align: center; }
.retry-button { display: inline-flex; margin-top: 20rpx; min-width: 160rpx; }
.course-cover { width:160rpx; height:120rpx; background:#F5E6D3; border-radius:12rpx; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.course-cover-img { width:100%; height:100%; display:block; }
.payment-option { display:flex; align-items:center; gap:16rpx; padding:16rpx 0; border-bottom:1rpx solid #E8E0D8; }
.radio { width:36rpx; height:36rpx; border-radius:50%; border:2rpx solid #ddd; display:flex; align-items:center; justify-content:center; font-size:20rpx; color:#fff; }
.radio.checked { background:#C43D3D; border-color:#C43D3D; }
.bottom-actions { position:fixed; bottom:0; left:0; right:0; padding:16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom)); background:#fff; }
</style>
