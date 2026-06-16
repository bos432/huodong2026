<script setup lang="ts">
import { computed, ref } from "vue";
import { getMobileAdminSession, loginMobileAdmin } from "../../mobile-admin";

const username = ref("admin");
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
.admin-login { min-height: 100vh; padding: 38rpx 28rpx; background: #f4f6f8; color: #111827; }
.hero { padding: 52rpx 28rpx; border-radius: 8px; background: #111827; color: #fff; }
.eyebrow { color: #9ee8d8; font-size: 24rpx; font-weight: 800; }
.title { margin-top: 12rpx; font-size: 52rpx; font-weight: 900; }
.copy { margin-top: 14rpx; color: rgba(255,255,255,.72); font-size: 27rpx; line-height: 1.6; }
.form { margin-top: 24rpx; padding: 26rpx; border-radius: 8px; background: #fff; box-shadow: 0 16rpx 40rpx rgba(15,23,42,.08); }
.label { margin: 18rpx 0 10rpx; color: #344054; font-size: 25rpx; font-weight: 800; }
.input { height: 84rpx; padding: 0 22rpx; border: 1px solid #d7dde8; border-radius: 6px; background: #fff; font-size: 28rpx; }
.button.primary { margin-top: 30rpx; height: 86rpx; border-radius: 6px; background: #0f766e; color: #fff; font-size: 28rpx; font-weight: 900; }
.button[disabled] { opacity: .55; }
</style>
