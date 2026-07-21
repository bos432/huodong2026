<template>
  <view class="container order-confirm-page">
    <view class="custom-nav">
      <view class="nav-back" role="button" tabindex="0" aria-label="返回上一页" @click="goBack" @keyup.enter="goBack" @keyup.space.prevent="goBack">‹ 返回</view>
      <text class="nav-title">确认订单</text>
      <view class="nav-placeholder"></view>
    </view>

    <view v-if="loading" class="card subtle">加载中...</view>
    <view v-else-if="error" class="card state-card" role="alert" aria-live="assertive">
      <view>{{ error }}</view>
      <view class="button secondary retry-button" role="button" tabindex="0" aria-label="重新加载订单" @click="loadCourse" @keyup.enter="loadCourse" @keyup.space.prevent="loadCourse">重试</view>
    </view>

    <template v-else-if="course">
      <view class="confirm-hero">
        <view class="hero-kicker">内容订单</view>
        <view class="hero-title">确认参与权益</view>
        <view class="hero-desc">提交后将生成订单，付款完成或后台确认后开通参与权益。</view>
      </view>

      <view class="course-card">
        <view class="course-row">
          <view class="course-cover">
            <image v-if="course.coverUrl" class="course-cover-img" :src="course.coverUrl" mode="aspectFill" />
            <text v-else class="course-cover-icon">书</text>
          </view>
          <view class="course-info">
            <text class="course-title">{{ course.title }}</text>
            <text class="course-meta">专题内容 · 参与权益</text>
            <text class="course-price">{{ priceText(course.price) }}</text>
          </view>
        </view>
      </view>

      <view v-if="Number(course.price) > 0" class="section-card">
        <view class="section-title-row">
          <text class="section-title">支付方式</text>
          <text class="section-badge">安全支付</text>
        </view>
        <view class="payment-notice">在线支付成功后立即开通；线下收款需后台确认。</view>
        <view v-for="pm in availablePaymentMethods" :key="pm.value" class="payment-option" role="radio" tabindex="0" :aria-checked="selectedPayment === pm.value" :aria-label="`选择${pm.label}`" @click="selectedPayment = pm.value" @keyup.enter="selectedPayment = pm.value" @keyup.space.prevent="selectedPayment = pm.value">
          <text class="payment-icon">{{ pm.icon }}</text>
          <text class="payment-label">{{ pm.label }}</text>
          <view class="radio" :class="{ checked: selectedPayment === pm.value }">{{ selectedPayment === pm.value ? "✓" : "" }}</view>
        </view>
        <view v-if="!availablePaymentMethods.length" class="payment-notice" role="alert">当前商家暂未开放支付方式，请联系管理员。</view>
      </view>

      <view class="section-card">
        <view class="summary-row">
          <text class="summary-label">内容小计</text>
          <text class="summary-price">{{ priceText(course.price) }}</text>
        </view>
        <view class="summary-row muted-row">
          <text class="summary-label">开通方式</text>
          <text class="summary-value">{{ Number(course.price) > 0 ? "付款确认后开通" : "提交后立即开通" }}</text>
        </view>
      </view>

      <view class="bottom-actions">
        <view class="button block button-lg" role="button" tabindex="0" :aria-disabled="paying" :aria-busy="paying" :aria-label="payButtonText" :class="{ disabled: paying }" @click="doPay" @keyup.enter="doPay" @keyup.space.prevent="doPay">{{ payButtonText }}</view>
      </view>
    </template>
    <WechatPhoneBindSheet
      :visible="phoneBindVisible"
      title="提交内容订单前绑定手机号"
      message="订单、线下确认和参与权益需要手机号，授权后将继续提交订单。"
      close-text="暂不提交"
      @close="closePhoneBindPanel"
      @bound="handlePhoneBound"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, fetchMyProfile, request, withTenantCode } from "../../api";
import { handleWechatPayResult } from "../../mall-payment";
import WechatPhoneBindSheet from "../../components/WechatPhoneBindSheet.vue";
import { reviewSafeText } from "../../review-safe-text";
import { createTenantLoadGuard } from "../../tenant-load-guard";

const selectedPayment = ref("");
const loading = ref(true);
const paying = ref(false);
const error = ref("");
const course = ref<any>();
const operationSetting = ref<any>();
const phoneBindVisible = ref(false);
const pendingPhoneAction = ref<"" | "pay">("");
const clientOrderKey = ref(createClientOrderKey());
const loadedContextKey = ref("");
const loadGuard = createTenantLoadGuard();
const paymentMethodOptions = [
  { icon: "微", label: "微信支付", value: "wechat" },
  { icon: "支", label: "支付宝", value: "alipay" },
  { icon: "余", label: "余额支付", value: "balance" },
  { icon: "线", label: "线下收款（待后台确认）", value: "offline" }
];
const availablePaymentMethods = computed(() => {
  const configured = { free: true, wechat: false, alipay: false, balance: true, offline: true, ...(operationSetting.value?.paymentMethods || {}) };
  return paymentMethodOptions.filter((item) => configured[item.value as keyof typeof configured]);
});
const payButtonText = computed(() => {
  if (paying.value) return "处理中...";
  return Number(course.value?.price || 0) > 0 ? `确认支付 ${priceText(course.value.price)}` : "免费开通内容";
});

