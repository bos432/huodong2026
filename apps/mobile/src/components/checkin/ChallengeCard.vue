<script setup lang="ts">
import type { Challenge } from "../../types/challenge";

defineProps<{ challenge: Challenge }>();
const emit = defineEmits<{ open: [number] }>();
</script>

<template>
  <view class="challenge-card" role="button" tabindex="0" :aria-label="`打开演示挑战：${challenge.title}`" @click="emit('open', challenge.id)" @keyup.enter="emit('open', challenge.id)" @keyup.space.prevent="emit('open', challenge.id)">
    <view class="challenge-title">
      <view class="badge">慢</view>
      <view><b>{{ challenge.title }}</b><small>{{ challenge.startDate }} - {{ challenge.endDate }} · {{ challenge.distanceText }}</small><em v-if="challenge.isDemo">演示任务</em></view>
    </view>
    <view class="media-strip">
      <template v-if="challenge.media.length"><image v-for="image in challenge.media" :key="image" class="challenge-media-image" :src="image" mode="aspectFill" /></template>
      <view v-else class="media-fallback">慢π示例任务</view>
      <span>{{ challenge.checkpointCount }}个点位</span>
    </view>
    <view class="challenge-progress"><view><small>本地演示进度</small><b>{{ challenge.progress }} / {{ challenge.checkpointCount }}</b></view><i><em :style="{ width: `${Math.round((challenge.progress / Math.max(1, challenge.checkpointCount)) * 100)}%` }" /></i></view><view class="challenge-foot"><small>{{ challenge.status === "completed" ? "演示挑战已完成" : challenge.progress ? "演示挑战进行中" : "点击任务开始体验" }} · 不代表真实活动记录</small><button class="challenge-action" @click.stop="emit('open', challenge.id)">{{ challenge.status === "completed" ? "查看记录" : "去打卡" }}</button></view>
  </view>
</template>

<style scoped>
@import "../../styles/tokens.css";
.challenge-card { margin: 0 14px 12px; padding: 13px; border-radius: var(--mp-radius-lg); background: #fff; box-shadow: var(--mp-shadow-card); touch-action: manipulation; }
.challenge-title { display: flex; gap: 10px; align-items: center; }.badge { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; background: var(--mp-brand-soft); color: var(--mp-brand-primary); font-weight: 800; }.challenge-title b, .challenge-title small { display: block; }.challenge-title b { color: var(--mp-text-primary); font-size: 15px; }.challenge-title small { margin-top: 5px; color: var(--mp-text-muted); font-size: 11px; }
.media-strip { position: relative; display: flex; overflow: hidden; height: 120px; margin-top: 12px; border-radius: 10px; background: var(--mp-bg-soft); }.challenge-media-image { width: 33.333%; height: 100%; border-right: 2px solid #fff; }.media-fallback { display: grid; place-items: center; width: 100%; height: 100%; color: var(--mp-brand-primary); font-size: 28rpx; font-weight: 700; }.media-strip span { position: absolute; right: 8px; bottom: 8px; padding: 4px 7px; border-radius: 7px; background: rgba(29, 36, 48, .72); color: #fff; font-size: 11px; }
.challenge-foot { display: flex; align-items: center; justify-content: space-between; min-height: 44px; margin-top: 10px; }.challenge-foot small { color: var(--mp-text-muted); font-size: 11px; }.challenge-action { min-height: 44px; border: 0; border-radius: 10px; padding: 8px 14px; background: var(--mp-brand-primary); color: #fff; font-weight: 700; }
.challenge-progress { margin-top: 12px; }.challenge-progress>view { display:flex; justify-content:space-between; color:var(--mp-text-muted); font-size:11px; }.challenge-progress b { color:var(--mp-brand-primary-dark); }.challenge-progress>i { display:block; height:7px; margin-top:7px; border-radius:99px; background:#edf1ee; }.challenge-progress em { display:block; height:100%; border-radius:inherit; background:var(--mp-brand-primary); }
</style>
<style scoped>
.challenge-title em{display:block;width:max-content;margin-top:4px;padding:2px 5px;border-radius:4px;background:#f3eee5;color:#8a6847;font-size:9px;font-style:normal}
</style>
