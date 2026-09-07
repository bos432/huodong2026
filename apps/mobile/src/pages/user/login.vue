<script setup lang="ts">
import GuofengPageHeading from '../../components/GuofengPageHeading.vue';
import { computed, onUnmounted, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getCurrentTenantCode, loginH5, loginH5Password, loginWechat, requestH5Code, uploadMyAvatar, withTenantCode } from "../../api";
import { filterIntrinsicHeaderDecorationSections, isTabUrl, usePageDecoration } from "../../decoration";
import { normalizeLoginRedirectTarget } from "../../login-redirect";
import TenantContextBadge from "../../components/TenantContextBadge.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import AppBottomNav from "../../components/AppBottomNav.vue";
import WechatPhoneBindSheet from "../../components/WechatPhoneBindSheet.vue";
import { reviewSafeText } from "../../review-safe-text";
import { formatShanghaiDateTime } from "../../tenant-load-guard";

type WechatProfilePayload = {
  nickname?: string;
  avatarUrl?: string;
  authorized?: boolean;
};

const phone = ref("");
const password = ref("");
const code = ref("");
const token = ref("");
const expiresAt = ref("");
const devCode = ref("");
const loginMode = ref<"password" | "code">("code");
const sending = ref(false);
const loggingIn = ref(false);
const message = ref("");
const actionError = ref("");
const cooldownSeconds = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;
const wechatAuthVisible = ref(false);
const wechatAuthNickname = ref("");
const wechatAuthAvatarPath = ref("");
const wechatAuthMessage = ref("");
const phoneBindVisible = ref(false);
const { tenant, bottomNavSection, contentSections, innerPageConfig, innerPageLayout, showBottomNav, loadDecoration } = usePageDecoration("login_page", "/pages/user/login");
const bodyDecorationSections = computed(() => filterIntrinsicHeaderDecorationSections(contentSections.value));

const canSend = computed(() => /^1\d{10}$/.test(phone.value.trim()) && !sending.value && cooldownSeconds.value === 0);
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

function setLoginMode(mode: "password" | "code") {
  if (loggingIn.value) return;
  loginMode.value = mode;
  actionError.value = "";
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
  return normalizeLoginRedirectTarget(options.redirect, getCurrentTenantCode());
}

function goAdminLogin() {
  uni.navigateTo({ url: "/pages/admin/login" });
}

function goHome() {
  uni.reLaunch({ url: withTenantCode("/pages/index/index") });
}

function goAfterLogin() {
  const target = redirectTarget();
  if (isTabUrl(target)) uni.reLaunch({ url: target });
  else uni.redirectTo({ url: target });
}

function startCooldown(seconds = 60) {
  cooldownSeconds.value = Math.max(Math.trunc(Number(seconds) || 60), 1);
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    cooldownSeconds.value = Math.max(cooldownSeconds.value - 1, 0);
    if (cooldownSeconds.value === 0 && cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  }, 1000);
}

function formatExpiry(value: string) {
  return formatShanghaiDateTime(value, "");
}

async function sendCode() {
  if (sending.value || cooldownSeconds.value > 0 || loggingIn.value) return;
  syncH5LoginInputs();
  if (!canSend.value) {
    actionError.value = "请输入11位中国大陆手机号";
    uni.showToast({ title: actionError.value, icon: "none" });
    return;
  }
  sending.value = true;
  message.value = "";
  actionError.value = "";
  try {
    const data = await requestH5Code(phone.value.trim());
    token.value = data.verificationToken;
    expiresAt.value = data.expiresAt;
    devCode.value = data.devCode || "";
    if (devCode.value) code.value = devCode.value;
    message.value = devCode.value ? `本地开发验证码：${devCode.value}` : "验证码已发送，请查看短信";
    startCooldown(data.cooldownSeconds || 60);
    uni.showToast({ title: "验证码已发送", icon: "success" });
  } catch (error: any) {
    actionError.value = reviewSafeText(error.message || "验证码发送失败");
    uni.showToast({ title: actionError.value, icon: "none" });
  } finally {
    sending.value = false;
  }
}