function currentCourseId() {
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any)?.options || {};
  return Number(options.id || 0);
}

async function loadCourse() {
  const token = loadGuard.begin();
  const id = currentCourseId();
  const contextKey = `${token.tenantCode}:${id}`;
  if (loadedContextKey.value && loadedContextKey.value !== contextKey) {
    course.value = undefined;
    clientOrderKey.value = createClientOrderKey();
  }
  loading.value = true;
  error.value = "";
  try {
    if (!id) throw new Error("缺少内容ID");
    const [data, setting] = await Promise.all([request<any>(`/public/courses/${id}`), request<any>("/public/settings/operation")]);
    if (!loadGuard.isCurrent(token)) return;
    if (!data) throw new Error("内容不存在或未发布");
    course.value = { ...data, title: reviewSafeText(data.title || "") };
    operationSetting.value = setting;
    if (!availablePaymentMethods.value.some((item) => item.value === selectedPayment.value)) selectedPayment.value = availablePaymentMethods.value[0]?.value || "";
    loadedContextKey.value = contextKey;
  } catch (err: any) {
    if (loadGuard.isCurrent(token)) error.value = reviewSafeText(err.message || "订单加载失败");
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}

function createClientOrderKey() {
  return `course_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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
    if (!(await requirePhoneBound("pay"))) return;
    const paymentMethod = Number(course.value.price) > 0 ? availablePaymentMethods.value.find((item) => item.value === selectedPayment.value)?.value : undefined;
    if (Number(course.value.price) > 0 && !paymentMethod) throw new Error("当前商家暂未开放支付方式");
    const result = await request<any>(`/public/courses/${course.value.id}/orders`, {
      method: "POST",
      data: { paymentMethod, clientOrderKey: clientOrderKey.value }
    });
    if (result?.owned && !result?.order) {
      uni.navigateTo({ url: withTenantCode(`/pages/order/payment?status=success&id=${course.value.id}`) });
      return;
    }
    const order = result?.order;
    if (!order?.id) throw new Error("内容订单创建失败");
    if (Number(order.amount || 0) <= 0 || order.status === "paid") {
      uni.navigateTo({ url: withTenantCode(`/pages/order/payment?status=success&id=${course.value.id}&orderId=${order.id}`) });
      return;
    }
    if (order.paymentMethod === "balance") {
      await request(`/public/course-orders/${order.id}/pay/balance`, { method: "POST" });
      uni.navigateTo({ url: withTenantCode(`/pages/order/payment?status=success&id=${course.value.id}&orderId=${order.id}`) });
      return;
    }
    if (["wechat", "alipay"].includes(order.paymentMethod)) {
      const pay = await request<any>(`/public/course-orders/${order.id}/pay/${order.paymentMethod}`, { method: "POST", data: { paymentScene: coursePaymentScene(order.paymentMethod), returnUrl: withTenantCode(`/pages/order/payment?status=pending&id=${course.value.id}&orderId=${order.id}`) } });
      if (order.paymentMethod === "wechat") {
        const redirected = await handleWechatPayResult(pay, "/payment/course/wechat/callback");
        if (redirected) return;
      } else {
        const target = pay?.payParams?.h5Url || pay?.payParams?.payUrl;
        if (target) {
          // #ifdef H5
          window.location.href = String(target);
          return;
          // #endif
          uni.showModal({ title: "支付宝", content: "请在浏览器中打开后完成支付宝付款。", showCancel: false });
        }
      }
    }
    uni.navigateTo({
      url: withTenantCode(`/pages/order/payment?status=pending&id=${course.value.id}&orderId=${order.id}`)
    });
  } catch (err: any) {
    uni.showToast({ title: reviewSafeText(err.message || "支付失败"), icon: "none" });
  } finally {
    paying.value = false;
  }
}

function coursePaymentScene(provider: string) {
  // #ifdef H5
  return provider === "wechat" ? "h5" : "wap";
  // #endif
  return provider === "wechat" ? "jsapi" : "precreate";
}

async function requirePhoneBound(action: "pay") {
  await ensureUser();
  const profile = await fetchMyProfile();
  if (profile?.phone) return true;
  pendingPhoneAction.value = action;
  phoneBindVisible.value = true;
  return false;
}

function closePhoneBindPanel() {
  phoneBindVisible.value = false;
  pendingPhoneAction.value = "";
}

function handlePhoneBound() {
  const action = pendingPhoneAction.value;
  phoneBindVisible.value = false;
  pendingPhoneAction.value = "";
  if (action === "pay") doPay();
}

onShow(loadCourse);
</script>

<style scoped>
.order-confirm-page {
  min-height: 100vh;
  width: 100%;
  max-width: 760px;
  box-sizing: border-box;
  margin: 0 auto;
  padding: calc(24rpx + env(safe-area-inset-top)) 24rpx calc(148rpx + env(safe-area-inset-bottom));
  overflow-wrap: anywhere;
  background:
    linear-gradient(180deg, #f7efe3 0%, #fbf7ef 36%, #f6f0e7 100%);
}

.custom-nav {
  display: flex;
  align-items: center;
  padding: 18rpx 0 20rpx;
}

.nav-back,
.nav-placeholder {
  width: 150rpx;
  font-size: 28rpx;
  color: #4a6b8a;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 700;
  color: #263d3c;
}

.state-card {
  text-align: center;
}

.retry-button {
  display: inline-flex;
  margin-top: 20rpx;
  min-width: 160rpx;
}

.confirm-hero {
  padding: 34rpx 30rpx;
  border-radius: 28rpx;
  background:
    linear-gradient(135deg, rgba(33, 75, 78, 0.96), rgba(129, 55, 48, 0.9)),
    #214b4e;
  color: #fffaf2;
  box-shadow: 0 18rpx 46rpx rgba(36, 60, 60, 0.18);
}

.hero-kicker {
  display: inline-flex;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 250, 242, 0.14);
  color: rgba(255, 250, 242, 0.86);
  font-size: 22rpx;
}

.hero-title {
  margin-top: 22rpx;
  font-size: 42rpx;
  font-weight: 800;
  line-height: 1.25;
}

.hero-desc {
  margin-top: 14rpx;
  max-width: 560rpx;
  color: rgba(255, 250, 242, 0.78);
  font-size: 25rpx;
  line-height: 1.7;
}

.course-card,
.section-card {
  margin-top: 22rpx;
  padding: 26rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 24rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 12rpx 34rpx rgba(72, 55, 38, 0.08);
}

.course-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.course-cover {
  width: 178rpx;
  height: 132rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #f1dfc8, #d9e3dc);
}

.course-cover-img {
  width: 100%;
  height: 100%;
  display: block;
}

.course-cover-icon {
  font-size: 44rpx;
  font-weight: 800;
  color: #8a3d35;
}

.course-info {
  min-width: 0;
  flex: 1;
}

.course-title {
  display: block;
  color: #263d3c;
  font-size: 31rpx;
  font-weight: 800;
  line-height: 1.45;
}

.course-meta {
  display: block;
  margin-top: 8rpx;
  color: #8f8172;
  font-size: 24rpx;
}

.course-price {
  display: block;
  margin-top: 16rpx;
  color: #b84435;
  font-size: 38rpx;
  font-weight: 800;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 18rpx;
}

.section-title {
  color: #263d3c;
  font-size: 30rpx;
  font-weight: 800;
}

.section-badge {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #f5e6d7;
  color: #9c4f3c;
  font-size: 22rpx;
}

.payment-option {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 0 4rpx;
}

.payment-notice {
  margin-bottom: 12rpx;
  padding: 18rpx 20rpx;
  border: 1rpx solid rgba(194, 130, 55, 0.22);
  border-radius: 18rpx;
  background: #fff7e8;
  color: #8f5c18;
  font-size: 24rpx;
  line-height: 1.65;
}

.payment-icon {
  font-size: 34rpx;
}

.payment-label {
  flex: 1;
  color: #3f4f4d;
  font-size: 28rpx;
}

.radio {
  width: 38rpx;
  height: 38rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #d8cbb8;
  border-radius: 50%;
  color: #fff;
  font-size: 20rpx;
}

.radio.checked {
  border-color: #b84435;
  background: #b84435;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.muted-row {
  margin-top: 18rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid rgba(218, 204, 184, 0.7);
}

.summary-label,
.summary-value {
  color: #7f7467;
  font-size: 26rpx;
}

.summary-price {
  color: #b84435;
  font-size: 38rpx;
  font-weight: 800;
}

.bottom-actions {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 18rpx 32rpx calc(18rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid rgba(214, 197, 174, 0.75);
  background: rgba(255, 252, 246, 0.98);
  box-shadow: 0 -10rpx 30rpx rgba(65, 52, 37, 0.08);
}
</style>
