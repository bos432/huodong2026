<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { onHide, onLoad, onShow } from "@dcloudio/uni-app";
import { mobileAdminRequest, requireMobileAdmin } from "../../mobile-admin";
import AdminBottomNav from "../../components/AdminBottomNav.vue";

const code = ref("");
const remark = ref("");
const submitting = ref(false);
const result = ref<any>(null);
const bootstrap = ref<any>(null);
const activities = ref<any[]>([]);
const selectedActivityId = ref<number | null>(null);
const points = ref<any[]>([]);
const selectedPointId = ref<number | null>(null);
const pointsError = ref("");
const overview = ref<any>({ stats: {}, pointStats: [] });
const overviewError = ref("");
const offlineManifest = ref<any>(null);
const offlineQueue = ref<any[]>([]);
const offlineConflicts = ref<any[]>([]);
const offlineBusy = ref(false);
const scanning = ref(false);
const pageLoading = ref(true);
const operationError = ref("");
const scanVideoId = "checkin-scan-video";
let scanStream: MediaStream | null = null;
let scanTimer: number | null = null;
let barcodeDetector: any = null;
let overviewTimer: number | null = null;
let overviewSerial = 0;
let pointsSerial = 0;
let pageSerial = 0;
let offlineLoaded = false;
let pageVisible = false;
const deviceId = String(uni.getStorageSync("checkin_device_id") || `device-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`);
uni.setStorageSync("checkin_device_id", deviceId);

function offlineStorageKey() { return `checkin_offline_${deviceId}`; }
function persistOffline() { uni.setStorageSync(offlineStorageKey(), { manifest: offlineManifest.value, queue: offlineQueue.value, conflicts: offlineConflicts.value }); }

async function downloadOfflineManifest() {
  if (!selectedActivityId.value || !selectedPointId.value) return uni.showToast({ title: "请先选择活动和核销点", icon: "none" });
  const activityId = selectedActivityId.value;
  const pointId = selectedPointId.value;
  operationError.value = "";
  offlineBusy.value = true;
  try {
    const manifest = await mobileAdminRequest<any>("/admin/check-ins/offline-manifest", { method: "POST", data: { activityId, pointId, deviceId } });
    if (selectedActivityId.value !== activityId || selectedPointId.value !== pointId) return;
    offlineManifest.value = manifest;
    offlineQueue.value = []; offlineConflicts.value = []; persistOffline();
    uni.showToast({ title: `已下载 ${offlineManifest.value?.tickets?.length || 0} 张票`, icon: "success" });
  } catch (error: any) { operationError.value = error.message || "离线清单下载失败，请检查网络和权限"; }
  finally { offlineBusy.value = false; }
}

function queueOffline(codeValue: string) {
  const manifest = offlineManifest.value;
  if (!manifest || new Date(manifest.expiresAt).getTime() <= Date.now()) return false;
  const ticket = manifest.tickets?.find((item: any) => item.code === codeValue);
  if (!ticket) return false;
  if (offlineQueue.value.some(item => item.code === codeValue)) throw new Error("该票已在本机离线队列中");
  offlineQueue.value.unshift({ localId: `${deviceId}-${Date.now()}-${ticket.registrationId}`, code: codeValue, registrationId: ticket.registrationId, name: ticket.name, phoneTail: ticket.phoneTail, scannedAt: new Date().toISOString(), pointId: manifest.point.id });
  persistOffline(); return true;
}

async function syncOfflineQueue() {
  if (!offlineQueue.value.length) return uni.showToast({ title: "没有待同步记录", icon: "none" });
  offlineBusy.value = true;
  operationError.value = "";
  try {
    const response = await mobileAdminRequest<any>("/admin/check-ins/offline-sync", { method: "POST", data: { deviceId, items: offlineQueue.value } });
    const successful = new Set((response.results || []).filter((item: any) => item.success).map((item: any) => item.localId));
    const conflicts = (response.results || []).filter((item: any) => !item.success);
    offlineQueue.value = offlineQueue.value.filter(item => !successful.has(item.localId) && !conflicts.some((conflict: any) => conflict.localId === item.localId));
    offlineConflicts.value.unshift(...conflicts); persistOffline(); await loadOverview();
    uni.showModal({ title: "同步完成", content: `成功 ${response.successCount || 0} 条，冲突 ${response.conflictCount || 0} 条`, showCancel: false });
  } catch (error: any) { operationError.value = error.message || "离线记录同步失败，请稍后重试"; }
  finally { offlineBusy.value = false; }
}

