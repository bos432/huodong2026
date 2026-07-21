<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getMobileAdminSession, loginMobileAdmin } from "../../mobile-admin";

const username = ref(String(uni.getStorageSync("mobile_admin_username") || ""));
const password = ref("");
const loading = ref(false);
const showPassword = ref(false);
const actionError = ref("");
const canSubmit = computed(() => username.value.trim().length > 0 && password.value.length > 0 && !loading.value);

async function submit() {
  if (!canSubmit.value) return;
  loading.value = true;
  actionError.value = "";
  try {
    await loginMobileAdmin(username.value.trim(), password.value);
    uni.setStorageSync("mobile_admin_username", username.value.trim());
    uni.showToast({ title: "登录成功", icon: "success" });
    uni.redirectTo({ url: "/pages/admin/home" });
  } catch (err: any) {
    actionError.value = err.message || "登录失败，请检查账号密码后重试。";
  } finally {
    loading.value = false;
  }
}

onShow(() => { if (getMobileAdminSession()) uni.redirectTo({ url: "/pages/admin/home" }); });
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
      <input v-model="username" class="input" maxlength="80" autocomplete="username" aria-label="后台账号" placeholder="后台账号" confirm-type="next" cursor-spacing="24" @input="actionError = ''" />
      <view class="label">密码</view>
      <view class="password-field">
        <input v-model="password" class="input password-input" maxlength="128" :password="!showPassword" autocomplete="current-password" aria-label="后台密码" placeholder="后台密码" confirm-type="done" @input="actionError = ''" @confirm="submit" />
        <view class="password-toggle" role="button" tabindex="0" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword" @keyup.enter="showPassword = !showPassword" @keyup.space.prevent="showPassword = !showPassword">{{ showPassword ? "隐藏" : "显示" }}</view>
      </view>
      <view v-if="actionError" class="action-error" role="alert" aria-live="assertive">{{ actionError }}</view>
      <button class="button primary" :disabled="!canSubmit" :loading="loading" @click="submit">{{ loading ? "登录中..." : "登录管理端" }}</button>
    </view>
  </view>
</template>

<style scoped>
.admin-login { min-height: 100vh; box-sizing:border-box; padding: calc(38rpx + env(safe-area-inset-top)) 28rpx calc(38rpx + env(safe-area-inset-bottom)); background: radial-gradient(circle at 18% 0%, rgba(255, 232, 198, 0.95), transparent 36%), linear-gradient(180deg, #fff8ef 0%, #f5f0e8 100%); color: #2f211c; }
.hero { padding: 54rpx 30rpx; border-radius: 32rpx; background: linear-gradient(135deg, #5b2f24 0%, #8f4c32 52%, #d29a5a 100%); color: #fff; box-shadow: 0 18rpx 44rpx rgba(91, 47, 36, 0.22); }
.eyebrow { color: rgba(255,255,255,.68); font-size: 22rpx; font-weight: 900; letter-spacing: .14em; }
.title { margin-top: 12rpx; font-size: 52rpx; font-weight: 950; }
.copy { margin-top: 14rpx; color: rgba(255,255,255,.76); font-size: 27rpx; line-height: 1.6; }
.form { margin-top: 24rpx; padding: 28rpx; border-radius: 28rpx; background: rgba(255,255,255,.9); box-shadow: 0 16rpx 40rpx rgba(91,47,36,.1); }
.label { margin: 18rpx 0 10rpx; color: #7a5b52; font-size: 25rpx; font-weight: 900; }
.input { width:100%; height: 84rpx; box-sizing:border-box; padding: 0 22rpx; border: 1rpx solid rgba(91,47,36,.12); border-radius: 20rpx; background: #fff; font-size: 28rpx; }
.password-field { position:relative; }.password-input { padding-right:120rpx; }.password-toggle { position:absolute; top:0; right:0; width:104rpx; height:84rpx; display:flex; align-items:center; justify-content:center; color:#0f766e; font-size:24rpx; font-weight:900; }
.action-error { margin-top:20rpx; padding:18rpx 20rpx; border:1rpx solid #fecaca; border-radius:8px; background:#fff7f7; color:#b42318; font-size:24rpx; line-height:1.55; overflow-wrap:anywhere; }
.button.primary { margin-top: 30rpx; height: 88rpx; border-radius: 22rpx; background: linear-gradient(135deg, #0f766e, #15907f); color: #fff; font-size: 28rpx; font-weight: 950; }
.button[disabled] { opacity: .55; }
@media (min-width: 900px) { .admin-login { max-width:760px; margin:0 auto; } }
</style>