async function submit() {
  if (loggingIn.value) return;
  syncH5LoginInputs();
  if (!canLogin.value) {
    actionError.value = !/^1\d{10}$/.test(phone.value.trim())
      ? "请输入11位中国大陆手机号"
      : loginMode.value === "password"
        ? "请输入至少6位密码；未设置密码请使用验证码登录"
        : !token.value ? "请先获取验证码" : "请输入6位短信验证码";
    uni.showToast({ title: actionError.value, icon: "none" });
    return;
  }
  loggingIn.value = true;
  actionError.value = "";
  try {
    if (loginMode.value === "password") await loginH5Password(phone.value.trim(), password.value, `用户${phone.value.slice(-4)}`);
    else await loginH5(phone.value.trim(), token.value, code.value.trim(), `用户${phone.value.slice(-4)}`);
    uni.showToast({ title: "登录成功", icon: "success" });
    goAfterLogin();
  } catch (error: any) {
    actionError.value = reviewSafeText(error.message || "登录失败");
    uni.showToast({ title: actionError.value, icon: "none" });
  } finally {
    loggingIn.value = false;
  }
}

function closeWechatAuthPanel() {
  if (loggingIn.value) return;
  wechatAuthVisible.value = false;
  wechatAuthMessage.value = "";
}

function chooseWechatLoginAvatar(event: any) {
  const filePath = String(event?.detail?.avatarUrl || "");
  if (!filePath) {
    uni.showToast({ title: "未选择头像", icon: "none" });
    return;
  }
  wechatAuthAvatarPath.value = filePath;
}

function updateWechatAuthNickname(event: any) {
  wechatAuthNickname.value = inputValue(event).slice(0, 40);
}

async function finishWechatLogin(profile: Partial<WechatProfilePayload> = {}, avatarFilePath = "") {
  return new Promise<any>((resolve, reject) => {
    uni.login({
      provider: "weixin",
      success: async (res) => {
        try {
          const user = await loginWechat(res.code, profile.nickname, avatarFilePath ? undefined : profile.avatarUrl);
          if (avatarFilePath) await uploadMyAvatar(avatarFilePath);
          resolve(user);
        } catch (error) {
          reject(error);
        }
      },
      fail: (error) => reject(new Error(error.errMsg || "授权登录失败"))
    });
  });
}

function continueAfterWechatLogin(user: any) {
  uni.showToast({ title: "登录成功", icon: "success" });
  if (!user?.phone) {
    phoneBindVisible.value = true;
    return;
  }
  goAfterLogin();
}

async function submitWechat() {
  if (loggingIn.value) return;
  loggingIn.value = true;
  try {
    const user = await finishWechatLogin();
    continueAfterWechatLogin(user);
  } catch (error: any) {
    actionError.value = reviewSafeText(error.message || "授权登录失败");
    uni.showToast({ title: actionError.value, icon: "none" });
  } finally {
    loggingIn.value = false;
  }
}

async function confirmWechatProfileLogin() {
  const nickname = wechatAuthNickname.value.trim();
  if (!nickname && !wechatAuthAvatarPath.value) {
    uni.showToast({ title: "请选择头像或填写昵称", icon: "none" });
    return;
  }
  loggingIn.value = true;
  try {
    const user = await finishWechatLogin({ nickname, authorized: true }, wechatAuthAvatarPath.value);
    wechatAuthVisible.value = false;
    continueAfterWechatLogin(user);
  } catch (error: any) {
    actionError.value = reviewSafeText(error.message || "授权登录失败");
    uni.showToast({ title: actionError.value, icon: "none" });
  } finally {
    loggingIn.value = false;
  }
}

function closePhoneBindAfterLogin() {
  phoneBindVisible.value = false;
  goAfterLogin();
}

function handlePhoneBoundAfterLogin() {
  phoneBindVisible.value = false;
  goAfterLogin();
}

onShow(async () => { await loadDecoration(); });
onUnmounted(() => { if (cooldownTimer) clearInterval(cooldownTimer); });
</script>

