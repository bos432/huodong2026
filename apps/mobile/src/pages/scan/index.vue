<script setup lang="ts">
import { ref } from "vue";
import { withTenantCode } from "../../api";
import { isCheckInTicket, parseActivityQrTarget } from "../../activity-qr";

const busy = ref(false);
const pastedValue = ref("");

function goHome() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
    return;
  }
  uni.reLaunch({ url: withTenantCode("/pages/index/index") });
}

function unsupportedMessage(raw: string) {
  if (isCheckInTicket(raw)) return "签到码请由签到员在手机管理端扫码核销";
  return "仅支持慢π活动二维码；活动群二维码请长按图片识别";
}

function openScannedActivity(raw: unknown) {
  const value = String(raw || "").trim();
  const target = parseActivityQrTarget(value);
  if (!target) {
    uni.showToast({ title: unsupportedMessage(value), icon: "none" });
    return;
  }
  const tenantQuery = target.tenantCode ? `&tenantCode=${encodeURIComponent(target.tenantCode)}` : "";
  uni.navigateTo({ url: `/pages/activity/detail?id=${target.activityId}${tenantQuery}` });
}

function startScan(source: "camera" | "album") {
  if (busy.value) return;
  // #ifdef MP-WEIXIN
  busy.value = true;
  uni.scanCode({
    onlyFromCamera: source === "camera",
    scanType: ["qrCode"],
    success: (result) => openScannedActivity(result.path || result.result),
    fail: (error: any) => {
      const message = String(error?.errMsg || "");
      if (!/cancel/i.test(message)) uni.showToast({ title: "未识别到二维码，请重试", icon: "none" });
    },
    complete: () => { busy.value = false; }
  });
  return;
  // #endif
  // #ifndef MP-WEIXIN
  uni.showModal({ title: "请使用微信小程序", content: "相机扫码和相册识别仅在微信小程序中可用。活动群二维码请在图片预览后长按识别。", showCancel: false });
  // #endif
}

function openPastedActivity() {
  const value = pastedValue.value.trim();
  if (!value) return uni.showToast({ title: "请粘贴慢π活动链接", icon: "none" });
  openScannedActivity(value);
}
</script>

<template>
  <view class="scan-page">
    <view class="scan-hero">
      <text class="scan-kicker">活动服务</text>
      <text class="scan-title">扫一扫</text>
      <text class="scan-copy">扫描慢π活动二维码，快速查看活动详情。</text>
    </view>

    <view class="scan-card">
      <view class="scan-icon" aria-hidden="true"><view /></view>
      <view class="scan-actions">
        <button class="scan-action primary" :disabled="busy" @click="startScan('camera')">相机扫码</button>
        <button class="scan-action" :disabled="busy" @click="startScan('album')">从相册识别</button>
      </view>
      <text class="scan-note">仅识别慢π活动码。签到码需由签到员核销，群二维码请长按图片识别。</text>
    </view>

    <!-- #ifdef H5 -->
    <view class="scan-card h5-card">
      <text class="h5-title">H5 安全打开</text>
      <input v-model="pastedValue" class="paste-input" placeholder="粘贴慢π活动链接" confirm-type="done" @confirm="openPastedActivity" />
      <button class="scan-action primary" @click="openPastedActivity">打开活动</button>
    </view>
    <!-- #endif -->

    <view class="back-link" role="button" tabindex="0" @click="goHome" @keyup.enter="goHome" @keyup.space.prevent="goHome">返回上一页</view>
  </view>
</template>

<style scoped>
.scan-page{min-height:100vh;padding:36rpx 28rpx 72rpx;box-sizing:border-box;background:#f6f8f7;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}.scan-hero{display:grid;gap:10rpx;padding:20rpx 2rpx 34rpx}.scan-kicker{color:#08753f;font-size:22rpx;font-weight:800}.scan-title{color:#13241a;font-size:48rpx;font-weight:950;line-height:1.15}.scan-copy{color:#687871;font-size:25rpx;line-height:1.55}.scan-card{display:grid;justify-items:center;gap:24rpx;padding:42rpx 28rpx;border:1rpx solid #e0e9e3;border-radius:8rpx;background:#fff;box-shadow:0 10rpx 28rpx rgba(22,52,36,.05)}.scan-icon{position:relative;width:136rpx;height:136rpx;border:6rpx solid #143a27;border-radius:8rpx;box-sizing:border-box}.scan-icon::before,.scan-icon::after,.scan-icon view::before,.scan-icon view::after{position:absolute;width:24rpx;height:24rpx;content:"";background:#20d477}.scan-icon::before{top:-6rpx;left:-6rpx}.scan-icon::after{top:-6rpx;right:-6rpx}.scan-icon view::before{bottom:-6rpx;left:-6rpx}.scan-icon view::after{right:-6rpx;bottom:-6rpx}.scan-actions{width:100%;display:grid;gap:14rpx}.scan-action{width:100%;min-height:82rpx;margin:0;border:1rpx solid #d8e4dc;border-radius:8rpx;background:#fff;color:#183425;font-size:27rpx;font-weight:800;line-height:82rpx}.scan-action::after{border:0}.scan-action.primary{border-color:#143a27;background:#143a27;color:#fff}.scan-action[disabled]{opacity:.55}.scan-note{color:#7a8981;font-size:22rpx;line-height:1.65;text-align:center}.h5-card{align-items:stretch;justify-items:stretch;margin-top:20rpx;padding:28rpx}.h5-title{color:#173424;font-size:27rpx;font-weight:900}.paste-input{height:78rpx;padding:0 18rpx;border:1rpx solid #d8e4dc;border-radius:8rpx;background:#f8faf9;color:#24362b;font-size:24rpx}.back-link{margin-top:30rpx;color:#08753f;font-size:25rpx;font-weight:800;text-align:center}.back-link:focus-visible{outline:3rpx solid #20d477;outline-offset:4rpx}
</style>
