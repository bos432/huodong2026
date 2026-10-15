<script setup lang="ts">
import { ref, watch } from 'vue';
import { computed } from 'vue';
import type { PublicActivitySummary } from '@activity/shared';

const props = defineProps<{
  activity: PublicActivitySummary;
  dateLabel: string;
  priceLabel: string;
  statusLabel: string;
  organizerLabel?: string;
}>();
const emit = defineEmits<{ open: [] }>();
const imageFailed = ref(false);
watch(() => props.activity.coverUrl, () => { imageFailed.value = false; });
const seatLabel = computed(() => {
  if (props.activity.isTest) return '';
  if (props.activity.remainingSeats !== undefined && props.activity.remainingSeats !== null) return `余 ${props.activity.remainingSeats}`;
  if (props.activity.capacity !== undefined && props.activity.capacity !== null) return `共 ${props.activity.capacity} 席`;
  return '名额待确认';
});
</script>

<template>
  <view class="activity-preview-row app-press" role="button" tabindex="0" :aria-label="`查看活动：${activity.title}`" @click="emit('open')" @keyup.enter="emit('open')" @keyup.space.prevent="emit('open')">
    <image v-if="activity.coverUrl && !imageFailed" class="row-cover" :src="activity.coverUrl" mode="aspectFill" @error="imageFailed = true" />
    <view v-else class="row-cover row-cover-empty"><text>{{ activity.category?.name || '活动' }}</text></view>
    <view class="row-copy">
      <text class="row-title">{{ activity.title }}</text>
      <text class="row-meta">{{ activity.isTest ? '示例时间 · ' : '' }}{{ dateLabel }} · {{ activity.isTest ? '地点信息以正式发布为准' : activity.location || '地点待确认' }}</text>
      <view class="row-footer"><text class="row-category">{{ activity.category?.name || '活动' }} · {{ activity.isTest ? '演示活动' : statusLabel }}</text><text class="row-price">{{ activity.isTest ? '示例费用 ' : '' }}{{ priceLabel }}</text></view>
      <text class="row-organizer">{{ activity.isTest ? '演示主理资料' : `主办：${organizerLabel || '主办方待确认'}` }}</text>
      <text v-if="!activity.isTest" class="row-count">{{ activity.registeredCount || 0 }} 人已报名 · {{ seatLabel }}</text>
    </view>
  </view>
</template>

<style scoped>
.activity-preview-row { display: flex; align-items: flex-start; gap: 22rpx; width: 100%; min-height: 174rpx; padding: 22rpx 0; border-bottom: 1rpx solid var(--app-border); background: var(--app-surface); }
.row-cover { width: 144rpx; height: 144rpx; flex: 0 0 144rpx; border-radius: 8rpx; background: var(--app-surface-muted); }
.row-cover-empty { display: flex; align-items: center; justify-content: center; padding: 12rpx; text-align: center; font-size: 24rpx; color: var(--app-primary); }
.row-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10rpx; }
.row-title { color: var(--app-text); font-family: "STSong", "SimSun", "Noto Serif CJK SC", serif; font-size: 30rpx; font-weight: 500; line-height: 1.5; overflow-wrap: anywhere; }
.row-meta { color: var(--app-text-muted); font-size: 23rpx; line-height: 1.5; overflow-wrap: anywhere; }
.row-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8rpx 12rpx; }
.row-category { color: var(--app-primary); border-left: 3rpx solid var(--app-primary); padding-left: 8rpx; font-size: 21rpx; line-height: 1.5; }
.row-price { color: var(--app-price); font-size: 27rpx; font-weight: 600; white-space: nowrap; }
.row-count { color: var(--app-text-muted); font-size: 21rpx; line-height: 1.4; }
.row-organizer { color: var(--app-text-subtle); font-size: 21rpx; line-height: 1.4; overflow-wrap: anywhere; }
.activity-preview-row:focus-visible { outline: 3rpx solid var(--app-focus); outline-offset: 3rpx; }
</style>
