<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { loginH5, loginH5Password, loginWechat, requestH5Code, withTenantCode } from "../../api";
import { isTabUrl, usePageDecoration } from "../../decoration";
import TenantContextBadge from "../../components/TenantContextBadge.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import AppBottomNav from "../../components/AppBottomNav.vue";

const phone = ref("");
const password = ref("");
const code = ref("");
const token = ref("");
const expiresAt = ref("");
const devCode = ref("");
const loginMode = ref<"password" | "code">("password");
const sending = ref(false);
const loggingIn = ref(false);
const message = ref("");
const { tenant, contentSections, innerPageConfig, innerPageLayout, loadDecoration } = usePageDecoration("login_page", "/pages/user/login");

const canSend = computed(() => /^1\d{10}$/.test(phone.value.trim()) && !sending.value);
const canPasswordLogin = computed(() => /^1\d{10}$/.test(phone.value.trim()) && password.value.length >= 6 && !loggingIn.value);
const canCodeLogin = computed(() => /^1\d{10}$/.test(phone.value.trim()) && /^\d{6}$/.test(code.value.trim()) && token.value && !loggingIn.value);
const canLogin = computed(() => (loginMode.value === "password" ? canPasswordLogin.value : canCodeLogin.value));

function redirectTarget() {
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any)?.options || {};
  return decodeURIComponent(options.redirect || "/pages/index/index");
}

function goAdminLogin() {
  uni.navigateTo({ url: "/pages/admin/login" });
}

async function sendCode() {
  if (!canSend.value) {
    uni.showToast({ title: "请输入正确的手机号", icon: "none" });
    return;
  }
  sending.value = true;
  message.value = "";
  try {
    const data = await requestH5Code(phone.value.trim());
    token.value = data.verificationToken;
    expiresAt.value = data.expiresAt;
    devCode.value = data.devCode || "";
    if (devCode.value) code.value = devCode.value;
    message.value = devCode.value ? `本地开发验证码：${devCode.value}` : "验证码已发送，请查看短信";
    uni.showToast({ title: "验证码已发送", icon: "success" });
  } catch (error: any) {
    uni.showToast({ title: error.message || "发送失败", icon: "none" });
  } finally {
    sending.value = false;
  }
}

async function submit() {
  if (!canLogin.value) {
    uni.showToast({ title: loginMode.value === "password" ? "请填写手机号和密码" : "请填写手机号和 6 位验证码", icon: "none" });
    return;
  }
  loggingIn.value = true;
  try {
    if (loginMode.value === "password") await loginH5Password(phone.value.trim(), password.value, `用户${phone.value.slice(-4)}`);
    else await loginH5(phone.value.trim(), token.value, code.value.trim(), `用户${phone.value.slice(-4)}`);
    uni.showToast({ title: "登录成功", icon: "success" });
    const target = redirectTarget();
    if (isTabUrl(target)) uni.reLaunch({ url: withTenantCode(target.split("?")[0]) });
    else uni.redirectTo({ url: withTenantCode(target) });
  } catch (error: any) {
    uni.showToast({ title: error.message || "登录失败", icon: "none" });
  } finally {
    loggingIn.value = false;
  }
}

function submitWechat() {
  if (loggingIn.value) return;
  loggingIn.value = true;
  uni.login({
    provider: "weixin",
    success: async (res) => {
      try {
        await loginWechat(res.code);
        uni.showToast({ title: "登录成功", icon: "success" });
        const target = redirectTarget();
        if (isTabUrl(target)) uni.reLaunch({ url: withTenantCode(target.split("?")[0]) });
        else uni.redirectTo({ url: withTenantCode(target) });
      } catch (error: any) {
        uni.showToast({ title: error.message || "微信登录失败", icon: "none" });
      } finally {
        loggingIn.value = false;
      }
    },
    fail: (error) => {
      loggingIn.value = false;
      uni.showToast({ title: error.errMsg || "微信登录失败", icon: "none" });
    }
  });
}

