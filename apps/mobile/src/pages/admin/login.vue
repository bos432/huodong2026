<script setup lang="ts">
import { computed, ref } from "vue";
import { getMobileAdminSession, loginMobileAdmin } from "../../mobile-admin";

const username = ref(String(uni.getStorageSync("user_phone") || "admin"));
const password = ref("");
const loading = ref(false);
const canSubmit = computed(() => username.value.trim().length > 0 && password.value.length > 0 && !loading.value);

async function submit() {
  if (!canSubmit.value) return;
  loading.value = true;
  try {
    await loginMobileAdmin(username.value.trim(), password.value);
    uni.showToast({ title: "登录成功", icon: "success" });
    uni.redirectTo({ url: "/pages/admin/home" });
  } catch (err: any) {
    uni.showToast({ title: err.message || "登录失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

if (getMobileAdminSession()) {
  uni.redirectTo({ url: "/pages/admin/home" });
}
</script>

<template>
  <view class="admin-login">
    <view class="hero">
      <view class="eyebrow">手机管理端</view>
      <view class="title">活动发布</view>
      <view class="copy">使用后台账号登录，在手机上创建、编辑和发布活动。</view>
    </view>
    <view class="form">
      <view class="label">账号</view>
      <input v-model="username" class="input" placeholder="后台账号" />
      <view class="label">密码</view>
      <input v-model="password" class="input" password placeholder="后台密码" confirm-type="done" @confirm="submit" />
      <button class="button primary" :disabled="!canSubmit" :loading="loading" @click="submit">登录管理端</button>
    </view>
  </view>
</template>

<style scoped>
.admin-login { min-height: 100vh; padding: 38rpx 28rpx; background: radial-gradient(circle at 18% 0%, rgba(255, 232, 198, 0.95), transparent 36%), linear-gradient(180deg, #fff8ef 0%, #f5f0e8 100%); color: #2f211c; }
.hero { padding: 54rpx 30rpx; border-radius: 32rpx; background: linear-gradient(135deg, #5b2f24 0%, #8f4c32 52%, #d29a5a 100%); color: #fff; box-shadow: 0 18rpx 44rpx rgba(91, 47, 36, 0.22); }
.eyebrow { color: rgba(255,255,255,.68); font-size: 22rpx; font-weight: 900; letter-spacing: .14em; }
.title { margin-top: 12rpx; font-size: 52rpx; font-weight: 950; }
.copy { margin-top: 14rpx; color: rgba(255,255,255,.76); font-size: 27rpx; line-height: 1.6; }
.form { margin-top: 24rpx; padding: 28rpx; border-radius: 28rpx; background: rgba(255,255,255,.9); box-shadow: 0 16rpx 40rpx rgba(91,47,36,.1); }
.label { margin: 18rpx 0 10rpx; color: #7a5b52; font-size: 25rpx; font-weight: 900; }
.input { height: 84rpx; padding: 0 22rpx; border: 1rpx solid rgba(91,47,36,.12); border-radius: 20rpx; background: #fff; font-size: 28rpx; }
.button.primary { margin-top: 30rpx; height: 88rpx; border-radius: 22rpx; background: linear-gradient(135deg, #0f766e, #15907f); color: #fff; font-size: 28rpx; font-weight: 950; }
.button[disabled] { opacity: .55; }
</style>
