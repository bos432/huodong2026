<script setup lang="ts">
import { ref } from "vue";
import { mobileAdminRequest, requireMobileAdmin } from "../../mobile-admin";

const code = ref("");
const remark = ref("");
const submitting = ref(false);
const result = ref<any>(null);

function scanCode() {
  requireMobileAdmin();
  uni.scanCode({
    success: (res) => {
      code.value = String(res.result || "").trim();
      if (code.value) submit();
    },
    fail: () => uni.showToast({ title: "扫码取消或失败", icon: "none" })
  });
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
</script>

<template>
  <view class="admin-page">
    <view class="head">
      <view class="title">签到核销</view>
      <view class="sub">扫码或手动输入用户签到码</view>
    </view>

    <view class="card">
      <view class="scan" @click="scanCode">扫码核销</view>
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
  </view>
</template>

<style scoped>
.admin-page { min-height: 100vh; padding: 24rpx; background: #f4f6f8; color: #111827; }
.head { padding: 30rpx 26rpx; border-radius: 8px; background: #111827; color: #fff; }
.title { font-size: 42rpx; font-weight: 900; }
.sub { margin-top: 8rpx; color: rgba(255,255,255,.72); font-size: 24rpx; }
.card { margin-top: 22rpx; padding: 24rpx; border-radius: 8px; background: #fff; box-shadow: 0 12rpx 34rpx rgba(15,23,42,.06); }
.scan, .submit { height: 86rpx; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: #0f766e; color: #fff; font-size: 28rpx; font-weight: 900; }
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
