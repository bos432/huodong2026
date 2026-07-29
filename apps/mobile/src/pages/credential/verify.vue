<template>
  <view class="verify-page">
    <view class="custom-nav">
      <view class="nav-back" role="button" tabindex="0" aria-label="返回上一页" @click="goBack" @keyup.enter="goBack" @keyup.space.prevent="goBack">‹ 返回</view>
      <text class="nav-title">公开验真</text>
      <view class="nav-placeholder"></view>
    </view>

    <view class="verify-head">
      <text class="verify-title">凭证真伪查询</text>
      <text class="verify-subtitle">输入证书、志愿服务证明或公益贡献凭证编号，查询当前有效状态。</text>
    </view>

    <view class="verify-form">
      <view class="mode-switch" role="tablist" aria-label="凭证类型">
        <view :class="['mode-item', { active: mode === 'certificate' }]" role="tab" tabindex="0" :aria-selected="mode === 'certificate'" @click="setMode('certificate')" @keyup.enter="setMode('certificate')" @keyup.space.prevent="setMode('certificate')">证书</view>
        <view :class="['mode-item', { active: mode === 'proof' }]" role="tab" tabindex="0" :aria-selected="mode === 'proof'" @click="setMode('proof')" @keyup.enter="setMode('proof')" @keyup.space.prevent="setMode('proof')">服务证明</view>
        <view :class="['mode-item', { active: mode === 'charity' }]" role="tab" tabindex="0" :aria-selected="mode === 'charity'" @click="setMode('charity')" @keyup.enter="setMode('charity')" @keyup.space.prevent="setMode('charity')">公益贡献</view>
      </view>
      <input v-model="code" class="code-input" maxlength="100" :aria-label="mode === 'certificate' ? '证书编号' : mode === 'proof' ? '服务证明编号' : '公益贡献凭证编号'" :placeholder="mode === 'certificate' ? '请输入证书编号' : mode === 'proof' ? '请输入服务证明编号' : '请输入公益贡献凭证编号'" confirm-type="search" @input="handleCodeInput" @confirm="verify" />
      <button class="verify-button" :disabled="loading || !code.trim()" :aria-busy="loading" @click="verify">{{ loading ? "查询中..." : "立即验真" }}</button>
    </view>

    <view v-if="errorMessage" class="state-card error-state" role="alert" aria-live="assertive">
      <text>{{ errorMessage }}</text>
      <view class="state-retry" role="button" tabindex="0" aria-label="重新查询凭证" @click="verify" @keyup.enter="verify" @keyup.space.prevent="verify">重新查询</view>
    </view>

    <view v-if="result" class="result-card" :class="{ invalid: !result.verify?.valid }" role="status" aria-live="polite" aria-atomic="true">
      <view class="result-head">
        <view>
          <text class="result-label">验真结果</text>
          <text class="result-title">{{ result.verify?.valid ? "凭证有效" : "凭证已失效" }}</text>
        </view>
        <text class="status-badge">{{ result.verify?.valid ? "有效" : "无效" }}</text>
      </view>
      <view class="result-list">
        <view><text>凭证编号</text><strong>{{ result.certificateNo || result.proofNo || "-" }}</strong></view>
        <view><text>凭证名称</text><strong>{{ result.name || result.title || "-" }}</strong></view>
        <view><text>持有人</text><strong>{{ result.holderName || (result.verify?.valid ? "未登记" : "已隐藏") }}</strong></view>
        <view><text>发放时间</text><strong>{{ formatTime(result.issuedAt) }}</strong></view>
        <view v-if="result.course?.title"><text>课程</text><strong>{{ result.course.title }}</strong></view>
        <view v-if="result.course?.issuerName"><text>发证单位</text><strong>{{ result.course.issuerName }}</strong></view>
        <view v-if="result.course?.completionProgress !== null && result.course?.completionProgress !== undefined"><text>完成进度</text><strong>{{ Number(result.course.completionProgress).toFixed(0) }}%</strong></view>
        <view v-if="result.snapshot?.taskTitle"><text>志愿任务</text><strong>{{ result.snapshot.taskTitle }}</strong></view>
        <view v-if="result.serviceHours || result.hours || result.snapshot?.hours"><text>服务时长</text><strong>{{ Number(result.serviceHours || result.hours || result.snapshot?.hours || 0).toFixed(1) }} 小时</strong></view>
        <view v-if="result.contributionAmount !== undefined"><text>公益贡献</text><strong>¥{{ Number(result.contributionAmount || 0).toFixed(2) }}</strong></view>
        <view v-if="result.sourceTitle"><text>贡献来源</text><strong>{{ result.sourceTitle }}</strong></view>
      </view>
      <text class="result-note">{{ result.statement || "查询结果以系统当前记录为准。已撤销凭证仅展示失效状态，不展示持有人和业务详情。" }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { request } from "../../api";
import { formatShanghaiDate } from "../../shanghai-date";

type VerifyMode = "certificate" | "proof" | "charity";
const mode = ref<VerifyMode>("certificate");
const code = ref("");
const loading = ref(false);
const errorMessage = ref("");
const result = ref<any>(null);
let verifySerial = 0;

function setMode(value: VerifyMode) {
  if (mode.value === value) return;
  verifySerial += 1;
  mode.value = value;
  loading.value = false;
  result.value = null;
  errorMessage.value = "";
}

function handleCodeInput() {
  verifySerial += 1;
  loading.value = false;
  result.value = null;
  errorMessage.value = "";
}

function formatTime(value?: string) {
  return formatShanghaiDate(value);
}

async function verify() {
  const value = code.value.trim();
  if (!value || loading.value) return;
  const requestedMode = mode.value;
  const serial = ++verifySerial;
  loading.value = true;
  errorMessage.value = "";
  result.value = null;
  try {
    const path = requestedMode === "certificate" ? `/public/certificates/${encodeURIComponent(value)}/verify` : requestedMode === "proof" ? `/public/volunteer-proofs/${encodeURIComponent(value)}/verify` : `/public/charity-certificates/${encodeURIComponent(value)}/verify`;
    const verified = await request<any>(path);
    if (serial !== verifySerial || mode.value !== requestedMode || code.value.trim() !== value) return;
    result.value = verified;
  } catch (error: any) {
    if (serial === verifySerial && mode.value === requestedMode && code.value.trim() === value) errorMessage.value = error?.message || "未查询到该凭证，请核对编号后重试。";
  } finally {
    if (serial === verifySerial) loading.value = false;
  }
}

function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack();
  else uni.reLaunch({ url: "/pages/index/index" });
}