async function loadOverview() {
  const activityId = selectedActivityId.value;
  const serial = ++overviewSerial;
  const suffix = activityId ? `?activityId=${activityId}` : "";
  try {
    overviewError.value = "";
    const data = await mobileAdminRequest<any>(`/admin/check-ins/overview${suffix}`);
    if (serial !== overviewSerial || selectedActivityId.value !== activityId) return;
    overview.value = data;
  } catch (error: any) {
    if (serial === overviewSerial && selectedActivityId.value === activityId) overviewError.value = error.message || "现场概览加载失败";
  }
}

async function loadPoints(activityId: number | null) {
  const serial = ++pointsSerial;
  pointsError.value = "";
  if (!activityId) { points.value = []; return; }
  try {
    const rows = await mobileAdminRequest<any[]>(`/admin/check-in-points?activityId=${activityId}`);
    if (serial !== pointsSerial || selectedActivityId.value !== activityId) return;
    points.value = rows;
    if (selectedPointId.value && !rows.some((item) => item.id === selectedPointId.value)) selectedPointId.value = null;
  } catch (error: any) {
    if (serial !== pointsSerial || selectedActivityId.value !== activityId) return;
    points.value = [];
    pointsError.value = error?.message || "核销点加载失败";
  }
}

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
  if (submitting.value) return;
  const value = code.value.trim();
  if (!value) {
    uni.showToast({ title: "请输入签到码", icon: "none" });
    return;
  }
  submitting.value = true;
  operationError.value = "";
  try {
    result.value = await mobileAdminRequest("/admin/check-ins", { method: "POST", data: { code: value, remark: remark.value.trim() || undefined, expectedActivityId: selectedActivityId.value || undefined, pointId: selectedPointId.value || undefined } });
    uni.showToast({ title: "核销成功", icon: "success" });
    code.value = "";
    remark.value = "";
    await loadOverview();
  } catch (err: any) {
    try {
      if (err?.statusCode === undefined && queueOffline(value)) { uni.showToast({ title: "已离线记录，联网后请同步", icon: "none" }); code.value = ""; }
      else operationError.value = `${err.message || "请核对签到码"}。该票不在有效离线清单中。`;
    } catch (offlineError: any) { operationError.value = offlineError.message || "离线核销失败"; }
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
  const phone = String(row?.registration?.user?.phone || "");
  return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone || "-";
}

function orderText(row: any) {
  if (!row?.order) return "-";
  const amount = Number(row.order.amount || 0).toFixed(2);
  return `${row.order.orderNo || "-"} / ¥${amount}`;
}

async function changeActivity(event: any) {
  selectedActivityId.value = activities.value[Number(event?.detail?.value)]?.id || null;
  selectedPointId.value = null;
  result.value = null;
  await loadPoints(selectedActivityId.value);
  await loadOverview();
}

function changePoint(event: any) { selectedPointId.value = points.value[Number(event?.detail?.value)]?.id || null; }

function stopOverviewTimer() {
  // #ifdef H5
  if (overviewTimer !== null) window.clearInterval(overviewTimer);
  // #endif
  overviewTimer = null;
}

function startOverviewTimer() {
  stopOverviewTimer();
  // #ifdef H5
  overviewTimer = window.setInterval(() => { void loadOverview(); }, 5000);
  // #endif
}

async function loadPage() {
  try { requireMobileAdmin(); } catch { pageLoading.value = false; return; }
  const serial = ++pageSerial;
  pageLoading.value = true;
  operationError.value = "";
  if (!offlineLoaded) {
    const saved = uni.getStorageSync(offlineStorageKey()) || {};
    offlineManifest.value = saved.manifest || null;
    offlineQueue.value = Array.isArray(saved.queue) ? saved.queue : [];
    offlineConflicts.value = Array.isArray(saved.conflicts) ? saved.conflicts : [];
    offlineLoaded = true;
  }
  try {
    const boot = await mobileAdminRequest<any>("/admin/mobile/bootstrap");
    if (serial !== pageSerial) return;
    bootstrap.value = boot;
    await loadOverview();
    if (serial !== pageSerial) return;
    activities.value = overview.value?.activities || [];
    if (selectedActivityId.value && !activities.value.some((item) => item.id === selectedActivityId.value)) selectedActivityId.value = null;
    await loadPoints(selectedActivityId.value);
  } catch (error: any) {
    if (serial === pageSerial) operationError.value = error.message || "核销工作台加载失败";
  } finally {
    if (serial === pageSerial) pageLoading.value = false;
  }
}

function stopPageWork() {
  stopH5Scan();
  stopOverviewTimer();
  overviewSerial += 1;
  pointsSerial += 1;
  pageSerial += 1;
}

onLoad((query) => { const scannedCode = String(query?.code || "").trim(); if (scannedCode) code.value = scannedCode; });
onShow(async () => { pageVisible = true; await loadPage(); if (pageVisible) startOverviewTimer(); });
onHide(() => { pageVisible = false; stopPageWork(); });
onBeforeUnmount(stopPageWork);
</script>

