<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  activity: { id: number; title: string; coverUrl?: string | null; category?: { name?: string } | null; location?: string; isTest?: boolean; registeredCount?: number; remainingSeats?: number; capacity?: number };
  dateLabel: string;
  priceLabel: string;
  statusLabel: string;
}>();
const emit = defineEmits<{ open: [] }>();
const imageFailed = ref(false);
watch(() => props.activity.coverUrl, () => { imageFailed.value = false; });
</script>

<template>
  <view class="activity-preview-row app-press" role="button" tabindex="0" :aria-label="`查看活动：${activity.title}`" @click="emit('open')" @keyup.enter="emit('open')" @keyup.space.prevent="emit('open')">
    <image v-if="activity.coverUrl && !imageFailed" class="row-cover" :src="activity.coverUrl" mode="aspectFill" @error="imageFailed = true" />
    <view v-else class="row-cover row-cover-empty"><text>{{ activity.category?.name || '活动' }}</text></view>
    <view class="row-copy">
      <text class="row-title">{{ activity.title }}</text>
      <text class="row-meta">{{ dateLabel }} · {{ activity.location || '地点待确认' }}</text>
      <view class="row-footer"><text class="row-category">{{ activity.category?.name || '活动' }} · {{ activity.isTest ? '测试活动' : statusLabel }}</text><text class="row-price">{{ priceLabel }}</text></view>
      <text v-if="!activity.isTest" class="row-count">{{ activity.registeredCount || 0 }} 人已报名 · 余 {{ activity.remainingSeats ?? activity.capacity ?? '-' }}</text>
    </view>
  </view>
</template>

<style scoped>
.activity-preview-row { display: flex; align-items: flex-start; gap: 22rpx; width: 100%; min-height: 174rpx; padding: 22rpx 0; border-bottom: 1rpx solid #e1e6de; background: #fff; }
.row-cover { width: 144rpx; height: 144rpx; flex: 0 0 144rpx; border-radius: 6rpx; background: #f0f3ee; }
.row-cover-empty { display: flex; align-items: center; justify-content: center; padding: 12rpx; text-align: center; font-size: 24rpx; color: #386151; }
.row-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10rpx; }
.row-title { color: #28332d; font-family: "STSong", "SimSun", "Noto Serif CJK SC", serif; font-size: 30rpx; font-weight: 500; line-height: 1.5; overflow-wrap: anywhere; }
.row-meta { color: #65736a; font-size: 23rpx; line-height: 1.5; overflow-wrap: anywhere; }
.row-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8rpx 12rpx; }
.row-category { color: #386151; border-left: 3rpx solid #386151; padding-left: 8rpx; font-size: 21rpx; line-height: 1.5; }
.row-price { color: #a33d36; font-size: 27rpx; font-weight: 600; white-space: nowrap; }
.row-count { color: #65736a; font-size: 21rpx; line-height: 1.4; }
.activity-preview-row:focus-visible { outline: 3rpx solid #386151; outline-offset: 3rpx; }
</style>