<template>
  <view class="container login-page" :class="{ 'has-custom-nav': showBottomNav }">
    <TenantContextBadge :tenant="tenant" label="当前城市" hint="登录后沿用" />

    <GuofengPageHeading :title="innerPageConfig.title || '手机号登录'" :subtitle="innerPageConfig.subtitle" :background="innerPageLayout.headerBackgroundColor" :text-color="innerPageLayout.headerTextColor" :muted-color="innerPageLayout.headerSubtitleColor" />

    <PageDecorationBlocks :sections="bodyDecorationSections" />

    <view class="card login-card">
      <view class="card-kicker">欢迎回来</view>
      <!-- #ifndef H5 -->
      <button class="button wechat-button native-button primary-wechat" :disabled="loggingIn" @tap="submitWechat">{{ loggingIn ? "登录中..." : "快捷登录" }}</button>
      <view class="login-divider"><text>手机号登录</text></view>
      <!-- #endif -->
      <view class="phone-login-section">
        <view class="field">
          <view class="label">手机号</view>
          <!-- #ifdef H5 -->
          <component :is="'input'" :value="phone" data-login-field="phone" class="input" type="tel" inputmode="numeric" name="phone" autocomplete="username" maxlength="11" placeholder="请输入11位手机号" aria-label="手机号" @input="updatePhone" @change="updatePhone" @blur="updatePhone" />
          <!-- #endif -->
          <!-- #ifndef H5 -->
          <input v-model="phone" data-login-field="phone" class="input" type="number" maxlength="11" placeholder="请输入手机号" aria-label="手机号" confirm-type="next" @input="updatePhone" @change="updatePhone" @blur="updatePhone" />
          <!-- #endif -->
        </view>
        <view class="login-tabs">
          <view class="login-tab" :class="{ active: loginMode === 'code', disabled: loggingIn }" role="button" tabindex="0" :aria-pressed="loginMode === 'code'" :aria-disabled="loggingIn" aria-label="切换到验证码登录" @click="setLoginMode('code')" @keyup.enter="setLoginMode('code')" @keyup.space.prevent="setLoginMode('code')">验证码登录 / 注册</view>
          <view class="login-tab" :class="{ active: loginMode === 'password', disabled: loggingIn }" role="button" tabindex="0" :aria-pressed="loginMode === 'password'" :aria-disabled="loggingIn" aria-label="切换到密码登录" @click="setLoginMode('password')" @keyup.enter="setLoginMode('password')" @keyup.space.prevent="setLoginMode('password')">密码登录</view>
        </view>
        <view v-if="loginMode === 'password'" class="field">
          <view class="label">密码</view>
          <!-- #ifdef H5 -->
          <component :is="'input'" :value="password" data-login-field="password" class="input" type="password" name="password" autocomplete="current-password" maxlength="64" placeholder="请输入密码" aria-label="密码" @keyup.enter="submit" @input="updatePassword" @change="updatePassword" @blur="updatePassword" />
          <!-- #endif -->
          <!-- #ifndef H5 -->
          <input v-model="password" data-login-field="password" class="input" type="password" maxlength="64" placeholder="请输入密码" aria-label="密码" confirm-type="done" @confirm="submit" @input="updatePassword" @change="updatePassword" @blur="updatePassword" />
          <!-- #endif -->
        </view>
        <template v-else>
          <view class="field">
            <view class="label">验证码</view>
            <view class="code-row">
              <!-- #ifdef H5 -->
              <component :is="'input'" :value="code" data-login-field="code" class="input" type="text" inputmode="numeric" name="code" autocomplete="one-time-code" maxlength="6" placeholder="6 位验证码" aria-label="验证码" @keyup.enter="submit" @input="updateCode" @change="updateCode" @blur="updateCode" />
              <!-- #endif -->
              <!-- #ifndef H5 -->
              <input v-model="code" data-login-field="code" class="input" type="number" maxlength="6" placeholder="6 位验证码" aria-label="验证码" confirm-type="done" @confirm="submit" @input="updateCode" @change="updateCode" @blur="updateCode" />
              <!-- #endif -->
              <view class="mini-button" :class="{ disabled: !canSend || loggingIn }" role="button" tabindex="0" :aria-disabled="sending || cooldownSeconds > 0 || loggingIn" :aria-busy="sending" :aria-label="cooldownSeconds ? `${cooldownSeconds}秒后可重新获取验证码` : '获取验证码'" @click="sendCode" @keyup.enter="sendCode" @keyup.space.prevent="sendCode">{{ sending ? "发送中" : cooldownSeconds ? `${cooldownSeconds}秒` : "获取验证码" }}</view>
            </view>
          </view>
          <view v-if="message" class="notice">{{ message }}</view>
          <view v-if="expiresAt" class="subtle">有效期至：{{ formatExpiry(expiresAt) }}</view>
        </template>
        <view v-if="actionError" class="login-error" role="alert" aria-live="assertive">{{ actionError }}</view>
        <view class="button" :class="{ secondary: !canLogin, disabled: loggingIn }" role="button" tabindex="0" :aria-disabled="loggingIn" :aria-busy="loggingIn" aria-label="登录" @click="submit" @keyup.enter="submit" @keyup.space.prevent="submit">{{ loggingIn ? "登录中…" : "登录" }}</view>
      </view>
      <view class="admin-login-entry" role="button" tabindex="0" aria-label="进入管理端登录" @click="goAdminLogin" @keyup.enter="goAdminLogin" @keyup.space.prevent="goAdminLogin">
        <text>管理端入口</text>
      </view>
      <view class="home-entry" role="button" tabindex="0" aria-label="返回首页" @click="goHome" @keyup.enter="goHome" @keyup.space.prevent="goHome">
        <text>先逛首页</text>
      </view>
    </view>
    <!-- #ifdef MP-WEIXIN -->
    <view v-if="wechatAuthVisible" class="wechat-auth-mask">
      <view class="wechat-auth-sheet">
        <view class="wechat-auth-brand">慢π</view>
        <view class="wechat-auth-title">获取你的昵称、头像和登录权限</view>
        <view v-if="wechatAuthMessage" class="wechat-auth-message">{{ wechatAuthMessage }}</view>
        <button class="wechat-auth-row avatar-select" open-type="chooseAvatar" @chooseavatar="chooseWechatLoginAvatar">
          <text class="auth-label">头像</text>
          <image v-if="wechatAuthAvatarPath" class="auth-avatar" :src="wechatAuthAvatarPath" mode="aspectFill" />
          <view v-else class="auth-avatar auth-avatar-empty">头像</view>
          <text class="auth-arrow">›</text>
        </button>
        <view class="wechat-auth-row">
          <text class="auth-label">昵称</text>
          <input v-model="wechatAuthNickname" type="nickname" class="auth-nickname-input" maxlength="40" placeholder="请选择或填写昵称" @input="updateWechatAuthNickname" />
        </view>
        <view class="wechat-auth-actions">
          <button class="auth-action reject" :disabled="loggingIn" @tap="closeWechatAuthPanel">拒绝</button>
          <button class="auth-action allow" :disabled="loggingIn" @tap="confirmWechatProfileLogin">{{ loggingIn ? "登录中" : "允许" }}</button>
        </view>
      </view>
    </view>
    <!-- #endif -->
    <WechatPhoneBindSheet
      :visible="phoneBindVisible"
      title="绑定手机号后继续"
      message="登录已完成。报名、下单、余额和会员权益需要手机号，建议现在完成手机号快捷绑定。"
      close-text="暂不绑定"
      @close="closePhoneBindAfterLogin"
      @bound="handlePhoneBoundAfterLogin"
    />
    <AppBottomNav v-if="showBottomNav" :section="bottomNavSection" current-path="/pages/user/login" />
  </view>
