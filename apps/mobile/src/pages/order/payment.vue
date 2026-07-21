<template>
  <view class="container payment-result-page">
    <view v-if="loadingOrder" class="result-card state-card">正在核验订单状态...</view>
    <view v-else-if="loadError" class="result-card state-card error-state" role="alert" aria-live="assertive"><text>{{ loadError }}</text><view class="button block" role="button" tabindex="0" aria-label="重新核验订单状态" @click="retryVerification" @keyup.enter="retryVerification" @keyup.space.prevent="retryVerification">重新核验</view></view>
    <view v-else class="result-card" :class="statusClass">
      <view class="result-kicker">{{ statusKicker }}</view>
      <view class="result-icon">{{ iconText }}</view>
      <text class="result-title">{{ titleText }}</text>
      <text class="result-body">{{ bodyText }}</text>
      <view v-if="orderId" class="order-line">
        <text class="order-label">订单编号</text>
        <text class="order-value">#{{ orderId }}</text>
      </view>
      <view class="action-stack">
        <view v-if="orderId && isPending && isOnlinePayment" class="button secondary block secondary-action" role="button" tabindex="0" :aria-disabled="refreshing" :aria-busy="refreshing" :aria-label="refreshing ? '查询中' : '刷新支付状态'" :class="{ disabled: refreshing }" @click="refreshStatus" @keyup.enter="refreshStatus" @keyup.space.prevent="refreshStatus">{{ refreshing ? "查询中..." : "刷新支付状态" }}</view>
        <view v-if="orderId && isPending" class="button secondary block secondary-action" role="button" tabindex="0" :aria-disabled="closing" :aria-busy="closing" :aria-label="closing ? '关闭中' : '关闭订单'" :class="{ disabled: closing }" @click="closeOrder" @keyup.enter="closeOrder" @keyup.space.prevent="closeOrder">{{ closing ? "关闭中..." : "关闭订单" }}</view>
        <view class="button block primary-action" role="button" tabindex="0" aria-label="继续操作" @click="goPrimary" @keyup.enter="goPrimary" @keyup.space.prevent="goPrimary">{{ primaryText }}</view>
        <view class="button secondary block secondary-action" role="button" tabindex="0" aria-label="返回内容" @click="goBack" @keyup.enter="goBack" @keyup.space.prevent="goBack">返回内容</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, getCurrentTenantCode, request, withTenantCode } from "../../api";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { reviewSafeText } from "../../review-safe-text";