onLoad((query) => {
  const value = String(query?.code || "").trim();
  const requestedMode = String(query?.type || "");
  mode.value = requestedMode === "charity" || value.toUpperCase().startsWith("MPCG") ? "charity" : requestedMode === "proof" || value.toUpperCase().startsWith("VPR") ? "proof" : "certificate";
  code.value = value;
  if (value) void verify();
});
</script>

<style scoped>
.verify-page { width:100%; max-width:760px; min-height:100vh; box-sizing:border-box; margin:0 auto; padding:24rpx 24rpx 80rpx; background:#f7f2ea; color:#263d3c; }
.custom-nav { display:flex; align-items:center; padding:18rpx 0 20rpx; }
.nav-back,.nav-placeholder { width:130rpx; color:#4a6b8a; font-size:28rpx; }
.nav-title { flex:1; text-align:center; font-size:32rpx; font-weight:800; }
.verify-head { padding:30rpx 28rpx; border-radius:8px; background:#214b4e; color:#fffaf2; }
.verify-title { display:block; font-size:38rpx; font-weight:900; }
.verify-subtitle { display:block; margin-top:12rpx; color:rgba(255,250,242,.76); font-size:25rpx; line-height:1.55; }
.verify-form,.result-card,.state-card { margin-top:20rpx; padding:24rpx; border:1rpx solid #e2d5c4; border-radius:8px; background:#fffdf8; }
.mode-switch { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8rpx; padding:6rpx; border-radius:8px; background:#eee5d9; }
.mode-item { min-height:68rpx; display:flex; align-items:center; justify-content:center; border-radius:6px; color:#75685b; font-size:26rpx; font-weight:800; }
.mode-item.active { background:#fff; color:#214b4e; box-shadow:0 4rpx 12rpx rgba(38,61,60,.08); }
.nav-back:focus-visible,.mode-item:focus-visible,.state-retry:focus-visible { outline:3rpx solid #0f766e; outline-offset:4rpx; }
.code-input { height:84rpx; box-sizing:border-box; margin-top:20rpx; padding:0 20rpx; border:1rpx solid #d9c9b5; border-radius:8px; background:#fff; font-size:27rpx; }
.verify-button { height:82rpx; margin-top:18rpx; border-radius:8px; background:#214b4e; color:#fff; font-size:28rpx; font-weight:900; line-height:82rpx; }
.verify-button[disabled] { opacity:.55; }
.state-card { display:grid; gap:12rpx; color:#667085; font-size:25rpx; line-height:1.5; }
.error-state { border-color:#fecaca; background:#fff7f7; color:#b91c1c; }
.state-retry { width:max-content; color:#214b4e; font-weight:900; }
.result-card.invalid { border-color:#fecaca; background:#fff8f8; }
.result-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18rpx; }
.result-label { display:block; color:#8f8172; font-size:23rpx; }
.result-title { display:block; margin-top:6rpx; color:#214b4e; font-size:36rpx; font-weight:900; }
.invalid .result-title { color:#b42318; }
.status-badge { flex:0 0 auto; padding:10rpx 18rpx; border-radius:999rpx; background:#e4f1ed; color:#0f766e; font-size:24rpx; font-weight:900; }
.invalid .status-badge { background:#fee2e2; color:#b42318; }
.result-list { margin-top:22rpx; border-top:1rpx solid #eadfce; }
.result-list view { display:grid; grid-template-columns:150rpx minmax(0,1fr); gap:16rpx; padding:18rpx 0; border-bottom:1rpx solid #f0e6d8; }
.result-list text { color:#8f8172; font-size:24rpx; }
.result-list strong { min-width:0; color:#263d3c; font-size:25rpx; overflow-wrap:anywhere; }
.result-note { display:block; margin-top:20rpx; color:#8f8172; font-size:22rpx; line-height:1.6; }
</style>
