<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, fetchMyProfile, getCurrentTenantCode, requestPhoneChangeCode, updateMyPassword, updateMyPhone } from "../../api";
import AppBottomNav from "../../components/AppBottomNav.vue";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { reviewSafeText } from "../../review-safe-text";

const profile = ref<any>(null);
const loading = ref(true);
const loadError = ref("");
const sending = ref(false);
const savingPhone = ref(false);
const savingPassword = ref(false);
const newPhone = ref("");
const code = ref("");
const token = ref("");
const devCode = ref("");
const codePhone = ref("");
const password = ref("");
const confirmPassword = ref("");
const operationError = ref("");
const cooldownSeconds = ref(0);
const loadedTenantCode = ref("");
const loadGuard = createTenantLoadGuard();
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

const validPhone = computed(() => /^1\d{10}$/.test(newPhone.value.trim()));
const canSendCode = computed(() => validPhone.value && !sending.value && cooldownSeconds.value <= 0);
const canSavePhone = computed(() => validPhone.value && /^\d{6}$/.test(code.value.trim()) && Boolean(token.value) && codePhone.value === newPhone.value.trim() && !savingPhone.value);
const canSavePassword = computed(() => password.value.length >= 6 && password.value.length <= 64 && password.value === confirmPassword.value && !savingPassword.value);

async function load() {
  const loadToken = loadGuard.begin();
  if (loadedTenantCode.value && loadedTenantCode.value !== loadToken.tenantCode) {
    profile.value = null;
    clearVerificationState();
  }
  loading.value = true;
  loadError.value = "";
  try {
    await ensureUser();
    const nextProfile = await fetchMyProfile();
    if (!loadGuard.isCurrent(loadToken)) return;
    profile.value = nextProfile;
    newPhone.value = profile.value?.phone || "";
    loadedTenantCode.value = loadToken.tenantCode;
  } catch (error: any) {
    if (!loadGuard.isCurrent(loadToken)) return;
    if (!String(error?.message || "").includes("请先完成")) loadError.value = reviewSafeText(error?.message || "账号安全信息加载失败，请稍后重试。");
  } finally {
    if (loadGuard.isCurrent(loadToken)) loading.value = false;
  }
}

function clearVerificationState() {
  token.value = "";
  codePhone.value = "";
  code.value = "";
  devCode.value = "";
  cooldownSeconds.value = 0;
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = null;
}

function startCooldown(seconds = 60) {
  cooldownSeconds.value = Math.max(1, Number(seconds) || 60);
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    cooldownSeconds.value = Math.max(0, cooldownSeconds.value - 1);
    if (cooldownSeconds.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  }, 1000);
}

async function sendCode() {
  if (!canSendCode.value) {
    uni.showToast({ title: "请输入正确的手机号", icon: "none" });
    return;
  }
  operationError.value = "";
  const tenantCode = getCurrentTenantCode();
  sending.value = true;
  try {
    const result = await requestPhoneChangeCode(newPhone.value.trim());
    if (getCurrentTenantCode() !== tenantCode) return;
    token.value = result.verificationToken;
    codePhone.value = newPhone.value.trim();
    devCode.value = result.devCode || "";
    if (devCode.value) code.value = devCode.value;
    startCooldown((result as any).cooldownSeconds || 60);
    uni.showToast({ title: devCode.value ? `验证码 ${devCode.value}` : "验证码已发送", icon: "none" });
  } catch (error: any) {
    operationError.value = reviewSafeText(error?.message || "验证码发送失败");
  } finally {
    sending.value = false;
  }
}