const isSuccess = ref(true);
const isPending = ref(false);
const accessMode = ref<"paid" | "free">("paid");
const courseId = ref(0);
const orderId = ref(0);
const order = ref<any>(null);
const loadingOrder = ref(false);
const loadError = ref("");
const refreshing = ref(false);
const closing = ref(false);
const initialized = ref(false);
const loadGuard = createTenantLoadGuard();
const isOnlinePayment = computed(() => ["wechat", "alipay"].includes(order.value?.paymentMethod));
onLoad((query) => {
  if (query?.status === "fail") isSuccess.value = false;
  if (query?.status === "pending") {
    isSuccess.value = false;
    isPending.value = true;
  }
  if (query?.mode === "free") accessMode.value = "free";
  courseId.value = Number(query?.id || 0);
  orderId.value = Number(query?.orderId || 0);
  initialized.value = true;
});
onShow(() => {
  if (!initialized.value) return;
  if (orderId.value) void loadOrder();
  else if (isSuccess.value && courseId.value) void verifyCourseAccess();
});
const iconText = computed(() => isSuccess.value ? "🎉" : isPending.value ? "⏳" : "😢");
const statusClass = computed(() => isSuccess.value ? "is-success" : isPending.value ? "is-pending" : "is-fail");
const statusKicker = computed(() => {
  if (isSuccess.value) return accessMode.value === "free" ? "内容已加入" : "内容已开通";
  return isPending.value ? isOnlinePayment.value ? "在线支付待确认" : "线下付款待确认" : "订单未完成";
});
const titleText = computed(() => {
  if (isSuccess.value) return accessMode.value === "free" ? "加入成功" : "支付成功";
  return isPending.value ? "等待确认收款" : "支付失败";
});
const bodyText = computed(() => {
  if (isSuccess.value) return accessMode.value === "free" ? "内容已加入，可直接开始观看" : "恭喜您获得内容参与权益";
  if (isPending.value) return isOnlinePayment.value ? "如已完成付款，请刷新支付状态。渠道确认成功后将立即开通课程权益。" : "订单已提交，请联系运营方完成线下付款，后台确认收款后再观看。";
  return "请稍后重试或联系客服";
});
const primaryText = computed(() => isSuccess.value ? "去观看" : isPending.value ? "返回内容" : "重新支付");
function goPrimary() {
  if (isSuccess.value) uni.navigateTo({ url: withTenantCode(`/pages/course/player?id=${courseId.value || 1}`) });
  else if (isPending.value) uni.navigateTo({ url: withTenantCode(`/pages/course/detail?id=${courseId.value || 1}`) });
  else uni.navigateTo({ url: withTenantCode(`/pages/order/confirm?id=${courseId.value || 1}&orderId=${orderId.value || ""}`) });
}
function goBack() { uni.navigateBack(); }
async function loadOrder() {
  if (!orderId.value) return;
  const token = loadGuard.begin();
  loadingOrder.value = true;
  loadError.value = "";
  try {
    await ensureUser();
    const result = await request<any>(`/public/course-orders/${orderId.value}`);
    if (!loadGuard.isCurrent(token)) return;
    order.value = result.order;
    if (result.order?.status === "paid" || result.owned) {
      isSuccess.value = true;
      isPending.value = false;
    } else if (result.order?.status === "pending_payment") {
      isSuccess.value = false;
      isPending.value = true;
    } else if (["closed", "refunded"].includes(result.order?.status)) {
      isSuccess.value = false;
      isPending.value = false;
    }
  } catch (error: any) {
    if (loadGuard.isCurrent(token)) loadError.value = reviewSafeText(error?.message || "订单状态核验失败，请重新核验后再判断支付结果。");
  } finally {
    if (loadGuard.isCurrent(token)) loadingOrder.value = false;
  }
}
async function verifyCourseAccess() {
  const token = loadGuard.begin();
  loadingOrder.value = true;
  loadError.value = "";
  try {
    await ensureUser();
    const courses = await request<any[]>("/public/me/courses");
    if (!loadGuard.isCurrent(token)) return;
    if (!courses.some((item) => Number(item.id) === courseId.value)) throw new Error("尚未查询到课程权益，请返回课程页重新确认订单状态。");
    isSuccess.value = true;
    isPending.value = false;
  } catch (error: any) {
    if (!loadGuard.isCurrent(token)) return;
    if (!String(error?.message || "").includes("请先完成")) loadError.value = reviewSafeText(error?.message || "课程权益核验失败，请重新核验。");
  } finally {
    if (loadGuard.isCurrent(token)) loadingOrder.value = false;
  }
}
function retryVerification() {
  if (orderId.value) void loadOrder();
  else void verifyCourseAccess();
}
async function refreshStatus() {
  if (refreshing.value || loadingOrder.value) return;
  refreshing.value = true;
  try {
    const result = await request<any>(`/public/course-orders/${orderId.value}/payment-status`);
    if (result.status === "success" || result.owned) uni.showToast({ title: "支付已确认", icon: "none" });
    else uni.showToast({ title: result.status === "closed" ? "渠道订单已关闭" : "暂未支付", icon: "none" });
    await loadOrder();
  } catch (error: any) {
    uni.showToast({ title: error.message || "查询支付状态失败", icon: "none" });
  } finally {
    refreshing.value = false;
  }
}
function closeOrder() {
  if (closing.value || refreshing.value) return;
  closing.value = true;
  const tenantCode = getCurrentTenantCode();
  uni.showModal({
    title: "关闭内容订单",
    content: "关闭后该订单不能继续付款，需要重新下单。",
    confirmText: "确认关闭",
    fail: () => { closing.value = false; },
    success: async (res) => {
      if (!res.confirm) { closing.value = false; return; }
      try {
        if (getCurrentTenantCode() !== tenantCode) throw new Error("当前城市已切换，请重新核验订单");
        await request(`/public/course-orders/${orderId.value}/payment-close`, { method: "POST" });
        uni.showToast({ title: "订单已关闭", icon: "none" });
        await loadOrder();
      } catch (error: any) {
        uni.showToast({ title: error.message || "关闭订单失败", icon: "none" });
      } finally {
        closing.value = false;
      }
    }
  });
}
</script>

<style scoped>
.payment-result-page {
  min-height: 100vh;
  width: 100%;
  max-width: 760px;
  box-sizing: border-box;
  margin: 0 auto;
  padding: calc(24rpx + env(safe-area-inset-top)) 24rpx calc(24rpx + env(safe-area-inset-bottom));
  overflow-wrap: anywhere;
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
.state-card { color:#667085; line-height:1.6; }
.state-card .button { margin-top:20rpx; }
.error-state { border-color:#fecaca; background:#fff7f7; color:#b91c1c; }
.disabled { opacity:.6; pointer-events:none; }
</style>
