<script setup lang="ts">
import IconGlyph from "../ui/IconGlyph.vue";
defineProps<{ items: string[]; active: string }>();
const emit = defineEmits<{ select: [string] }>();
</script>
<template><scroll-view scroll-x class="category-scroll" :show-scrollbar="false"><view class="category-row"><view v-for="item in items" :key="item" class="category-chip" :class="{ selected: active === item }" @click="emit('select', item)"><IconGlyph v-if="item === '推荐'" name="star" :size="13" label="推荐" />{{ item }}</view></view></scroll-view></template>
<style scoped>
@import "../../styles/tokens.css";
.category-scroll{white-space:nowrap;background:transparent;padding:2px 16px 4px}.category-row{display:inline-flex;gap:8px}.category-chip{min-height:36px;box-sizing:border-box;padding:0 13px;border:1px solid var(--mp-border);border-radius:var(--mp-radius-pill);background:#fff;color:var(--mp-text-secondary);font-size:var(--mp-font-sm)}.category-chip.selected{border-color:transparent;background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark);font-weight:700}
</style>