async function savePhone() {
  if (!canSavePhone.value) {
    uni.showToast({ title: "请填写手机号和验证码", icon: "none" });
    return;
  }
  operationError.value = "";
  const tenantCode = getCurrentTenantCode();
  savingPhone.value = true;
  try {
    const nextProfile = await updateMyPhone(newPhone.value.trim(), token.value, code.value.trim());
    if (getCurrentTenantCode() !== tenantCode) return;
    profile.value = nextProfile;
    clearVerificationState();
    uni.showToast({ title: "手机号已更新", icon: "success" });
  } catch (error: any) {
    operationError.value = reviewSafeText(error?.message || "手机号修改失败");
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
  operationError.value = "";
  const tenantCode = getCurrentTenantCode();
  savingPassword.value = true;
  try {
    await updateMyPassword(password.value);
    if (getCurrentTenantCode() !== tenantCode) return;
    password.value = "";
    confirmPassword.value = "";
    profile.value = await fetchMyProfile();
    uni.showToast({ title: "密码已保存", icon: "success" });
  } catch (error: any) {
    operationError.value = reviewSafeText(error?.message || "密码保存失败");
  } finally {
    savingPassword.value = false;
  }
}

onShow(load);
onUnmounted(() => { if (cooldownTimer) clearInterval(cooldownTimer); });
watch(newPhone, (value) => {
  if (!codePhone.value || value.trim() === codePhone.value) return;
  clearVerificationState();
});
</script>

<template>
  <view class="security-page">
    <view v-if="loading" class="card muted">加载中...</view>
    <view v-else-if="loadError" class="card error-card" role="alert" aria-live="assertive"><text>{{ loadError }}</text><button class="button" aria-label="重新加载账号安全信息" @click="load">重新加载</button></view>
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
          <input v-model="newPhone" class="input" type="number" maxlength="11" cursor-spacing="24" confirm-type="next" placeholder="请输入新手机号" />
        </view>
        <view class="field">
          <view class="label">验证码</view>
          <view class="code-row">
            <input v-model="code" class="input" type="number" maxlength="6" cursor-spacing="24" confirm-type="done" placeholder="6 位验证码" />
            <button class="mini-button" :disabled="!canSendCode" aria-label="获取换号验证码" @click="sendCode">{{ sending ? "发送中" : cooldownSeconds > 0 ? `${cooldownSeconds} 秒后重试` : "获取验证码" }}</button>
          </view>
        </view>
        <view v-if="devCode" class="notice">本地开发验证码：{{ devCode }}</view>
        <view v-if="operationError" class="operation-error" role="alert" aria-live="assertive">{{ operationError }}</view>
        <view class="button" role="button" tabindex="0" :aria-disabled="!canSavePhone" :aria-busy="savingPhone" :aria-label="savingPhone ? '保存中' : '保存手机号'" :class="{ disabled: !canSavePhone }" @click="savePhone" @keyup.enter="savePhone" @keyup.space.prevent="savePhone">{{ savingPhone ? "保存中..." : "保存手机号" }}</view>
      </view>

      <view class="card">
        <view class="card-title">{{ profile?.hasPassword ? "修改登录密码" : "设置登录密码" }}</view>
        <view class="sub">设置后可在 H5 使用手机号和密码登录，短信登录仍然保留。</view>
        <view class="field">
          <view class="label">新密码</view>
          <input v-model="password" class="input" type="password" maxlength="64" cursor-spacing="24" confirm-type="next" placeholder="6-64 位" />
        </view>
        <view class="field">
          <view class="label">确认密码</view>
          <input v-model="confirmPassword" class="input" type="password" maxlength="64" cursor-spacing="24" confirm-type="done" placeholder="再次输入新密码" />
        </view>
        <view class="button" role="button" tabindex="0" :aria-disabled="!canSavePassword" :aria-busy="savingPassword" :aria-label="savingPassword ? '保存中' : '保存密码'" :class="{ disabled: !canSavePassword }" @click="savePassword" @keyup.enter="savePassword" @keyup.space.prevent="savePassword">{{ savingPassword ? "保存中..." : "保存密码" }}</view>
      </view>
    </template>

    <AppBottomNav current-path="/pages/user/my" />
  </view>
</template>

<style scoped>
.security-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 24rpx 24rpx calc(160rpx + env(safe-area-inset-bottom));
  background:
    linear-gradient(180deg, #f7efe3 0%, #fbf7ef 40%, #f4eadc 100%);
  color: #263d3c;
}

.head {
  margin-bottom: 20rpx;
  padding: 34rpx 30rpx;
  border-radius: 30rpx;
  background:
    linear-gradient(135deg, rgba(33, 75, 78, 0.96), rgba(129, 55, 48, 0.9)),
    #214b4e;
  color: #fffaf2;
  box-shadow: 0 18rpx 46rpx rgba(36, 60, 60, 0.18);
}

.title {
  font-size: 42rpx;
  font-weight: 950;
}

.sub,
.muted {
  margin-top: 8rpx;
  color: #7f7467;
  font-size: 25rpx;
  line-height: 1.5;
}

.head .sub {
  color: rgba(255, 250, 242, 0.76);
}

.card {
  margin-bottom: 20rpx;
  padding: 26rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 24rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 12rpx 34rpx rgba(72, 55, 38, 0.08);
}

.card-title {
  color: #263d3c;
  font-size: 31rpx;
  font-weight: 950;
}

.field {
  display: grid;
  gap: 12rpx;
  margin-top: 24rpx;
}

.label {
  color: #263d3c;
  font-size: 27rpx;
  font-weight: 900;
}

.input {
  height: 82rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.45);
  border-radius: 18rpx;
  background: #fbf7ef;
  color: #263d3c;
  font-size: 27rpx;
}

.code-row {
  display: grid;
  grid-template-columns: 1fr 190rpx;
  gap: 12rpx;
  align-items: center;
}

.mini-button {
  height: 82rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
  background: #214b4e;
  color: #fffaf2;
  font-size: 25rpx;
  font-weight: 900;
}

.mini-button.disabled,
.button.disabled,
.mini-button[disabled] {
  opacity: .5;
}

.notice {
  margin-top: 18rpx;
  padding: 18rpx;
  border-radius: 18rpx;
  background: #f1e3d0;
  color: #8b4a3e;
  font-size: 25rpx;
}

.button {
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 26rpx;
  border-radius: 999rpx;
  background: #b84435;
  color: #fffaf2;
  font-size: 28rpx;
  font-weight: 950;
}
.mini-button::after, .error-card .button::after { border:0; }
.operation-error { margin-top:18rpx; color:#b42318; font-size:24rpx; line-height:1.55; overflow-wrap:anywhere; }
.error-card { border-color:#fecaca; background:#fff7f7; color:#b91c1c; line-height:1.6; }
.error-card .button { margin-top:18rpx; }
.mini-button.disabled, .button.disabled { pointer-events:none; }
@media (min-width: 900px) { .security-page { max-width:760px; margin:0 auto; } }
</style>
