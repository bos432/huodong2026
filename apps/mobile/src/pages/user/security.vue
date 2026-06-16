<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ensureUser, fetchMyProfile, requestPhoneChangeCode, updateMyPassword, updateMyPhone } from "../../api";
import AppBottomNav from "../../components/AppBottomNav.vue";

const profile = ref<any>(null);
const loading = ref(true);
const sending = ref(false);
const savingPhone = ref(false);
const savingPassword = ref(false);
const newPhone = ref("");
const code = ref("");
const token = ref("");
const devCode = ref("");
const password = ref("");
const confirmPassword = ref("");

const canSendCode = computed(() => /^1\d{10}$/.test(newPhone.value.trim()) && !sending.value);
const canSavePhone = computed(() => canSendCode.value && /^\d{6}$/.test(code.value.trim()) && Boolean(token.value) && !savingPhone.value);
const canSavePassword = computed(() => password.value.length >= 6 && password.value.length <= 64 && password.value === confirmPassword.value && !savingPassword.value);

async function load() {
  loading.value = true;
  try {
    await ensureUser();
    profile.value = await fetchMyProfile();
    newPhone.value = profile.value?.phone || "";
  } finally {
    loading.value = false;
  }
}

async function sendCode() {
  if (!canSendCode.value) {
    uni.showToast({ title: "请输入正确的手机号", icon: "none" });
    return;
  }
  sending.value = true;
  try {
    const result = await requestPhoneChangeCode(newPhone.value.trim());
    token.value = result.verificationToken;
    devCode.value = result.devCode || "";
    if (devCode.value) code.value = devCode.value;
    uni.showToast({ title: devCode.value ? `验证码 ${devCode.value}` : "验证码已发送", icon: "none" });
  } catch (error: any) {
    uni.showToast({ title: error.message || "发送失败", icon: "none" });
  } finally {
    sending.value = false;
  }
}

async function savePhone() {
  if (!canSavePhone.value) {
    uni.showToast({ title: "请填写手机号和验证码", icon: "none" });
    return;
  }
  savingPhone.value = true;
  try {
    profile.value = await updateMyPhone(newPhone.value.trim(), token.value, code.value.trim());
    token.value = "";
    code.value = "";
    devCode.value = "";
    uni.showToast({ title: "手机号已更新", icon: "success" });
  } catch (error: any) {
    uni.showToast({ title: error.message || "修改失败", icon: "none" });
  } finally {
    savingPhone.value = false;
  }
}

async function savePassword() {
  if (password.value.length < 6 || password.value.length > 64) {
    uni.showToast({ title: "密码长度需为 6-64 位", icon: "none" });
    return;
  }
  if (password.value !== confirmPassword.value) {
    uni.showToast({ title: "两次输入的密码不一致", icon: "none" });
    return;
  }
  savingPassword.value = true;
  try {
    await updateMyPassword(password.value);
    password.value = "";
    confirmPassword.value = "";
    profile.value = await fetchMyProfile();
    uni.showToast({ title: "密码已保存", icon: "success" });
  } catch (error: any) {
    uni.showToast({ title: error.message || "保存失败", icon: "none" });
  } finally {
    savingPassword.value = false;
  }
}

onMounted(load);
</script>

<template>
  <view class="security-page">
    <view v-if="loading" class="card muted">加载中...</view>
    <template v-else>
      <view class="head">
        <view class="title">账号安全</view>
        <view class="sub">当前账号：{{ profile?.phone || "未绑定手机号" }}</view>
      </view>

      <view class="card">
        <view class="card-title">绑定手机号</view>
        <view class="sub">更换手机号需要校验新手机号验证码。</view>
        <view class="field">
          <view class="label">新手机号</view>
          <input v-model="newPhone" class="input" type="number" maxlength="11" placeholder="请输入新手机号" />
        </view>
        <view class="field">
          <view class="label">验证码</view>
          <view class="code-row">
            <input v-model="code" class="input" type="number" maxlength="6" placeholder="6 位验证码" />
            <view class="mini-button" :class="{ disabled: !canSendCode }" @click="sendCode">{{ sending ? "发送中" : "获取验证码" }}</view>
          </view>
        </view>
        <view v-if="devCode" class="notice">本地开发验证码：{{ devCode }}</view>
        <view class="button" :class="{ disabled: !canSavePhone }" @click="savePhone">{{ savingPhone ? "保存中..." : "保存手机号" }}</view>
      </view>

      <view class="card">
        <view class="card-title">{{ profile?.hasPassword ? "修改登录密码" : "设置登录密码" }}</view>
        <view class="sub">设置后可在 H5 使用手机号和密码登录，短信登录仍然保留。</view>
        <view class="field">
          <view class="label">新密码</view>
          <input v-model="password" class="input" type="password" maxlength="64" placeholder="6-64 位" />
        </view>
        <view class="field">
          <view class="label">确认密码</view>
          <input v-model="confirmPassword" class="input" type="password" maxlength="64" placeholder="再次输入新密码" />
        </view>
        <view class="button" :class="{ disabled: !canSavePassword }" @click="savePassword">{{ savingPassword ? "保存中..." : "保存密码" }}</view>
      </view>
    </template>

    <AppBottomNav current-path="/pages/user/my" />
  </view>
</template>

<style scoped>
.security-page { min-height: 100vh; padding: 24rpx 24rpx 160rpx; background: var(--page-bg-layer, #f4f6f8); color: var(--text-color, #111827); }
.head { margin-bottom: 20rpx; padding: 30rpx; border-radius: var(--card-radius, 8px); background: #111827; color: #fff; }
.title { font-size: 38rpx; font-weight: 950; }
.sub, .muted { margin-top: 8rpx; color: var(--muted-color, #667085); font-size: 25rpx; line-height: 1.5; }
.head .sub { color: rgba(255,255,255,.72); }
.card { margin-bottom: 20rpx; padding: 26rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.card-title { color: var(--text-color, #111827); font-size: 31rpx; font-weight: 950; }
.field { display: grid; gap: 12rpx; margin-top: 24rpx; }
.label { font-size: 27rpx; font-weight: 900; }
.input { height: 82rpx; padding: 0 20rpx; border-radius: 6px; background: #f8fafc; font-size: 27rpx; }
.code-row { display: grid; grid-template-columns: 1fr 190rpx; gap: 12rpx; align-items: center; }
.mini-button { height: 82rpx; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: var(--primary-color, #0f766e); color: #fff; font-size: 25rpx; font-weight: 900; }
.mini-button.disabled, .button.disabled { opacity: .5; }
.notice { margin-top: 18rpx; padding: 18rpx; border-radius: 6px; background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); font-size: 25rpx; }
.button { margin-top: 26rpx; height: 84rpx; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: var(--primary-color, #0f766e); color: #fff; font-size: 28rpx; font-weight: 950; }
</style>
