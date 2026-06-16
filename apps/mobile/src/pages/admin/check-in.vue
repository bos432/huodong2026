<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { mobileAdminRequest, requireMobileAdmin } from "../../mobile-admin";
import AdminBottomNav from "../../components/AdminBottomNav.vue";

const code = ref("");
const remark = ref("");
const submitting = ref(false);
const result = ref<any>(null);
const scanning = ref(false);
const scanVideoId = "checkin-scan-video";
let scanStream: MediaStream | null = null;
let scanTimer: number | null = null;
let barcodeDetector: any = null;

function scanCode() {
  requireMobileAdmin();
  // #ifdef H5
  startH5Scan();
  return;
  // #endif
  uni.scanCode({
    success: (res) => {
      code.value = String(res.result || "").trim();
      if (code.value) submit();
    },
    fail: () => uni.showToast({ title: "扫码取消或失败，可手动输入签到码", icon: "none" })
  });
}

async function startH5Scan() {
  if (scanning.value) return;
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    uni.showToast({ title: "当前浏览器不支持扫码，请手动输入签到码", icon: "none" });
    return;
  }
  if (!("BarcodeDetector" in window)) {
    uni.showToast({ title: "当前浏览器不支持网页扫码，请手动输入签到码", icon: "none" });
    return;
  }
  try {
    scanning.value = true;
    barcodeDetector = barcodeDetector || new (window as any).BarcodeDetector({ formats: ["qr_code"] });
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    await new Promise<void>((resolve) => setTimeout(resolve, 80));
    const video = document.getElementById(scanVideoId) as HTMLVideoElement | null;
    if (!video) throw new Error("扫码窗口初始化失败");
    video.srcObject = scanStream;
    await video.play();
    scanTimer = window.setInterval(async () => {
      if (!video || video.readyState < 2 || submitting.value) return;
      const codes = await barcodeDetector.detect(video).catch(() => []);
      const value = String(codes?.[0]?.rawValue || "").trim();
      if (!value) return;
      stopH5Scan();
      code.value = value;
      await submit();
    }, 350);
  } catch (error: any) {
    stopH5Scan();
    uni.showToast({ title: error?.message || "扫码启动失败，请手动输入签到码", icon: "none" });
  }
}

function stopH5Scan() {
  if (scanTimer !== null) {
    window.clearInterval(scanTimer);
    scanTimer = null;
  }
  if (scanStream) {
    scanStream.getTracks().forEach((track) => track.stop());
    scanStream = null;
  }
  scanning.value = false;
}

async function submit() {
  requireMobileAdmin();
  const value = code.value.trim();
  if (!value) {
    uni.showToast({ title: "请输入签到码", icon: "none" });
    return;
  }
  submitting.value = true;
  try {
    result.value = await mobileAdminRequest("/admin/check-ins", { method: "POST", data: { code: value, remark: remark.value.trim() || undefined } });
    uni.showToast({ title: "核销成功", icon: "success" });
    code.value = "";
    remark.value = "";
  } catch (err: any) {
    uni.showModal({ title: "核销失败", content: err.message || "请核对签到码", showCancel: false });
  } finally {
    submitting.value = false;
  }
}

function formatTime(value?: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

onBeforeUnmount(stopH5Scan);
</script>

<template>
  <view class="admin-page">
    <view class="head">
      <view class="title">签到核销</view>
      <view class="sub">扫码或手动输入用户签到码</view>
    </view>

    <view class="card">
      <view class="scan" @click="scanCode">扫码核销</view>
      <view v-if="scanning" class="scan-panel">
        <video :id="scanVideoId" class="scan-video" autoplay playsinline muted></video>
        <view class="scan-tip">请将签到二维码放入画面中。若浏览器不支持，可关闭后手动输入签到码。</view>
        <view class="scan-close" @click="stopH5Scan">关闭扫码</view>
      </view>
      <view class="label">签到码</view>
      <input v-model="code" class="input" placeholder="粘贴或输入签到码" />
      <view class="label">备注</view>
      <textarea v-model="remark" class="textarea" placeholder="可填写现场异常或补签说明" />
      <view class="submit" :class="{ disabled: submitting }" @click="!submitting && submit()">{{ submitting ? "核销中..." : "确认核销" }}</view>
    </view>

    <view v-if="result" class="card success">
      <view class="success-title">最近一次核销成功</view>
      <view class="meta">时间：{{ formatTime(result.createdAt) }}</view>
      <view class="meta">备注：{{ result.remark || "-" }}</view>
    </view>
    <AdminBottomNav current="checkin" :permissions="{ canCheckIn: true, canViewRegistrations: true, canViewOrders: true }" />
  </view>
</template>

<style scoped>
.admin-page { min-height: 100vh; padding: 24rpx 24rpx 150rpx; background: #f4f6f8; color: #111827; }
.head { padding: 30rpx 26rpx; border-radius: 8px; background: #111827; color: #fff; }
.title { font-size: 42rpx; font-weight: 900; }
.sub { margin-top: 8rpx; color: rgba(255,255,255,.72); font-size: 24rpx; }
.card { margin-top: 22rpx; padding: 24rpx; border-radius: 8px; background: #fff; box-shadow: 0 12rpx 34rpx rgba(15,23,42,.06); }
.scan, .submit { height: 86rpx; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: #0f766e; color: #fff; font-size: 28rpx; font-weight: 900; }
.scan-panel { margin-top: 20rpx; padding: 16rpx; border-radius: 8px; background: #0f172a; color: #fff; }
.scan-video { width: 100%; height: 420rpx; border-radius: 8px; background: #020617; object-fit: cover; }
.scan-tip { margin-top: 12rpx; color: rgba(255,255,255,.74); font-size: 24rpx; line-height: 1.5; }
.scan-close { margin-top: 14rpx; height: 68rpx; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: rgba(255,255,255,.12); color: #fff; font-weight: 900; }
.label { margin: 24rpx 0 12rpx; color: #344054; font-size: 26rpx; font-weight: 800; }
.input, .textarea { width: 100%; box-sizing: border-box; border-radius: 6px; background: #f8fafc; color: #111827; font-size: 27rpx; }
.input { height: 82rpx; padding: 0 20rpx; }
.textarea { min-height: 150rpx; padding: 18rpx 20rpx; }
.submit { margin-top: 24rpx; }
.submit.disabled { background: #9ca3af; }
.success { border: 1px solid #cde8e3; background: #f3faf8; }
.success-title { color: #0f766e; font-size: 29rpx; font-weight: 900; }
.meta { margin-top: 10rpx; color: #667085; font-size: 24rpx; }
</style>
