<script setup lang="ts">
import IconGlyph from "../ui/IconGlyph.vue";
defineProps<{ items: string[]; active: string }>();
const emit = defineEmits<{ select: [string] }>();
const categoryIcons: Record<string, string> = {
  推荐: "star", "城市漫步": "pin", "手作体验": "edit", "自然体验": "leaf",
  "阅读分享": "book", "主题沙龙": "host", "轻户外": "checkin", "公益行动": "award", "影像记录": "image",
};
</script>
<template><scroll-view scroll-x class="category-scroll" :show-scrollbar="false"><view class="category-row"><view v-for="item in items" :key="item" class="category-chip" :class="{ selected: active === item }" role="button" tabindex="0" :aria-label="`按${item}分类`" :aria-pressed="active === item" @click="emit('select', item)" @keyup.enter="emit('select', item)" @keyup.space.prevent="emit('select', item)"><IconGlyph :name="categoryIcons[item] || 'star'" :size="15" :label="item" />{{ item }}</view></view></scroll-view></template>
<style scoped>
@import "../../styles/tokens.css";
.category-scroll{white-space:nowrap;background:transparent;padding:2px 16px 4px}.category-row{display:inline-flex;gap:8px}.category-chip{min-height:36px;box-sizing:border-box;padding:0 13px;border:1px solid var(--mp-border);border-radius:var(--mp-radius-pill);background:#fff;color:var(--mp-text-secondary);font-size:var(--mp-font-sm)}.category-chip.selected{border-color:transparent;background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark);font-weight:700}
.category-chip{display:inline-flex;align-items:center;gap:5px;min-height:34px;padding:0 10px;border-radius:3px;background:#f3f4f3;color:#303a34;font-size:11px}
.category-chip.selected{background:#18dfa1;color:#18372c}
</style>
