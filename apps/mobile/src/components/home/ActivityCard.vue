<script setup lang="ts">
import type { Activity } from "../../types/activity";
import { ref, watch } from "vue";
import IconGlyph from "../ui/IconGlyph.vue";
const props = defineProps<{ activity: Activity }>();
const emit = defineEmits<{ open: [number] }>();
const imageFailed = ref(false);
watch(() => props.activity.cover, () => { imageFailed.value = false; });
</script>
<template>
  <view class="activity-card app-press" role="button" tabindex="0" :aria-label="`查看活动：${activity.title}`" @click="emit('open', activity.id)" @keyup.enter="emit('open', activity.id)" @keyup.space.prevent="emit('open', activity.id)">
    <image v-if="activity.cover && !imageFailed" class="activity-cover" :src="activity.cover" mode="aspectFill" @error="imageFailed = true" />
    <view v-else class="activity-cover activity-cover-empty"><IconGlyph name="star" :size="24" label="慢π活动" /><text class="activity-cover-label">{{ activity.category || "慢π活动" }}</text></view>
    <view class="activity-content">
      <view class="date-line"><b>{{ activity.date }}</b><small>{{ activity.weekday }} {{ activity.startTime }} - {{ activity.endTime }}</small></view>
      <view class="status-row"><text class="status" :class="activity.status">{{ activity.status === 'full' ? '已满座' : '可报名' }}</text><text v-if="activity.isDemo" class="demo-tag">演示活动</text><text v-for="tag in activity.tags.slice(0, 2)" :key="tag" class="tag">{{ tag }}</text></view>
      <b class="title">{{ activity.title }}</b>
      <view class="muted"><IconGlyph name="pin" :size="13" /><text class="meta-text">{{ activity.distanceText }} · {{ activity.venue }}</text></view>
      <view class="muted"><IconGlyph name="host" :size="13" /><text class="meta-text">{{ activity.hostName }}</text></view>
      <view class="foot"><view><b>{{ activity.highlight }}</b><small v-if="activity.isDemo">报名数据未接入 · 名额信息以正式发布为准</small><small v-else>{{ activity.registrationCount }} 人已报名 · 剩余 {{ activity.remainingSlots }} 席</small></view><text class="price">{{ activity.priceText }}</text></view>
    </view>
  </view>
</template>
<style scoped>
@import "../../styles/tokens.css";
.activity-card{display:flex;overflow:hidden;min-height:188px;margin-bottom:12px;border-radius:var(--mp-radius-lg);background:#fff;box-shadow:var(--mp-shadow-card);touch-action:manipulation}.activity-cover{display:flex;width:46%;aspect-ratio:1 / 1;align-items:center;justify-content:center;flex-direction:column;gap:8px;object-fit:cover;background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark)}.activity-cover-label{font-size:12px}.activity-content{display:flex;flex:1;min-width:0;flex-direction:column;padding:13px 12px}.date-line{display:flex;align-items:baseline;gap:7px;color:var(--mp-text-muted)}.date-line b{font-size:21px;color:var(--mp-text-primary)}.date-line small{font-size:10px}.status-row{display:flex;gap:5px;margin-top:7px}.status,.tag{padding:3px 6px;border-radius:5px;font-size:10px}.status{background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark);font-weight:700}.status.full{background:#f5e9df;color:#a4653e}.tag{background:#f4f6f3;color:var(--mp-text-muted)}.title{display:-webkit-box;overflow:hidden;margin:7px 0;font-size:16px;line-height:1.3;-webkit-line-clamp:2;-webkit-box-orient:vertical}.muted{display:flex;align-items:center;gap:4px;overflow:hidden;color:#89958e;font-size:11px;line-height:1.6;text-overflow:ellipsis;white-space:nowrap}.meta-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.foot{display:flex;align-items:flex-end;justify-content:space-between;gap:5px;margin-top:auto}.foot b,.foot small{display:block}.foot b{color:var(--mp-brand-primary-dark);font-size:12px}.foot small{color:#a0aaa3;font-size:10px}.price{white-space:nowrap;color:var(--mp-price);font-size:15px;font-weight:700}
</style>
<style scoped>
.demo-tag{padding:3px 6px;border-radius:5px;background:#f3eee5;color:#8a6847;font-size:10px;font-weight:700}
</style>
