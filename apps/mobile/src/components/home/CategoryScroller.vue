<script setup lang="ts">
import IconGlyph from "../ui/IconGlyph.vue";
defineProps<{ items: string[]; active: string }>();
const emit = defineEmits<{ select: [string] }>();
</script>
<template><scroll-view scroll-x class="category-scroll" :show-scrollbar="false"><view class="category-row"><view v-for="item in items" :key="item" class="category-chip" :class="{ selected: active === item }" @click="emit('select', item)"><IconGlyph v-if="item === '推荐'" name="star" :size="13" label="推荐" />{{ item }}</view></view></scroll-view></template>
<style scoped>
@import "../../styles/tokens.css";
.category-scroll{white-space:nowrap;background:var(--mp-brand-soft);padding:4px 14px 14px}.category-row{display:inline-flex;gap:8px}.category-chip{min-height:44px;box-sizing:border-box;padding:12px 13px;border-radius:var(--mp-radius-sm);background:#fff;color:#2a3c35;font-size:var(--mp-font-sm)}.category-chip.selected{background:var(--mp-brand-primary);color:#fff;font-weight:700}
</style>
