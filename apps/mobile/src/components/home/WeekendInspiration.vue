<script setup lang="ts">
import { ref, watch } from "vue";
import BaseBottomSheet from "../sheets/BaseBottomSheet.vue";
import type { WeekendInspiration } from "../../pages/home/weekend-inspiration";

const props = defineProps<{ items: WeekendInspiration[] }>();
const selected = ref<WeekendInspiration | null>(null);
const failedImages = ref<Record<string, boolean>>({});
watch(() => props.items, () => { selected.value = null; });
function copySource() {
  if (selected.value) uni.setClipboardData({ data: selected.value.sourceUrl });
}
</script>

<template>
  <view v-if="items.length" class="inspiration">
    <view class="section-heading"><view><text class="eyebrow">WEEKEND NOTES · 铜梁</text><text class="section-title">周末，换一种打开方式</text></view><text class="edition">{{ items.length }} 个在地灵感</text></view>
    <text class="section-note">逛古城、读一本书，或走进自然。先收藏一个想法。</text>
    <view class="inspiration-grid">
      <button v-for="(item, index) in items" :key="item.id" class="inspiration-card" :class="{ lead: index === 0 }" role="button" tabindex="0" :aria-label="`阅读灵感：${item.title}`" @click="selected = item" @keyup.enter="selected = item" @keyup.space.prevent="selected = item">
        <view class="image-wrap">
          <image v-if="!failedImages[item.id]" :src="item.image" mode="aspectFill" class="cover" @error="failedImages[item.id] = true" />
          <view v-else class="image-fallback"><text>{{ item.category }}</text></view>
          <text class="image-note">氛围配图</text>
        </view>
        <view class="card-copy"><text class="category">{{ item.category }}<text v-if="item.id === 'harvest'"> · 活动记录</text></text><text class="card-title">{{ item.title }}</text><text class="card-summary">{{ item.summary }}</text><view class="card-footer"><text>{{ item.place }}</text><text class="read-more">读一读 ↗</text></view></view>
      </button>
    </view>
    <text class="collection-note">铜梁周末灵感 · 公开资料整理，非活动报名</text>
    <BaseBottomSheet :open="!!selected" title="铜梁周末灵感" @close="selected = null">
      <view v-if="selected" class="story" role="dialog" :aria-label="selected.title">
        <image v-if="!failedImages[selected.id]" :src="selected.image" mode="aspectFill" class="story-cover" @error="failedImages[selected.id] = true" />
        <text class="story-image-note">氛围配图，非当地实景或活动现场照片</text>
        <text class="category">{{ selected.category }} · {{ selected.place }}</text>
        <text class="story-title">{{ selected.title }}</text>
        <text class="context">{{ selected.context }}</text>
        <text class="body">{{ selected.body }}</text>
        <view class="source"><text class="source-label">资料来源</text><text>{{ selected.sourceName }}</text>
          <!-- #ifdef H5 -->
          <a :href="selected.sourceUrl" target="_blank" rel="noopener noreferrer">查看原始资料 ↗</a>
          <!-- #endif -->
          <!-- #ifndef H5 -->
          <button class="source-copy" @click="copySource">复制来源链接</button>
          <!-- #endif -->
        </view>
        <text class="story-note">灵感整理于 2026-10-15。场馆开放及新一期活动，以官方最新通知为准。</text>
        <button class="back" @click="selected = null">收起，继续逛逛</button>
      </view>
    </BaseBottomSheet>
  </view>
</template>

<style scoped>
.inspiration{margin:20px 16px 24px;color:var(--mp-text-primary)}.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:8px}.section-heading>view{display:grid;gap:5px}.eyebrow{font-size:9px;letter-spacing:1.5px;color:var(--mp-brand-primary-dark)}.section-title{font-size:20px;line-height:1.4;font-weight:700}.edition{flex-shrink:0;padding-bottom:3px;font-size:10px;color:var(--mp-text-muted)}.section-note{display:block;margin:7px 0 15px;font-size:11px;line-height:1.6;color:var(--mp-text-secondary)}.inspiration-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.inspiration-card{display:block;width:100%;min-width:0;margin:0;padding:0;overflow:hidden;text-align:left;white-space:normal;background:var(--mp-bg-surface,#fff);border:1px solid var(--mp-border);border-radius:10px;line-height:1.5;color:inherit}.inspiration-card::after{border:0}.inspiration-card:focus-visible{outline:2px solid var(--mp-brand-primary);outline-offset:3px}.inspiration-card.lead{grid-column:1/-1}.image-wrap{position:relative;height:110px;background:var(--mp-mist-soft)}.lead .image-wrap{height:168px}.cover,.image-fallback{display:block;width:100%;height:100%}.image-fallback{display:flex;align-items:center;justify-content:center;color:var(--mp-brand-primary-dark);font-size:16px}.image-note{position:absolute;right:6px;bottom:6px;padding:2px 5px;border-radius:3px;background:rgba(255,255,255,.88);font-size:8px;color:#555}.card-copy{display:grid;gap:7px;padding:12px 11px}.category{display:block;font-size:10px;color:var(--mp-brand-primary-dark);line-height:1.5}.card-title{display:block;font-size:14px;font-weight:700;line-height:1.55}.lead .card-title{font-size:19px}.card-summary{display:block;font-size:11px;line-height:1.7;color:var(--mp-text-secondary)}.card-footer{display:flex;justify-content:space-between;align-items:center;gap:5px;margin-top:3px;padding-top:8px;border-top:1px solid var(--mp-border);font-size:9px;color:var(--mp-text-muted)}.read-more{white-space:nowrap;color:var(--mp-brand-primary-dark)}.collection-note{display:block;margin-top:12px;font-size:10px;line-height:1.6;color:var(--mp-text-muted)}.story{max-height:calc(87vh - 85px);overflow-y:auto;box-sizing:border-box;padding:0 20px 20px;overscroll-behavior:contain}.story-cover{display:block;width:100%;height:170px;border-radius:9px}.story-image-note{display:block;margin:7px 0 18px;font-size:9px;color:var(--mp-text-muted)}.story-title{display:block;margin:9px 0 12px;font-size:23px;font-weight:700;line-height:1.5}.context{display:block;padding:10px 12px;background:var(--mp-mist-soft);border-radius:6px;font-size:11px;line-height:1.7;color:var(--mp-text-secondary)}.body{display:block;margin:20px 0;white-space:pre-wrap;line-height:1.95;font-size:14px;color:var(--mp-text-primary)}.source{display:grid;gap:7px;padding-top:14px;border-top:1px solid var(--mp-border);font-size:11px;line-height:1.7;color:var(--mp-text-secondary)}.source-label{font-weight:700}.source a{display:inline-block;min-height:36px;color:var(--mp-brand-primary-dark);line-height:36px;text-decoration:underline}.source-copy{margin:0;padding:0;background:transparent;color:var(--mp-brand-primary-dark);font-size:12px}.story-note{display:block;margin-top:14px;font-size:10px;line-height:1.8;color:var(--mp-text-muted)}.back{width:100%;min-height:44px;margin-top:18px;border:1px solid var(--mp-border);border-radius:7px;background:var(--mp-bg-soft);color:var(--mp-brand-primary-dark);font-size:13px}
@media(min-width:460px){.inspiration-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.image-wrap{height:145px}.lead .image-wrap{height:210px}.card-copy{padding:14px}.card-title{font-size:15px}.card-summary{font-size:12px}}
</style>
