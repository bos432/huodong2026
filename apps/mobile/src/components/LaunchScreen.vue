<script setup lang="ts">
import { onMounted, ref } from "vue";
import { withTenantCode } from "../api";
import launchPhoto from "../assets/manpi-prototype/splash-landscape.jpg";
const emit = defineEmits<{ close: [] }>();
const visible = ref(false);
const storageKey = "manpi-launch-screen-version-1";
function close() { uni.setStorageSync(storageKey, "seen"); visible.value = false; emit("close"); }
function enterHome() { close(); uni.reLaunch({ url: withTenantCode("/pages/home/index") }); }
onMounted(() => { visible.value = !uni.getStorageSync(storageKey); });
</script>
<template>
  <view v-if="visible" class="launch-screen" role="dialog" aria-label="慢π应用启动页">
    <image class="launch-photo" :src="launchPhoto" mode="aspectFill" aria-hidden="true" /><view class="launch-scrim" aria-hidden="true" />
    <view class="launch-skip" role="button" tabindex="0" @click="close" @keyup.enter="close" @keyup.space.prevent="close">跳过</view>
    <view class="launch-copy"><view class="launch-brand"><view class="launch-mark" aria-hidden="true">π</view><text>慢π · 认真体验真实生活</text></view><text class="launch-title">慢一点，\n遇见值得的体验。</text><text class="launch-subtitle">从一场真实活动开始，认识城市，也认识一起出发的人。</text><view class="launch-enter" role="button" tabindex="0" @click="enterHome" @keyup.enter="enterHome" @keyup.space.prevent="enterHome">进入慢π</view></view>
  </view>
</template>
<style scoped>
.launch-screen { position: fixed; z-index: 10010; inset: 0; display: grid; align-items: end; overflow: hidden; background: #18241f; color: #fff; }
.launch-photo, .launch-scrim { position: absolute; inset: 0; width: 100%; height: 100%; }
.launch-photo { object-fit: cover; object-position: center; }
.launch-scrim { background: linear-gradient(180deg, rgba(18,24,29,.08) 18%, rgba(18,24,29,.16) 48%, rgba(18,24,29,.82) 100%); }
.launch-skip { position: absolute; z-index: 1; top: max(24rpx, env(safe-area-inset-top)); right: 24rpx; min-height: 52rpx; padding: 0 24rpx; display: flex; align-items: center; border: 1rpx solid rgba(255,255,255,.58); border-radius: 999rpx; background: rgba(29,36,48,.28); color: #fff; font-size: 23rpx; }
.launch-copy { position: relative; z-index: 1; width: 100%; box-sizing: border-box; padding: 0 30rpx calc(40rpx + env(safe-area-inset-bottom)); }
.launch-brand { display: flex; align-items: center; gap: 12rpx; margin-bottom: 24rpx; color: rgba(255,255,255,.86); font-size: 24rpx; }
.launch-mark { width: 58rpx; height: 58rpx; display: grid; place-items: center; border: 1rpx solid rgba(255,255,255,.66); border-radius: 50%; font-size: 28rpx; }
.launch-title { display: block; color: #fff; font-size: 46rpx; font-weight: 900; line-height: 1.25; white-space: pre-line; }
.launch-subtitle { display: block; margin-top: 16rpx; color: rgba(255,255,255,.84); font-size: 24rpx; line-height: 1.65; }
.launch-enter { display: flex; align-items: center; justify-content: center; min-height: 88rpx; margin-top: 28rpx; border-radius: 8rpx; background: #e0e98e; color: #18372c; font-size: 28rpx; font-weight: 800; }
.launch-skip:focus-visible, .launch-enter:focus-visible { outline: 3rpx solid #b8f0c7; outline-offset: 4rpx; }
@media (min-width: 900px) { .launch-copy { width: min(100%, 760px); margin: 0 auto; } }
</style>