</template>

<style scoped>
.login-page { display: grid; align-content: start; gap: 20rpx; padding-bottom: 160rpx; }
.login-card { display: grid; gap: 24rpx; padding: 24rpx 0; border: 0; border-radius: 0; background: #fff; }
.card-kicker {
  color: #386151;
  font-size: 24rpx;
  font-weight: 800;
}
.primary-wechat { height: 92rpx; font-size: 30rpx; }
.login-divider {
  display: flex;
  align-items: center;
  gap: 18rpx;
  color: #8f8172;
  font-size: 24rpx;
  font-weight: 800;
}
.login-divider::before,
.login-divider::after {
  content: "";
  flex: 1;
  height: 1rpx;
  background: #eadfd1;
}
.phone-login-section { display: grid; gap: 24rpx; }
.field { display: grid; gap: 12rpx; }
.field .input { min-width:0; width:100%; box-sizing:border-box; font-family:inherit; }
.label { font-size: 28rpx; font-weight: 650; }
.login-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8rpx; padding: 6rpx; border-radius: 6rpx; background: #f0f3ee; }
.login-tab { min-height: 88rpx; padding: 8rpx; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border-radius: 14rpx; color: #666666; font-size: 26rpx; font-weight: 800; text-align: center; }
.login-tab.active { background: #fff; color: #386151; box-shadow: none; border-bottom: 3rpx solid #386151; }
.code-row { display: grid; grid-template-columns: 1fr 190rpx; gap: 12rpx; align-items: center; }
.mini-button { height: 78rpx; border-radius: 6rpx; background: #386151; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 500; }
.mini-button.disabled { background: #9ca3af; }
.login-error { padding:18rpx; border:1rpx solid #f0b8b0; border-radius:12rpx; background:#fff4f2; color:#b42318; font-size:25rpx; line-height:1.6; overflow-wrap:anywhere; }
.notice { padding: 18rpx; border-radius: 18rpx; background: rgba(74, 107, 138, 0.08); color: #4a6b8a; font-size: 26rpx; }
.wechat-button { background: #16a34a; }
.native-button { width: 100%; margin: 0; padding: 0; border: 0; line-height: normal; }
.native-button::after { border: 0; }
.native-button[disabled] { color: #fff; opacity: .68; }
.admin-login-entry { display: flex; align-items: center; justify-content: center; min-height: 68rpx; padding: 8rpx 18rpx; border-top: 1rpx solid #e1e6de; background: #fff; color: #386151; font-size: 24rpx; font-weight: 500; }
.home-entry { display: flex; align-items: center; justify-content: center; min-height: 64rpx; color: #8b3f32; font-size: 24rpx; font-weight: 900; }
.wechat-auth-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(15, 23, 42, 0.46);
}
.wechat-auth-sheet {
  width: 100%;
  max-width: 760rpx;
  padding: 34rpx 42rpx 28rpx;
  border-radius: 28rpx 28rpx 0 0;
  background: #fff;
  box-shadow: 0 -18rpx 50rpx rgba(15, 23, 42, 0.14);
}
.wechat-auth-brand { color: #8b4a3e; font-size: 26rpx; font-weight: 900; }
.wechat-auth-title { margin-top: 22rpx; color: #111827; font-size: 34rpx; font-weight: 950; line-height: 1.45; }
.wechat-auth-message { margin-top: 14rpx; color: #8f8172; font-size: 24rpx; line-height: 1.55; }
.wechat-auth-row {
  min-height: 104rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin: 0;
  padding: 0;
  border: 0;
  border-bottom: 1rpx solid #ececec;
  border-radius: 0;
  background: #fff;
  color: #111827;
  line-height: normal;
}
.wechat-auth-row::after { border: 0; }
.avatar-select { width: 100%; }
.auth-label { width: 100rpx; flex: 0 0 auto; color: #111827; font-size: 28rpx; font-weight: 700; text-align: left; }
.auth-avatar {
  width: 72rpx;
  height: 72rpx;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #f1e3d0;
}
.auth-avatar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b4a3e;
  font-size: 26rpx;
  font-weight: 900;
}
.auth-arrow { margin-left: auto; color: #8f8172; font-size: 44rpx; line-height: 1; }
.auth-nickname-input { flex: 1; min-width: 0; height: 92rpx; color: #111827; font-size: 28rpx; text-align: left; }
.wechat-auth-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-top: 32rpx; }
.auth-action {
  height: 84rpx;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 900;
  line-height: 84rpx;
}
.auth-action::after { border: 0; }
.auth-action.reject { background: #f3f4f6; color: #111827; }
.auth-action.allow { background: #16a34a; color: #fff; }
.auth-action[disabled] { opacity: .62; }
.login-page { min-height:100vh; box-sizing:border-box; padding-bottom:calc(42rpx + env(safe-area-inset-bottom)); overflow-wrap:anywhere; background: #fff; }
.login-page [role="button"]:focus-visible { outline:2px solid #0f766e; outline-offset:3px; }
.login-page input:focus-visible { outline:2px solid #0f766e; outline-offset:2px; }
@media (min-width:900px) { .login-page { max-width:760px; margin:0 auto; } }
</style>
