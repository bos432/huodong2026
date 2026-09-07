<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  subtitle?: string;
  stamp?: string;
  background?: string;
  textColor?: string;
  mutedColor?: string;
}>(), { subtitle: '', stamp: '慢', background: '#ffffff', textColor: '#28332d', mutedColor: '#65736a' });
</script>

<template>
  <view class="guofeng-page-heading" :style="{ background, color: textColor }">
    <text class="heading-stamp" aria-hidden="true">{{ stamp }}</text>
    <view class="heading-copy"><text class="heading-title">{{ title }}</text><text v-if="subtitle" class="heading-subtitle" :style="{ color: mutedColor }">{{ subtitle }}</text></view>
  </view>
</template>

<style scoped>
.guofeng-page-heading { display: flex; align-items: center; gap: 22rpx; padding: 26rpx 0; margin-bottom: 12rpx; border-bottom: 1rpx solid #e1e6de; }
.heading-stamp { width: 62rpx; min-height: 72rpx; flex: 0 0 62rpx; display: flex; align-items: center; justify-content: center; border: 4rpx double #a33d36; background: #fff; color: #a33d36; font-family: "STSong", "SimSun", serif; font-size: 34rpx; }
.heading-copy { flex: 1; min-width: 0; }
.heading-title { display: block; font-family: "STSong", "SimSun", "Noto Serif CJK SC", serif; font-size: 38rpx; font-weight: 500; line-height: 1.5; overflow-wrap: anywhere; }
.heading-subtitle { display: block; margin-top: 8rpx; font-size: 24rpx; line-height: 1.6; overflow-wrap: anywhere; }
</style>
