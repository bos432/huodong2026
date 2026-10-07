<template>
  <view class="loading-state" :class="{ 'loading-state--compact': compact }" role="status" aria-live="polite" :aria-label="title">
    <view class="loading-state-illustration" aria-hidden="true">
      <view class="loading-state-ring" />
      <view class="loading-state-dot" />
    </view>
    <view class="loading-state-copy">
      <text class="loading-state-title">{{ title }}</text>
      <text v-if="description" class="loading-state-description">{{ description }}</text>
    </view>
    <view class="loading-state-lines" aria-hidden="true">
      <view class="loading-state-line loading-state-line--long" />
      <view class="loading-state-line loading-state-line--short" />
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string;
  description?: string;
  compact?: boolean;
}>(), {
  title: "正在加载",
  description: "正在同步最新内容，请稍候。",
  compact: false
});
</script>

<style scoped>
.loading-state {
  display: grid;
  justify-items: center;
  gap: 16rpx;
  padding: 56rpx 28rpx;
  color: var(--app-text-muted);
  text-align: center;
}
.loading-state-illustration {
  position: relative;
  width: 84rpx;
  height: 84rpx;
  display: grid;
  place-items: center;
  border: 2rpx solid var(--app-primary);
  border-radius: 50%;
  background: var(--app-primary-soft);
}
.loading-state-ring {
  width: 42rpx;
  height: 42rpx;
  border: 4rpx solid rgba(56, 97, 81, .22);
  border-top-color: var(--app-primary);
  border-radius: 50%;
  animation: loading-state-spin 900ms linear infinite;
}
.loading-state-dot {
  position: absolute;
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: var(--app-primary);
  transform: translateY(-31rpx);
}
.loading-state-copy { display: grid; gap: 6rpx; justify-items: center; }
.loading-state-title { color: var(--app-text); font-size: 30rpx; font-weight: 700; line-height: 1.4; }
.loading-state-description { max-width: 600rpx; color: var(--app-text-muted); font-size: 24rpx; line-height: 1.6; }
.loading-state-lines { width: min(100%, 520rpx); display: grid; gap: 10rpx; }
.loading-state-line { height: 14rpx; border-radius: 999rpx; background: linear-gradient(90deg, var(--app-surface-muted), var(--app-primary-soft), var(--app-surface-muted)); background-size: 220% 100%; animation: loading-state-shimmer 1.4s ease-in-out infinite; }
.loading-state-line--long { width: 100%; }
.loading-state-line--short { width: 68%; }
.loading-state--compact { grid-template-columns: auto 1fr; justify-items: initial; align-items: center; padding: 24rpx 0; text-align: left; }
.loading-state--compact .loading-state-illustration { width: 60rpx; height: 60rpx; }
.loading-state--compact .loading-state-ring { width: 30rpx; height: 30rpx; }
.loading-state--compact .loading-state-dot { transform: translateY(-22rpx); }
.loading-state--compact .loading-state-copy { justify-items: initial; }
.loading-state--compact .loading-state-lines { grid-column: 1 / -1; }
@keyframes loading-state-spin { to { transform: rotate(360deg); } }
@keyframes loading-state-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
@media (prefers-reduced-motion: reduce) {
  .loading-state-ring, .loading-state-line { animation: none; }
}
</style>
