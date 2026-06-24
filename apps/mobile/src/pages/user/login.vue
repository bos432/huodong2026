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

function inputValue(event: any) {
  return String(event?.detail?.value ?? event?.target?.value ?? "");
}

function updatePhone(event: any) {
  phone.value = inputValue(event).replace(/\D/g, "").slice(0, 11);
}

function updatePassword(event: any) {
  password.value = inputValue(event).slice(0, 64);
}

function updateCode(event: any) {
  code.value = inputValue(event).replace(/\D/g, "").slice(0, 6);
}

function syncH5LoginInputs() {
  // #ifdef H5
  const readInput = (name: string) => {
    const element = document.querySelector(`[data-login-field="${name}"] input, input[data-login-field="${name}"]`) as HTMLInputElement | null;
    return element?.value || "";
  };
  const domPhone = readInput("phone").replace(/\D/g, "").slice(0, 11);
  const domPassword = readInput("password").slice(0, 64);
  const domCode = readInput("code").replace(/\D/g, "").slice(0, 6);
  if (domPhone) phone.value = domPhone;
  if (domPassword) password.value = domPassword;
  if (domCode) code.value = domCode;
  // #endif
}

function redirectTarget() {
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any)?.options || {};
  return decodeURIComponent(options.redirect || "/pages/index/index");
}

function goAdminLogin() {
  uni.navigateTo({ url: "/pages/admin/login" });
}

function requestWechatProfile(): Promise<{ nickname?: string; avatarUrl?: string }> {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    const getUserProfile = (uni as any).getUserProfile;
    if (typeof getUserProfile !== "function") {
      resolve({});
      return;
    }
    try {
      getUserProfile({
        desc: "用于完善会员昵称和头像",
        success: (res: any) => {
          const info = res?.userInfo || {};
          resolve({
            nickname: typeof info.nickName === "string" ? info.nickName : "",
            avatarUrl: typeof info.avatarUrl === "string" ? info.avatarUrl : ""
          });
        },
        fail: () => resolve({})
      });
    } catch {
      resolve({});
    }
    // #endif
    // #ifndef MP-WEIXIN
    resolve({});
    // #endif
  });
}

async function sendCode() {
  syncH5LoginInputs();
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
  syncH5LoginInputs();
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
  requestWechatProfile().then((profile) => {
    uni.login({
      provider: "weixin",
      success: async (res) => {
        try {
          await loginWechat(res.code, profile.nickname, profile.avatarUrl);
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
  });
}

onMounted(loadDecoration);
</script>

<template>
  <view class="container login-page has-custom-nav">
    <TenantContextBadge :tenant="tenant" label="当前城市" hint="登录后沿用" />

    <view class="login-hero" :style="{ background: String(innerPageLayout.headerBackgroundColor || '#8e2d28') }">
      <view class="hero-mark">慢π</view>
      <view class="hero-copy">
        <view class="title" :style="{ color: String(innerPageLayout.headerTextColor || '#fff8f0') }">{{ innerPageConfig.title || "手机号登录" }}</view>
        <view class="subtle" :style="{ color: String(innerPageLayout.headerSubtitleColor || 'rgba(255,248,240,0.82)') }">{{ innerPageConfig.subtitle || "用于查看报名、订单、签到码和会员权益。" }}</view>
      </view>
    </view>

    <PageDecorationBlocks :sections="contentSections" />

    <view class="card login-card">
      <view class="card-kicker">欢迎回来</view>
      <view class="field">
        <view class="label">手机号</view>
        <input v-model="phone" data-login-field="phone" class="input" type="number" maxlength="11" placeholder="请输入手机号" @input="updatePhone" @change="updatePhone" @blur="updatePhone" />
      </view>
      <view class="login-tabs">
        <view class="login-tab" :class="{ active: loginMode === 'password' }" @click="loginMode = 'password'">密码登录</view>
        <view class="login-tab" :class="{ active: loginMode === 'code' }" @click="loginMode = 'code'">验证码登录</view>
      </view>
      <view v-if="loginMode === 'password'" class="field">
        <view class="label">密码</view>
        <input v-model="password" data-login-field="password" class="input" type="password" maxlength="64" placeholder="请输入密码" @input="updatePassword" @change="updatePassword" @blur="updatePassword" />
      </view>
      <template v-else>
        <view class="field">
          <view class="label">验证码</view>
          <view class="code-row">
            <input v-model="code" data-login-field="code" class="input" type="number" maxlength="6" placeholder="6 位验证码" @input="updateCode" @change="updateCode" @blur="updateCode" />
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
.login-hero {
  position: relative;
  overflow: hidden;
  min-height: 300rpx;
  display: flex;
  align-items: flex-end;
  gap: 22rpx;
  padding: 34rpx 28rpx;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 44rpx rgba(91, 47, 36, 0.16);
}
.login-hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(34, 24, 19, 0.04), rgba(34, 24, 19, 0.24));
  pointer-events: none;
}
.hero-mark,
.hero-copy {
  position: relative;
  z-index: 1;
}
.hero-mark {
  flex: 0 0 auto;
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
  background: rgba(255, 248, 240, 0.16);
  color: #fff8f0;
  font-size: 30rpx;
  font-weight: 700;
  font-family: "STKaiti", "KaiTi", serif;
}
.hero-copy { min-width: 0; }
.hero-copy .title {
  font-size: 48rpx;
  line-height: 1.22;
  font-weight: 700;
  font-family: "STKaiti", "KaiTi", serif;
}
.hero-copy .subtle {
  margin-top: 12rpx;
  font-size: 25rpx;
  line-height: 1.6;
}
.login-card { display: grid; gap: 24rpx; border-radius: 24rpx; }
.card-kicker {
  color: #4a6b8a;
  font-size: 24rpx;
  font-weight: 800;
}
.field { display: grid; gap: 12rpx; }
.label { font-size: 28rpx; font-weight: 650; }
.login-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8rpx; padding: 8rpx; border-radius: 18rpx; background: #f9f4ee; }
.login-tab { height: 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 14rpx; color: #666666; font-size: 26rpx; font-weight: 800; }
.login-tab.active { background: #fff; color: #c43d3d; box-shadow: 0 8rpx 22rpx rgba(91, 47, 36, 0.08); }
.code-row { display: grid; grid-template-columns: 1fr 190rpx; gap: 12rpx; align-items: center; }
.mini-button { height: 78rpx; border-radius: 16rpx; background: #4a6b8a; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 700; }
.mini-button.disabled { background: #9ca3af; }
.notice { padding: 18rpx; border-radius: 18rpx; background: rgba(74, 107, 138, 0.08); color: #4a6b8a; font-size: 26rpx; }
.wechat-button { background: #16a34a; }
.admin-login-entry { display: flex; align-items: center; justify-content: center; min-height: 68rpx; padding: 8rpx 18rpx; border-radius: 16rpx; background: #f9f4ee; color: #4a6b8a; font-size: 24rpx; font-weight: 800; }
</style>
