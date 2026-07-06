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

function activityTime(row: any) {
  const activity = row?.registration?.activity || row?.activity || {};
  const start = formatTime(activity.startTime);
  const end = formatTime(activity.endTime);
  if (start === "-" && end === "-") return "-";
  return end === "-" ? start : `${start} 至 ${end}`;
}

function attendeeName(row: any) {
  const user = row?.registration?.user || {};
  const answers = Array.isArray(row?.registration?.answers) ? row.registration.answers : [];
  const answerName = answers.find((item: any) => String(item.label || item.name || "").includes("姓名"))?.value;
  return answerName || user.nickname || "-";
}

function attendeePhone(row: any) {
  return row?.registration?.user?.phone || "-";
}

function orderText(row: any) {
  if (!row?.order) return "-";
  const amount = Number(row.order.amount || 0).toFixed(2);
  return `${row.order.orderNo || "-"} / ¥${amount}`;
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
      <view class="success-head">
        <view>
          <view class="success-title">核销成功</view>
          <view class="success-sub">请核对以下信息后放行入场</view>
        </view>
        <view class="success-badge">已签到</view>
      </view>
      <view class="info-grid">
        <view class="info-line full"><text>活动</text><strong>{{ result.registration?.activity?.title || result.activity?.title || "-" }}</strong></view>
        <view class="info-line full"><text>场次时间</text><strong>{{ activityTime(result) }}</strong></view>
        <view class="info-line full"><text>地点</text><strong>{{ result.registration?.activity?.location || result.activity?.location || "-" }}</strong></view>
        <view class="info-line"><text>报名人</text><strong>{{ attendeeName(result) }}</strong></view>
        <view class="info-line"><text>手机号</text><strong>{{ attendeePhone(result) }}</strong></view>
        <view class="info-line full"><text>订单</text><strong>{{ orderText(result) }}</strong></view>
        <view class="info-line"><text>核销时间</text><strong>{{ formatTime(result.createdAt) }}</strong></view>
        <view class="info-line"><text>核销员</text><strong>{{ result.operator?.name || result.operator?.username || "-" }}</strong></view>
        <view class="info-line full"><text>备注</text><strong>{{ result.remark || "-" }}</strong></view>
      </view>
    </view>
    <AdminBottomNav current="checkin" :permissions="{ canCheckIn: true, canViewRegistrations: true, canViewOrders: true }" />
  </view>
</template>

<style scoped>
.admin-page { min-height: 100vh; padding: 24rpx 24rpx 150rpx; background: radial-gradient(circle at 18% 0%, rgba(255, 232, 198, 0.9), transparent 34%), linear-gradient(180deg, #fff8ef 0%, #f5f0e8 100%); color: #2f211c; }
.head { padding: 30rpx 26rpx; border-radius: 30rpx; background: linear-gradient(135deg, #5b2f24 0%, #8f4c32 52%, #d29a5a 100%); color: #fff; box-shadow: 0 18rpx 44rpx rgba(91,47,36,.2); }
.title { font-size: 42rpx; font-weight: 900; }
.sub { margin-top: 8rpx; color: rgba(255,255,255,.72); font-size: 24rpx; }
.card { margin-top: 22rpx; padding: 24rpx; border-radius: 24rpx; background: rgba(255,255,255,.9); box-shadow: 0 14rpx 34rpx rgba(91,47,36,.08); }
.scan, .submit { height: 86rpx; display: flex; align-items: center; justify-content: center; border-radius: 20rpx; background: linear-gradient(135deg, #0f766e, #15907f); color: #fff; font-size: 28rpx; font-weight: 900; }
.scan-panel { margin-top: 20rpx; padding: 16rpx; border-radius: 24rpx; background: #2f211c; color: #fff; }
.scan-video { width: 100%; height: 420rpx; border-radius: 20rpx; background: #020617; object-fit: cover; }
.scan-tip { margin-top: 12rpx; color: rgba(255,255,255,.74); font-size: 24rpx; line-height: 1.5; }
.scan-close { margin-top: 14rpx; height: 68rpx; display: flex; align-items: center; justify-content: center; border-radius: 18rpx; background: rgba(255,255,255,.12); color: #fff; font-weight: 900; }
.label { margin: 24rpx 0 12rpx; color: #344054; font-size: 26rpx; font-weight: 800; }
.input, .textarea { width: 100%; box-sizing: border-box; border-radius: 18rpx; background: #fffaf4; color: #2f211c; font-size: 27rpx; }
.input { height: 82rpx; padding: 0 20rpx; }
.textarea { min-height: 150rpx; padding: 18rpx 20rpx; }
.submit { margin-top: 24rpx; }
.submit.disabled { background: #9ca3af; }
.success { border: 1px solid #cde8e3; background: #f3faf8; }
.success-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.success-title { color: #0f766e; font-size: 34rpx; font-weight: 900; }
.success-sub { margin-top: 6rpx; color: #667085; font-size: 23rpx; }
.success-badge { flex: 0 0 auto; padding: 8rpx 16rpx; border-radius: 999px; background: #0f766e; color: #fff; font-size: 22rpx; font-weight: 900; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 20rpx; }
.info-line { min-width: 0; padding: 14rpx; border-radius: 16rpx; background: rgba(255,255,255,.78); border: 1px solid rgba(15,118,110,.12); }
.info-line.full { grid-column: 1 / -1; }
.info-line text { display: block; color: #667085; font-size: 22rpx; }
.info-line strong { display: block; margin-top: 6rpx; color: #2f211c; font-size: 25rpx; line-height: 1.45; word-break: break-all; }
</style>
