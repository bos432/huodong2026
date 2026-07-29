<template>
  <view v-if="visible" class="phone-bind-mask">
    <view class="phone-bind-sheet">
      <view class="sheet-handle"></view>
      <view class="sheet-title">{{ title }}</view>
      <view class="sheet-message">{{ message }}</view>
      <!-- #ifdef MP-WEIXIN -->
      <button class="bind-button native-button" :class="{ 'is-disabled': binding }" open-type="getPhoneNumber" :disabled="binding" @getphonenumber="handleGetPhoneNumber">
        {{ binding ? "绑定中..." : "手机号快捷绑定" }}
      </button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <view class="bind-button bind-button-disabled" @click="goSecurity">去账号安全绑定</view>
      <!-- #endif -->
      <view class="later-button" @click="close">{{ closeText }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { bindWechatPhone, withTenantCode } from "../api";

const props = withDefaults(defineProps<{
  visible: boolean;
  title?: string;
  message?: string;
  closeText?: string;
}>(), {
  title: "绑定手机号",
  message: "报名、下单、余额和会员权益需要手机号，绑定后后台会员资料会同步更新。",
  closeText: "稍后再说"
});

const emit = defineEmits<{
  close: [];
  bound: [profile: any];
}>();

const binding = ref(false);

function close() {
  if (binding.value) return;
  emit("close");
}

async function handleGetPhoneNumber(event: any) {
  if (binding.value) return;
  const code = String(event?.detail?.code || "");
  if (!code) {
    const message = String(event?.detail?.errMsg || "");
    uni.showToast({ title: message.includes("deny") ? "你取消了手机号快捷绑定" : "未获取到手机号", icon: "none" });
    return;
  }
  binding.value = true;
  try {
    const profile = await bindWechatPhone(code);
    uni.showToast({ title: "手机号已绑定", icon: "success" });
    emit("bound", profile);
  } catch (error: any) {
    uni.showToast({ title: error.message || "手机号绑定失败", icon: "none" });
  } finally {
    binding.value = false;
  }
}

function goSecurity() {
  uni.navigateTo({ url: withTenantCode("/pages/user/security") });
  close();
}
</script>

<style scoped>
.phone-bind-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(15, 23, 42, 0.46);
}
.phone-bind-sheet {
  width: 100%;
  max-width: 760rpx;
  padding: 24rpx 34rpx 32rpx;
  border-radius: 28rpx 28rpx 0 0;
  background: #fffaf2;
  box-shadow: 0 -18rpx 50rpx rgba(15, 23, 42, 0.16);
}
.sheet-handle {
  width: 72rpx;
  height: 8rpx;
  margin: 0 auto 28rpx;
  border-radius: 999rpx;
  background: rgba(91, 47, 36, 0.18);
}
.sheet-title {
  color: #263d3c;
  font-size: 36rpx;
  line-height: 1.35;
  font-weight: 950;
}
.sheet-message {
  margin-top: 14rpx;
  color: #7f7467;
  font-size: 26rpx;
  line-height: 1.6;
}
.bind-button {
  width: 100%;
  height: 88rpx;
  margin: 30rpx 0 0;
  padding: 0;
  border: 0;
  border-radius: 18rpx;
  background: #16a34a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 29rpx;
  font-weight: 900;
  line-height: 88rpx;
}
.bind-button::after {
  border: 0;
}
.bind-button.is-disabled {
  color: #fff;
  opacity: .62;
}
.bind-button-disabled {
  background: #4a6b8a;
}
.later-button {
  height: 76rpx;
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b4a3e;
  font-size: 26rpx;
  font-weight: 900;
}
</style>