onMounted(loadDecoration);
</script>

<template>
  <view class="container login-page">
    <TenantContextBadge :tenant="tenant" label="当前城市" hint="登录后沿用" />
    <PageDecorationBlocks :sections="contentSections" />

    <view class="login-head">
      <view class="title" :style="{ color: String(innerPageLayout.headerTextColor || '#172033') }">{{ innerPageConfig.title || "手机号登录" }}</view>
      <view class="subtle" :style="{ color: String(innerPageLayout.headerSubtitleColor || '#667085') }">{{ innerPageConfig.subtitle || "用于查看报名、订单、签到码和会员权益。" }}</view>
    </view>

    <view class="card login-card">
      <view class="field">
        <view class="label">手机号</view>
        <input v-model="phone" class="input" type="number" maxlength="11" placeholder="请输入手机号" />
      </view>
      <view class="login-tabs">
        <view class="login-tab" :class="{ active: loginMode === 'password' }" @click="loginMode = 'password'">密码登录</view>
        <view class="login-tab" :class="{ active: loginMode === 'code' }" @click="loginMode = 'code'">验证码登录</view>
      </view>
      <view v-if="loginMode === 'password'" class="field">
        <view class="label">密码</view>
        <input v-model="password" class="input" type="password" maxlength="64" placeholder="请输入密码" />
      </view>
      <template v-else>
        <view class="field">
          <view class="label">验证码</view>
          <view class="code-row">
            <input v-model="code" class="input" type="number" maxlength="6" placeholder="6 位验证码" />
            <view class="mini-button" :class="{ disabled: !canSend }" @click="sendCode">{{ sending ? "发送中" : "获取验证码" }}</view>
          </view>
        </view>
        <view v-if="message" class="notice">{{ message }}</view>
        <view v-if="expiresAt" class="subtle">有效期至：{{ expiresAt.replace("T", " ").slice(0, 16) }}</view>
      </template>
      <view class="button" :class="{ secondary: !canLogin }" @click="submit">{{ loggingIn ? "登录中..." : "登录" }}</view>
      <!-- #ifndef H5 -->
      <view class="button wechat-button" @click="submitWechat">{{ loggingIn ? "登录中..." : "微信登录" }}</view>
      <!-- #endif -->
      <view class="admin-login-entry" @click="goAdminLogin">
        <text>管理端入口</text>
      </view>
    </view>
    <AppBottomNav current-path="/pages/user/my" />
  </view>
</template>

<style scoped>
.login-page { display: grid; align-content: start; gap: 20rpx; padding-bottom: 160rpx; }
.login-head { padding: 38rpx 6rpx 10rpx; }
.login-head .title { margin-bottom: 12rpx; }
.login-card { display: grid; gap: 24rpx; }
.field { display: grid; gap: 12rpx; }
.label { font-size: 28rpx; font-weight: 650; }
.login-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8rpx; padding: 6rpx; border-radius: 6px; background: #f3f4f6; }
.login-tab { height: 68rpx; display: flex; align-items: center; justify-content: center; border-radius: 6px; color: #667085; font-size: 26rpx; font-weight: 800; }
.login-tab.active { background: #fff; color: #0f766e; box-shadow: 0 4rpx 16rpx rgba(15, 118, 110, 0.12); }
.code-row { display: grid; grid-template-columns: 1fr 190rpx; gap: 12rpx; align-items: center; }
.mini-button { height: 78rpx; border-radius: 6px; background: #0f766e; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26rpx; }
.mini-button.disabled { background: #9ca3af; }
.notice { padding: 18rpx; border-radius: 6px; background: #f3faf8; color: #0f766e; font-size: 26rpx; }
.wechat-button { background: #16a34a; }
.admin-login-entry { display: flex; align-items: center; justify-content: center; min-height: 62rpx; padding: 8rpx 18rpx; border-radius: 6px; background: #f3f4f6; color: #667085; font-size: 24rpx; font-weight: 800; }
</style>