<template>
  <view class="admin-page">
    <view class="head">
      <view class="title">签到核销</view>
      <view class="sub">扫码或手动输入用户签到码</view>
    </view>

    <view class="card">
      <view class="label">当前活动</view>
      <picker :range="activities" range-key="title" @change="changeActivity">
        <view class="picker-value" role="button" tabindex="0" aria-label="选择当前活动">{{ activities.find((item) => item.id === selectedActivityId)?.title || "全部活动（扫码后自动识别）" }}</view>
      </picker>
      <view class="label">核销点</view>
      <picker :range="points" range-key="name" @change="changePoint">
        <view class="picker-value" role="button" tabindex="0" aria-label="选择核销点">{{ points.find((item) => item.id === selectedPointId)?.name || "未指定核销点" }}</view>
      </picker>
      <view v-if="pointsError" class="field-error">{{ pointsError }}，可重新选择活动后重试。</view>
      <view class="offline-actions">
        <view class="offline-button" role="button" tabindex="0" :aria-disabled="offlineBusy" :aria-label="offlineBusy ? '离线清单处理中' : '下载离线清单'" :class="{ disabled: offlineBusy }" @click="!offlineBusy && downloadOfflineManifest()" @keyup.enter="!offlineBusy && downloadOfflineManifest()" @keyup.space.prevent="!offlineBusy && downloadOfflineManifest()">下载离线清单</view>
        <view class="offline-button sync" role="button" tabindex="0" :aria-disabled="offlineBusy || !offlineQueue.length" :aria-label="`同步${offlineQueue.length}条离线记录`" :class="{ disabled: offlineBusy || !offlineQueue.length }" @click="!offlineBusy && offlineQueue.length && syncOfflineQueue()" @keyup.enter="!offlineBusy && offlineQueue.length && syncOfflineQueue()" @keyup.space.prevent="!offlineBusy && offlineQueue.length && syncOfflineQueue()">同步 {{ offlineQueue.length }} 条</view>
      </view>
      <view v-if="offlineManifest" class="offline-status">离线清单：{{ offlineManifest.activity?.title }} / {{ offlineManifest.point?.name }}，有效至 {{ formatTime(offlineManifest.expiresAt) }}</view>
      <view class="scan" role="button" tabindex="0" aria-label="扫码核销" @click="scanCode" @keyup.enter="scanCode" @keyup.space.prevent="scanCode">扫码核销</view>
      <view v-if="scanning" class="scan-panel">
        <video :id="scanVideoId" class="scan-video" autoplay playsinline muted></video>
        <view class="scan-tip">请将签到二维码放入画面中。若浏览器不支持，可关闭后手动输入签到码。</view>
        <view class="scan-close" role="button" tabindex="0" aria-label="关闭扫码窗口" @click="stopH5Scan" @keyup.enter="stopH5Scan" @keyup.space.prevent="stopH5Scan">关闭扫码</view>
      </view>
      <view class="label">签到码</view>
      <input v-model="code" class="input" maxlength="128" cursor-spacing="24" confirm-type="done" aria-label="签到码" placeholder="粘贴或输入签到码" @confirm="submit" />
      <view class="label">备注</view>
      <textarea v-model="remark" class="textarea" maxlength="500" cursor-spacing="24" aria-label="现场异常或补签说明" placeholder="可填写现场异常或补签说明" />
      <view class="submit" role="button" tabindex="0" :aria-disabled="submitting" :aria-busy="submitting" :aria-label="submitting ? '核销中' : '确认核销'" :class="{ disabled: submitting }" @click="!submitting && submit()" @keyup.enter="!submitting && submit()" @keyup.space.prevent="!submitting && submit()">{{ submitting ? "核销中..." : "确认核销" }}</view>
    </view>
    <view v-if="pageLoading && !bootstrap" class="card">核销工作台加载中...</view>
    <view v-if="operationError" class="error-panel" role="alert" aria-live="assertive"><text>{{ operationError }}</text><view class="retry" @click="loadPage">重试</view></view>
    <view v-if="overviewError" class="error-panel" role="alert" aria-live="assertive"><text>{{ overviewError }}</text><view class="retry" role="button" tabindex="0" aria-label="重新加载现场概览" @click="loadOverview" @keyup.enter="loadOverview" @keyup.space.prevent="loadOverview">重试</view></view>

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
        <view class="info-line full"><text>核销点</text><strong>{{ result.point?.name || "未指定" }}</strong></view>
        <view class="info-line full"><text>备注</text><strong>{{ result.remark || "-" }}</strong></view>
      </view>
    </view>

    <view v-if="offlineQueue.length || offlineConflicts.length" class="card">
      <view class="success-title">离线队列</view>
      <view v-for="item in offlineQueue" :key="item.localId" class="offline-row"><strong>{{ item.name || `报名 ${item.registrationId}` }}</strong><text>待同步 · {{ formatTime(item.scannedAt) }}</text></view>
      <view v-for="item in offlineConflicts.slice(0, 10)" :key="item.localId" class="offline-row conflict"><strong>同步冲突</strong><text>{{ item.message }}</text></view>
    </view>

    <view class="live-grid">
      <view><text>当前到场</text><strong>{{ overview.stats?.checkedInCount || 0 }}</strong></view>
      <view><text>待核销</text><strong>{{ overview.stats?.pendingCheckInCount || 0 }}</strong></view>
      <view><text>核销率</text><strong>{{ overview.stats?.checkInRate || 0 }}%</strong></view>
    </view>
    <AdminBottomNav current="checkin" :permissions="bootstrap?.permissions" />
  </view>
