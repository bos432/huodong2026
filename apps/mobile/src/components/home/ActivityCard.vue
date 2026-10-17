<script setup lang="ts">
import type { Activity } from "../../types/activity";
import { ref, watch } from "vue";
import IconGlyph from "../ui/IconGlyph.vue";
import mountainImage from "../../assets/manpi-prototype/activity-mountain.jpg";
import ceramicsImage from "../../assets/manpi-prototype/activity-ceramics.jpg";
import citywalkImage from "../../assets/manpi-prototype/activity-citywalk.jpg";
const props = defineProps<{ activity: Activity }>();
const emit = defineEmits<{ open: [number] }>();
const imageFailed = ref(false);
function coverSource() {
  if (props.activity.cover && !imageFailed.value) return props.activity.cover;
  if (props.activity.category === "手作体验") return ceramicsImage;
  if (props.activity.category === "城市漫步") return citywalkImage;
  return mountainImage;
}
watch(() => props.activity.cover, () => { imageFailed.value = false; });
</script>
<template>
  <view class="activity-card app-press" role="button" tabindex="0" :aria-label="`查看活动：${activity.title}`" @click="emit('open', activity.id)" @keyup.enter="emit('open', activity.id)" @keyup.space.prevent="emit('open', activity.id)">
    <view class="activity-cover-frame"><image class="activity-cover" :src="coverSource()" mode="aspectFill" @error="imageFailed = true" /></view>
    <view class="activity-content">
      <view class="date-line"><b>{{ activity.date }}</b><small>{{ activity.weekday }} {{ activity.startTime }} - {{ activity.endTime }}</small></view>
      <view class="status-row"><text v-if="!activity.isDemo" class="status" :class="activity.status">{{ activity.status === 'full' ? '已满座' : '可报名' }}</text><text v-if="activity.isDemo" class="demo-tag">演示活动</text><text v-for="tag in activity.tags.slice(0, 2)" :key="tag" class="tag">{{ tag }}</text></view>
      <b class="title">{{ activity.title }}</b>
      <view class="muted"><IconGlyph name="pin" :size="13" /><text class="meta-text">{{ activity.isDemo ? '地点与主理人信息以正式发布为准' : `${activity.distanceText} · ${activity.venue}` }}</text></view>
      <view v-if="!activity.isDemo" class="muted"><IconGlyph name="host" :size="13" /><text class="meta-text">{{ activity.hostName }}</text></view>
      <view class="foot"><view><b>{{ activity.isDemo ? '当前仅用于页面展示' : activity.highlight }}</b><small v-if="activity.isDemo">报名数据未接入 · 名额信息以正式发布为准</small><small v-else>{{ activity.registrationCount }} 人已报名 · 剩余 {{ activity.remainingSlots }} 席</small></view><text class="price">{{ activity.isDemo ? '示例价 ' : '' }}{{ activity.priceText }}</text></view>
    </view>
  </view>
</template>
<style scoped>
@import "../../styles/tokens.css";
.activity-card{display:flex;overflow:hidden;min-height:164px;margin-bottom:10px;border-radius:6px;background:#f7f8f7;box-shadow:none;touch-action:manipulation}.activity-cover-frame{position:relative;flex:0 0 36%;min-width:112px;max-width:150px;min-height:164px;align-self:stretch;background:var(--mp-brand-soft)}.activity-cover{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;color:var(--mp-brand-primary-dark)}.activity-content{display:flex;flex:1;min-width:0;flex-direction:column;padding:10px 11px}.date-line{display:flex;align-items:baseline;gap:7px;color:var(--mp-text-muted)}.date-line b{font-size:17px;color:var(--mp-text-primary)}.date-line small{font-size:10px}.status-row{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}.status,.tag{padding:3px 6px;border-radius:3px;font-size:9px}.status{background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark);font-weight:700}.status.full{background:#f5e9df;color:#a4653e}.tag{background:#eef1ed;color:var(--mp-text-muted)}.title{display:-webkit-box;overflow:hidden;margin:5px 0;font-size:14px;line-height:1.3;overflow-wrap:anywhere;-webkit-line-clamp:2;-webkit-box-orient:vertical}.muted{display:flex;align-items:center;gap:4px;overflow:hidden;color:#89958e;font-size:10px;line-height:1.45;text-overflow:ellipsis;white-space:nowrap}.meta-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.foot{display:flex;align-items:flex-end;justify-content:space-between;gap:5px;margin-top:auto;padding-top:6px}.foot>view{min-width:0}.foot b,.foot small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.foot b{color:var(--mp-brand-primary-dark);font-size:10px}.foot small{color:#89958e;font-size:9px}.price{flex:none;white-space:nowrap;color:var(--mp-price);font-size:13px;font-weight:700}
</style>
<style scoped>
.demo-tag{padding:3px 6px;border-radius:5px;background:#f3eee5;color:#8a6847;font-size:10px;font-weight:700}
</style>