</template>

<style scoped>
.admin-page { min-height: 100vh; width:100%; max-width:760px; margin:0 auto; box-sizing:border-box; padding: calc(24rpx + env(safe-area-inset-top)) 24rpx calc(150rpx + env(safe-area-inset-bottom)); overflow-wrap:anywhere; background: radial-gradient(circle at 18% 0%, rgba(255, 232, 198, 0.9), transparent 34%), linear-gradient(180deg, #fff8ef 0%, #f5f0e8 100%); color: #2f211c; }
.head { padding: 30rpx 26rpx; border-radius: 30rpx; background: linear-gradient(135deg, #5b2f24 0%, #8f4c32 52%, #d29a5a 100%); color: #fff; box-shadow: 0 18rpx 44rpx rgba(91,47,36,.2); }
.title { font-size: 42rpx; font-weight: 900; }
.sub { margin-top: 8rpx; color: rgba(255,255,255,.72); font-size: 24rpx; }
.card { margin-top: 22rpx; padding: 24rpx; border-radius: 24rpx; background: rgba(255,255,255,.9); box-shadow: 0 14rpx 34rpx rgba(91,47,36,.08); }
.live-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; margin-top: 20rpx; }.live-grid view { padding: 18rpx 12rpx; border-radius: 18rpx; background: #fff; text-align: center; }.live-grid text { display: block; color: #667085; font-size: 21rpx; }.live-grid strong { display: block; margin-top: 6rpx; color: #0f766e; font-size: 32rpx; }
.scan, .submit { height: 86rpx; display: flex; align-items: center; justify-content: center; border-radius: 20rpx; background: linear-gradient(135deg, #0f766e, #15907f); color: #fff; font-size: 28rpx; font-weight: 900; }
.scan-panel { margin-top: 20rpx; padding: 16rpx; border-radius: 24rpx; background: #2f211c; color: #fff; }
.scan-video { width: 100%; height: 420rpx; border-radius: 20rpx; background: #020617; object-fit: cover; }
.scan-tip { margin-top: 12rpx; color: rgba(255,255,255,.74); font-size: 24rpx; line-height: 1.5; }
.scan-close { margin-top: 14rpx; height: 68rpx; display: flex; align-items: center; justify-content: center; border-radius: 18rpx; background: rgba(255,255,255,.12); color: #fff; font-weight: 900; }
.label { margin: 24rpx 0 12rpx; color: #344054; font-size: 26rpx; font-weight: 800; }
.input, .textarea { width: 100%; box-sizing: border-box; border-radius: 18rpx; background: #fffaf4; color: #2f211c; font-size: 27rpx; }
.picker-value { min-height: 82rpx; box-sizing: border-box; display: flex; align-items: center; padding: 0 20rpx; border-radius: 18rpx; background: #fffaf4; color: #2f211c; font-size: 27rpx; }
.field-error { margin-top:10rpx; color:#b42318; font-size:23rpx; line-height:1.5; }
@media (min-width: 900px) { .admin-page { max-width:760px; margin:0 auto; } }
.offline-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 20rpx; }.offline-button { min-height: 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 18rpx; background: #344054; color: #fff; font-weight: 800; }.offline-button.sync { background: #0f766e; }.offline-button.disabled { opacity: .45; }.offline-status { margin-top: 12rpx; color: #667085; font-size: 22rpx; line-height: 1.5; }.offline-row { margin-top: 12rpx; padding: 14rpx; border-radius: 14rpx; background: #f8fafc; display: flex; justify-content: space-between; gap: 12rpx; }.offline-row text { color: #667085; font-size: 22rpx; }.offline-row.conflict { background: #fff1f2; color: #9f1239; }
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
.error-panel { display:flex; align-items:center; justify-content:space-between; gap:16rpx; margin-top:18rpx; padding:20rpx; border-radius:24rpx; background:#fff1f3; color:#b42318; }.retry { padding:10rpx 18rpx; border-radius:16rpx; background:#b42318; color:#fff; font-weight:800; }
</style>
